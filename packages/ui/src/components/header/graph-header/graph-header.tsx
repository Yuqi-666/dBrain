"use client";

import { ToggleSidebarButton } from "../toggle-sidebar-button";
import { ToggleSearchCommandButton } from "../toggle-search-command-button";
import { ViewSelectDropdownMenu } from "./view-select-dropdown-menu";
import { ViewConfigPanel } from "./view-config-panel";

interface GraphHeaderProps {
  className?: string;
}

export function GraphHeader({ className }: GraphHeaderProps) {
  return (
    <header
      className={`fixed top-0 left-0 right-0 border-none z-50 flex items-center justify-between py-4 px-6 pointer-events-none ${className || ""}`}
    >
      <div className="flex items-center gap-0 px-0.5 transition-opacity rounded-lg border bg-fd-muted text-fd-muted-foreground z-10 pointer-events-auto">
        <ToggleSidebarButton />
        <ToggleSearchCommandButton />
      </div>

      <ViewSelectDropdownMenu className="pointer-events-auto" />

      <div className="flex items-center gap-1 pointer-events-auto">
        <ViewConfigPanel />
      </div>
    </header>
  );
}
