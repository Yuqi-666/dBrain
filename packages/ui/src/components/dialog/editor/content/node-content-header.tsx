"use client";

/**
 * The shared page header of a node whose content carries its own title block —
 * today only `rich-text` (`docs/node-content/README.md` §1.6/§2, plan
 * `docs/plan/node-content-ui.md` §M3.1 第 5 行).
 *
 * Five elements, top to bottom, all fed by **top-level** node fields:
 *
 * | # | element       | field                 |
 * | - | ------------- | --------------------- |
 * | 1 | cover         | `NodeBase.cover`      |
 * | 2 | icon          | `NodeBase.icon`       |
 * | 3 | title         | `NodeBase.title`      |
 * | 4 | summary       | `NodeBase.abstract`   |
 * | 5 | type • semantic | `NodeBase.nodeType` + `NodeBase.semanticId` |
 *
 * **The layout is the reference page's, not a stack of centred rows** (G3 追加交付
 * 二，2026-10-06). Two things carry it, and both are relationships rather than
 * sizes:
 *
 * ```
 *   ┌──────────────────── pane (the editor's own box) ────────────────────┐
 *   │                            cover                                    │  ← element 1:
 *   │   ┌──────────┐                                                      │    full-bleed,
 *   └───┤   icon   ├──────────────────────────────────────────────────────┘    rounded,
 *       └──────────┘  ← element 2 straddles the cover's **bottom edge**
 *        │  title
 *        │  summary
 *        └  type • semantic
 *        ↑ the 708px content column (the same one the body's grid produces)
 * ```
 *
 * 1. **The cover leaves the text column.** Only element 1 is outside it: the
 *    cover spans the whole pane, so it is wider than the column by both 3rem
 *    paddings and both auto margins. That is why the host no longer wraps this
 *    component in `mx-auto max-w-[708px] px-12` — the column is drawn *here*, and
 *    the cover is simply not in it.
 * 2. **The icon sits on its own row, over the cover's lower edge.** The row is a
 *    fixed-height box (`h-10`) with `items-end`, pulled up by a negative margin;
 *    the plate is bottom-aligned inside it, so *any* plate size ends the same
 *    distance below the cover's edge. Nothing is absolutely positioned and no
 *    size is hard-coded into the geometry: {@link NODE_ICON_PLATE} decides how
 *    big the plate is, this file decides where its bottom edge lands.
 *
 * **3–5 are a typographic scale, and the gaps follow it** (G4 修订，量图重排). The
 * reference page's own numbers, read off the plate (219px over a `size-20`=80px
 * plate ⇒ its CSS px are 2.406 of a screenshot pixel) and carried over by the
 * title: title ≈ 32.6px, summary ≈ 16.0px, meta label ≈ 12.7px — i.e.
 * **0.49 and 0.39 of the title**, which on this repo's `text-4xl` (36px) title is
 * `text-lg` (18px) and `text-sm` (14px). The vertical rhythm is set by the same
 * measurement, in *baselines below the cover's bottom edge* — the one ruler that
 * does not move when the cover does:
 *
 * | element | baseline (reference ×1.09) | what lands it there |
 * | ------- | -------------------------- | ------------------- |
 * | title   | ~73px                      | band's bottom (+16) + `mt-6` |
 * | summary | ~107px                     | `mt-1.5` under the title's 40px line box |
 * | meta    | ~137px                     | `mt-1.5` under the summary's 28px line box |
 *
 * Both text fields therefore run `py-0` and the column is **gap-less**: the old
 * `gap-4` (16px) plus the field's own `py-1` and half-leading put ~33px of air
 * between the title and the summary, where the reference has ~14px of ink gap.
 *
 * The two fields the user types into are {@link useEchoSafeText}, not plain
 * controlled inputs: `patchNode` echoes through a queued writer, so a controlled
 * value put the caret back at the end of the line on every keystroke.
 *
 * The body below element 5 is **not** this component's business: it writes
 * `content`, and it goes through the same queue as `patchNode`, which the host
 * owns. This component never writes `content` — the point of the split is that
 * changing an icon can never roll the正文 back a frame (§2 纪律 ①).
 *
 * It deliberately does not read the *node* from the store: `node` is a prop and
 * every write to it goes through `patchNode`. The one store read is `nodeSemantics`,
 * the semantic **catalogue** element 5 renders from — the same read `preview-header.tsx`
 * does, and not a node lookup. Element 5's dropdown body is the shared
 * `SemanticList`, which reads that same catalogue (and can open the global
 * 「新建语义」 dialog); picking a row comes back as `patchNode({ semanticId })`, so the
 * node is still only written by the host's drain.
 *
 * The two selectors are injected (`renderCoverSelector` / `renderIconSelector`), so
 * this header stays a leaf of the node type it decorates. The injected node *is*
 * the trigger; because it receives `node`, it draws the empty state itself (a
 * compact 「添加封面」 button) — the header only decides where the entry sits.
 * {@link NODE_ICON_PLATE} is exported for exactly one reason: the injected
 * icon trigger and the `fallback` box below are two drawings of the same plate,
 * and an unshared size would make them drift apart.
 */
