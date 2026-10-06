"use client";

/**
 * The editor header's cover button — the host side of `CoverSelectorPopover`
 * (docs/plan/node-content-ui.md §M2.1 第 6 行).
 *
 * Same two rules as {@link NodeIconButton}: read the **live** node at write time
 * (sel §7), and clear through the explicit `null` sentinel rather than
 * `undefined` (R29-定 — an omitted key keeps the stored value).
 *
 * `listNodes` is injected here because the selector must not read the store
 * itself (sel §2 边界 1): it is the same 「渲染器需要节点就向宿主索取」 split the
 * dataview gallery uses.
 */
import type { NodeCover, NodeData } from "@workspace/interfaces";
import { useDataStore, useUIStore } from "@workspace/store";
import { NodeService } from "@workspace/services";
import { Button } from "@workspace/ui/components/ui/button";
import { CoverSelectorPopover } from "@workspace/ui/components/node-media/cover-selector-popover";
import { ImagePlusIcon } from "lucide-react";

/** How many nodes 「从节点选」offers before the search narrows it. */
const CANDIDATE_LIMIT = 24;

interface NodeCoverButtonProps {
  className?: string;
}

export function NodeCoverButton({ className }: NodeCoverButtonProps) {
  const nodeId = useUIStore((state) => state.currentEditingNodeId);
  const node = useDataStore((state) =>
    nodeId ? state.getNode(nodeId) : undefined,
  );

  if (!nodeId || !node) return null;

  const cover = node.cover ?? undefined;

  const write = (next: NodeCover | undefined) => {
    if (next === undefined) {
      void NodeService.upsert(nodeId, { cover: null });
      return;
    }
    const live = useDataStore.getState().getNode(nodeId)?.cover ?? undefined;
    void NodeService.upsert(nodeId, {
      cover: live ? { ...live, ...next } : next,
    });
  };

  const listNodes = (query: string): NodeData[] => {
    const needle = query.trim().toLowerCase();
    return [...useDataStore.getState().nodes.values()]
      .filter((candidate) => candidate.id !== nodeId)
      .filter((candidate) =>
        needle ? candidate.title.toLowerCase().includes(needle) : true,
      )
      .slice(0, CANDIDATE_LIMIT);
  };

  return (
    <CoverSelectorPopover
      nodeId={nodeId}
      value={cover}
      onChange={write}
      onRemove={() => write(undefined)}
      listNodes={listNodes}
      className={className}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={cover ? "更换节点封面" : "添加节点封面"}
      >
        <ImagePlusIcon className="size-4" />
      </Button>
    </CoverSelectorPopover>
  );
}
