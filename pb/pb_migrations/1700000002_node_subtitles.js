/// <reference path="../pb_data/types.d.ts" />
/**
 * M7 — the `subtitles` column on `nodes`.
 *
 * A separate file, not an edit to its siblings: PocketBase de-duplicates
 * migrations by **filename** only, so changing `1700000000_initial_schema.js`
 * (or the `1700000001` extras that added `timestampNotes`) would do nothing on
 * an existing `pb_data` — and deleting `pb_data` to force it is destructive.
 * A new filename is picked up on the next boot and needs no rebuild.
 *
 * `subtitles` is `SubtitleCue[]` JSON, used by `audio` + `video`, and is
 * optional exactly like its sibling columns: the mappers read a missing column
 * as `undefined`, so every record written before this migration stays readable
 * (it simply has no transcript).
 */
migrate(
  (app) => {
    const nodes = app.findCollectionByNameOrId("nodes");
    nodes.fields.add(new Field({ name: "subtitles", type: "json" }));
    app.save(nodes);
  },
  (app) => {
    const nodes = app.findCollectionByNameOrId("nodes");
    nodes.fields.removeByName("subtitles");
    app.save(nodes);
  },
);
