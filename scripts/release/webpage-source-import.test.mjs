import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

/**
 * The source-file import of a `webpage` node.
 *
 * Issue #67 was "click 导入文件 → click the zone → click 本地上传 → nothing
 * happens". The click path cannot be exercised here (it needs a browser and a
 * native file chooser), so this test pins the three properties that made it
 * fail silently and that a future change could undo:
 *
 * 1. **The file input is rendered.** WebKit ignores a scripted click on a file
 *    input with `display: none`; the input must be hidden off-screen instead.
 * 2. **The trigger is a `<label>` bound to that input.** Native activation
 *    opens the picker in every engine; no scripted `input.click()` is needed.
 *    The menu must stay mounted until the input's own click, because removing
 *    the label during the click cancels the picker (Chromium).
 * 3. **Every rejection is visible.** The zone reports the reason inline and the
 *    host raises a toast, so a filtered / oversized / empty file or a failed
 *    node write is no longer indistinguishable from a dead click.
 */

const root = new URL("../../", import.meta.url);
const menu = readFileSync(
  new URL("packages/ui/src/components/menu/upload-menu.tsx", root),
  "utf8",
);
const dropZone = readFileSync(
  new URL(
    "packages/ui/src/components/node-content/file-drop-zone.tsx",
    root,
  ),
  "utf8",
);
const webpage = readFileSync(
  new URL(
    "packages/ui/src/components/node-content/webpage-node-content.tsx",
    root,
  ),
  "utf8",
);

function fileInputBlock() {
  const match = menu.match(/<Input\b[\s\S]*?type="file"[\s\S]*?\/>/);
  assert.ok(match, "UploadMenu renders an <Input type=\"file\">");
  return match[0];
}

test("the file input stays rendered so a hidden-input picker is allowed", () => {
  const input = fileInputBlock();
  assert.doesNotMatch(
    input,
    /className="hidden"/,
    "display:none makes WebKit ignore the file picker",
  );
  assert.match(input, /className="[^"]*opacity-0[^"]*"/);
  assert.match(input, /id=\{fileInputId\}/);
});

test("本地上传 is a label bound to the file input", () => {
  const trigger = menu.match(/<MenuItemLabel\b[^>]*>/);
  assert.ok(trigger, "the local-upload entry is a MenuItemLabel");
  assert.match(trigger[0], /htmlFor=\{fileInputId\}/);
  // Dismissing the menu from the label's own click removes the label while the
  // activation is still in flight, and Chromium then cancels the picker. The
  // menu is closed from the input's click instead.
  assert.doesNotMatch(trigger[0], /onClick=/);
});

test("the import zone reports failures inline and to the host", () => {
  assert.match(dropZone, /role="alert"/);
  assert.match(dropZone, /const reportImportError = \(message: string\) => \{[\s\S]*?setError\(message\);[\s\S]*?onUploadError\?\./);
  // The type check, the size cap and the read/write try block all report.
  const reports = dropZone.match(/reportImportError\(/g) ?? [];
  assert.ok(reports.length >= 3, "every rejection path reports the reason");
});

test("the webpage host turns an import failure into a toast", () => {
  assert.match(
    webpage,
    /onUploadError=\{\(error\) => \{[\s\S]*?toast\(\{[\s\S]*?variant: "destructive"/,
  );
  // The picker's accept list must keep covering the HTML spellings.
  for (const pattern of ['".html"', '".htm"', '".xhtml"', '"text/*"']) {
    assert.ok(webpage.includes(pattern), `source accept keeps ${pattern}`);
  }
});
