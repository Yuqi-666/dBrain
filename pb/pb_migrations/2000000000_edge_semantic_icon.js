// 边语义支持保存 Lucide 图标名称，已有记录保留空图标。
migrate((app) => {
  const collection = app.findCollectionByNameOrId("edge_semantics");
  collection.fields.add(new TextField({ name: "icon" }));
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("edge_semantics");
  collection.fields.removeByName("icon");
  app.save(collection);
});
