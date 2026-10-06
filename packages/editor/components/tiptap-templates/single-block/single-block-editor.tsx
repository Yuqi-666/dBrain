"use client";

/**
 * The restricted **one-block** Tiptap editor behind a `text` node
 * (`docs/node-content/README.md` §1.1, plan `docs/plan/node-content-ui.md` M3).
 *
 * A `text` node is a single centered paragraph of rich text — a 禅意 block for a
 * quote, theorem or formula. Three layers keep it at one block, in descending
 * order of authority:
 *
 * 1. **The schema.** {@link SingleBlockDocument} declares `content: "paragraph"`,
 *    which is stricter than ProseMirror's default `block+`. Schema rejection is
 *    the only layer that also covers IME composition and drop/paste.
 * 2. **`transformPasted`** flattens a multi-block paste into one paragraph, so
 *    the schema never has to reject a whole paste (it would keep only the first
 *    block and silently drop the rest).
 * 3. **`handleKeyDown`** swallows `Enter` so no second paragraph is ever asked
 *    for — a look-and-feel guard, not a data-integrity one.
 *
 * `Esc` is deliberately **not** handled: it belongs to the surrounding Dialog.
 * There is no Yjs collaboration here, so `undoRedo` (disabled in the Notion
 * template because the collaboration extension owns history) stays on.
 *
 * The container styles (centering, type scale, whitespace) belong to the
 * **consumer** (`packages/ui`), per plan §M3.2-3: `packages/editor` is not in the
 * Tailwind `@source` list, so only structure and SCSS live here.
 */
import { Node as TiptapNode } from "@tiptap/core";
import type { Extensions, JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { TextAlign } from "@tiptap/extension-text-align";
import { Fragment, Slice } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { useEffect, useMemo, useRef, useState } from "react";
// Relative, not `@workspace/editor/…`: `packages/ui`'s tsconfig maps that alias to
// `../editor/src/*` (which does not exist) and therefore reports every such import
// as an unresolved module (42 of them are already in the regression baseline).
import { cn } from "../../../lib/tiptap-utils";
import "./single-block-editor.scss";

/**
 * The document node: exactly one paragraph, no `block+` escape hatch.
 *
 * Hand-written rather than `Document.extend(...)` because `@tiptap/extension-document`
 * is only a transitive dependency of `@tiptap/starter-kit` and is therefore not
 * resolvable from this package; this is the same `Node.create` body that package
 * uses (`name: "doc"`, `topNode: true`) with a tighter `content`.
 */
const SingleBlockDocument = TiptapNode.create({
  name: "doc",
  topNode: true,
  content: "paragraph",
});

/**
 * The one extension set both the editor and the read-only renderer use.
 *
 * Taste is fixed here on purpose: only inline marks survive (bold / italic /
 * strike / code / underline / link / colour are what `StarterKit` + the text
 * style kit give), every block-level node is off, `hardBreak` is off (soft
 * wrapping is the consumer's `white-space`), and `document` is replaced by
 * {@link SingleBlockDocument}.
 */
export function createSingleBlockExtensions(placeholder?: string): Extensions {
  const extensions: Extensions = [
    StarterKit.configure({
      document: false,
      blockquote: false,
      bulletList: false,
      codeBlock: false,
      dropcursor: false,
      gapcursor: false,
      hardBreak: false,
      heading: false,
      horizontalRule: false,
      listItem: false,
      listKeymap: false,
      orderedList: false,
      trailingNode: false,
      link: { openOnClick: false },
    }),
    SingleBlockDocument,
    TextAlign.configure({ types: ["paragraph"] }),
  ];

  if (placeholder !== undefined) {
    extensions.push(
      Placeholder.configure({ placeholder, emptyNodeClass: "is-empty" }),
    );
  }

  return extensions;
}

/**
 * A stored `docs` value → the `content` option `useEditor` accepts.
 *
 * {@link SingleBlockDocument} rejects `{ type: "doc", content: [] }`, so an empty
 * (or unrecognized) stored value must become `undefined` — that is what makes
 * Tiptap build its own default empty document.
 */
export function toSingleBlockContent(value: unknown): JSONContent | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as { type?: unknown; content?: unknown };
  if (record.type !== "doc") return undefined;
  if (!Array.isArray(record.content) || record.content.length === 0) {
    return undefined;
  }
  return value as JSONContent;
}

