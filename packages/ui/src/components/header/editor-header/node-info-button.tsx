"use client";

import { InfoIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";

interface NodeInfoButtonProps {
  className?: string;
  onClick?: () => void;
}

/**
 * 节点信息按钮 - 触发节点信息面板
 */
export function NodeInfoButton({ className, onClick }: NodeInfoButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      className={className}
      aria-label="节点信息"
    >
      <InfoIcon />
    </Button>
  );
}
