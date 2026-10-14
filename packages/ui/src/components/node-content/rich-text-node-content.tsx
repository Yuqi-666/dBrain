"use client";
import { useI18n } from "@workspace/ui/lib/i18n";

import { useCallback, useEffect, useRef } from "react";
import type {
  NodeData,
  RichTextContent,
  RichTextNodeData,
} from "@workspace/interfaces";
import { NotionEditor } from "@workspace/editor/components/tiptap-templates/notion-like/notion-like-editor";
import { useDataStore } from "@workspace/store";
import { Button } from "@workspace/ui/components/ui/button";
import { CoverSelectorPopover } from "@workspace/ui/components/selector/cover-selector-popover";
import { IconSelectorPopover } from "@workspace/ui/components/selector/icon-selector-popover";
import { IconView } from "@workspace/ui/components/icon/icon-view";
import { NODE_TYPE_ICONS } from "@workspace/ui/components/icon/node-type-icons";
import { NodePreviewCover } from "@workspace/ui/components/preview-block/node-preview-cover";
import { cn } from "@workspace/ui/lib/utils";
import {
  NODE_ICON_FALLBACK,
  NODE_ICON_GLYPH,
  NODE_ICON_PLATE,
  NodeContentHeader,
} from "./node-content-header";
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
  const { t } = useI18n();

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
      {/* The header owns its own layout — the 708px text column **and** the
          full-bleed cover outside it (`node-content-header.tsx`, G3 追加交付 二),
          so the host must not wrap it in one. */}
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
              className={cn("p-0", NODE_ICON_PLATE)}
              aria-label={target.icon ? t("更换节点图标") : t("设置节点图标")}
            >
              <IconView
                icon={target.icon ?? undefined}
                fallback={<TypeIcon className={NODE_ICON_FALLBACK} />}
                className={NODE_ICON_PLATE}
                glyphClassName={NODE_ICON_GLYPH}
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
              label={t("添加封面")}
            />
          ) : (
            <CoverSelectorPopover
              nodeId={target.id}
              value={target.cover}
              onChange={(next) => onPick(next ?? null)}
              onRemove={() => onPick(null)}
              listNodes={listNodes}
            >
              {/* Full-bleed: the reference page's cover is the pane's width, not
                  the text column's, and its corners follow the dialog's. */}
              <button
                type="button"
                className="block h-60 w-full overflow-hidden rounded-lg"
                aria-label={t("更换节点封面")}
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

      <NotionEditor
        placeholder={t("开始写作...")}
        onContentChange={handleBodyChange}
        getInitialContent={() =>
          useDataStore.getState().getNode(node.id)?.content ?? {}
        }
      />
    </div>
  );
}
