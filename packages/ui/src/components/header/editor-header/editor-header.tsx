"use client";

import { ToggleSidebarButton } from "../toggle-sidebar-button";
import { ToggleSearchCommandButton } from "../toggle-search-command-button";
import { FullscreenButton } from "./fullscreen-button";
import { NodeCoverButton } from "./node-cover-button";
import { NodeIconButton } from "./node-icon-button";
import { PinButton } from "./pin-button";
import { NodeTitle } from "./node-title";
import { OptionsMenu } from "./options-menu";
import { Button } from "@workspace/ui/components/ui/button";
import { useUIStore } from "@workspace/store";
import { InfoIcon } from "lucide-react";

interface EditorHeaderProps {
  className?: string;
}

export function EditorHeader({ className }: EditorHeaderProps) {
  const currentEditingNodeId = useUIStore(
    (state) => state.currentEditingNodeId,
  );
  const sidebarMode = useUIStore((state) => state.sidebarMode);
  const mainViewType = useUIStore((state) => state.mainViewType);
  const toggleAttributesSidebar = useUIStore(
    (state) => state.toggleAttributesSidebar,
  );
  return (
    <header
      className={` z-10 flex flex-shrink-0 items-center justify-between pt-4 pb-2 px-6 ${className || ""}`}
    >
      <div className="flex flex-1 justify-start items-center gap-0">
        <FullscreenButton />
        {mainViewType === "editor" && (
          <div
            className={`flex items-center gap-0 p-0.5 transition-all  bg-background text-foreground z-10 pointer-events-auto ${sidebarMode === "fixed" ? "opacity-0" : ""}`}
          >
            <ToggleSidebarButton />
            <ToggleSearchCommandButton />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 pointer-events-auto">
        <NodeIconButton />
        <NodeTitle className="text-center border-none" />
      </div>

      <div
        className={`flex flex-1 justify-end items-center gap-0 p-0.5 transition-all rounded-lg border-none z-10 pointer-events-auto text-foreground `}
      >
        <NodeCoverButton />
        <PinButton />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toggleAttributesSidebar()}
        >
          <InfoIcon className="size-4" />
        </Button>
        <OptionsMenu nodeId={currentEditingNodeId} />
      </div>
    </header>
  );
}
