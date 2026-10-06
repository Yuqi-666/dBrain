/// <reference path="../pb_data/types.d.ts" />
/**
 * M1 — the four `nodes` columns the node-content / selectors / annotation
 * designs need.
 *
 * The filename must be new: PocketBase de-duplicates migrations by **filename**
 * only, so editing `1700000000_initial_schema.js` would do nothing on an
 * existing `pb_data` (see that file's own note). Four columns land at once
 * because one milestone (M1) owns the whole chain:
 *
 * - `annotations`    — `AnnotationLayerData` JSON, used by `image` + `pdf`
 * - `timestampNotes` — `TimestampNote[]` JSON, used by `audio` + `video`
 * - `icon`           — `NodeIcon` JSON, every node type
 * - `cover`          — `NodeCover` JSON, every node type
 *
 * All four are optional and store a plain `json` value: the mappers read a
 * missing column as `undefined`, so old records stay readable. `Field` (not a
 * concrete `JsonField` constructor) is deliberate — the 0-numbered script
 * records that a concrete constructor can be silently dropped, while
 * `new Field({ name, type: "json" })` is verified against
 * `pb_data/types.d.ts` (`class Field` :441, `removeByName` :12473).
 */
migrate(
  (app) => {
    const nodes = app.findCollectionByNameOrId("nodes");
    for (const name of ["annotations", "timestampNotes", "icon", "cover"]) {
      nodes.fields.add(new Field({ name, type: "json" }));
    }
    app.save(nodes);
  },
  (app) => {
    const nodes = app.findCollectionByNameOrId("nodes");
    for (const name of ["annotations", "timestampNotes", "icon", "cover"]) {
      nodes.fields.removeByName(name);
    }
    app.save(nodes);
  },
);