/** True for the IME "confirm" `Enter`, which must reach the composition. */
function isComposingEnter(event: KeyboardEvent): boolean {
  return event.isComposing || event.keyCode === 229;
}

/**
 * Collapse a multi-block paste into one paragraph.
 *
 * Marks are dropped **only** on this path: a paste that fits the schema (a single
 * paragraph, or an inline fragment) passes through untouched, so bold/italic
 * survive a normal paste. Blocks are joined with `\n` inside one text node, which
 * the SCSS renders through `white-space: pre-wrap` — the design's "压平成一段（不落
 * `hardBreak`）".
 */
function flattenPastedSlice(slice: Slice, view: EditorView): Slice {
  const blocks = slice.content.content;
  if (blocks.length <= 1) return slice;

  const paragraphType = view.state.schema.nodes.paragraph;
  if (!paragraphType) return slice;

  const text = blocks
    .map((block) => block.textContent)
    .filter((part) => part.length > 0)
    .join("\n");

  return new Slice(
    Fragment.from(
      paragraphType.create(
        null,
        text.length > 0 ? view.state.schema.text(text) : null,
      ),
    ),
    0,
    0,
  );
}

export interface SingleBlockEditorProps {
  /**
   * The stored document, normally `normalizeDoc(node.content.docs)`. It seeds the
   * editor once — the editor is uncontrolled afterwards, and the caller persists
   * through {@link SingleBlockEditorProps.onContentChange}.
   */
  initialContent?: unknown;
  /** Called with the whole document after every change. */
  onContentChange?: (doc: JSONContent) => void;
  placeholder?: string;
  /** Applied to the element that wraps `EditorContent`; the caller sizes it. */
  className?: string;
}

/**
 * The single-block editor. Uncontrolled by design: it takes the stored document
 * once (the caller remounts it with `key` when the node changes) and reports every
 * new document through `onContentChange`.
 */
export function SingleBlockEditor({
  initialContent,
  onContentChange,
  placeholder = "写下这句话…",
  className,
}: SingleBlockEditorProps) {
  // Lazy `useState`, not `useRef`: the seed has to be read once, and reading a ref
  // during render is what `react-hooks/refs` forbids.
  const [initialDoc] = useState(() => toSingleBlockContent(initialContent));
  const changeHandler = useRef(onContentChange);
  useEffect(() => {
    changeHandler.current = onContentChange;
  }, [onContentChange]);

  const extensions = useMemo(
    () => createSingleBlockExtensions(placeholder),
    [placeholder],
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      // `null` (not `undefined`) is Tiptap's "no content" value; it builds the
      // default empty document.
      content: initialDoc ?? null,
      editorProps: {
        attributes: { class: "single-block-editor" },
        handleKeyDown: (_view, event) => {
          if (event.key !== "Enter") return false;
          if (isComposingEnter(event)) return false;
          // Enter / Shift-Enter / Mod-Enter all stay inside the one block.
          return true;
        },
        transformPasted: (slice, view) => flattenPastedSlice(slice, view),
      },
      onUpdate: ({ editor: instance }) => {
        changeHandler.current?.(instance.getJSON());
      },
      extensions,
    },
    [],
  );

  if (!editor) {
    return (
      <div className={cn("flex flex-col", className)} aria-hidden="true" />
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <EditorContent
        editor={editor}
        className="single-block-editor-content"
      />
    </div>
  );
}
