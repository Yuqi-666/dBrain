"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import type {
  DatabaseCell,
  DataView,
  DataViewConfig,
  DataViewId,
  DataViewSource,
  DataViewType,
} from "@workspace/interfaces";

import { DataViewConfigPanel } from "./config-panel/data-view-config-panel";
import { createDefaultDataView, seedDataViewId } from "./defaults";
import { getDataViewDescriptor, isDataViewTypeAllowed } from "./registry";
import { DataViewEmptyState } from "./shared/empty-state";
import {
  useRowFilteredSource,
  type RowFilterCondition,
} from "./shared/use-row-filter";
import { DataViewToolbar } from "./toolbar/data-view-toolbar";

/** The view a node gets when it has none yet. */
const DEFAULT_VIEW_TYPE_BY_KIND: Record<DataViewSource["kind"], DataViewType> =
  {
    // Table is the core view and works on both hosts (README §7).
    database: "table",
    collection: "table",
  };

export interface DataViewRootProps {
  /** Normalized data — build it with an adapter, never by hand. */
  source: DataViewSource;
  /**
   * This node's views. `DataViewRoot` seeds a default view when the list is
   * empty and reports it back through `onViewsChange`.
   *
   * The host should remount (`key={node.id}`) when it switches to a different
   * node: the internal view/active-view state is initialized once per mount.
   */
  views?: DataView[];
  activeViewId?: DataViewId;
  /**
   * Data is read-only (collection projections). Renderers must not offer
   * editing affordances. View management is controlled separately by whether
   * `onViewsChange` is supplied.
   */
  readOnly?: boolean;
  /** Config panel visibility on first render. */
  defaultConfigPanelOpen?: boolean;
  /** Cross-view row filter applied before the renderer sees the source. */
  rowFilter?: RowFilterCondition[];

  // —— view management ——
  onViewsChange?: (views: DataView[]) => void;
  onActiveViewChange?: (id: DataViewId) => void;

  // —— data interaction ——
  onCellChange?: (rowId: string, fieldId: string, cell: DatabaseCell) => void;
  onOpenRecord?: (rowId: string, source: DataViewSource) => void;
  onOpenNode?: (nodeId: string) => void;

  className?: string;
}

interface InitialDataViewState {
  views: DataView[];
  activeViewId: DataViewId;
  /** True when the default view had to be synthesized (nothing persisted yet). */
  seeded: boolean;
}

function resolveInitialState(
  source: DataViewSource,
  viewsProp: DataView[] | undefined,
  activeViewIdProp: DataViewId | undefined,
): InitialDataViewState {
  // Self-heal: a view type that is not allowed on this host kind (e.g.
  // nodeGraph on a database) is dropped rather than rendered.
  const allowed = (viewsProp ?? []).filter((view) =>
    isDataViewTypeAllowed(view.type, source.kind),
  );

  if (allowed.length > 0) {
    const active =
      (activeViewIdProp &&
        allowed.find((view) => view.id === activeViewIdProp)?.id) ||
      allowed.find((view) => view.isDefault)?.id ||
      allowed[0]!.id;
    return { views: allowed, activeViewId: active, seeded: false };
  }

  const type = DEFAULT_VIEW_TYPE_BY_KIND[source.kind];
  const created = createDefaultDataView(
    type,
    source,
    [],
    getDataViewDescriptor(type).label,
    seedDataViewId(source),
  );
  return { views: [created], activeViewId: created.id, seeded: true };
}

/**
 * The single public entry point of the data view component (README §3.2).
 *
 * It composes the three blocks — toolbar, active renderer, config panel — and
 * owns nothing but view-level UI state. Persisting a view change is the host's
 * job (`onViewsChange` → `NodeService.upsert`), and writing data is reported
 * upward through `onCellChange`; renderers never touch the store.
 */
export function DataViewRoot({
  source,
  views: viewsProp,
  activeViewId: activeViewIdProp,
  readOnly,
  defaultConfigPanelOpen = false,
  rowFilter,
  onViewsChange,
  onActiveViewChange,
  onCellChange,
  onOpenRecord,
  onOpenNode,
  className,
}: DataViewRootProps) {
  const [initial] = useState(() =>
    resolveInitialState(source, viewsProp, activeViewIdProp),
  );
  const [views, setViews] = useState<DataView[]>(initial.views);
  const [activeViewId, setActiveViewId] = useState<DataViewId>(
    initial.activeViewId,
  );
  const [configPanelOpen, setConfigPanelOpen] = useState(
    defaultConfigPanelOpen,
  );

  /**
   * View management (create / rename / delete / configure) is enabled by the
   * host passing `onViewsChange` — not by `readOnly`, which only says whether
   * the *data* may be edited. A read-only collection projection still lets the
   * user add and configure views.
   */
  const canManageViews = Boolean(onViewsChange);

  // Tell the host about a synthesized default view so it can persist it. Runs
  // once per mount; `DataViewRoot` is keyed by node id at the host.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    if (initial.seeded) onViewsChange?.(initial.views);
  }, [initial, onViewsChange]);

  const filteredSource = useRowFilteredSource(source, rowFilter);

  const activeView = views.find((view) => view.id === activeViewId) ?? views[0];

  const handleViewsChange = (next: DataView[]) => {
    setViews(next);
    onViewsChange?.(next);
  };

  const handleActiveViewChange = (id: DataViewId) => {
    setActiveViewId(id);
    onActiveViewChange?.(id);
  };

  const handleCreateView = (type: DataViewType) => {
    const created = createDefaultDataView(
      type,
      source,
      views,
      getDataViewDescriptor(type).label,
    );
    handleViewsChange([...views, created]);
    handleActiveViewChange(created.id);
  };

  const handleConfigChange = (viewId: DataViewId, config: DataViewConfig) => {
    handleViewsChange(
      views.map((view) =>
        view.id === viewId ? ({ ...view, config } as DataView) : view,
      ),
    );
  };

  if (!activeView) {
    return (
      <DataViewEmptyState
        icon={LayoutGrid}
        title="没有可用的数据视图"
        description="该节点的视图列表为空。"
        className={className}
      />
    );
  }

  const ActiveRenderer = getDataViewDescriptor(activeView.type).renderer;

  return (
    <div
      data-dataview-root={source.kind}
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden bg-background",
        className,
      )}
    >
      <DataViewToolbar
        views={views}
        activeView={activeView}
        source={source}
        configPanelOpen={configPanelOpen}
        onToggleConfigPanel={() => setConfigPanelOpen((open) => !open)}
        onViewsChange={canManageViews ? handleViewsChange : undefined}
        onCreateView={canManageViews ? handleCreateView : undefined}
        onActiveViewChange={handleActiveViewChange}
      />

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0 flex-1 overflow-auto">
          <Suspense
            fallback={
              <div className="flex flex-col gap-2 p-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-40 w-full" />
              </div>
            }
          >
            <ActiveRenderer
              source={filteredSource}
              config={activeView.config}
              readOnly={readOnly}
              onCellChange={onCellChange}
              onOpenRecord={onOpenRecord}
              onOpenNode={onOpenNode}
              className="h-full"
            />
          </Suspense>
        </div>

        {configPanelOpen && (
          <DataViewConfigPanel
            view={activeView}
            source={filteredSource}
            readOnly={readOnly}
            onConfigChange={canManageViews ? handleConfigChange : undefined}
          />
        )}
      </div>
    </div>
  );
}