import { useDataStore } from "@workspace/store";
import type { NodeCover, NodeData, NodeIcon } from "@workspace/interfaces";
import { Input } from "@workspace/ui/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { SemanticList } from "@workspace/ui/components/menu/node/semantic-list";
import { NODE_TYPE_LABELS } from "@workspace/ui/components/menu/node/dataType-list";
import { NodeIconView } from "@workspace/ui/components/node-media/node-icon-view";
import { NODE_TYPE_ICONS } from "@workspace/ui/components/node-media/node-type-icons";
import { cn } from "@workspace/ui/lib/utils";
import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

/**
 * The box a node's icon draws in — the icon trigger's plate in
 * `rich-text-node-content.tsx` and the `fallback` plate below must be the same
 * box, so both ask these constants instead of spelling classes twice.
 *
 * **One size for every icon kind** (G3 追加交付 二 r1): the page-header plate is
 * the reference page's, and the reference draws its icon at one size whatever it
 * is. An emoji is text (`text-5xl` = 48px in an 80px plate) and an image fills
 * the box, so the Lucide branch is the only one that needs telling — it gets
 * {@link NODE_ICON_GLYPH} through `NodeIconView`'s `glyphClassName`, which is a
 * share of the box rather than that component's 16px small-box default.
 * `bg-background` is the point of the plate: it is the page colour showing
 * through the cover, which is what lifts the icon off it.
 */
export const NODE_ICON_PLATE = "size-20 rounded-lg bg-background text-5xl";

/** A Lucide glyph's share of {@link NODE_ICON_PLATE} (48px of the 80px plate). */
export const NODE_ICON_GLYPH = "size-3/5";

/** The node-type glyph that stands in for a missing icon, sized to the plate. */
export const NODE_ICON_FALLBACK = "size-12";

/**
 * The semantic capsule: one shape for the read-only pill and the trigger, and
 * **no size of its own** — the reference's "Page • Tag" draws both halves of the
 * meta line at one size, so the pill takes the line's `text-sm`. It used to
 * carry `text-[11px]` inside a `text-xs` line; once that line is 14px, a hard
 * 11px would make the semantic the smallest text in the row.
 */
const SEMANTIC_PILL =
  "inline-flex w-fit items-center rounded-full px-2 py-0.5 font-medium";

/**
 * The capsule's own colours — a tint of the category colour with the colour as
 * the text (`preview-header.tsx:43-60`'s rule), or nothing at all when the
 * category has none. Radix merges its trigger props into the same element, so
 * the two states have to come from one function.
 */
function pillStyle(color?: string) {
  return {
    backgroundColor: color ? `${color}20` : undefined,
    color: color || undefined,
  };
}

/**
 * A controlled text field that cannot lose its caret to its own echo.
 *
 * `patchNode` is **not** a synchronous store write: the host's writer queues the
 * patch and drains it in a microtask (`use-node-content-writer.ts:127-138`), so at
 * the end of a keystroke's event the `node` prop still carries the *previous*
 * text. React's controlled-input bookkeeping runs right after that event, sees
 * the DOM disagree with the prop and writes the old text back — which parks the
 * caret at the end of the line. Typing in the middle of the title therefore
 * jumped to the tail on every keystroke (adding a character looked like it was
 * appended, and the next one landed there too).
 *
 * Holding a draft updated in the same tick as the keystroke makes the rendered
 * value agree with the DOM value when React checks them, so nothing is written
 * back and the caret stays where the user put it. Store writes caused by this
 * field itself are expected — they are matched against the queue below and leave
 * the draft alone; a value it never emitted is an outside edit (the attributes
 * sidebar, a remote sync) and **is** adopted, which is what keeps the header and
 * the sidebar showing the same `title` / `abstract` in both directions
 * (`docs/plan/node-content-ui.md` 第 5 条).
 *
 * @param value  the live store value, i.e. this render's `node.title` / `node.abstract`
 * @param commit the host's patch entry point, called on every keystroke
 */
