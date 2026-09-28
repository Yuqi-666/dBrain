/**
 * Default view configs and default view instances.
 *
 * `defaultConfig` must be able to run on any source, including one with no
 * usable field of the type a view needs: a "smart default" that cannot find a
 * date field yields an empty `startField` string and the renderer shows the
 * missing-field guidance. Configs self-heal from `fields` alone (README §5.1).
 */
import type {
  CalendarViewConfig,
  ChartViewConfig,
  DataView,
  DataViewSource,
  DataViewType,
  GalleryViewConfig,
  GanttViewConfig,
  KanbanViewConfig,
  NodeGraphViewConfig,
  TableViewConfig,
} from "@workspace/interfaces";

import {
  dateFieldIds,
  firstGroupableFieldId,
  firstNumberFieldId,
  firstUrlFieldId,
  primaryFieldId,
  selectFieldIds,
} from "./source/field-utils";

const TABLE_DEFAULT_CONFIG = (source: DataViewSource): TableViewConfig => ({
  columns: source.fields.map((field, index) => ({
    fieldId: field.id,
    visible: true,
    frozen: index === 0,
  })),
  hiddenFieldIds: [],
  editable: source.kind === "database",
  selectable: true,
  sortable: true,
  filterable: true,
  resizable: true,
  reorderable: true,
  groupable: true,
  density: "comfortable",
  frozenColumnCount: 1,
  showRowNumber: true,
  theme: "auto",
});

const KANBAN_DEFAULT_CONFIG = (source: DataViewSource): KanbanViewConfig => ({
  groupByField: firstGroupableFieldId(source.fields) ?? "",
  titleField: primaryFieldId(source.fields) ?? "",
  cardFields: [],
  showCardCount: true,
  showUnassigned: true,
  allowDrag: source.kind === "database",
  allowCreate: source.kind === "database",
  compact: false,
});

const CALENDAR_DEFAULT_CONFIG = (
  source: DataViewSource,
): CalendarViewConfig => {
  const [startField, endField] = dateFieldIds(source.fields);
  return {
    startField: startField ?? "",
    endField,
    titleField: primaryFieldId(source.fields) ?? "",
    defaultView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
    },
    firstDay: 1,
    locale: "zh-CN",
    timeZone: "local",
    editable: source.kind === "database",
    selectable: false,
    eventClick: "open",
    eventLimit: true,
    height: "auto",
    showWeekends: true,
    nowIndicator: true,
    theme: "auto",
  };
};

const GANTT_DEFAULT_CONFIG = (source: DataViewSource): GanttViewConfig => {
  const [startField, endField] = dateFieldIds(source.fields);
  return {
    startField: startField ?? "",
    endField,
    titleField: primaryFieldId(source.fields) ?? "",
    progressField: firstNumberFieldId(source.fields),
    viewMode: "week",
    rowHeight: 36,
    showTodayLine: true,
    showWeekends: true,
    editable: source.kind === "database",
    theme: "auto",
  };
};

const GALLERY_DEFAULT_CONFIG = (source: DataViewSource): GalleryViewConfig => ({
  titleField: primaryFieldId(source.fields) ?? "",
  coverField: firstUrlFieldId(source.fields),
  badgeFields: selectFieldIds(source.fields),
  metaFields: [],
  layout: "grid",
  cardSize: "medium",
  columns: 4,
  showEmptyCover: true,
  selectable: true,
  virtualized: true,
});

const CHART_DEFAULT_CONFIG = (source: DataViewSource): ChartViewConfig => {
  const numberField = firstNumberFieldId(source.fields);
  return {
    chartType: "bar",
    dimensionField:
      firstGroupableFieldId(source.fields) ?? primaryFieldId(source.fields),
    // `__count` is the one measure that works without a number field.
    measures: [
      numberField
        ? { fieldId: numberField, aggregation: "sum" }
        : { fieldId: "__count" },
    ],
    aggregation: "sum",
    showLegend: true,
    showTooltip: true,
    showLabel: false,
    theme: "auto",
    clickAction: "none",
  };
};

const NODE_GRAPH_DEFAULT_CONFIG = (): NodeGraphViewConfig => ({
  // Flow mode is still a placeholder shell in @workspace/graph.
  viewType: "Force",
  visualConfig: { backgroundStyle: "grid", showMinimap: true },
  name: "节点图",
  showFilterEntry: true,
});

/** Builds the default config for `type` against a concrete source. */
export function createDefaultConfig(
  type: DataViewType,
  source: DataViewSource,
): DataView["config"] {
  switch (type) {
    case "table":
      return TABLE_DEFAULT_CONFIG(source);
    case "kanban":
      return KANBAN_DEFAULT_CONFIG(source);
    case "calendar":
      return CALENDAR_DEFAULT_CONFIG(source);
    case "gantt":
      return GANTT_DEFAULT_CONFIG(source);
    case "gallery":
      return GALLERY_DEFAULT_CONFIG(source);
    case "chart":
      return CHART_DEFAULT_CONFIG(source);
    case "nodeGraph":
      return NODE_GRAPH_DEFAULT_CONFIG();
  }
}

/** A reasonably unique view id without pulling in an id library. */
export function createDataViewId(): string {
  const globalCrypto = globalThis.crypto;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return `dv_${globalCrypto.randomUUID()}`;
  }
  return `dv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Deterministic id for the single view a node gets when it has none.
 *
 * Using a stable id (instead of a random one) keeps the seeded view identical
 * between the server render and hydration, and makes re-seeding idempotent.
 */
export function seedDataViewId(source: DataViewSource): string {
  return `dv_default_${source.nodeId ?? source.kind}`;
}

/**
 * Creates a view instance of `type` with a fresh id and a de-duplicated name
 * (`表格`, `表格 2`, …) derived from the existing view list.
 */
export function createDefaultDataView(
  type: DataViewType,
  source: DataViewSource,
  existing: readonly DataView[],
  label: string,
  id: string = createDataViewId(),
): DataView {
  const sameType = existing.filter((view) => view.type === type).length;
  const base = {
    id,
    name: sameType === 0 ? label : `${label} ${sameType + 1}`,
    isDefault: existing.length === 0,
  };
  const config = createDefaultConfig(type, source);

  // The discriminant must travel with its config; the call sites register the
  // matching renderer for the matching type, so this is the one place the
  // union is assembled dynamically.
  return { ...base, type, config } as DataView;
}
