"use client";

import { SearchIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { useUIStore } from "@workspace/store";

interface ToggleSearchCommandButtonProps {
  className?: string;
}

/**
 * 切换命令面板显示的按钮
 */
export function ToggleSearchCommandButton({
  className,
}: ToggleSearchCommandButtonProps) {
  const openQuickPanel = useUIStore((state) => state.openQuickPanel);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => openQuickPanel("search")}
      className={className}
      aria-label="打开搜索命令面板"
    >
      <SearchIcon />
    </Button>
  );
}
