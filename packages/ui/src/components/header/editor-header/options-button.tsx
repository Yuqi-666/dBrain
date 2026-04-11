"use client";

import { MoreHorizontalIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";

interface OptionsButtonProps {
  nodeId?: string | null;
  className?: string;
  onClick?: () => void;
}

/**
 * 选项按钮 - 触发节点操作菜单
 */
export function OptionsButton({
  nodeId,
  className,
  onClick,
}: OptionsButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      className={className}
      aria-label="更多选项"
    >
      <MoreHorizontalIcon />
    </Button>
  );
}
