"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
} from "@workspace/ui/components/ui/dropdown-menu";
import { useGraphContextMenu } from "./useGraphContextMenu";
import { GraphContextMenuNode } from "./graph-context-menu-node";
import { GraphContextMenuEdge } from "./graph-context-menu-edge";
import { GraphContextMenuCanvas } from "./graph-context-menu-canvas";
import { GraphContextMenuGroupSelect } from "./graph-context-menu-group-select";

export interface GraphContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  target: { type: "node" | "edge" | "canvas"; id?: string } | null;
  selectedNodeIds?: Set<string>;
  selectedEdgeIds?: Set<string>;
  onClose: () => void;
}

const GraphContextMenu = React.forwardRef<
  React.ElementRef<typeof DropdownMenuContent>,
  GraphContextMenuProps
>(
  (
    {
      x,
      y,
      visible,
      target,
      selectedNodeIds,
      selectedEdgeIds,
      onClose,
    },
    ref,
  ) => {
    if (!visible || !target) return null;
    const isNode = target.type === "node";
    const isEdge = target.type === "edge";
    const isCanvas = target.type === "canvas";

    const selectedCount = (selectedNodeIds?.size ?? 0) + (selectedEdgeIds?.size ?? 0);
    const isGroupSelect = selectedCount > 1;

    const { onEditNode, onDeleteNode, onAddNode, onEditEdge, onDeleteEdge, onAddEdge, onDeleteSelected } =
      useGraphContextMenu();

    const getTarget = (): { type: "node" | "edge"; id: string } | null => {
      if (!target.id) return null;
      if (target.type === "canvas") return null;
      return { type: target.type, id: target.id };
    };

    const targetObj = getTarget();

    return (
      <DropdownMenu open={visible} onOpenChange={(open) => !open && onClose()}>
        <DropdownMenuContent
          ref={ref}
          style={{
            position: "absolute",
            left: x,
            top: y,
          }}
          className="w-48 p-1 shadow-lg rounded-lg border bg-popover text-popover-foreground"
          onEscapeKeyDown={onClose}
          onPointerDownOutside={onClose}
        >
          {isGroupSelect ? (
            <GraphContextMenuGroupSelect
              nodeIds={Array.from(selectedNodeIds ?? [])}
              edgeIds={Array.from(selectedEdgeIds ?? [])}
              onDeleteSelected={onDeleteSelected}
              onClose={onClose}
            />
          ) : isNode && targetObj ? (
            <GraphContextMenuNode
              targetObj={targetObj}
              onEditNode={onEditNode}
              onAddEdge={onAddEdge}
              onDeleteNode={onDeleteNode}
              onClose={onClose}
            />
          ) : isEdge && targetObj ? (
            <GraphContextMenuEdge
              targetObj={targetObj}
              onEditEdge={onEditEdge}
              onDeleteEdge={onDeleteEdge}
              onClose={onClose}
            />
          ) : isCanvas ? (
            <GraphContextMenuCanvas
              onAddNode={onAddNode}
              onClose={onClose}
            />
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
);

GraphContextMenu.displayName = "GraphContextMenu";

export { GraphContextMenu };
