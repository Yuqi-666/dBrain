/**
 * The JSON ceiling of the `nodes.content` field.
 *
 * A `webpage` node keeps its whole HTML source in that JSON field. PocketBase
 * caps a JSON field at 1 MiB when the field sets no size, so a source the
 * storage policy accepts (the web page category defaults to 16 MiB) made the
 * node update fail with "The maximum allowed JSON size is 1048576 bytes" and the
 * editor showed a failed import. The base schema and the change migration raise
 * the ceiling, and this test keeps both equal to the shared constant.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { NODE_CONTENT_MAX_BYTES } from "../../packages/utils/src/node-content.ts";

const root = new URL("../../", import.meta.url);
const base = readFileSync(
  new URL("pb/pb_migrations_base/0000000001_base_schema.js", root),
  "utf8",
);
const change = readFileSync(
  new URL("pb/pb_migrations_changes/0000000006_node_content_size.js", root),
  "utf8",
);

/** Reads the `N * 1024 * 1024` expression that follows `anchor`. */
function limitAfter(source, anchor) {
  const match = new RegExp(`${anchor}[\\s\\S]{0,200}?(\\d+) \\* 1024 \\* 1024`).exec(
    source,
  );
  assert.ok(match, `a mebibyte expression follows ${anchor}`);
  return Number(match[1]) * 1024 * 1024;
}

test("the shared constant covers a web page at the default file limit", () => {
  assert.equal(NODE_CONTENT_MAX_BYTES, 24 * 1024 * 1024);
  // The default web page category accepts 16 MiB, and the JSON escaping of a
  // source adds a little: the raised ceiling must stay above it with headroom.
  assert.ok(
    NODE_CONTENT_MAX_BYTES >= 16 * 1024 * 1024 * 1.25,
    "the node content ceiling leaves headroom over the 16 MiB source limit",
  );
});

test("the base schema raises the content field ceiling", () => {
  const block =
    /name: "content",\s*\n\s*type: "json",\s*\n\s*maxSize: [\d\s*]+/.exec(base);
  assert.ok(block, "nodes.content declares a JSON size");
  assert.equal(
    limitAfter(block[0], "maxSize:"),
    NODE_CONTENT_MAX_BYTES,
    "the fresh-database schema uses NODE_CONTENT_MAX_BYTES",
  );
});

test("the change migration raises the ceiling and a rollback restores the default", () => {
  assert.equal(
    limitAfter(change, "const NODE_CONTENT_MAX_BYTES ="),
    NODE_CONTENT_MAX_BYTES,
    "the migration value is NODE_CONTENT_MAX_BYTES",
  );
  assert.match(
    change,
    /fields\.getByName\("content"\)\.maxSize = NODE_CONTENT_MAX_BYTES/,
    "the up path writes the raised ceiling",
  );
  assert.match(
    change,
    /fields\.getByName\("content"\)\.maxSize = 0/,
    "the down path returns to the PocketBase default",
  );
});
