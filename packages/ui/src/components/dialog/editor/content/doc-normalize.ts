import type { TimestampNote } from "@workspace/interfaces";

/**
 * Shape compatibility helpers for node `content`.
 *
 * Pure functions: no React, no store, no writes. They only translate what a
 * record already holds into the shape the editors consume, so callers stay
 * tolerant of older records.
 */

/** A Tiptap JSON document — the shape `text` and `rich-text` docs both want. */
export interface NormalizedDoc {
  type: "doc";
  content: unknown[];
}

/** Wrap plain text into the one-paragraph Tiptap document. */
function paragraphDoc(text: string): NormalizedDoc {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

/**
 * Normalize a `docs` value into a Tiptap document.
 *
 * This is **lazy upgrade**: reading never writes to the database. A record that
 * still holds the old `text` shape (`{ content: "字符串" }`) or a bare string is
 * translated here, and the first edit through the node's writer persists the new
 * `{ type: "doc", content: [...] }` shape. No one-off migration script exists.
 *
 * M3 consumes this and may extend the target shape **in this file** as the
 * single-block editor needs more (`node-content-ui.md` §M3.2-1).
 *
 * Rules, in priority order:
 * 1. a non-empty string → one paragraph (an empty string → an empty document);
 * 2. an object with `type === "doc"` → itself (`content` defaults to `[]`);
 * 3. an object whose `content` is a non-empty string → one paragraph (the old
 *    shape); an empty one → an empty document;
 * 4. an object whose `content` is an array → `{ type: "doc", content }`;
 * 5. anything else (`undefined` / `null` / empty string / unrecognized) → an
 *    empty document.
 */
export function normalizeDoc(value: unknown): NormalizedDoc {
  if (typeof value === "string") {
    return value.length > 0
      ? paragraphDoc(value)
      : { type: "doc", content: [] };
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;

    if (record.type === "doc") {
      return {
        type: "doc",
        content: Array.isArray(record.content) ? record.content : [],
      };
    }

    if (typeof record.content === "string") {
      // An empty string is a real legacy shape (`text-node-content.tsx` wrote
      // `{ content: textareaValue }`), and it must NOT become a paragraph with
      // an empty text node: ProseMirror's `schema.text("")` throws
      // "Empty text nodes are not allowed", so the document has to stay empty.
      return record.content.length > 0
        ? paragraphDoc(record.content)
        : { type: "doc", content: [] };
    }

    if (Array.isArray(record.content)) {
      return { type: "doc", content: record.content };
    }
  }

  return { type: "doc", content: [] };
}

/**
 * Normalize a persisted `timestampNotes` value into usable notes.
 *
 * A non-array is warned about and reads as `[]`; a member that is not an object
 * or has no numeric `timeMs` is dropped with a warning (the backend stays
 * permissive — this tolerance is front-end only). `text` falls back to `""`,
 * and a missing `id` / `createdAt` / `updatedAt` gets a stable substitute so
 * every returned item is a complete {@link TimestampNote}. Order is preserved
 * and duplicates are kept — this only validates, it does not reconcile.
 */
export function normalizeNotes(value: unknown): TimestampNote[] {
  if (!Array.isArray(value)) {
    console.warn(
      "[doc-normalize] normalizeNotes expected an array, got:",
      value,
    );
    return [];
  }

  const notes: TimestampNote[] = [];

  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      console.warn(
        "[doc-normalize] Dropping a timestamp note that is not an object:",
        item,
      );
      continue;
    }

    const record = item as Record<string, unknown>;

    if (typeof record.timeMs !== "number") {
      console.warn(
        "[doc-normalize] Dropping a timestamp note without a numeric timeMs:",
        item,
      );
      continue;
    }

    const timeMs = record.timeMs;
    const now = new Date().toISOString();

    notes.push({
      id: typeof record.id === "string" ? record.id : `note-${timeMs}`,
      timeMs,
      text: typeof record.text === "string" ? record.text : "",
      createdAt: typeof record.createdAt === "string" ? record.createdAt : now,
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : now,
    });
  }

  return notes;
}
