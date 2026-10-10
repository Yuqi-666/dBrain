/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const workspace = app.findCollectionByNameOrId("workspaces");
    const users = app.findCollectionByNameOrId("users");
    const access =
      '@request.auth.id != "" && ownerId = @request.auth.id && (workspaceId.ownerId = @request.auth.id || (@collection.workspace_members:dashboard.workspaceId ?= workspaceId && @collection.workspace_members:dashboard.userId ?= @request.auth.id))';
    app.save(
      new Collection({
        name: "dashboard_configs",
        type: "base",
        listRule: access,
        viewRule: access,
        createRule: access,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: "ownerId",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: users.id,
            cascadeDelete: true,
          },
          {
            name: "workspaceId",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: workspace.id,
            cascadeDelete: true,
          },
          {
            name: "revision",
            type: "number",
            required: true,
            min: 1,
            onlyInt: true,
          },
          { name: "config", type: "json", required: true, maxSize: 5000000 },
        ],
        // Immutable revisions give saves a database-enforced concurrency boundary.
        indexes: [
          "CREATE UNIQUE INDEX idx_dashboard_revision ON dashboard_configs (ownerId, workspaceId, revision)",
        ],
      }),
    );
  },
  (app) => app.delete(app.findCollectionByNameOrId("dashboard_configs")),
);
