/**
 * Browser-side backend URLs.
 *
 * The two browser clients (tRPC over WebSocket, PocketBase REST/files) must
 * reach the dev backends on `:3001` / `:8090`. Two deployment shapes exist:
 *
 * 1. **Loopback** — the browser runs on the same host as `pnpm dev:full`
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
 *        /pb/   → http://127.0.0.1:8090/  (REST + /api/files; the prefix is
 *                                          stripped, so PocketBase still sees
 *                                          `/api/...`)
 *
 * The proxy side is host configuration, not part of this repo; see
 * `docs/plan/README.md` (§9 R37 / §10) for the required nginx snippet.
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

const LOOPBACK_URLS: BackendUrls = {
  trpc: "ws://localhost:3001",
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

  const { hostname, host, origin, protocol } = window.location;
  if (isLoopbackHostname(hostname)) {
    return LOOPBACK_URLS;
  }

  return {
    trpc: `${protocol === "https:" ? "wss:" : "ws:"}//${host}/trpc`,
    pocketbase: `${origin}/pb`,
  };
}
