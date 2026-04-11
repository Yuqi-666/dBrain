"use client";

import { ToggleSidebarButton } from "../toggle-sidebar-button";
import { ToggleSearchCommandButton } from "../toggle-search-command-button";
import { BackToGraphButton } from "./back-to-graph-button";
import { PinButton } from "./pin-button";
import { NodeInfoPanel } from "./node-info-panel";
import { OptionsMenu } from "./options-menu";
import { useUIStore, useGraphStore } from "@workspace/store";

interface EditorHeaderProps {
  className?: string;
}

export function EditorHeader({ className }: EditorHeaderProps) {
  const currentEditingNodeId = useUIStore(
    (state) => state.currentEditingNodeId,
  );
  const nodes = useGraphStore((state) => state.nodes);

  const currentNode = currentEditingNodeId
    ? nodes.get(currentEditingNodeId)
    : null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 border-none z-50 flex items-center justify-between py-4 px-6 pointer-events-none ${className || ""}`}
    >
      <div className="flex items-center gap-0 px-0.5 transition-opacity rounded-lg border bg-fd-muted text-fd-muted-foreground z-10 pointer-events-auto">
        <ToggleSidebarButton />
        <ToggleSearchCommandButton />
      </div>

      <div className="flex items-center gap-4 pointer-events-auto">
        <div className="flex py-2 px-4  transition-opacity rounded-md border bg-fd-muted text-fd-muted-foreground z-10">
          <span className="text-sm font-medium truncate max-w-[200px] ">
            {currentNode?.title || "未命名节点"}
          </span>
        </div>
        <BackToGraphButton />
      </div>

      <div className="flex items-center gap-1 pointer-events-auto">
        <PinButton />
        <NodeInfoPanel />
        <OptionsMenu nodeId={currentEditingNodeId} />
      </div>
    </header>
  );
}
