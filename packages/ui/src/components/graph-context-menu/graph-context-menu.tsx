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
import { GraphContextMenuAddEdge } from "./graph-context-menu-add-edge";

export interface GraphContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  target: { type: "node" | "edge" | "canvas" | "addEdge"; id?: string } | null;
  addEdgeSourceIds?: string[];
  selectedNodeIds?: Set<string>;
  selectedEdgeIds?: Set<string>;
  onClose: () => void;
  onStartAddEdge?: (nodeId: string) => void;
  onEditEdge?: (edgeId: string) => void;
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
      addEdgeSourceIds,
      selectedNodeIds,
      selectedEdgeIds,
      onClose,
      onStartAddEdge,
      onEditEdge,
    },
    ref,
  ) => {
    if (!visible || !target) return null;
    const isNode = target.type === "node";
    const isEdge = target.type === "edge";
    const isCanvas = target.type === "canvas";
    const isAddEdge = target.type === "addEdge";

    const selectedCount = (selectedNodeIds?.size ?? 0) + (selectedEdgeIds?.size ?? 0);
    const isGroupSelect = selectedCount > 1;

    const { onEditNode, onDeleteNode, onAddNode, onCreateEdge, onDeleteEdge, onDeleteSelected, onChangeEdgeDirection, onChangeEdgeSemantic } =
      useGraphContextMenu();

    const getTarget = (): { type: "node" | "edge"; id: string } | null => {
      if (!target.id) return null;
      if (target.type === "canvas" || target.type === "addEdge") return null;
      return { type: target.type, id: target.id };
    };

    const targetObj = getTarget();

    const handleCreateEdge = (from: string[], to: string | null) => {
      if (to !== null) {
        onCreateEdge(from, to);
      }
    };

    const handleEditEdge = (edgeId: string) => {
      if (onEditEdge) {
        onEditEdge(edgeId);
      }
      onClose();
    };

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
          onPointerDownOutside={isAddEdge ? undefined : onClose}
        >
          {isGroupSelect ? (
            <GraphContextMenuGroupSelect
              nodeIds={Array.from(selectedNodeIds ?? [])}
              edgeIds={Array.from(selectedEdgeIds ?? [])}
              onDeleteSelected={onDeleteSelected}
              onClose={onClose}
            />
          ) : isAddEdge ? (
            <GraphContextMenuAddEdge
              sourceIds={addEdgeSourceIds ?? []}
              onCreateEdge={handleCreateEdge}
              onEditEdge={handleEditEdge}
              onClose={onClose}
            />
          ) : isNode && targetObj ? (
            <GraphContextMenuNode
              nodeId={targetObj.id}
              onEditNode={onEditNode}
              onStartAddEdge={onStartAddEdge}
              onDeleteNode={onDeleteNode}
              onClose={onClose}
            />
          ) : isEdge && targetObj ? (
            <GraphContextMenuEdge
              edgeId={targetObj.id}
              onDeleteEdge={onDeleteEdge}
              onChangeEdgeDirection={onChangeEdgeDirection}
              onChangeEdgeSemantic={onChangeEdgeSemantic}
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
