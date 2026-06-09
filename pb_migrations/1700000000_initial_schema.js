/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. 给 users 表添加 nickname 字段
  const usersCollection = app.findCollectionByNameOrId("users");
  usersCollection.fields.addAt(3, new TextField({
    name: "nickname",
  }));
  app.save(usersCollection);

  // 2. 创建 node_semantics 表
  const nodeSemantics = new Collection({
    name: "node_semantics",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "description", type: "text" },
      { name: "color", type: "text" },
      { name: "icon", type: "text" },
    ],
  });
  app.save(nodeSemantics);

  // 3. 创建 edge_semantics 表
  const edgeSemantics = new Collection({
    name: "edge_semantics",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "name", type: "text" },
      { name: "category", type: "select", required: true, values: ["hierarchy", "flow", "association", "interaction"] },
      { name: "color", type: "text" },
      { name: "description", type: "text" },
    ],
  });
  app.save(edgeSemantics);

  // 4. 创建 node_tags 表
  const nodeTags = new Collection({
    name: "node_tags",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "name", type: "text" },
      { name: "color", type: "text" },
    ],
  });
  app.save(nodeTags);

  // 5. 创建 views 表
  const views = new Collection({
    name: "views",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "name", type: "text" },
      { name: "viewType", type: "select", required: true, values: ["Force", "Flow"] },
      { name: "visualConfig", type: "json" },
      { name: "filterConfig", type: "json" },
      { name: "isPinned", type: "bool" },
    ],
  });
  app.save(views);

  // 6. 创建 nodes 表
  const nodes = new Collection({
    name: "nodes",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "title", type: "text" },
      { name: "abstract", type: "text" },
      { name: "permission", type: "select", required: true, values: ["private", "public", "restricted"] },
      { name: "semanticId", type: "text" },
      { name: "tags", type: "json" },
      { name: "isPinned", type: "bool" },
      { name: "stateData", type: "json" },
      { name: "nodeType", type: "text", required: true },
      { name: "content", type: "json" },
      { name: "width", type: "number" },
      { name: "height", type: "number" },
      { name: "fileSize", type: "number" },
      { name: "location", type: "text" },
      { name: "shootingTime", type: "text" },
      { name: "coverUrl", type: "text" },
      { name: "pageCount", type: "number" },
      { name: "duration", type: "number" },
      { name: "source", type: "select", values: ["local", "online"] },
      { name: "sourceUrl", type: "url" },
      { name: "url", type: "url" },
      { name: "screenshotUrl", type: "text" },
      { name: "faviconUrl", type: "text" },
      { name: "filterConfig", type: "json" },
      { name: "referencedNodes", type: "json" },
      { name: "docs", type: "json" },
    ],
  });
  app.save(nodes);

  // 7. 创建 edges 表
  const edges = new Collection({
    name: "edges",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "from", type: "text", required: true },
      { name: "to", type: "text", required: true },
      { name: "direction", type: "select", required: true, values: ["forward", "reverse", "bidirectional", "unidirectional"] },
      { name: "semanticId", type: "text" },
      { name: "edgeType", type: "text", required: true },
      { name: "weight", type: "number" },
    ],
  });
  app.save(edges);
}, (app) => {
  // 回滚逻辑：先删子表，再删父表，最后删除 users 字段
  app.delete(app.findCollectionByNameOrId("edges"));
  app.delete(app.findCollectionByNameOrId("nodes"));
  app.delete(app.findCollectionByNameOrId("views"));
  app.delete(app.findCollectionByNameOrId("node_tags"));
  app.delete(app.findCollectionByNameOrId("edge_semantics"));
  app.delete(app.findCollectionByNameOrId("node_semantics"));

  // 移除 users 表的 nickname 字段
  const usersCollection = app.findCollectionByNameOrId("users");
  const nicknameField = usersCollection.fields.find(f => f.name === "nickname");
  if (nicknameField) {
    usersCollection.fields.remove(nicknameField);
    app.save(usersCollection);
  }
});
