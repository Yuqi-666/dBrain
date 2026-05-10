"use client";

import { PinIcon, PinOffIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { useNodeEditorStore, useGraphStore } from "@workspace/store";

interface PinButtonProps {
  className?: string;
}

/**
 * 图钉按钮 - 切换节点置顶状态
 */
export function PinButton({ className }: PinButtonProps) {
  const currentEditingNodeId = useNodeEditorStore(
    (s) => s.currentEditingNodeId,
  );
  const node = useGraphStore((s) =>
    currentEditingNodeId ? s.getNode(currentEditingNodeId) : undefined,
  );
  const updateNode = useGraphStore((s) => s.updateNode);

  const isPinned = node?.isPinned ?? false;

  const handleTogglePin = () => {
    if (!currentEditingNodeId) return;
    updateNode(currentEditingNodeId, { isPinned: !isPinned });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleTogglePin}
      className={className}
      aria-label={isPinned ? "取消置顶" : "置顶节点"}
    >
      {isPinned ? <PinIcon className="fill-current" /> : <PinOffIcon />}
    </Button>
  );
}