function useEchoSafeText(value: string, commit: (next: string) => void) {
  const [draft, setDraft] = useState(value);
  /** Values emitted here that the store has not echoed back yet, oldest first. */
  const pending = useRef<string[]>([]);
  /** The last store value this field has looked at. */
  const seen = useRef(value);

  if (value !== seen.current) {
    seen.current = value;
    // One drain can merge several keystrokes and jump straight to the newest
    // value, so the echo is matched anywhere in the queue, not just at its head.
    const echo = pending.current.lastIndexOf(value);
    if (echo === -1) {
      pending.current.length = 0;
      setDraft(value);
    } else {
      pending.current.splice(0, echo + 1);
    }
  }

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      pending.current.push(next);
      setDraft(next);
      commit(next);
    },
    [commit],
  );

  return [draft, onChange] as const;
}

export interface NodeContentHeaderProps {
  /** The live node; the host re-renders it from the store. */
  node: NodeData;
  /**
   * Write top-level fields through the host's shared drain. `null` is the explicit
   * 「清空」 sentinel for `icon` / `cover` (R29-定).
   */
  patchNode: (
    patch: Partial<
      Pick<NodeData, "title" | "abstract" | "semanticId" | "icon" | "cover">
    >,
  ) => void;
  /** The cover entry point; it receives the pick callback it must call. */
  renderCoverSelector?: (props: {
    node: NodeData;
    onPick: (cover: NodeCover | null) => void;
  }) => ReactNode;
  /** The icon entry point; it receives the pick callback it must call. */
  renderIconSelector?: (props: {
    node: NodeData;
    onPick: (icon: NodeIcon | null) => void;
  }) => ReactNode;
  /** Renders static text instead of inputs and drops both selector entries. */
  readOnly?: boolean;
  className?: string;
}

