import { getDesktopBackend } from "./desktop-backend";

/**
 * Browser-side backend URLs.
 *
 * The two browser clients (tRPC over WebSocket, PocketBase REST/files) must
 * reach the dev backends on `:3001` / `:8090`. Two deployment shapes exist:
 *
 * 1. **Loopback** — the browser runs on the same host as `pnpm dev`
 *    (`http://localhost:3000`). The backends listen on their own ports, so we
 *    keep talking to `localhost:3001` / `localhost:8090` directly. This is the
 *    local development path and must not change.
 * 2. **Proxied same-origin** — the browser reaches the app through a reverse
 *    proxy on a real hostname (this repo's dev box: `https://dev.yuqi-666.cn`
 *    → nginx → `:3000`). From such a browser `localhost` means the *browser's*
 *    machine, so the direct ports are unreachable. We instead use same-origin
 *    paths that the proxy is expected to route:
 *
 *        /trpc  → http://127.0.0.1:3001   (WebSocket upgrade; any path is
 *                                          accepted — the server is
 *                                          `new WebSocketServer({ port })`)
 *        /pb/   → server:3001 (authenticated file gateway → PocketBase)
 *
 * Container routing lives in `deploy/nginx.conf`; see `docs/development.md`
 * and `docs/operations.md` for development and deployment proxy configuration.
 *
 * Anything else (e.g. opening `http://10.21.188.14:3000` directly) cannot work
 * in either shape and falls back to the same-origin paths, which is no worse
 * than the previous always-`localhost` behaviour.
 */

export interface BackendUrls {
  /** tRPC WebSocket endpoint (queries, mutations, subscriptions). */
  trpc: string;
  /** PocketBase origin (REST, file URLs, uploads). */
  pocketbase: string;
}

// The `/trpc` path is part of the contract, not decoration: the server owns the
// HTTP listener and performs the WebSocket upgrade itself, admitting only
// `req.url === "/trpc"` (and rejecting anything else with a 403 handshake).
// Every other shape already spells it out — `deploy/nginx.conf`'s
// `location = /trpc`, the desktop runtime's `${base}/trpc`, and
// `scripts/release/server-smoke.mjs`. A URL without it fails the handshake, and
// because tRPC's ws client silently retries a rejected socket, the caller's
// promise never settles: the app sits on its loading gate forever instead of
// erroring.
const LOOPBACK_URLS: BackendUrls = {
  trpc: "ws://localhost:3001/trpc",
  pocketbase: "http://localhost:8090",
};

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

/**
 * Resolve the backend URLs for the current browsing context. Safe to call on
 * the server: without a `window` it returns the loopback defaults.
 */
export function resolveBackendUrls(): BackendUrls {
  if (typeof window === "undefined") {
    return LOOPBACK_URLS;
  }

  if (process.env.NEXT_PUBLIC_DBRAIN_PLATFORM === "desktop") {
    return getDesktopBackend();
  }

  const { hostname, host, origin, protocol } = window.location;
  if (isLoopbackHostname(hostname) && process.env.NEXT_PUBLIC_DBRAIN_BACKEND_MODE !== "same-origin") {
    // Cookies are scoped by hostname, not port. Keep the browser's hostname
    // so media requests opened at 127.0.0.1 also carry its session to PB.
    const loopbackHost = hostname === "::1" ? "[::1]" : hostname;
    return {
      trpc: `ws://${loopbackHost}:3001/trpc`,
      pocketbase: `http://${loopbackHost}:8090`,
    };
  }

  return {
    trpc: `${protocol === "https:" ? "wss:" : "ws:"}//${host}/trpc`,
    pocketbase: `${origin}/pb`,
  };
}
