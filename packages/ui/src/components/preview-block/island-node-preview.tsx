"use client";

import { useDataStore } from "@workspace/store";
import { Button } from "@workspace/ui/components/ui/button";
import { NodePreviewBody } from "./node-preview-body";

export function IslandNodePreview({
  nodeId,
  onClose,
}: {
  nodeId: string;
  onClose: () => void;
}) {
  const node = useDataStore((s) => s.nodes.get(nodeId));
  if (!node)
    return (
      <div className="p-4 text-sm text-muted-foreground">
        节点已不存在
        <Button variant="ghost" onClick={onClose}>
          收起
        </Button>
      </div>
    );
  return <NodePreviewBody node={node} />;
}
