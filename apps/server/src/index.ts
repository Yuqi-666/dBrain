import { createServer, request as httpRequest } from "node:http";
import {
  AppContainer,
  createWSServer,
  createContext,
  appRouter,
} from "@workspace/adapter-front";
import { verifyToken } from "@workspace/infrastructure";
import { allowedFileRequest } from "./desktop/security";
import { TRPC_PATH, sameOrigin } from "./origin";

const PORT = Number(process.env.PORT ?? 3001);
const PB_URL = process.env.PB_URL ?? "http://127.0.0.1:8090";
const publicOrigin = process.env.DBRAIN_PUBLIC_ORIGIN;
function cookieToken(cookie = ""): string {
  try {
    return decodeURIComponent(
      cookie.match(/(?:^|;\s*)pb_token=([^;]+)/)?.[1] ?? "",
    );
  } catch {
    return "";
  }
}
async function databaseReady(): Promise<boolean> {
  try {
    return (
      await fetch(`${PB_URL}/api/health`, { signal: AbortSignal.timeout(3000) })
    ).ok;
  } catch {
    return false;
  }
}
async function main() {
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535)
    throw new Error("Invalid PORT");
  for (let attempt = 0; !(await databaseReady()); attempt++) {
    if (attempt >= 30) throw new Error("PocketBase did not become ready");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await AppContainer.initialize(PB_URL);
  const server = createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      void databaseReady().then((ready) =>
        res
          .writeHead(ready ? 200 : 503, { "Content-Type": "application/json" })
          .end(JSON.stringify({ ready })),
      );
      return;
    }
    const path = req.url?.startsWith("/pb/") ? req.url.slice(3) : "";
    if (!allowedFileRequest(path, req.method)) {
      res.writeHead(404).end();
      return;
    }
    if (!sameOrigin(req.headers.origin, req.headers.host, publicOrigin)) {
      res.writeHead(403).end();
      return;
    }
    const token = req.headers.authorization || cookieToken(req.headers.cookie);
    void verifyToken(token)
      .then(() => {
        // Never proxy administration, arbitrary URLs, client cookies or forwarding headers.
        const headers: Record<string, string> = { Authorization: token };
        for (const key of [
          "content-type",
          "content-length",
          "range",
          "if-none-match",
          "if-modified-since",
        ]) {
          const value = req.headers[key];
          if (typeof value === "string") headers[key] = value;
        }
        const upstream = httpRequest(
          new URL(path, PB_URL),
          { method: req.method, headers },
          (response) => {
            res.setHeader("Cache-Control", "private, no-store");
            res.setHeader("X-Content-Type-Options", "nosniff");
            if (
              path.split("?")[0]?.endsWith(".m3u8") &&
              req.method === "GET" &&
              response.statusCode === 200
            ) {
              const chunks: Buffer[] = [];
              response.on("data", (chunk) => chunks.push(chunk));
              response.on("end", () =>
                res
                  .writeHead(200, {
                    "Content-Type": "application/vnd.apple.mpegurl",
                  })
                  .end(
                    Buffer.concat(chunks)
                      .toString("utf8")
                      .replace(/^\/api\/files\//gm, "/pb/api/files/"),
                  ),
              );
            } else {
              for (const key of [
                "content-type",
                "content-length",
                "content-range",
                "accept-ranges",
                "etag",
                "last-modified",
              ]) {
                const value = response.headers[key];
                if (value !== undefined) res.setHeader(key, value);
              }
              res.writeHead(response.statusCode ?? 502);
              response.pipe(res);
            }
            response.once("error", () => res.destroy());
          },
        );
        upstream.setTimeout(120000, () =>
          upstream.destroy(new Error("File gateway timeout")),
        );
        upstream.once("error", () => {
          if (!res.headersSent) res.writeHead(502);
          res.end();
        });
        req.once("aborted", () => upstream.destroy());
        req.pipe(upstream);
      })
      .catch(() => res.writeHead(401).end());
  });
  const { wss, handler } = createWSServer(0, appRouter, createContext, {
    noServer: true,
  });
  server.on("upgrade", (req, socket, head) => {
    if (
      req.url?.split("?")[0] !== TRPC_PATH ||
      !sameOrigin(req.headers.origin, req.headers.host, publicOrigin)
    ) {
      socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) =>
      wss.emit("connection", ws, req),
    );
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "0.0.0.0", resolve);
  });
  console.log(`[server] ready on port ${PORT}`);
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    handler.broadcastReconnectNotification();
    wss.clients.forEach((client) => client.close(1001));
    const deadline = setTimeout(() => {
      wss.clients.forEach((client) => client.terminate());
      process.exit(1);
    }, 5000);
    wss.close(() =>
      server.close(() => {
        clearTimeout(deadline);
        process.exit(0);
      }),
    );
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
main().catch((error) => {
  console.error("[server] startup failed", error);
  process.exit(1);
});
