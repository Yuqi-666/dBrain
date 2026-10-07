/// <reference path="../pb_data/types.d.ts" />
/**
 * Fold `timestampNotes` + `subtitles` into one `timestamps` column.
 *
 * A media node's timeline used to be two JSON columns holding two shapes
 * (`TimestampNote[]` with `{ id, timeMs, doc, createdAt, updatedAt }` and
 * `SubtitleCue[]` with `{ startMs, endMs, text }`). They are one column of one
 * discriminated shape now — `TimestampData` = `{ type: "note", timeMs,
 * content, … } | { type: "subtitle", timeMs, endMs?, content }` — so this
 * migration is the one place the old bytes have to be rewritten.
 *
 * A **new filename** is mandatory: PocketBase de-duplicates migrations by
 * filename only, so editing `1700000001_node_extras.js` (which added
 * `timestampNotes`) or `1700000002_node_subtitles.js` (which added `subtitles`)
 * would do nothing on an existing `pb_data` — and both of those have already
 * run here. This one is picked up on the next boot and needs no rebuild.
 *
 * The conversion is **explicit field mapping, not a byte copy**: the database
 * holds notes written by two generations of the app (`doc` documents and the
 * older `text` strings), and either one is an ordinary record, not an edge case.
 * Mapping here means the column holds the one shape from the moment this
 * finishes, instead of waiting for the frontend's lazy upgrade
 * (`normalizeTimestamps`) to rewrite it on the user's first gesture.
 *
 * `down` maps back, so a revert leaves two columns the previous build can read.
 *
 * **The one PocketBase quirk this has to bridge.** A `json` column read with
 * `record.get(name)` comes back as the value's raw UTF-8 **bytes** (goja exposes
 * a Go byte slice as an array of numbers — `JSON.stringify` of it reads
 * `[91,123,…]`), which is useless for field mapping. `record.getString(name)`
 * returns the same payload as text, decoded once by the Go side, so
 * `JSON.parse` of it is the way in; a `null` column reads as `""` and therefore
 * as "no items". (Raw SQL is not an option: `app.db().newQuery(...).all()`
 * panics with `Invalid variable type: must be a pointer`.)
 *
 * Migration ordering note: `1700000001` still adds `timestampNotes` on a
 * database built from scratch, and this file then folds it away. That is the
 * price of never touching an applied migration; the end state is identical.
 */

/** The JSON array a `json` column holds, or `[]` when it is null / unusable. */
function readJsonArray(record, field) {
  const text = record.getString(field);
  if (!text) return [];
  try {
    const value = JSON.parse(text);
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.warn("[timestamps migration] unreadable " + field + ":", error);
    return [];
  }
}

migrate(
  (app) => {
    const nodes = app.findCollectionByNameOrId("nodes");
    nodes.fields.add(new Field({ name: "timestamps", type: "json" }));
    app.save(nodes);

    for (const record of app.findAllRecords("nodes")) {
      const stamp = new Date().toISOString();
      const items = [];

      // The retired notes column. `doc` is the current body, `text` the M6 one;
      // either is `content` now.
      const notes = readJsonArray(record, "timestampNotes");
      for (let index = 0; index < notes.length; index += 1) {
        const note = notes[index];
        if (!note || typeof note !== "object") continue;
        if (typeof note.timeMs !== "number") continue;
        let body = "";
        if (note.content !== undefined && note.content !== null) {
          body = note.content;
        } else if (note.doc !== undefined && note.doc !== null) {
          body = note.doc;
        } else if (typeof note.text === "string") {
          body = note.text;
        }
        items.push({
          id:
            typeof note.id === "string"
              ? note.id
              : "note_" + note.timeMs + "_" + index,
          type: "note",
          timeMs: note.timeMs,
          content: body,
          createdAt:
            typeof note.createdAt === "string" ? note.createdAt : stamp,
          updatedAt:
            typeof note.updatedAt === "string" ? note.updatedAt : stamp,
        });
      }

      // The retired transcript column. A cue's span is optional in the unified
      // shape; `startMs` becomes the one `timeMs`.
      const cues = readJsonArray(record, "subtitles");
      for (const cue of cues) {
        if (!cue || typeof cue !== "object") continue;
        if (typeof cue.startMs !== "number") continue;
        const item = {
          type: "subtitle",
          timeMs: cue.startMs,
          content: typeof cue.text === "string" ? cue.text : "",
        };
        if (typeof cue.endMs === "number") item.endMs = cue.endMs;
        items.push(item);
      }

      // Untouched records keep `null` rather than gaining an empty array: a node
      // with no timeline is the normal case (`timestampNotes` was `null` on
      // most records), and "absent" is what the mapper reads as `undefined`.
      if (items.length > 0) {
        record.set("timestamps", items);
        app.save(record);
      }
    }

    const after = app.findCollectionByNameOrId("nodes");
    after.fields.removeByName("timestampNotes");
    after.fields.removeByName("subtitles");
    app.save(after);
  },
  (app) => {
    const nodes = app.findCollectionByNameOrId("nodes");
    nodes.fields.add(new Field({ name: "timestampNotes", type: "json" }));
    nodes.fields.add(new Field({ name: "subtitles", type: "json" }));
    app.save(nodes);

    for (const record of app.findAllRecords("nodes")) {
      const items = readJsonArray(record, "timestamps");
      const notes = [];
      const cues = [];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        if (typeof item.timeMs !== "number") continue;
        if (item.type === "subtitle") {
          cues.push({
            startMs: item.timeMs,
            endMs: typeof item.endMs === "number" ? item.endMs : item.timeMs,
            text: typeof item.content === "string" ? item.content : "",
          });
        } else {
          // A text body goes back under `text` and a document under `doc`,
          // which is where each generation of the old reader looks for it: the
          // M6 reader only understood `text`, and putting a string in `doc`
          // would read back as an empty note.
          const legacy = {
            id: typeof item.id === "string" ? item.id : "note_" + item.timeMs,
            timeMs: item.timeMs,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          };
          if (typeof item.content === "string") legacy.text = item.content;
          else legacy.doc = item.content;
          notes.push(legacy);
        }
      }

      record.set("timestampNotes", notes);
      record.set("subtitles", cues);
      app.save(record);
    }

    const after = app.findCollectionByNameOrId("nodes");
    after.fields.removeByName("timestamps");
    app.save(after);
  },
);
