"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LayoutGrid } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import type {
  DatabaseCell,
  DatabaseField,
  DataRow,
  DataView,
  DataViewConfig,
  DataViewId,
  DataViewSource,
  DataViewType,
  NodeData,
} from "@workspace/interfaces";

import { createDefaultDataView, seedDataViewId } from "./defaults";
import { getDataViewDescriptor, isDataViewTypeAllowed } from "./registry";
import { DataViewEmptyState } from "./shared/empty-state";
import {
  RecordActionsProvider,
  type OpenRecordOptions,
  type RecordActionsContextValue,
  type RecordMenuOptions,
} from "./shared/record-actions";
import { RecordMenuAtPoint } from "./shared/record-menu";
import {
  useRowFilteredSource,
  type RowFilterCondition,
} from "./shared/use-row-filter";
import { DataViewToolbar } from "./toolbar/data-view-toolbar";
import { ViewActionsMenu, ViewActionsProvider } from "./toolbar/view-actions";

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
  /** Cross-view row filter applied before the renderer sees the source. */
  rowFilter?: RowFilterCondition[];

  // —— view management ——
  onViewsChange?: (views: DataView[]) => void;
  onActiveViewChange?: (id: DataViewId) => void;

  // —— data interaction ——
  onCellChange?: (rowId: string, fieldId: string, cell: DatabaseCell) => void;
  /**
   * The user asked to open a record. **The shell only reports it**: the record
   * editing page is the host's — `database-node-content.tsx` /
   * `collection-node-content.tsx` render `<RecordEditor>` next to the shell,
   * because that is where a record's data and write path live. A host that
   * passes no `onOpenRecord` gets no record page when a record is clicked.
   *
   * `options.hiddenFieldIds` are the fields the calling view does *not* surface;
   * the host folds them into the editor's 隐藏字段 block.
   */
  onOpenRecord?: (rowId: string, options?: OpenRecordOptions) => void;
  onOpenNode?: (nodeId: string) => void;
  /** Insert a row into the host's data (database hosts only). */
  onRowInsert?: (row: DataRow, index?: number) => void;
  /** Delete rows from the host's data (database hosts only). */
  onRowDelete?: (rowIds: readonly string[]) => void;
  /** Reorder the host's rows into the given id order (database hosts only). */
  onRowReorder?: (rowIds: readonly string[]) => void;
  /**
   * Replace the schema — add / rename / retype / reorder / group / delete a
   * field (database hosts only). `rows` is present when the schema change also
   * rewrites cells (dropping a deleted field's cells, reseeding a retyped or
   * defaulted one); together they are one atomic content write.
   */
  onFieldsChange?: (fields: DatabaseField[], rows?: DataRow[]) => void;
  /** Resolve a relation node id to its title for display. */
  resolveNodeTitle?: (nodeId: string) => string | undefined;
  /**
   * Resolve a graph node id to the node itself (collection hosts). The gallery
   * uses it to draw a node's own preview as a card cover; see the renderer
   * contract in `source/types.ts`.
   */
  resolveNode?: (nodeId: string) => NodeData | undefined;

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
 * It composes the two blocks — the view tab strip and the active renderer —
 * and owns nothing but view-level UI state. Each renderer renders its own
 * toolbar (config on the left, functions on the right); there is no side config
 * panel (docs/propmt/dataview-table-1.md). Persisting a view change is the
 * host's job (`onViewsChange` → `NodeService.upsert`), and writing data is
 * reported upward through `onCellChange`; renderers never touch the store.
 */
