"use client";
import { useI18n } from "@workspace/ui/lib/i18n";

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
  const { t } = useI18n();

  const setIslandPanel = useUIStore((state) => state.setIslandPanel);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIslandPanel("search")}
      className={className}
      aria-label={t("打开搜索命令面板")}
    >
      <SearchIcon />
    </Button>
  );
}
