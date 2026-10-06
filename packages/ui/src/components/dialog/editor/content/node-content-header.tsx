"use client";

/**
 * The shared page header of a node whose content carries its own title block —
 * today only `rich-text` (`docs/node-content/README.md` §1.6/§2, plan
 * `docs/plan/node-content-ui.md` §M3.1 第 5 行).
 *
 * Five elements, top to bottom, all fed by **top-level** node fields:
 *
 * | # | element       | field                |
 * | - | ------------- | -------------------- |
 * | 1 | cover         | `NodeBase.cover`     |
 * | 2 | icon          | `NodeBase.icon`      |
 * | 3 | title         | `NodeBase.title`     |
 * | 4 | summary       | `NodeBase.abstract`  |
 * | 5 | semantic pill | `NodeBase.semanticId`|
 *
 * The body below it (section 6 of §2) is **not** this component's business: it
 * writes `content`, and it goes through the same queue as `patchNode`, which the
 * host owns. This component never writes `content` — the point of the split is
 * that changing an icon can never roll the正文 back a frame (§2 纪律 ①).
 *
 * It deliberately does not read the *node* from the store: `node` is a prop and
 * every write goes through `patchNode`. The one store read is `nodeSemantics`, the
 * semantic **catalogue** the pill renders from — the same read `preview-header.tsx`
 * does, and not a node lookup.
 *
 * The two selectors are injected (`renderCoverSelector` / `renderIconSelector`), so
 * this header stays a leaf of the node type it decorates. The injected node *is*
 * the trigger; because it receives `node`, it draws the empty state itself (a
 * compact 「添加封面」 button) — the header only decides where the entry sits.
 */
import { useDataStore } from "@workspace/store";
import type { NodeCover, NodeData, NodeIcon } from "@workspace/interfaces";
import { Input } from "@workspace/ui/components/ui/input";
import { NodeIconView } from "@workspace/ui/components/node-media/node-icon-view";
import { NODE_TYPE_ICONS } from "@workspace/ui/components/node-media/node-type-icons";
import { cn } from "@workspace/ui/lib/utils";
import type { ReactNode } from "react";

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
    <div className={cn("flex flex-col gap-4", className)}>
      {/* 1 — cover. An empty cover draws no block (nc §2): the host's entry is then
          the compact 「添加封面」 button, aligned to the right of the title row. */}
      {hasCover && coverEntry}

      <div className="flex items-start gap-3">
        {/* 2 — icon. The box is the trigger when the host injected one. */}
        <div className="shrink-0">
          {iconEntry ?? (
            <span className="flex size-9 items-center justify-center text-muted-foreground">
              <NodeIconView
                icon={node.icon ?? undefined}
                fallback={<TypeIcon className="size-5" />}
                className="size-9 rounded-sm text-2xl"
              />
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* 3 — title, with the empty-cover entry pinned to its right end. */}
          <div className="flex items-center gap-2">
            {readOnly ? (
              <h1 className="min-w-0 flex-1 truncate text-3xl font-semibold">
                {node.title}
              </h1>
            ) : (
              <Input
                value={node.title}
                onChange={(event) => patchNode({ title: event.target.value })}
                placeholder="未命名页面"
                aria-label="节点标题"
                className="h-auto min-w-0 flex-1 border-none px-0 text-3xl font-semibold shadow-none focus-visible:ring-0"
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

          {/* 5 — semantic pill, drawn from the catalogue the store holds. */}
          {semantic && (
            <span
              className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: semantic.color
                  ? `${semantic.color}20`
                  : undefined,
                color: semantic.color || undefined,
              }}
            >
              {semantic.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
