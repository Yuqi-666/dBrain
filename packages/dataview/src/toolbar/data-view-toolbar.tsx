"use client";

import { cn } from "@workspace/ui/lib/utils";
import type {
  DataView,
  DataViewId,
  DataViewSource,
  DataViewType,
} from "@workspace/interfaces";

import { ViewSwitcher } from "./view-switcher";

export interface DataViewToolbarProps {
  views: DataView[];
  activeView: DataView;
  source: DataViewSource;
  onViewsChange?: (views: DataView[]) => void;
  onCreateView?: (type: DataViewType) => void;
  onActiveViewChange?: (id: DataViewId) => void;
  className?: string;
}

/**
 * The view *switcher* strip: the tabs (renamed inline on the tab) and the "new
 * view" menu. Nothing else.
 *
 * View configuration does **not** live here — the design change moved it into
 * each view's own toolbar as buttons + dropdown menus
 * (`docs/propmt/dataview-table-1.md`) — and neither do the per-view actions
 * (设为默认 / 复制 / 删除): 更多 renders inside the view toolbar's function
 * group now, so the strip is pure navigation and its right edge holds no
 * buttons that could appear or move.
 *
 * The toolbar owns no name field: a rename arrives from the tab strip, and
 * every mutation produces a new `DataView[]` handed to `onViewsChange`; the
 * toolbar never persists anything itself.
 */
export function DataViewToolbar({
  views,
  activeView,
  source,
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

  return (
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
    </div>
  );
}
