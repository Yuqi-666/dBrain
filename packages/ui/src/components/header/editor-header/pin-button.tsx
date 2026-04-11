"use client";

import { PinIcon, PinOffIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { useUIStore } from "@workspace/store";

interface PinButtonProps {
  className?: string;
}

/**
 * 图钉按钮 - 切换编辑器置顶状态
 */
export function PinButton({ className }: PinButtonProps) {
  const { editorPinned, toggleEditorPinned } = useUIStore();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleEditorPinned}
      className={className}
      aria-label={editorPinned ? "取消置顶" : "置顶编辑器"}
    >
      {editorPinned ? <PinIcon className="fill-current" /> : <PinOffIcon />}
    </Button>
  );
}
