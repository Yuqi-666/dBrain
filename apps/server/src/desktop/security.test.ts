import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedOrigin, allowedFileRequest, rewriteLocalPlaylist, sessionPath } from "./security.ts";

test("gateway requires the exact session secret and rejects arbitrary browser origins", () => {
  assert.equal(sessionPath("/session/secret/trpc", "secret"), "/trpc");
  assert.equal(sessionPath("/session/secret/trpc?connectionParams=1", "secret")?.split("?")[0], "/trpc");
  for (const url of ["/session/secret2/trpc", "/session/secret", "/trpc"]) assert.equal(sessionPath(url, "secret"), undefined);
  assert.equal(allowedOrigin("http://localhost:3002"), true);
  assert.equal(allowedOrigin("tauri://localhost"), true);
  assert.equal(allowedOrigin("https://hostile.example"), false);
  assert.equal(allowedOrigin("null"), false);
});
test("file gateway permits only file reads and upload creates", () => {
  assert.equal(allowedFileRequest("/api/files/files/abcdef/file.png", "GET"), true);
  assert.equal(allowedFileRequest("/api/files/files/abcdef/file.mp4", "HEAD"), true);
  assert.equal(allowedFileRequest("/api/collections/files/records", "POST"), true);
  for (const path of ["/_/", "/api/collections/users/records", "/api/files/files/abcdef/../file.png"]) assert.equal(allowedFileRequest(path, "GET"), false);
  assert.equal(allowedFileRequest("/api/collections/files/records", "DELETE"), false);
});
test("HLS playback retains the active session prefix without changing comments", () => {
  const playlist = "#EXTM3U\n#EXTINF:1,\n/api/files/files/abcdef/one.ts\n#EXT-X-ENDLIST\n";
  assert.equal(rewriteLocalPlaylist(playlist, "new-secret"), playlist.replace("/api/files/", "/session/new-secret/api/files/"));
});
