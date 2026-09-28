/**
 * Renderer-facing contract shared by every data view implementation.
 *
 * The persisted model (`DataView`, `DataViewType`, `DataViewSource`, …) lives
 * in `@workspace/interfaces` so node content can reference it without pulling
 * React. This module re-exports those types and adds the props contract that
 * renderers and config editors implement — the piece that is React-shaped and
 * therefore belongs to this package.
 */
import type {
  DatabaseCell,
  DataRow,
  DataView,
  DataViewConfig,
  DataViewSource,
  DataViewType,
} from "@workspace/interfaces";

export type {
  CalendarViewConfig,
  ChartMeasure,
  ChartViewConfig,
  DataRow,
  DataView,
  DataViewBase,
  DataViewCellChange,
  DataViewConfig,
  DataViewConfigOf,
  DataViewId,
  DataViewSource,
  DataViewSourceKind,
  DataViewType,
  GalleryViewConfig,
  GanttViewConfig,
  KanbanViewConfig,
  NodeGraphViewConfig,
  TableColumnConfig,
  TableViewConfig,
} from "@workspace/interfaces";

export { DATA_VIEW_TYPES } from "@workspace/interfaces";

/**
 * Props every view renderer receives.
 *
 * Renderers are strictly presentational: they never call `NodeService` or the
 * data store to write. A data change is reported through `onCellChange` and
 * the host node-content decides how to persist it (see README §3.4).
 */
export interface DataViewRendererProps<C = DataViewConfig> {
  /** Read-only normalized data. */
  source: DataViewSource;
  /** This view instance's own config, discriminated by the view's `type`. */
  config: C;
  /** Collection projections are read-only; database views are editable. */
  readOnly?: boolean;
  /** A cell (or card / event / task) edit made in a view. */
  onCellChange?: (rowId: string, fieldId: string, cell: DatabaseCell) => void;
  /** Open the record behind a row. */
  onOpenRecord?: (rowId: string, source: DataViewSource) => void;
  /** Open the graph node behind a row (collection only). */
  onOpenNode?: (nodeId: string) => void;
  /**
   * A change to this view's own config made *from the renderer* — a header sort
   * or column resize the user performed directly on the canvas rather than in
   * the config panel. Same ownership rule as `onCellChange`: the renderer
   * reports, the root persists (README §8 "排序/筛选/分组态回写 config").
   *
   * Absent when the host does not allow view management.
   */
  onConfigChange?: (config: C) => void;
  /** Insert a row (database hosts). `index` defaults to "append". */
  onRowInsert?: (row: DataRow, index?: number) => void;
  /** Delete rows by id (database hosts). */
  onRowDelete?: (rowIds: readonly string[]) => void;
  /** Reorder rows into the given id order (database hosts). */
  onRowReorder?: (rowIds: readonly string[]) => void;
  /**
   * Resolve a `relation` node id to its title for display. The host supplies it
   * because node titles live in the data store, which this package does not
   * depend on (dataview/AGENTS.md — kept store-free).
   */
  resolveNodeTitle?: (nodeId: string) => string | undefined;
  className?: string;
}

/** Props every config editor receives. */
export interface DataViewConfigEditorProps<C = DataViewConfig> {
  config: C;
  source: DataViewSource;
  readOnly?: boolean;
  onChange?: (config: C) => void;
  className?: string;
}

/** A view instance as it exists in memory, before `type`/`config` narrowing. */
export type AnyDataView = DataView;

/**
 * Narrows a view to a specific type. Kept here so toolbar and config panel can
 * narrow without importing the registry (which owns the lazy renderers).
 */
export function isDataViewOfType<T extends DataViewType>(
  view: DataView,
  type: T,
): view is Extract<DataView, { type: T }> {
  return view.type === type;
}
