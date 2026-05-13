import { AppContainer, createWSServer, createContext, appRouter } from "@workspace/adapter-front";

const PORT = Number(process.env.PORT ?? 3000);
const PB_URL = process.env.PB_URL ?? "http://127.0.0.1:8090";

async function main() {
  await AppContainer.initialize(PB_URL);
  console.log(`[server] PocketBase connected: ${PB_URL}`);

  const { wss } = createWSServer(PORT, appRouter, createContext);
  console.log(`[server] tRPC server running on ws://localhost:${PORT}`);

  wss.on("connection", (ws, req) => {
    console.log(`[server] Client connected from ${req.socket.remoteAddress}`);
    ws.on("close", () => console.log(`[server] Client disconnected`));
  });

  process.on("SIGINT", () => {
    wss.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[server] Fatal error:", err);
  process.exit(1);
});
