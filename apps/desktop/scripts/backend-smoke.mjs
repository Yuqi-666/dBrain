/** Exercise the packaged backend outside the checkout, with a fresh device database. */
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { cp, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const requireClient = createRequire(join(root, "packages/api-client/package.json"));
const { createTRPCClient, createWSClient, wsLink } = await import(requireClient.resolve("@trpc/client"));
const { default: superjson } = await import(requireClient.resolve("superjson"));
const scratch = await mkdtemp(join(tmpdir(), "dbrain-backend-smoke-"));
const runtime = join(scratch, "runtime");
await cp(join(root, "apps/desktop/src-tauri/runtime"), runtime, { recursive: true, dereference: true });
const data = join(scratch, "data");
const readyFile = join(scratch, "ready.json");
const exe = name => join(runtime, process.platform === "win32" ? `${name}.exe` : name);
let child, descriptor, ws, client;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let logs = "";
const env = { ...process.env, DBRAIN_DESKTOP: "1", FFMPEG_PATH: exe("ffmpeg"), FFPROBE_PATH: exe("ffprobe"), LD_LIBRARY_PATH: join(runtime, "lib") };
async function start() {
  child = spawn(exe("node"), [join(runtime, "backend.mjs"), data, readyFile], { env, stdio: ["pipe", "pipe", "pipe"] });
  child.stdout.on("data", chunk => { logs += chunk; });
  child.stderr.on("data", chunk => { logs += chunk; });
  child.on("error", error => { logs += error.message; });
  for (let attempt = 0; attempt < 450; attempt++) {
    if (child.exitCode !== null) throw new Error(`Backend stopped: ${logs}`);
    try { descriptor = JSON.parse(await readFile(readyFile, "utf8")); break; } catch { await pause(100); }
  }
  assert.ok(descriptor, "runtime ready");
  ws = createWSClient({ url: descriptor.trpc, connectionParams: { token: descriptor.token, sourceId: "smoke-client" } });
  client = createTRPCClient({ links: [wsLink({ client: ws, transformer: superjson })] });
}
async function stop() {
  ws?.close();
  if (child && child.exitCode === null) {
    const exit = once(child, "exit");
    child.stdin.end("shutdown\n");
    await Promise.race([exit, pause(5000).then(() => { if (child.exitCode === null) child.kill("SIGKILL"); })]);
    assert.equal(child.exitCode, 0, logs);
  }
  descriptor = undefined;
}
async function upload(bytes, name, type) {
  const form = new FormData(); form.append("file", new Blob([bytes], { type }), name);
  const response = await fetch(`${descriptor.pocketbase}/api/collections/files/records`, { method: "POST", body: form });
  assert.equal(response.status, 200, await response.clone().text());
  const record = await response.json();
  return `/api/files/${record.collectionId}/${record.id}/${record.file}`;
}
function pdfFixture() {
  const stream = "BT /F1 18 Tf 20 80 Td (Offline desktop PDF) Tj ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 120] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
const deadline = setTimeout(() => {
  console.error("Backend smoke test timed out\n" + logs);
  child?.stdin.end("shutdown\n");
  setTimeout(() => process.exit(1), 1000);
}, 90_000);
const tmpId = () => `tmp_${crypto.randomUUID()}`;
try {
  await start();
  const originalGateway = descriptor.pocketbase;
  const base = new URL(descriptor.pocketbase).origin;
  assert.equal((await fetch(`${base}/health`)).status, 403);
  assert.equal((await fetch(`${descriptor.pocketbase}/health`, { headers: { Origin: "https://hostile.example" } })).status, 403);
  assert.equal((await fetch(`${descriptor.pocketbase}/api/collections/users/records`)).status, 404);
  const freshSession = await fetch(`${descriptor.pocketbase}/session`, { method: "POST" });
  assert.ok((await freshSession.json()).token);
  const anonymousWS = createWSClient({ url: descriptor.trpc });
  const anonymous = createTRPCClient({ links: [wsLink({ client: anonymousWS, transformer: superjson })] });
  try { await assert.rejects(anonymous.auth.me.query(), error => error.data?.code === "UNAUTHORIZED"); } finally { anonymousWS.close(); }
  if (process.platform === "linux") {
    const children = execFileSync("pgrep", ["-P", String(child.pid)], { encoding: "utf8" }).trim().split("\n");
    let checked = false;
    for (const pid of children) {
      const command = await readFile(`/proc/${pid}/cmdline`, "utf8");
      const port = command.match(/--http=127\.0\.0\.1:(\d+)/)?.[1];
      if (port) { assert.equal((await fetch(`http://127.0.0.1:${port}/api/health`)).status, 403); checked = true; }
    }
    assert.ok(checked, "private database rejects requests bypassing the gateway");
  }
  console.log("PASS session gate, origin checks, private database gate and authentication");

  console.log("STEP local identity");
  const user = await client.auth.me.query();
  assert.equal(user.nickname, "本地用户");
  console.log("STEP provision workspace");
  const workspace = await client.workspace.provisionDefault.mutate();
  assert.equal(workspace.ownerId, user.id);
  const workspaceId = workspace.id;
  assert.equal((await client.workspace.listByUser.query({})).length, 1);
  console.log("STEP workspace models");
  const views = await client.view.listByWorkspace.query({ workspaceId });
  assert.equal(views.length, 1);
  await client.view.update.mutate({ id: views[0].id, updates: { visualConfig: { showMinimap: false } } });
  const semantic = await client.nodeSemantic.add.mutate({ id: tmpId(), name: "离线笔记", workspaceId });
  const tag = await client.nodeTag.add.mutate({ id: tmpId(), name: "本地", workspaceId });
  const edgeSemantic = await client.edgeSemantic.add.mutate({ id: tmpId(), name: "关联", category: "association", workspaceId });
  const inputs = [
    { nodeType: "text", content: { docs: {} } },
    { nodeType: "image", width: 10, height: 10, fileSize: 0, content: { url: "" } },
    { nodeType: "pdf", pageCount: 0, fileSize: 0, content: { url: "", coverUrl: "" } },
    { nodeType: "video", duration: 0, source: "local", content: { url: "", coverUrl: "", hlsUrl: "" } },
    { nodeType: "audio", duration: 0, fileSize: 0, content: { url: "" } },
    { nodeType: "webpage", content: { code: "<p>offline</p>", language: "html" } },
    { nodeType: "website", content: { url: "https://example.com", faviconUrl: "" } },
    { nodeType: "collection", content: {} },
    { nodeType: "rich-text", content: { referencedNodes: [], docs: {} } },
    { nodeType: "database", content: { fields: [], rows: [] } },
  ];
  console.log("STEP ten node types");
  const nodes = [];
  for (const input of inputs) nodes.push(await client.node.add.mutate({ ...input, id: tmpId(), title: input.nodeType, semanticId: semantic.id, tags: [tag.id], workspaceId }));
  assert.equal((await client.node.listByWorkspace.query({ workspaceId })).length, 10);
  const edge = await client.edge.add.mutate({ id: tmpId(), from: nodes[0].id, to: nodes[1].id, direction: "forward", semanticId: edgeSemantic.id, workspaceId });
  console.log("STEP subscription");
  const event = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Subscription timed out")), 5000);
    const subscription = client.event.onEvent.subscribe(undefined, {
      onStarted() { void client.node.update.mutate({ id: nodes[0].id, updates: { title: "重启后保留" } }).catch(reject); },
      onData(data) { if (data.eventType === "NodeUpdated") { clearTimeout(timeout); subscription.unsubscribe(); resolve(data); } }, onError: reject,
    });
  });
  assert.equal((await event).metadata.sourceId, "smoke-client");
  console.log("PASS workspace, view, semantics, tags, all 10 node types, edges and live events");

  const dashboard = await client.dashboard.get.query({ workspaceId });
  const state = { ...dashboard, pages: [{ id: "offline-page", name: "离线 Dashboard", widgets: [] }], activePageId: "offline-page" };
  const saved = await client.dashboard.save.mutate({ workspaceId, state });
  assert.equal(saved.revision, 1);
  await assert.rejects(client.dashboard.save.mutate({ workspaceId, state }), error => error.data?.code === "CONFLICT");
  console.log("PASS Dashboard persistence and optimistic conflicts");

  const file = await upload(Buffer.from("local attachment"), "offline.txt", "text/plain");
  assert.equal(await (await fetch(`${descriptor.pocketbase}${file}`)).text(), "local attachment");
  assert.equal((await fetch(`${descriptor.pocketbase}${file}`, { headers: { Range: "bytes=0-4" } })).status, 206);
  const pdf = await upload(pdfFixture(), "offline.pdf", "application/pdf");
  const analysis = await client.file.analyzePdf.mutate({ fileUrl: pdf });
  assert.equal(analysis.pageCount, 1);
  assert.ok(analysis.coverUrl.startsWith("/api/files/"), "PDF cover rendered by packaged native canvas");
  assert.equal((await fetch(`${descriptor.pocketbase}${analysis.coverUrl}`)).status, 200);
  const videoPath = join(scratch, "offline.mp4");
  execFileSync(exe("ffmpeg"), ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=blue:s=64x64:d=1", "-c:v", "mpeg4", videoPath], { env });
  const video = await upload(await readFile(videoPath), "offline.mp4", "video/mp4");
  const transcode = await client.file.transcodeVideo.mutate({ fileUrl: video });
  assert.equal(transcode.reencoded, true);
  assert.ok(transcode.coverUrl.startsWith("/api/files/"));
  const playlist = await (await fetch(`${descriptor.pocketbase}${transcode.hlsUrl}`)).text();
  const segment = playlist.split("\n").find(line => line.startsWith("/session/"));
  assert.ok(segment, "HLS segment uses the authenticated gateway");
  assert.equal((await fetch(`${base}${segment}`)).status, 200);
  console.log("PASS disk attachments, range requests, PDF parsing/covers and FFmpeg video transcoding/HLS");

  await stop();
  await assert.rejects(stat(join(data, "runtime.lock")), error => error.code === "ENOENT");
  await start();
  assert.notEqual(descriptor.pocketbase, originalGateway);
  assert.equal((await client.auth.me.query()).id, user.id);
  assert.equal((await client.node.getById.query({ id: nodes[0].id })).title, "重启后保留");
  assert.equal((await client.dashboard.get.query({ workspaceId })).pages[0].name, "离线 Dashboard");
  assert.equal(await (await fetch(`${descriptor.pocketbase}${file}`)).text(), "local attachment");
  const newPlaylist = await (await fetch(`${descriptor.pocketbase}${transcode.hlsUrl}`)).text();
  const newSegment = newPlaylist.split("\n").find(line => line.startsWith("/session/"));
  assert.notEqual(newSegment, segment);
  assert.equal((await fetch(`${new URL(descriptor.pocketbase).origin}${newSegment}`)).status, 200);
  await client.edge.delete.mutate({ id: edge.id });
  await client.node.delete.mutate({ id: nodes[0].id });
  console.log("PASS clean shutdown, same local identity, restart persistence and portable file/HLS paths");
} catch (error) {
  console.error(logs); throw error;
} finally { clearTimeout(deadline); await stop(); await rm(scratch, { recursive: true, force: true }); }
