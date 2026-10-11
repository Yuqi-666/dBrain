"use client";

import { Input } from "@workspace/ui/components/ui/input";
import { useDataStore, useUIStore } from "@workspace/store";
import { NodeService } from "@workspace/services";

interface NodeTitleProps {
  className?: string;
}

export function NodeTitle({ className }: NodeTitleProps) {
  const currentEditingNodeId = useUIStore(
    (state) => state.currentEditingNodeId,
  );
  const nodes = useDataStore((state) => state.nodes);

  const currentNode = currentEditingNodeId
    ? nodes.get(currentEditingNodeId)
    : null;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentEditingNodeId && currentNode) {
      const title = e.target.value;
      void NodeService.upsert(
        currentEditingNodeId,
        { title },
        { debounce: true },
      );
    }
  };

  return (
    <Input
      value={currentNode?.title || ""}
      onChange={handleTitleChange}
      placeholder="未命名节点"
      className={className}
      disabled={!currentNode}
    />
  );
}
