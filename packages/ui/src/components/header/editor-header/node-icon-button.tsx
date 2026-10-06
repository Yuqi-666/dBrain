"use client";

/**
 * The editor header's icon button — the host side of `IconSelectorPopover`
 * (sel §4 末段).
 *
 * It reads the **live** node from the store for display, and re-reads it again
 * at write time: sel §7 makes 「任何一次提交都用活值作为基底」 an invariant, because
 * the selector can only merge with the value it was rendered with (the colour
 * palette is the obvious case — a stale base would drop a colour the user just
 * picked).
 *
 * Removing writes the explicit `null` sentinel (R29-定, verified end-to-end by
 * M1): `undefined` means "leave this field alone", so `{ icon: undefined }`
 * would silently do nothing.
 */
import type { NodeIcon } from "@workspace/interfaces";
import { useDataStore, useUIStore } from "@workspace/store";
import { NodeService } from "@workspace/services";
import { Button } from "@workspace/ui/components/ui/button";
import { IconSelectorPopover } from "@workspace/ui/components/node-media/icon-selector-popover";
import { NodeIconView } from "@workspace/ui/components/node-media/node-icon-view";
import { NODE_TYPE_ICONS } from "@workspace/ui/components/node-media/node-type-icons";

interface NodeIconButtonProps {
  className?: string;
}

export function NodeIconButton({ className }: NodeIconButtonProps) {
  const nodeId = useUIStore((state) => state.currentEditingNodeId);
  const node = useDataStore((state) =>
    nodeId ? state.getNode(nodeId) : undefined,
  );

  if (!nodeId || !node) return null;

  const icon = node.icon ?? undefined;
  const TypeIcon = NODE_TYPE_ICONS[node.nodeType];

  const write = (next: NodeIcon | undefined) => {
    if (next === undefined) {
      void NodeService.upsert(nodeId, { icon: null });
      return;
    }
    const live = useDataStore.getState().getNode(nodeId)?.icon ?? undefined;
    void NodeService.upsert(nodeId, {
      icon: live ? { ...live, ...next } : next,
    });
  };

  return (
    <IconSelectorPopover
      nodeId={nodeId}
      value={icon}
      onChange={write}
      onRemove={() => write(undefined)}
      className={className}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`size-9 ${className ?? ""}`}
        aria-label={icon ? "更换节点图标" : "设置节点图标"}
      >
        <NodeIconView
          icon={icon}
          fallback={<TypeIcon className="size-4" />}
          className="size-5 rounded-sm"
        />
      </Button>
    </IconSelectorPopover>
  );
}
