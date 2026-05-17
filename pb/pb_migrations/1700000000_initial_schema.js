/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
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

  const edgeSemantics = new Collection({
    name: "edge_semantics",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "category", type: "select", required: true, values: ["hierarchy", "flow", "association", "interaction"] },
      { name: "color", type: "text" },
      { name: "description", type: "text" },
    ],
  });
  app.save(edgeSemantics);

  const nodeTags = new Collection({
    name: "node_tags",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "color", type: "text" },
    ],
  });
  app.save(nodeTags);

  const views = new Collection({
    name: "views",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "layout", type: "text", required: true },
      { name: "visualConfig", type: "json" },
      { name: "filterConfig", type: "json" },
      { name: "isPinned", type: "bool" },
    ],
  });
  app.save(views);

  const nodes = new Collection({
    name: "nodes",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "title", type: "text", required: true },
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
      { name: "selectedNodes", type: "json" },
      { name: "referencedNodes", type: "json" },
      { name: "docs", type: "json" },
    ],
  });
  app.save(nodes);

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
      // 修复：select 字段 values 直接写在顶级
      { name: "direction", type: "select", required: true, values: ["forward", "reverse", "bidirectional"] },
      { name: "semanticId", type: "text" },
      { name: "edgeType", type: "text", required: true },
      { name: "weight", type: "number" },
    ],
  });
  app.save(edges);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("edges"));
  app.delete(app.findCollectionByNameOrId("nodes"));
  app.delete(app.findCollectionByNameOrId("views"));
  app.delete(app.findCollectionByNameOrId("node_tags"));
  app.delete(app.findCollectionByNameOrId("edge_semantics"));
  app.delete(app.findCollectionByNameOrId("node_semantics"));
});
