"use client";

import { ToggleSidebarButton } from "../toggle-sidebar-button";
import { ToggleSearchCommandButton } from "../toggle-search-command-button";
import { BackToGraphButton } from "./back-to-graph-button";
import { FullscreenButton } from "./fullscreen-button";
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
  const setCurrentEditingNodeId = useUIStore(
    (state) => state.setCurrentEditingNodeId,
  );
  const sidebarMode = useUIStore((state) => state.sidebarMode);
  const mainViewType = useUIStore((state) => state.mainViewType);
  const setMainViewType = useUIStore((state) => state.setMainViewType);
  const toggleAttributesSidebar = useUIStore(
    (state) => state.toggleAttributesSidebar,
  );
  return (
    <header
      className={` z-10 flex flex-shrink-0 items-center justify-between pt-4 pb-2 px-6 ${className || ""}`}
    >
      {mainViewType === "editor" ? (
        <div
          className={`flex flex-1 justify-start items-center gap-0 p-0.5 transition-all  bg-fd-muted text-fd-muted-foreground z-10 pointer-events-auto ${sidebarMode === "fixed" ? "opacity-0" : ""}`}
        >
          <ToggleSidebarButton />
          <ToggleSearchCommandButton />
        </div>
      ) : (
        <div className="flex-1 justify-start">
          <FullscreenButton />
        </div>
      )}

      <div className="flex items-center gap-4 pointer-events-auto">
        <NodeTitle className="text-center border-none" />
        {mainViewType === "editor" ? (
          <BackToGraphButton
            className={``}
            onClick={() => {
              setMainViewType("graph");
              setCurrentEditingNodeId(null);
            }}
          />
        ) : null}
      </div>

      <div
        className={`flex flex-1 justify-end items-center gap-0 p-0.5 transition-all rounded-lg border-none bg-fd-muted text-fd-muted-foreground z-10 pointer-events-auto `}
      >
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