export function DataViewRoot({
  source,
  views: viewsProp,
  activeViewId: activeViewIdProp,
  readOnly,
  rowFilter,
  onViewsChange,
  onActiveViewChange,
  onCellChange,
  onOpenRecord,
  onOpenNode,
  onRowInsert,
  onRowDelete,
  onRowReorder,
  onFieldsChange,
  resolveNodeTitle,
  resolveNode,
  className,
}: DataViewRootProps) {
  const [initial] = useState(() =>
    resolveInitialState(source, viewsProp, activeViewIdProp),
  );
  const [views, setViews] = useState<DataView[]>(initial.views);
  const [activeViewId, setActiveViewId] = useState<DataViewId>(
    initial.activeViewId,
  );

  /**
   * The record menu opened at a viewport point (the imperative path; see
   * `openRecordMenu`). Only surfaces that cannot wrap their record in a React
   * element use it — today the calendar's events.
   */
  const [recordMenuPoint, setRecordMenuPoint] = useState<{
    point: { x: number; y: number };
    rowId: string;
    options: {
      hiddenFieldIds?: readonly string[];
      sections?: RecordMenuOptions["sections"];
    };
  } | null>(null);

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

  /**
   * Opening a record = telling the host, which owns the record page.
   *
   * Every view reaches this through `useRecordActions().openRecord`, so "click a
   * record" still means the same thing in all four views; what it *does* is now
   * the host's decision (`onOpenRecord`), and the record editor lives in the
   * node content rather than in this shell.
   */
  const handleOpenRecord = useCallback(
    (rowId: string, options?: OpenRecordOptions) => {
      onOpenRecord?.(rowId, options);
    },
    [onOpenRecord],
  );

  const handleOpenRecordMenu = useCallback(
    (
      point: { x: number; y: number },
      rowId: string,
      options?: RecordMenuOptions,
    ) => {
      setRecordMenuPoint({ point, rowId, options: options ?? {} });
    },
    [],
  );

  const recordActions = useMemo<RecordActionsContextValue>(
    () => ({
      source,
      editable: !readOnly,
      onCellChange,
      onRowInsert,
      onRowDelete,
      onFieldsChange,
      onOpenNode,
      resolveNodeTitle,
      openRecord: handleOpenRecord,
      openRecordMenu: handleOpenRecordMenu,
    }),
    [
      source,
      readOnly,
      onCellChange,
      onRowInsert,
      onRowDelete,
      onFieldsChange,
      onOpenNode,
      resolveNodeTitle,
      handleOpenRecord,
      handleOpenRecordMenu,
    ],
  );

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

  /**
   * The shell's 更多 menu, rendered by the active view's own toolbar.
   *
   * View management belongs to the toolbar's function group now (design change
   * in `docs/propmt/dataview-table-1.md`), so the actions are published as a
   * slot and `ViewToolbar` / `TableToolbar` place them; the tab strip above
   * stays pure navigation.
   */
  const viewActions = canManageViews ? (
    <ViewActionsMenu
      views={views}
      activeView={activeView}
      onViewsChange={handleViewsChange}
      onActiveViewChange={handleActiveViewChange}
    />
  ) : undefined;

  return (
    <ViewActionsProvider actions={viewActions}>
      <RecordActionsProvider value={recordActions}>
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
            onViewsChange={canManageViews ? handleViewsChange : undefined}
            onCreateView={canManageViews ? handleCreateView : undefined}
            onActiveViewChange={handleActiveViewChange}
          />

          <div className="flex min-h-0 flex-1">
            {/**
             * The renderer box: fixed size, **never a scroll container**.
             *
             * Each renderer owns its own scrolling (the table's VTable canvas
             * scrolls itself; the placeholders carry an inner `overflow-auto`).
             * With `overflow: auto` here, a renderer that fills the pane exactly —
             * as every one of them does — could push the box 1px past its own
             * height, and the scrollbar that appeared stole 10px off the renderer
             * in *both* axes (10px in a HiDPI window). A canvas library that
             * stamps its own rounded pixel size (VTable does:
             * `style.width = parentElement.offsetWidth`, which rounds a
             * fractional box up) then re-measured a smaller box, re-wrapped its
             * toolbar, re-overflowed, … and the table's size visibly flickered
             * between two values 10px apart. Keeping this box `overflow: hidden`
             * means a renderer's own spill can never resize it.
             */}
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
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
                  onOpenNode={onOpenNode}
                  onConfigChange={
                    canManageViews
                      ? (config) => handleConfigChange(activeView.id, config)
                      : undefined
                  }
                  onRowInsert={onRowInsert}
                  onRowDelete={onRowDelete}
                  onRowReorder={onRowReorder}
                  onFieldsChange={onFieldsChange}
                  resolveNodeTitle={resolveNodeTitle}
                  resolveNode={resolveNode}
                  className="h-full"
                />
              </Suspense>
            </div>
          </div>

          {/**
           * The record *menu* is still the shell's: it is chrome over a record,
           * not a page. Its 打开记录 item goes through `openRecord`, i.e. out to
           * the host's `onOpenRecord` — the same path a click on the record
           * takes.
           */}
          {recordMenuPoint && (
            <RecordMenuAtPoint
              point={recordMenuPoint.point}
              rowId={recordMenuPoint.rowId}
              hiddenFieldIds={recordMenuPoint.options.hiddenFieldIds}
              sections={recordMenuPoint.options.sections}
              onClose={() => setRecordMenuPoint(null)}
            />
          )}
        </div>
      </RecordActionsProvider>
    </ViewActionsProvider>
  );
}
