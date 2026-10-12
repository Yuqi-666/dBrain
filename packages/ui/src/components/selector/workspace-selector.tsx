"use client";
import { useI18n } from "@workspace/ui/lib/i18n";

import { useMemo } from "react";
import type { Workspace } from "@workspace/interfaces";
import { WorkspaceService } from "@workspace/services";
import { useUIStore, useWorkspaceStore } from "@workspace/store";
import { Button } from "@workspace/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Separator } from "@workspace/ui/components/ui/separator";
import { ChevronDownIcon, ChevronUpIcon, Globe, Plus } from "lucide-react";

export interface WorkSpaceSelectorProps {
  /**
   * Edge of the trigger the menu opens from. Defaults to `right`: the sidebar
   * panel is narrower than the menu, so dropping it downward would cover the
   * list it sits next to. A wide host such as the dashboard header passes
   * `bottom`.
   */
  side?: "top" | "right" | "bottom" | "left";
  /**
   * Gap in px between trigger and menu. Defaults to 12 for `side="right"` —
   * enough to clear the sidebar's right border — and 4 otherwise, matching the
   * other header menus.
   */
  sideOffset?: number;
}

/**
 * Workspace picker that owns its whole dropdown and trigger.
 *
 * Reads the workspace list from the store, switches through
 * `WorkspaceService.open` and creates through the global workspace dialog, so
 * any host can mount it without props. Styles use the sidebar tokens, which
 * resolve globally — the sidebar and the dashboard header both mount it as is.
 */
export function WorkSpaceSelector({
  side = "right",
  sideOffset,
}: WorkSpaceSelectorProps) {
  const { t } = useI18n();

  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const currentWorkspaceId = useWorkspaceStore(
    (state) => state.currentWorkspaceId,
  );
  const openCreateWorkspaceDialog = useUIStore(
    (state) => state.openWorkspaceCreateDialog,
  );
  const workspaceList = useMemo(
    () => Array.from(workspaces.values()),
    [workspaces],
  );
  const currentWorkspace = workspaceList.find(
    (w) => w.id === currentWorkspaceId,
  );

  const handleSelect = async (workspace: Workspace) => {
    if (workspace.id === currentWorkspaceId) return;
    try {
      await WorkspaceService.open(workspace.id);
    } catch (err) {
      console.error("[WorkSpaceSelector] switch workspace failed:", err);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-2.5 h-10 rounded-lg hover:bg-sidebar-accent transition-colors duration-200 group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Globe className="size-4 text-sidebar-primary shrink-0" />
            <span className="text-[13px] font-medium text-sidebar-foreground truncate">
              {currentWorkspace?.name ?? "Select workspace"}
            </span>
          </div>
          <div className="flex items-center text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60 transition-colors">
            <div className="flex flex-col items-center ml-1 leading-none">
              <ChevronUpIcon className="size-3" />
              <ChevronDownIcon className="size-3 -mt-1" />
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side={side}
        sideOffset={sideOffset ?? (side === "right" ? 12 : 4)}
        className="w-52 rounded-xl border-sidebar-border bg-sidebar p-1.5 shadow-lg"
      >
        {workspaceList.length > 0 ? (
          workspaceList.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => handleSelect(workspace)}
              className="rounded-lg px-2.5 py-2 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
            >
              {workspace.name}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem
            disabled
            className="rounded-lg px-2.5 py-2 text-[13px] text-sidebar-foreground/50 cursor-default"
          >
            {t("No workspaces")}{" "}
          </DropdownMenuItem>
        )}
        <Separator className="my-1.5 bg-sidebar-border" />
        <DropdownMenuItem
          onClick={() => openCreateWorkspaceDialog()}
          className="rounded-lg px-2.5 py-2 text-[13px] text-sidebar-primary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
        >
          <Plus className="mr-2 size-4" />
          {t("Create new workspace")}{" "}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
