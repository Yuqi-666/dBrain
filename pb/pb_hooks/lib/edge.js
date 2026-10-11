// Text foreign keys must never connect nodes from different workspaces.
function validateEdge(e) {
  const workspace = e.record.getString("workspaceId");
  if (!workspace) throw new BadRequestError("Workspace is required");
  for (const field of ["from", "to"]) {
    const node = e.app.findRecordById("nodes", e.record.getString(field));
    if (node.getString("workspaceId") !== workspace) throw new BadRequestError("Edge endpoints must belong to its workspace");
  }
  const semantic = e.app.findRecordById("edge_semantics", e.record.getString("semanticId"));
  if (semantic.getString("workspaceId") !== workspace) throw new BadRequestError("Edge semantic must belong to its workspace");
  return e.next();
}
module.exports = { validateEdge };
