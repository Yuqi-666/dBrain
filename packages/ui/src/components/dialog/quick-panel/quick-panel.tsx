"use client";

import { useEffect, useRef } from "react";
import { useUIStore } from "@workspace/store";
import {
  Dialog,
  DialogContent,
} from "@workspace/ui/components/ui/dialog";
import { cn } from "@workspace/ui/lib/utils";
import { SearchMode } from "./search-mode";
import { AgentMode } from "./agent-mode";

export interface QuickPanelProps {
  className?: string;
}

export function QuickPanel({ className }: QuickPanelProps) {
  const quickPanel = useUIStore((state) => state.quickPanel);
  const setQuickPanelMode = useUIStore((state) => state.setQuickPanelMode);
  const toggleQuickPanelFromKeyboard = useUIStore(
    (state) => state.toggleQuickPanelFromKeyboard,
  );
  const closeQuickPanel = useUIStore((state) => state.closeQuickPanel);

  const panelOpenRef = useRef(quickPanel.open);
  panelOpenRef.current = quickPanel.open;
  const modeRef = useRef(quickPanel.mode);
  modeRef.current = quickPanel.mode;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggleQuickPanelFromKeyboard();
        return;
      }
      if (event.key === "Tab" && panelOpenRef.current) {
        event.preventDefault();
        setQuickPanelMode(modeRef.current === "search" ? "agent" : "search");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [toggleQuickPanelFromKeyboard, setQuickPanelMode]);

  return (
    <Dialog open={quickPanel.open} onOpenChange={closeQuickPanel}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "top-[15%] translate-y-0 flex flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl",
          className,
        )}
      >
        <div className="flex items-center gap-1 border-b p-1.5">
          <button
            type="button"
            onClick={() => setQuickPanelMode("search")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent",
              quickPanel.mode === "search" && "bg-accent text-foreground",
            )}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setQuickPanelMode("agent")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent",
              quickPanel.mode === "agent" && "bg-accent text-foreground",
            )}
          >
            Agent
          </button>
        </div>
        {quickPanel.mode === "search" ? <SearchMode /> : <AgentMode />}
      </DialogContent>
    </Dialog>
  );
}
