import assert from "node:assert/strict";
import { test } from "node:test";
import { clearedNodeUpdates, emptyRichTextDocument } from "./node-content.ts";

test("clears the editable document of a text or rich-text node", () => {
  assert.deepEqual(clearedNodeUpdates({ nodeType: "text", content: {} }), {
    content: { docs: emptyRichTextDocument() },
  });
  assert.deepEqual(
    clearedNodeUpdates({
      nodeType: "rich-text",
      content: { referencedNodes: ["a", "b"], docs: { type: "doc" } },
    }),
    { content: { referencedNodes: [], docs: emptyRichTextDocument() } },
  );
});

test("clears the media link and the measurements that belong to it", () => {
  assert.deepEqual(
    clearedNodeUpdates({
      nodeType: "image",
      content: { url: "/api/files/files/x/a.png" },
    }),
    { content: { url: "" }, width: 0, height: 0, fileSize: 0 },
  );
  assert.deepEqual(
    clearedNodeUpdates({
      nodeType: "pdf",
      content: { url: "u", coverUrl: "c" },
    }),
    { content: { url: "", coverUrl: "" }, pageCount: 0, fileSize: 0 },
  );
  assert.deepEqual(
    clearedNodeUpdates({
      nodeType: "video",
      content: { url: "u", coverUrl: "c", hlsUrl: "h" },
    }),
    {
      content: { url: "", coverUrl: "", hlsUrl: "", timestamps: undefined },
      duration: 0,
      fileSize: 0,
    },
  );
  assert.deepEqual(
    clearedNodeUpdates({
      nodeType: "audio",
      content: { url: "u" },
    }),
    { content: { url: "", timestamps: undefined }, duration: 0, fileSize: 0 },
  );
});

test("keeps the user's timeline when the media link is cleared", () => {
  const timestamps = [{ type: "note", at: 3, text: "chapter" }];
  assert.deepEqual(
    clearedNodeUpdates({
      nodeType: "video",
      content: { url: "u", coverUrl: "", hlsUrl: "", timestamps },
    }),
    {
      content: { url: "", coverUrl: "", hlsUrl: "", timestamps },
      duration: 0,
      fileSize: 0,
    },
  );
});

test("clears the source of a webpage and the address of a website", () => {
  assert.deepEqual(
    clearedNodeUpdates({
      nodeType: "webpage",
      content: { code: "<p>hi</p>", language: "html" },
    }),
    { content: { code: "", language: "html" } },
  );
  assert.deepEqual(
    clearedNodeUpdates({
      nodeType: "website",
      content: { url: "https://example.com", faviconUrl: "f" },
    }),
    { content: { url: "" } },
  );
});

test("does not offer to clear a collection or a database", () => {
  assert.equal(
    clearedNodeUpdates({ nodeType: "collection", content: {} }),
    null,
  );
  assert.equal(clearedNodeUpdates({ nodeType: "database", content: {} }), null);
});
