"use client";

import { Copy, MoreHorizontal, PanelRight, Star, Trash2 } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Toggle } from "@workspace/ui/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/ui/tooltip";
import type {
  DataView,
  DataViewId,
  DataViewSource,
  DataViewType,
} from "@workspace/interfaces";

import { ViewSwitcher } from "./view-switcher";
import { createDataViewId } from "../defaults";

export interface DataViewToolbarProps {
  views: DataView[];
  activeView: DataView;
  source: DataViewSource;
  configPanelOpen: boolean;
  onToggleConfigPanel: () => void;
  onViewsChange?: (views: DataView[]) => void;
  onCreateView?: (type: DataViewType) => void;
  onActiveViewChange?: (id: DataViewId) => void;
  className?: string;
}

/**
 * View tabs (renamed inline on the tab), "new view" menu, per-view actions and
 * the config panel toggle — the whole top strip of `<DataViewRoot />`
 * (README §3.1).
 *
 * The toolbar owns no name field: a rename arrives as `onRenameView` from the
 * tab strip, and every mutation produces a new `DataView[]` handed to
 * `onViewsChange`; the toolbar never persists anything itself.
 *
 * It is one 36px strip: navigation on the left (a segmented track), view-level
 * actions on the right. Only the *pressed* state of the panel toggle and the
 * active tab carry any emphasis.
 */
export function DataViewToolbar({
  views,
  activeView,
  source,
  configPanelOpen,
  onToggleConfigPanel,
  onViewsChange,
  onCreateView,
  onActiveViewChange,
  className,
}: DataViewToolbarProps) {
  const canEditViews = Boolean(onViewsChange);

  /**
   * Renaming happens inline on the tab itself (double-click, see
   * `<ViewSwitcher>`); the toolbar only turns the reported name into the next
   * `DataView[]`.
   */
  const renameView = (id: DataViewId, name: string) => {
    onViewsChange?.(
      views.map((view) => (view.id === id ? { ...view, name } : view)),
    );
  };

  const duplicateActiveView = () => {
    if (!onViewsChange) return;
    const copy: DataView = {
      ...activeView,
      id: createDataViewId(),
      name: `${activeView.name} 副本`,
      isDefault: false,
    };
    onViewsChange([...views, copy]);
    onActiveViewChange?.(copy.id);
  };

  const deleteActiveView = () => {
    if (!onViewsChange || views.length <= 1) return;
    const remaining = views.filter((view) => view.id !== activeView.id);
    // Never leave the node without a default view.
    if (activeView.isDefault && remaining[0]) {
      remaining[0] = { ...remaining[0], isDefault: true };
    }
    onViewsChange(remaining);
    onActiveViewChange?.(remaining[0]?.id ?? "");
  };

  const setActiveViewAsDefault = () => {
    if (!onViewsChange) return;
    onViewsChange(
      views.map((view) => ({
        ...view,
        isDefault: view.id === activeView.id,
      })),
    );
  };

  return (
    <TooltipProvider delayDuration={400}>
      <div
        className={cn(
          "flex min-h-9 shrink-0 items-center gap-2 border-b border-border bg-background px-2 py-1",
          className,
        )}
      >
        <ViewSwitcher
          views={views}
          activeViewId={activeView.id}
          source={source}
          onCreateView={canEditViews ? onCreateView : undefined}
          onActiveViewChange={onActiveViewChange}
          onRenameView={canEditViews ? renameView : undefined}
        />

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                aria-label="配置面板"
                aria-pressed={configPanelOpen}
                pressed={configPanelOpen}
                className="size-7 min-w-7 text-muted-foreground data-[state=on]:text-foreground"
                onPressedChange={onToggleConfigPanel}
              >
                <PanelRight className="size-3.5" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom">视图配置</TooltipContent>
          </Tooltip>

          {canEditViews && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="size-7 text-muted-foreground"
                  aria-label="视图操作"
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onSelect={setActiveViewAsDefault}
                  disabled={activeView.isDefault}
                >
                  <Star className="size-4" />
                  设为默认视图
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={duplicateActiveView}>
                  <Copy className="size-4" />
                  复制视图
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={deleteActiveView}
                  disabled={views.length <= 1}
                >
                  <Trash2 className="size-4" />
                  删除视图
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
