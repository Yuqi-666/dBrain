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
      { name: "workspaceId", type: "text" },
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
      { name: "workspaceId", type: "text" },
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
      { name: "workspaceId", type: "text" },
    ],
  });
  app.save(nodeTags);

  // 5. 创建 workspaces 表（数据隔离的工作区容器）
  const workspaces = new Collection({
    name: "workspaces",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "ownerId", type: "text", required: true },
    ],
  });
  app.save(workspaces);

  // 6. 创建 workspace_members 表（user↔workspace 多对多协作）
  const workspaceMembers = new Collection({
    name: "workspace_members",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "workspaceId", type: "text", required: true },
      { name: "userId", type: "text", required: true },
      { name: "role", type: "select", required: true, values: ["owner", "editor", "viewer"] },
    ],
  });
  app.save(workspaceMembers);

  // 7. 创建 views 表
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
      { name: "workspaceId", type: "text" },
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
      // 网页节点只保存源码这一种表现形式：content 列存放源码（HTML 或任意
      // 代码），codeLanguage 是它高亮所用的语言。节点不再有初始化模式，地址
      // 归 website 节点，截图归 image 节点，所以没有 webpageMode 列。
      { name: "codeLanguage", type: "text" },
      { name: "faviconUrl", type: "text" },
      { name: "filterConfig", type: "json" },
      { name: "referencedNodes", type: "json" },
      { name: "docs", type: "json" },
      { name: "workspaceId", type: "text" },
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
      { name: "stateData", type: "json" },
      { name: "workspaceId", type: "text" },
    ],
  });
  app.save(edges);

  // 8. 创建 files 表（所有上传二进制的存储：节点媒体、编辑器图片、excalidraw 场景）
  //
  // 前端一直往 /api/collections/files/records 上传（见 packages/api-client/src/upload.ts），
  // 但集合本身从未创建，导致每次上传都 404。
  // 规则与其余集合一致（nodes/edges/views 都用 "" 即公开），因为应用没有客户端
  // PocketBase 登录，鉴权由服务端 tRPC 层负责。
  //
  // 注意：Collection 构造函数只认「普通字段描述对象」。这里若写成
  // `new FileField({...})` 会被静默丢弃（集合只保存下系统 id 字段），必须保持普通对象。
  const files = new Collection({
    name: "files",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      {
        name: "file",
        type: "file",
        required: true,
        maxSelect: 1,
        // 100MB — 与 FileDropZone 的 maxSize 保持一致
        maxSize: 104857600,
      },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });
  app.save(files);
}, (app) => {
  // 回滚逻辑：先删子表，再删父表，最后删除 users 字段
  app.delete(app.findCollectionByNameOrId("files"));
  app.delete(app.findCollectionByNameOrId("edges"));
  app.delete(app.findCollectionByNameOrId("nodes"));
  app.delete(app.findCollectionByNameOrId("views"));
  app.delete(app.findCollectionByNameOrId("workspace_members"));
  app.delete(app.findCollectionByNameOrId("workspaces"));
  app.delete(app.findCollectionByNameOrId("node_tags"));
  app.delete(app.findCollectionByNameOrId("edge_semantics"));
  app.delete(app.findCollectionByNameOrId("node_semantics"));

  // 移除 users 表的 nickname 字段
  // 注意：PB 0.40 的 FieldsList 只有 removeById/removeByName，没有 remove()。
  // 早先的 `fields.remove(field)` 会抛 "Object has no member 'remove'"，导致整条
  // 回滚（含上面的集合删除）一起失败。removeByName 在字段不存在时是 no-op。
  const usersCollection = app.findCollectionByNameOrId("users");
  usersCollection.fields.removeByName("nickname");
  app.save(usersCollection);
});
