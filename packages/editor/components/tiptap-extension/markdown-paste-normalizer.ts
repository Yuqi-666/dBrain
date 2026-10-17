import type { JSONContent } from "@tiptap/core";

/**
 * Normalisation for Markdown pasted through `editor.markdown.parse`.
 *
 * Two upstream behaviours break a paste of ordinary prose, and both are fixed
 * here rather than by changing the upstream parser:
 *
 * 1. **A single `~` is a strikethrough.** `marked`'s GFM `del` tokenizer
 *    accepts one *or* two tildes, so a range such as `0~9 … 10~15` parses into
 *    a `<del>` that runs between the two tildes. GFM defines strikethrough as
 *    `~~text~~`; a lone `~` is content. The tilde is therefore hidden behind a
 *    sentinel before parsing and put back afterwards, which keeps every use of
 *    a lone tilde (ranges, file names, code spans, link targets) literal while
 *    `~~text~~` still becomes a strike mark.
 * 2. **Nested emphasis duplicates a mark.** CommonMark's flanking rules let
 *    `…**（Decimal）**和**（Hexadecimal）**` come out as nested `<strong>`
 *    elements around the text between them. Tiptap maps each strong to a
 *    `bold` mark, and ProseMirror requires at most one mark of a type per text
 *    node; `insertContent` then throws
 *    `RangeError: Invalid collection of marks for node text: bold,bold`.
 *    Duplicate marks are collapsed here, before the JSON reaches the editor.
 */

/**
 * Sentinel that stands in for a lone tilde while `marked` parses.
 *
 * NUL-wrapped so it cannot collide with anything a user would paste, and
 * restored before the JSON reaches ProseMirror, so it never reaches the DOM.
 */
const LONE_TILDE_SENTINEL = "\u0000dsh-lone-tilde\u0000";

/**
 * Replaces every tilde that is not part of a `~~` pair with the sentinel.
 *
 * Only *runs* of one tilde are replaced; a longer run (`~~~` fence) is left to
 * Markdown, which is also why the pattern is anchored between non-tilde
 * characters rather than counting the run.
 */
export function protectLoneTildes(markdown: string): string {
  return markdown.replace(/(?<!~)~(?!~)/g, LONE_TILDE_SENTINEL);
}

/** Restores the sentinel in any string the parsed document carries. */
function restoreInValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.split(LONE_TILDE_SENTINEL).join("~");
  }
  if (Array.isArray(value)) {
    return value.map(restoreInValue);
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      record[key] = restoreInValue(record[key]);
    }
    return record;
  }
  return value;
}

/**
 * Collapses marks that repeat a type on one node.
 *
 * ProseMirror's mark set is a `Mark[]` with one entry per type; a second `bold`
 * makes `insertContent` reject the whole document.
 */
function dedupeMarks(node: JSONContent): void {
  if (Array.isArray(node.marks) && node.marks.length > 1) {
    const seen = new Set<string>();
    node.marks = node.marks.filter((mark) => {
      const type = mark.type;
      if (!type || seen.has(type)) return false;
      seen.add(type);
      return true;
    });
  }
  node.content?.forEach(dedupeMarks);
}

/**
 * Makes a freshly parsed Markdown document safe to `insertContent`.
 *
 * Mutates the document in place — the manager hands back a fresh value, so a
 * copy would buy nothing.
 */
export function normalizePastedMarkdown(doc: JSONContent): JSONContent {
  restoreInValue(doc);
  dedupeMarks(doc);
  return doc;
}