export function NodeContentHeader({
  node,
  patchNode,
  renderCoverSelector,
  renderIconSelector,
  readOnly = false,
  className,
}: NodeContentHeaderProps) {
  const nodeSemantics = useDataStore((state) => state.nodeSemantics);
  const semantic = nodeSemantics.get(node.semanticId);
  const TypeIcon = NODE_TYPE_ICONS[node.nodeType];
  const typeLabel = NODE_TYPE_LABELS[node.nodeType] ?? node.nodeType;
  const hasCover = node.cover != null;

  // The two fields the user types into directly. Both keep a local draft so the
  // store's echo cannot move the caret (`useEchoSafeText` above).
  const [title, onTitleChange] = useEchoSafeText(node.title, (next) =>
    patchNode({ title: next }),
  );
  const [summary, onSummaryChange] = useEchoSafeText(
    node.abstract ?? "",
    (next) => patchNode({ abstract: next }),
  );

  const iconEntry = readOnly
    ? undefined
    : renderIconSelector?.({
        node,
        onPick: (next) => patchNode({ icon: next }),
      });

  const coverEntry = readOnly
    ? undefined
    : renderCoverSelector?.({
        node,
        onPick: (next) => patchNode({ cover: next }),
      });

  return (
    // `min-h-full` / scrolling belong to the host; this is only the page's two
    // bands: the full-bleed cover, then the centred text column.
    <div className={cn("flex flex-col", className)}>
      {/* 1 — cover. The one element outside the column, and the reason this
          component is not wrapped in one. An empty cover draws no block (nc §2):
          the host's entry is then the compact 「添加封面」 button, aligned to the
          right of the title row. */}
      {hasCover && coverEntry}

      {/* The text column: 708px centred with 3rem of padding — the numbers the
          body's own grid produces (`notion-like-editor.scss:66-67`, `:103`), so
          the title below lines up with the first paragraph. Without a cover the
          column needs the pane's top padding itself; with one, the cover is
          already the top. */}
      <div
        className={cn(
          "mx-auto w-full max-w-[708px] px-12",
          !hasCover && "pt-6",
        )}
      >
        <div className="flex flex-col">
          {/* 2 — icon. Its own row, bottom-aligned inside a 40px band that is
              pulled 24px up, so the plate's bottom edge lands 16px below the
              cover's: `items-end` keeps that edge put whatever the plate's
              height is, and the negative margin only has to place the band's
              **bottom**, not the plate's. The plate therefore overflows the
              band's top into the cover — 64px of an 80px plate for an emoji,
              exactly the reference's "icon sits in the cover's lower quarter".
              Nothing clips (the host's scroller is the only `overflow` box, and
              it ends far below). */}
          <div className={cn("flex", hasCover && "-mt-6 h-10 items-end")}>
            {iconEntry ?? (
              <span
                className={cn(
                  "flex items-center justify-center text-muted-foreground",
                  NODE_ICON_PLATE,
                )}
              >
                <NodeIconView
                  icon={node.icon ?? undefined}
                  fallback={<TypeIcon className={NODE_ICON_FALLBACK} />}
                  className={NODE_ICON_PLATE}
                  glyphClassName={NODE_ICON_GLYPH}
                />
              </span>
            )}
          </div>

          {/* 3 — title, with the empty-cover entry pinned to its right end. */}
          <div className="mt-6 flex items-center gap-2">
            {readOnly ? (
              <h1 className="min-w-0 flex-1 truncate text-4xl font-semibold">
                {node.title}
              </h1>
            ) : (
              <Input
                value={title}
                onChange={onTitleChange}
                placeholder="未命名页面"
                aria-label="节点标题"
                // `text-4xl` alone loses to the `Input` base's `md:text-sm` (a
                // media-query rule of the same specificity, emitted later), so
                // the page title rendered at 14px from `md` up — the one class
                // pair that must stay in step is `text-4xl md:text-4xl`
                // (tailwind-merge then drops the base's `md:text-sm`). `py-0` /
                // `dark:bg-transparent` strip the rest of the field chrome: this
                // is a page title, not a form control.
                className="h-auto min-w-0 flex-1 border-none bg-transparent px-0 py-0 text-4xl font-semibold shadow-none focus-visible:ring-0 md:text-4xl dark:bg-transparent"
              />
            )}
            {!hasCover && coverEntry}
          </div>

          {/* 4 — summary. One step under the title (`text-lg`, the reference's
              ~0.5 × title), not the input default: the reference's summary is
              plainly larger than the meta line below it. */}
          {readOnly ? (
            node.abstract ? (
              <p className="mt-1.5 text-lg text-muted-foreground">
                {node.abstract}
              </p>
            ) : null
          ) : (
            <Input
              value={summary}
              onChange={onSummaryChange}
              placeholder="添加摘要…"
              aria-label="节点摘要"
              // Same `md:` pair rule as the title: the `Input` base's
              // `md:text-sm` would otherwise beat `text-lg`.
              className="mt-1.5 h-auto border-none bg-transparent px-0 py-0 text-lg text-muted-foreground shadow-none focus-visible:ring-0 md:text-lg dark:bg-transparent"
            />
          )}

          {/* 5 — meta: the node's type and its semantic on one muted line, the
              reference page's "Page • Tag". The type label is the shared
              `NODE_TYPE_LABELS` table (a second copy would drift the way the
              icon table once did, §M2.2-3); the semantic half keeps
              `preview-header.tsx:43-60`'s coloured pill — the colour is the
              category's own (sel §4), not decoration this line may drop — and is
              now the **switch** for it (G3 追加交付 二 r2): a dropdown trigger that
              writes `semanticId`. Its body is the shared `SemanticList` (search +
              catalogue + 「Add new type」), the same menu the attributes sidebar
              opens, so the two entries can never disagree about what a semantic
              is; the write still goes through the host's `patchNode` drain. */}
          <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{typeLabel}</span>
            {semantic && <span aria-hidden>•</span>}
            {readOnly ? (
              semantic ? (
                <span
                  className={SEMANTIC_PILL}
                  style={pillStyle(semantic.color)}
                >
                  {semantic.name}
                </span>
              ) : null
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      SEMANTIC_PILL,
                      "cursor-pointer transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    )}
                    style={pillStyle(semantic?.color)}
                    aria-label={semantic ? "切换语义" : "选择语义"}
                  >
                    {semantic ? (
                      semantic.name
                    ) : (
                      <span className="text-muted-foreground">选择语义</span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                {/* `min-w-64`: the menu's own default is
                    `w-(--radix-dropdown-menu-trigger-width)`, and a semantic
                    capsule is ~90-190px wide — the shared list is `w-64`
                    (256px), so it would overflow the menu's own
                    `overflow-x-hidden` box and its rows would be clipped *and*
                    unclickable (the probe caught exactly that: the row's box was
                    240px inside a 128px menu, so the click landed on the Dialog
                    overlay). `min-w-*` is a different property from `w-*`, so it
                    cannot lose to the Radix width on stylesheet order — `w-64`
                    could. */}
                <DropdownMenuContent align="start" className="min-w-64">
                  <SemanticList
                    onSelect={(semanticId) => patchNode({ semanticId })}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
