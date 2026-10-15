// Keep the initial migration immutable; tighten both fresh and existing databases.
migrate((app) => {
  const auth = '@request.auth.id != ""';
  const owner = '@collection.workspaces:workspace_scope.id ?= workspaceId && @collection.workspaces:workspace_scope.ownerId ?= @request.auth.id';
  const member = '@collection.workspace_members:membership_scope.workspaceId ?= workspaceId && @collection.workspace_members:membership_scope.userId ?= @request.auth.id';
  const editor = member + ' && @collection.workspace_members:membership_scope.role ?!= "viewer"';
  const read = auth + ' && (' + owner + ' || (' + member + '))';
  const write = auth + ' && (' + owner + ' || (' + editor + '))';
  for (const name of ["nodes", "edges", "views", "node_semantics", "edge_semantics", "node_tags"]) {
    const c = app.findCollectionByNameOrId(name);
    c.listRule = read; c.viewRule = read; c.createRule = write;
    c.updateRule = write + ' && @request.body.workspaceId:changed = false'; c.deleteRule = write;
    app.save(c);
  }
  const workspace = app.findCollectionByNameOrId("workspaces");
  workspace.listRule = auth + ' && (ownerId = @request.auth.id || (@collection.workspace_members:membership_scope.workspaceId ?= id && @collection.workspace_members:membership_scope.userId ?= @request.auth.id))';
  workspace.viewRule = workspace.listRule;
  workspace.createRule = auth + ' && ownerId = @request.auth.id';
  workspace.updateRule = auth + ' && ownerId = @request.auth.id && @request.body.ownerId:changed = false';
  workspace.deleteRule = auth + ' && ownerId = @request.auth.id';
  app.save(workspace);
  const members = app.findCollectionByNameOrId("workspace_members");
  members.listRule = read; members.viewRule = read;
  members.createRule = auth + ' && (' + owner + ')';
  members.updateRule = members.createRule + ' && @request.body.workspaceId:changed = false && @request.body.userId:changed = false';
  members.deleteRule = members.createRule;
  app.save(members);
  const users = app.findCollectionByNameOrId("users");
  users.listRule = auth + ' && id = @request.auth.id'; users.viewRule = users.listRule;
  users.createRule = ""; users.updateRule = users.listRule; users.deleteRule = null;
  app.save(users);
  const files = app.findCollectionByNameOrId("files");
  files.fields.add(new RelationField({ name: "ownerId", collectionId: users.id, maxSelect: 1 }));
  files.fields.add(new TextField({ name: "workspaceId" }));
  files.listRule = auth + ' && (ownerId = @request.auth.id || (' + owner + ') || (' + member + '))'; files.viewRule = files.listRule;
  files.createRule = auth + ' && (workspaceId = "" || (' + owner + ') || (' + editor + '))'; files.updateRule = null; files.deleteRule = auth + ' && (ownerId = @request.auth.id || (' + owner + ') || (' + editor + '))';
  app.save(files);
  // Historic anonymous files have no safe owner. Auto-assign only for a one-user DB.
  const existingUsers = app.findRecordsByFilter("users", "", "", 2);
  if (existingUsers.length === 1) {
    const records = app.findAllRecords("files");
    for (const record of records) { record.set("ownerId", existingUsers[0].id); app.save(record); }
  }
}, () => { throw new Error("Access migration cannot be downgraded; restore a pre-upgrade backup."); });
