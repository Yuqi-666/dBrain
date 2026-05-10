"use client";

import { Input } from "@workspace/ui/components/ui/input";
import { useGraphStore, useNodeEditorStore } from "@workspace/store";

interface NodeTitleProps {
  className?: string;
}

export function NodeTitle({ className }: NodeTitleProps) {
  const currentEditingNodeId = useNodeEditorStore(
    (state) => state.currentEditingNodeId,
  );
  const nodes = useGraphStore((state) => state.nodes);
  const updateNode = useGraphStore((state) => state.updateNode);

  const currentNode = currentEditingNodeId
    ? nodes.get(currentEditingNodeId)
    : null;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentEditingNodeId && currentNode) {
      updateNode(currentEditingNodeId, { title: e.target.value });
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
