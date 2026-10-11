"use client";

import { PinIcon, PinOffIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { useDataStore, useUIStore } from "@workspace/store";
import { NodeService } from "@workspace/services";

interface PinButtonProps {
  className?: string;
}

/**
 * 图钉按钮 - 切换节点置顶状态
 */
export function PinButton({ className }: PinButtonProps) {
  const currentEditingNodeId = useUIStore(
    (s) => s.currentEditingNodeId,
  );
  const node = useDataStore((s) =>
    currentEditingNodeId ? s.getNode(currentEditingNodeId) : undefined,
  );

  const isPinned = node?.isPinned ?? false;

  const handleTogglePin = async () => {
    if (!currentEditingNodeId) return;
    await NodeService.upsert(currentEditingNodeId, { isPinned: !isPinned });
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
