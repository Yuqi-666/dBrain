"use client";

import { useUIStore } from "@workspace/store";
import { SidebarTrigger } from "../ui/sidebar";
import { cn } from "@workspace/ui/lib/utils";

interface ToggleSidebarButtonProps {
  className?: string;
}

/**
 * 切换侧边栏显示的按钮
 */
export function ToggleSidebarButton({ className }: ToggleSidebarButtonProps) {
  const { setSidebarOpen } = useUIStore();

  return (
    <SidebarTrigger className={cn(className)} />
  )
}
