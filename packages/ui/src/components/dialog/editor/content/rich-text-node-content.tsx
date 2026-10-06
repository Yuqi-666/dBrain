"use client";

/**
 * A `rich-text` node: the shared content header (cover / icon / title / summary /
 * semantic pill) over the existing `<NotionEditor>` body
 * (`docs/node-content/README.md` §1.6, plan `docs/plan/node-content-ui.md` §M3.1
 * 第 6 行).
 *
 * The whole point of this file is that **one queue owns the node**:
 *
 * - the header's top-level fields go through `patchNode`;
 * - the body's `docs` goes through `patchContent`;
 * - both come from the same `useNodeContentWriter`, so a title typed while the
 *   body is being written is merged into one upsert instead of becoming a second
 *   in-flight request for the same record (§M3.2-10).
 *
 * The header never writes `content` and the body never writes a top-level field,
 * so neither can roll the other back a frame — which is also why the editor
 * header no longer shows its own icon / cover / title entry for this node type
 * (`editor-header.tsx`, 收口 §M3.2-2 方案 A).
 */
import { useCallback, useEffect, useRef } from "react";
import type {
  NodeData,
  RichTextContent,
  RichTextNodeData,
} from "@workspace/interfaces";
import { NotionEditor } from "@workspace/editor/components/tiptap-templates/notion-like/notion-like-editor";
import { useDataStore } from "@workspace/store";
import { Button } from "@workspace/ui/components/ui/button";
import { CoverSelectorPopover } from "@workspace/ui/components/node-media/cover-selector-popover";
import { IconSelectorPopover } from "@workspace/ui/components/node-media/icon-selector-popover";
import { NodeIconView } from "@workspace/ui/components/node-media/node-icon-view";
import { NODE_TYPE_ICONS } from "@workspace/ui/components/node-media/node-type-icons";
import { NodePreviewCover } from "@workspace/ui/components/preview-block/node-preview-cover";
import { cn } from "@workspace/ui/lib/utils";
import { NodeContentHeader } from "./node-content-header";
import { useNodeContentWriter } from "./use-node-content-writer";

/** How many nodes 「从节点选」offers before the search narrows it. */
const CANDIDATE_LIMIT = 24;

interface RichTextNodeContentProps {
  node: RichTextNodeData;
  className?: string;
}

export function RichTextNodeContent({
  node,
  className,
}: RichTextNodeContentProps) {
  // The host renders the live node: the header's inputs are one-way (`node.title`
  // in, `patchNode` out) and `NodeService.upsert` updates the store synchronously,
  // so this subscription is what makes typing echo back.
  const liveNode = useDataStore((state) => state.getNode(node.id)) ?? node;
  const writer = useNodeContentWriter<RichTextContent>(
    node.id,
    "rich-text",
    node.content,
  );

  // `patchContent` changes identity whenever the store does; the editor keeps the
  // first `onContentChange` closure it was given, so hand it a stable one.
  const patchBody = useRef(writer.patchContent);
  useEffect(() => {
    patchBody.current = writer.patchContent;
  }, [writer.patchContent]);

  const handleBodyChange = useCallback((docs: unknown) => {
    patchBody.current({ docs: docs as RichTextContent["docs"] });
  }, []);

  const listNodes = useCallback(
    (query: string): NodeData[] => {
      const needle = query.trim().toLowerCase();
      return [...useDataStore.getState().nodes.values()]
        .filter((candidate) => candidate.id !== node.id)
        .filter((candidate) =>
          needle ? candidate.title.toLowerCase().includes(needle) : true,
        )
        .slice(0, CANDIDATE_LIMIT);
    },
    [node.id],
  );

  const TypeIcon = NODE_TYPE_ICONS[liveNode.nodeType];

  return (
    <div className={cn("flex min-h-full flex-col", className)}>
      {/* The header shares the body's content column (708px + 3rem of padding,
          `notion-like-editor.scss:85-112`) so the two line up. */}
      <div className="mx-auto w-full max-w-[708px] px-12 pt-6">
        <NodeContentHeader
          node={liveNode}
          patchNode={writer.patchNode}
          renderIconSelector={({ node: target, onPick }) => (
            <IconSelectorPopover
              nodeId={target.id}
              value={target.icon ?? undefined}
              onChange={(next) => {
                if (next === undefined) {
                  onPick(null);
                  return;
                }
                // Live-value base, exactly like `NodeIconButton`: a colour-only
                // pick must not drop `kind` / `value` (sel §7).
                const live =
                  useDataStore.getState().getNode(target.id)?.icon ?? undefined;
                onPick(live ? { ...live, ...next } : next);
              }}
              onRemove={() => onPick(null)}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label={target.icon ? "更换节点图标" : "设置节点图标"}
              >
                <NodeIconView
                  icon={target.icon ?? undefined}
                  fallback={<TypeIcon className="size-5" />}
                  className="size-9 rounded-sm text-2xl"
                />
              </Button>
            </IconSelectorPopover>
          )}
          renderCoverSelector={({ node: target, onPick }) =>
            target.cover == null ? (
              // Empty cover draws no block (nc §2); the popover's own trigger is
              // the compact 「添加封面」 entry of the title row.
              <CoverSelectorPopover
                nodeId={target.id}
                value={undefined}
                onChange={(next) => onPick(next ?? null)}
                onRemove={() => onPick(null)}
                listNodes={listNodes}
                label="添加封面"
              />
            ) : (
              <CoverSelectorPopover
                nodeId={target.id}
                value={target.cover}
                onChange={(next) => onPick(next ?? null)}
                onRemove={() => onPick(null)}
                listNodes={listNodes}
              >
                <button
                  type="button"
                  className="block h-40 w-full overflow-hidden rounded-md"
                  aria-label="更换节点封面"
                >
                  <NodePreviewCover
                    node={target}
                    className="size-full"
                    resolveNode={(nodeId) =>
                      useDataStore.getState().getNode(nodeId)
                    }
                  />
                </button>
              </CoverSelectorPopover>
            )
          }
        />
      </div>

      <NotionEditor
        room={node.id}
        placeholder="开始写作..."
        onContentChange={handleBodyChange}
        getInitialContent={() =>
          useDataStore.getState().getNode(node.id)?.content ?? {}
        }
      />
    </div>
  );
}
