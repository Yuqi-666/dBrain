onRecordCreateRequest((e) => {
  if (!e.auth) throw new UnauthorizedError("Authentication required");
  e.record.set("ownerId", e.auth.id);
  return e.next();
}, "files");
// Keep native Range/media support while authorizing every direct file download.
onFileDownloadRequest((e) => {
  if (e.collection.name !== "files") return e.next();
  const request = e.requestEvent || e;
  let auth = request.auth;
  // Local development uses direct PocketBase media URLs. Browser media elements
  // cannot attach Authorization, but same-site requests carry the session cookie.
  if (!auth && (request.request.method === "GET" || request.request.method === "HEAD")) {
    const match = request.request.header.get("Cookie").match(/(?:^|;\s*)pb_token=([^;]+)/);
    if (match) { try { auth = request.app.findAuthRecordByToken(decodeURIComponent(match[1]), "auth"); } catch (_) {} }
  }
  if (!auth || auth.collection().name !== "users") throw new NotFoundError("File not found");
  if (e.record.getString("ownerId") === auth.id) return e.next();
  const workspaceId = e.record.getString("workspaceId");
  if (workspaceId) {
    try {
      const workspace = request.app.findRecordById("workspaces", workspaceId);
      if (workspace.getString("ownerId") === auth.id) return e.next();
      request.app.findFirstRecordByFilter("workspace_members", "workspaceId = {:workspace} && userId = {:user}", { workspace: workspaceId, user: auth.id });
      return e.next();
    } catch (_) {}
  }
  throw new NotFoundError("File not found");
});
