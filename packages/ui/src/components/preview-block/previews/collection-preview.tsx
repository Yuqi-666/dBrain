"use client";

import type { CollectionNodeData } from "@workspace/interfaces";
import { Folder, Filter } from "lucide-react";

export function CollectionPreview({ node }: { node: CollectionNodeData }) {
  const filterConfig = node.content?.filterConfig;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Folder className="size-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">Collection</p>
          <p className="text-xs text-muted-foreground truncate">
            {filterConfig?.selectedNodes?.length || 0} nodes selected
          </p>
        </div>
      </div>
      {filterConfig?.ruleGroup && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Filter className="size-3.5 shrink-0 mt-0.5" />
          <span>Has filter rules</span>
        </div>
      )}
      {node.abstract && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {node.abstract}
        </p>
      )}
    </div>
  );
}
