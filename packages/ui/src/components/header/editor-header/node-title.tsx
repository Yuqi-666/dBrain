"use client";

import { Input } from "@workspace/ui/components/ui/input";
import { useDataStore, useUIStore } from "@workspace/store";
import { GraphCQRS } from "@workspace/api-client";

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

  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentEditingNodeId && currentNode) {
      let title = e.target.value
      await GraphCQRS.upsertNode(currentEditingNodeId, { title: title });
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
