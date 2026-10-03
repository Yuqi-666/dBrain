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

/**
 * A named column group (字段配置 → 创建编组).
 *
 * `config.columns` stays the single authoritative field order; a group names a
 * set of fields that render under one VTable group header. The table pulls each
 * group's members together at the position of the group's first member, so a
 * group is always a contiguous visual block without a second ordering source.
 */
export interface TableColumnGroup {
  id: string;
  name: string;
  /** Member field ids, in display order. */
  fieldIds: string[];
}

/** One level of the 分组 / 排序 menus. */
export interface TableCondition {
  fieldId: string;
  order: "asc" | "desc";
}

/** The operators a filter / colour condition offers. */
export type TableConditionOperator =
  | "contains"
  | "equals"
  | "empty"
  | "notEmpty";

/**
 * One filter condition (筛选).
 *
 * Persisted inside `TableViewConfig.filterState`; the runtime reader also
 * accepts the legacy `{ [fieldId]: { operator, value } }` record so a view
 * saved before the condition list existed keeps working.
 */
export interface TableFilterCondition {
  id: string;
  fieldId: string;
  operator: TableConditionOperator;
  value?: string;
}

/** Where a conditional colour rule paints (填色 → 单元格 / 行 / 列). */
export type TableColorTarget = "cell" | "row" | "column";

/**
 * One conditional-colour rule.
 *
 * `fieldId` is both the condition field and — for `target: "cell"` — the column
 * that gets painted, which is what the 填色 menu offers (one field picker).
 */
export interface TableColorRule {
  id: string;
  target: TableColorTarget;
  fieldId: string;
  operator: TableConditionOperator;
  value?: string;
  /** Any CSS colour the canvas understands (hex from the preset palette). */
  color: string;
}

export interface TableViewConfig {
  columns: TableColumnConfig[];
  hiddenFieldIds?: string[];
  /** Named column groups; see {@link TableColumnGroup}. */
  columnGroups?: TableColumnGroup[];

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
  theme: "light" | "dark" | "auto";

  sortState?: TableCondition[];
  /** Re-apply `sortState` after a data change (排序 → 自动排序). */
  autoSort?: boolean;
  /**
   * The 筛选 conditions, ANDed in order.
   *
   * Declared as the condition list, but always *read* defensively: a view saved
   * before the list existed carries the legacy `{ [fieldId]: { operator,
   * value } }` record, which `readFilterState` migrates.
   */
  filterState?: TableFilterCondition[];
  groupBy?: string[];
  /** Per-level direction of the `groupBy` fields (分组 → A→Z / Z→A). */
  groupOrder?: Record<string, "asc" | "desc">;
  /** Conditional colours; see {@link TableColorRule}. */
  colorRules?: TableColorRule[];
}

/**
 * The card presentation the card-shaped views share — **a config fragment, not
 * a view config**.
 *
 * Kanban and gallery both draw records as cards, so both persist the same four
 * keys and render the same 卡片配置 menu (`shared/card-config.tsx`) over them; a
 * card therefore looks and configures the same in either view. Everything a
 * card needs beyond this (lanes, layout, card size) stays on the view's own
 * config.
 *
 * `titleField` / `coverField` are ids into the live schema and self-heal
 * (`shared/card-ops.ts`): a deleted field degrades instead of throwing.
 * `compact` is 展示模式 (常规 / 紧凑) — a boolean, so an old config's
 * `compact: false` stays valid.
 */
export interface DataCardConfig {
  /** The field drawn as the card's title (locked at the top of 卡片配置). */
  titleField?: string;
  /** The field whose value becomes the cover; absent → no configured cover. */
  coverField?: string;
  /** The fields drawn under the card title, in card order. */
  cardFields?: string[];
  /** 展示模式: `true` = 紧凑 (tighter spacing, fewer values). */
  compact?: boolean;
}

/**
 * The kanban's own config.
 *
 * A card is the shared {@link DataCardConfig} fragment; what is left here is how
 * rows become lanes. Dragging, creating a card and the lane counts are **not**
 * configurable any more: they were three switches of the 显示 panel whose
 * defaults were the right answer every time, so the board now behaves like the
 * default — cards move whenever the host allows cell writes, a lane offers "new
 * card" whenever the host allows row inserts, and a lane always states how many
 * cards it holds.
 */
export interface KanbanViewConfig extends DataCardConfig {
  groupByField: string;
  /**
   * The card order, as the same multi-level condition list the table's 排序
   * writes (first level wins, later levels break its ties).
   *
   * A board saved before this list existed carries the legacy single-level
   * `sortBy`, which the kanban reads as a one-level `sortState`.
   */
  sortState?: TableCondition[];
  /** Legacy single-level sort; superseded by `sortState`. */
  sortBy?: { fieldId: string; order: "asc" | "desc" };
  laneOrder?: string[];
  showUnassigned: boolean;
}

/**
 * The calendar's own config.
 *
 * A calendar field is a *role* (start / end / title / colour / tooltip), and the
 * header buttons are the view switcher; those are the only things here. The
 * 交互 and 显示 panels are gone: a drag writes whenever the host allows cell
 * writes, a drag over blank days creates a row whenever the host allows row
 * inserts, an event click opens the record, and the presentation (locale,
 * height, weekend columns, the "now" line, folding a busy day, theme) is the
 * fixed default set in `views/calendar/core/config.ts` — every one of those had
 * exactly one right answer.
 */
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
  /** Persisted for v1 compatibility; the surface pins it to `local`. */
  timeZone: "local" | string;
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

/**
 * The gallery's own config.
 *
 * A card is a title, a cover and a handful of field values, and that half of it
 * is the shared {@link DataCardConfig} — the same shape the kanban persists, so
 * both views render one card component and one 卡片配置 menu. What is left here
 * is how the wall arranges those cards.
 *
 * The first implementation let the user tune more (an explicit column count, a
 * "virtualize" switch, a "show a placeholder cover" switch, and two separate
 * field lists for chips and meta rows); each either had one right answer or was
 * already implied by the layout. Legacy configs (`badgeFields` / `metaFields` /
 * `columns` / …) are still read by `shared/card-ops.ts`, which folds the old
 * field lists into `cardFields`.
 */
export interface GalleryViewConfig extends DataCardConfig {
  layout: "grid" | "masonry" | "list";
  cardSize: "small" | "medium" | "large";
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
