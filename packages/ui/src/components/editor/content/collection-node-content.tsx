"use client";

import { useGraphStore } from "@workspace/store";
import { cn } from "@workspace/ui/lib/utils";
import { FolderIcon } from "lucide-react";
import type { CollectionNodeData, NodeData } from "@workspace/interfaces";

interface CollectionNodeContentProps {
  node: CollectionNodeData;
  className?: string;
}

/**
 * CollectionNodeContent - Read-only collection display
 * Displays node list using node.content data directly
 */
export function CollectionNodeContent({
  node,
  className,
}: CollectionNodeContentProps) {
  const nodes = useGraphStore((state) => state.nodes);

  const nodeIds = node.content.filterConfig?.selectedNodes || [];
  const collectionType =
    node.content.filterConfig?.collectionType || "unordered";

  // Get collection nodes data
  const collectionNodes = nodeIds
    .map((id: string) => nodes.get(id))
    .filter(Boolean) as NodeData[];

  return (
    <div className={cn("flex flex-col gap-4 p-6", className)}>
      <div className="space-y-2 flex-1">
        <div className="text-xs text-muted-foreground">
          节点列表 ({nodeIds.length})
        </div>

        <div className="border rounded-lg min-h-[200px] p-4 bg-muted/30">
          {collectionNodes.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <FolderIcon className="size-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  点击"添加节点"将节点加入集合
                </p>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "space-y-2",
                collectionType === "cards" && "grid grid-cols-2 gap-3",
              )}
            >
              {collectionNodes.map((collectionNode) => (
                <div
                  key={collectionNode!.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg bg-background border",
                    collectionType === "cards" && "flex-col items-start",
                  )}
                >
                  {collectionType === "cards" ? (
                    <>
                      <div className="w-full flex items-start justify-between">
                        <span className="font-medium">
                          {collectionNode!.title || "未命名"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {collectionNode!.nodeType}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">
                        {collectionType === "ordered"
                          ? `${nodeIds.indexOf(collectionNode!.id) + 1}.`
                          : "•"}
                      </span>
                      <span className="flex-1 font-medium truncate">
                        {collectionNode!.title || "未命名"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {collectionNode!.nodeType}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
