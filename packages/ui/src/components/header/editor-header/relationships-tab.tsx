"use client";

import { LinkIcon } from "lucide-react";
import { useDataStore } from "@workspace/store";

interface RelationshipsTabProps {
  edges: any[];
  currentNodeId: string;
}

export function RelationshipsTab({
  edges,
  currentNodeId,
}: RelationshipsTabProps) {
  const edgeSemantics = useDataStore((state) => state.edgeSemantics);

  if (edges.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        暂无关联关系
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {edges.map((edge) => {
        const isSource = edge.source === currentNodeId;
        const otherNodeId = isSource ? edge.target : edge.source;
        const semantic = edge.semanticId
          ? edgeSemantics.get(edge.semanticId)
          : undefined;
        return (
          <div
            key={edge.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm"
          >
            <LinkIcon className="size-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {isSource ? "→" : "←"}
            </span>
            <span className="font-medium truncate flex-1">
              {otherNodeId.slice(0, 8)}...
            </span>
            <span className="text-xs text-muted-foreground">
              {semantic?.category || semantic?.name || "关联"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
