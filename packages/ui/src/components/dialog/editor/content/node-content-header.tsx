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
import type { ReactNode } from "react";

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

/** The semantic capsule: one shape for the read-only pill and the trigger. */
const SEMANTIC_PILL =
  "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-medium";

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
        <div className="flex flex-col gap-4">
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
          <div className="flex items-center gap-2">
            {readOnly ? (
              <h1 className="min-w-0 flex-1 truncate text-4xl font-semibold">
                {node.title}
              </h1>
            ) : (
              <Input
                value={node.title}
                onChange={(event) => patchNode({ title: event.target.value })}
                placeholder="未命名页面"
                aria-label="节点标题"
                className="h-auto min-w-0 flex-1 border-none px-0 text-4xl font-semibold shadow-none focus-visible:ring-0"
              />
            )}
            {!hasCover && coverEntry}
          </div>

          {/* 4 — summary. */}
          {readOnly ? (
            node.abstract ? (
              <p className="text-sm text-muted-foreground">{node.abstract}</p>
            ) : null
          ) : (
            <Input
              value={node.abstract ?? ""}
              onChange={(event) => patchNode({ abstract: event.target.value })}
              placeholder="添加摘要…"
              aria-label="节点摘要"
              className="h-auto border-none px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
