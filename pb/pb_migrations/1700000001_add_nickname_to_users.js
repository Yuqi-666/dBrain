/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Add nickname field to the built-in users collection
  const usersCollection = app.findCollectionByNameOrId("users");

  usersCollection.fields.addAt(3, new TextField({
    name: "nickname",
  }));

  app.save(usersCollection);
}, (app) => {
  // Rollback: remove nickname field
  const usersCollection = app.findCollectionByNameOrId("users");
  usersCollection.fields.remove(usersCollection.fields.find(f => f.name === "nickname"));
  app.save(usersCollection);
});
