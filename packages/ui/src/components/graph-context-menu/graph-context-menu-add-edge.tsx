"use client";

import * as React from "react";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@workspace/ui/components/ui/dropdown-menu";
import { ArrowLeft, X, Link2 } from "lucide-react";
import { NodeList } from "../list/node/node-list";
import { useGraphStore } from "@workspace/store";
import type { EdgeData, EdgeId } from "@workspace/interfaces";

export interface GraphContextMenuAddEdgeProps {
  sourceIds: string[];
  onCreateEdge: (from: string[], to: string | null) => void;
  onClose: () => void;
  onEditEdge: (edgeId: EdgeId) => void;
}

export function GraphContextMenuAddEdge({
  sourceIds,
  onCreateEdge,
  onClose,
  onEditEdge,
}: GraphContextMenuAddEdgeProps) {
  const [pendingSourceIds, setPendingSourceIds] = React.useState<string[]>(sourceIds);
  const edges = useGraphStore((state) => state.edges);

  React.useEffect(() => {
    setPendingSourceIds(sourceIds);
  }, [sourceIds]);

  const handleNodeSelect = (targetId: string) => {
    if (pendingSourceIds.length === 0 || pendingSourceIds.includes(targetId)) {
      return;
    }

    const firstSourceId = pendingSourceIds[0]!;
    onCreateEdge(pendingSourceIds, targetId);

    const newEdges = Array.from(edges.values()).filter(
      (edge: EdgeData) => edge.from === firstSourceId && edge.to === targetId,
    );

    if (newEdges.length > 0) {
      onEditEdge(newEdges[0]!.id);
    }
  };

  const handleBack = () => {
    setPendingSourceIds([]);
    onCreateEdge(sourceIds, null);
  };

  const handleCancel = () => {
    onCreateEdge(sourceIds, null);
    onClose();
  };

  return (
    <>
      {pendingSourceIds.length > 0 && (
        <>
          <DropdownMenuItem
            onClick={handleBack}
            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
          >
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuItem
        onClick={handleCancel}
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
      >
        <X className="size-4" />
        <span>Cancel</span>
      </DropdownMenuItem>
      <NodeList
        onSelect={handleNodeSelect}
        onClose={onClose}
      />
    </>
  );
}
