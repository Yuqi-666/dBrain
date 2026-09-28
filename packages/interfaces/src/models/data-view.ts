/**
 * DataView — the multi-shape data browsing layer embedded in `database` and
 * `collection` node contents.
 *
 * Names are deliberately `Data`-prefixed to stay distinct from the workspace
 * level graph `View` (`./view.ts`): a `View` is a graph layout over nodes and
 * edges, a `DataView` is one way of looking at a single node's tabular data.
 *
 * Everything here is pure data — no React, no third-party library types — so
 * the persisted shape can live on node content and round-trip through the API
 * without dragging view implementations along. The renderer contract that
 * consumes it is declared in `@workspace/dataview`.
 *
 * See `docs/dataview/README.md` for the full design.
 */
import type { FilterConfig } from "./filter";
import type { NodeId } from "./node/base";
import type {
  DatabaseCell,
  DatabaseField,
  DatabaseRow,
} from "./node/nodes/complex/database";
import type { VisualConfig, ViewType } from "./view";

// ============================================================================
// Data source (normalized)
// ============================================================================

/** Which host node a {@link DataViewSource} was projected from. */
export type DataViewSourceKind = "database" | "collection";

/** A row of a data view. Identical to a database row for both host kinds. */
export type DataRow = DatabaseRow;

/**
 * The single normalized shape every data view renderer consumes.
 *
 * `database` maps its self-contained table onto it directly; `collection`
 * projects selected graph nodes into a fixed node-attribute schema so the
 * renderers never need a second data path.
 */
export interface DataViewSource {
  kind: DataViewSourceKind;
  /** Id of the host node, when the adapter knows it. */
  nodeId?: string;
  fields: DatabaseField[];
  rows: DataRow[];
  /** Only `collection`: the host filter config, read by the nodeGraph view. */
  filterConfig?: FilterConfig;
  /** Only `collection`: node id for each row, index-aligned with `rows`. */
  nodeIds?: NodeId[];
}

// ============================================================================
// View identity
// ============================================================================

export type DataViewId = string;

/**
 * Every data view shape the registry knows about.
 *
 * The runtime list is the single source of truth: the union is derived from
 * it, so adding a shape means touching this array plus the registry entry.
 */
export const DATA_VIEW_TYPES = [
  "table",
  "kanban",
  "calendar",
  "gantt",
  "gallery",
  "chart",
  "nodeGraph",
] as const;

export type DataViewType = (typeof DATA_VIEW_TYPES)[number];

export interface DataViewBase {
  id: DataViewId;
  name: string;
  type: DataViewType;
  /** The view opened first when the host node has no explicit selection. */
  isDefault?: boolean;
}

// ============================================================================
// Per-type configs
// ============================================================================

export interface TableColumnConfig {
  fieldId: string;
  width?: number;
  visible: boolean;
  frozen?: boolean;
  /** Overrides the cell type derived from the field type. */
  cellTypeOverride?: string;
  format?: {
    dateFormat?: string;
    numberFormat?: string;
    emptyText?: string;
  };
}

export interface TableViewConfig {
  columns: TableColumnConfig[];
  hiddenFieldIds?: string[];

  editable: boolean;
  selectable: boolean;
  sortable: boolean;
  filterable: boolean;
  resizable: boolean;
  reorderable: boolean;
  groupable: boolean;

  density: "compact" | "comfortable" | "spacious";
  frozenColumnCount: number;
  showRowNumber: boolean;
  /** Render cap; `undefined` renders every row (ListTable virtualizes). */
  rowLimit?: number;
  theme: "light" | "dark" | "auto";

  sortState?: { fieldId: string; order: "asc" | "desc" }[];
  filterState?: Record<string, unknown>;
  groupBy?: string[];
}

export interface KanbanViewConfig {
  groupByField: string;
  titleField: string;
  cardFields?: string[];
  sortBy?: { fieldId: string; order: "asc" | "desc" };
  laneOrder?: string[];
  showCardCount: boolean;
  showUnassigned: boolean;
  allowDrag: boolean;
  allowCreate: boolean;
  compact: boolean;
}

export interface CalendarViewConfig {
  startField: string;
  endField?: string;
  titleField: string;
  colorField?: string;
  tooltipFields?: string[];

  defaultView:
    | "dayGridMonth"
    | "timeGridWeek"
    | "timeGridDay"
    | "listWeek"
    | "multiMonth";
  headerToolbar: { left: string; center: string; right: string };
  firstDay: number;
  locale: string;
  timeZone: "local" | string;

  editable: boolean;
  selectable: boolean;
  eventClick: "open" | "popover" | "none";
  eventLimit: boolean | number;

  height: "auto" | number;
  showWeekends: boolean;
  nowIndicator: boolean;
  theme: "light" | "dark" | "auto";
}

export interface GanttViewConfig {
  startField: string;
  endField?: string;
  titleField: string;
  progressField?: string;
  groupByField?: string;

  viewMode: "day" | "week" | "month";
  rowHeight: number;
  showTodayLine: boolean;
  showWeekends: boolean;
  minDate?: string;
  maxDate?: string;
  editable: boolean;
  theme: "light" | "dark" | "auto";
}

export interface GalleryViewConfig {
  titleField: string;
  coverField?: string;
  badgeFields?: string[];
  metaFields?: string[];

  layout: "grid" | "masonry" | "list";
  cardSize: "small" | "medium" | "large";
  columns: number;
  showEmptyCover: boolean;
  selectable: boolean;
  virtualized: boolean;
}

export type ChartAggregation = "sum" | "avg" | "count" | "min" | "max";

export interface ChartMeasure {
  /** A `number` field id, or `__count` for a plain row count. */
  fieldId: string;
  aggregation?: Exclude<ChartAggregation, "count">;
  alias?: string;
}

export interface ChartViewConfig {
  chartType: string;
  dimensionField?: string;
  measures: ChartMeasure[];
  seriesField?: string;

  xMeasure?: string;
  yMeasure?: string;
  sourceField?: string;
  targetField?: string;
  hierarchyFields?: string[];

  aggregation: ChartAggregation;
  sortBy?: { measureIndex: number; order: "asc" | "desc" };
  limit?: number;

  title?: string;
  showLegend: boolean;
  showTooltip: boolean;
  showLabel: boolean;
  theme: "light" | "dark" | "auto";
  colorScheme?: string;

  clickAction: "filter" | "open" | "none";
}

export interface NodeGraphViewConfig {
  /** Graph layout mode — `Flow` is still a placeholder shell in @workspace/graph. */
  viewType: ViewType;
  visualConfig: VisualConfig;
  name?: string;
  showFilterEntry: boolean;
}

/** Discriminated on `type`; narrowing yields the matching config shape. */
export type DataView =
  | (DataViewBase & { type: "table"; config: TableViewConfig })
  | (DataViewBase & { type: "kanban"; config: KanbanViewConfig })
  | (DataViewBase & { type: "calendar"; config: CalendarViewConfig })
  | (DataViewBase & { type: "gantt"; config: GanttViewConfig })
  | (DataViewBase & { type: "gallery"; config: GalleryViewConfig })
  | (DataViewBase & { type: "chart"; config: ChartViewConfig })
  | (DataViewBase & { type: "nodeGraph"; config: NodeGraphViewConfig });

/** Config of a specific data view type, for generic helpers. */
export type DataViewConfigOf<T extends DataViewType> = Extract<
  DataView,
  { type: T }
>["config"];

export type DataViewConfig = DataView["config"];

/** A cell write bubbling up from a renderer. */
export interface DataViewCellChange {
  rowId: string;
  fieldId: string;
  cell: DatabaseCell;
}
