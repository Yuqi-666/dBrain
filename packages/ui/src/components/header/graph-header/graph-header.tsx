"use client";

import { ToggleSidebarButton } from "../toggle-sidebar-button";
import { ViewSelectDropdownMenu } from "./view-select-dropdown-menu";
import { ViewConfigPanel } from "./view-config-panel";
import { useUIStore } from "@workspace/store";

interface GraphHeaderProps {
  className?: string;
}

export function GraphHeader({ className }: GraphHeaderProps) {
  const sidebarMode = useUIStore((state) => state.sidebarMode);

  return (
    <header
      className={`absolute top-0 left-0 right-0 border-none z-10 flex items-center justify-between py-4 px-6 pointer-events-none bg-transparent ${className || ""}`}
    >
      <div
        className={`flex items-center gap-0 px-0.5 transition-all rounded-lg border bg-background text-foreground z-10 pointer-events-auto ${sidebarMode === "fixed" ? "opacity-0" : ""}`}
      >
        <ToggleSidebarButton />
      </div>

      <ViewSelectDropdownMenu className="pointer-events-auto rounded-lg border dark:bg-background dark:border-border dark:hover:bg-background dark:aria-expanded:bg-background" />

      <div className="flex items-center gap-1 pointer-events-auto rounded-lg border bg-background px-0.5">
        <ViewConfigPanel />
      </div>
    </header>
  );
}
