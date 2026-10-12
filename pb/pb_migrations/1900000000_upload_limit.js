// Raises the per-file cap from 100 MiB to 2 GiB.
//
// The value must match `MAX_UPLOAD_BYTES` in `packages/utils/src/upload.ts`:
// the client refuses a larger file before it starts, and the API refuses it at
// session creation, but PocketBase is the last line of defence and the only one
// that sees the assembled file. The initial migration stays untouched, so an
// existing database is upgraded in place.
migrate((app) => {
  const files = app.findCollectionByNameOrId("files");
  files.fields.getByName("file").maxSize = 2147483648;
  app.save(files);
}, (app) => {
  const files = app.findCollectionByNameOrId("files");
  files.fields.getByName("file").maxSize = 104857600;
  app.save(files);
});
