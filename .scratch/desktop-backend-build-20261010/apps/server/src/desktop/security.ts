/** Only the native WebView and the documented development frontend can reach the gateway. */
const origins = new Set([
  "tauri://localhost", "http://tauri.localhost", "https://tauri.localhost",
  "http://localhost:3002", "http://127.0.0.1:3002",
]);
export function allowedOrigin(origin?: string): boolean {
  return origin === undefined || origins.has(origin);
}
export function sessionPath(url: string, secret: string): string | undefined {
  const prefix = `/session/${secret}`;
  if (!url.startsWith(`${prefix}/`)) return undefined;
  return url.slice(prefix.length);
}
export function allowedFileRequest(path: string, method?: string): boolean {
  const pathname = path.split("?")[0] ?? "";
  return ((method === "GET" || method === "HEAD") && /^\/api\/files\/[a-zA-Z0-9_]+\/[a-zA-Z0-9]+\/[^/]+$/.test(pathname)) ||
    (method === "POST" && pathname === "/api/collections/files/records");
}
/** HLS URI lines must retain the authenticated gateway prefix, including after a restart. */
export function rewriteLocalPlaylist(body: string, secret: string): string {
  return body.replace(/^\/api\/files\//gm, `/session/${secret}/api/files/`);
}
