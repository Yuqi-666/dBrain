"use client";

/**
 * The data view registry — the single place a view type is declared.
 *
 * Adding a view means implementing its renderer (+ config editor, unless every
 * setting lives in its toolbar) and adding one entry here; `DataViewRoot` and the
 * toolbars all read this table and never switch on `DataViewType` themselves
 * (README §6).
 *
 * Renderers and config editors are `React.lazy` so a view's third-party bundle
 * (VTable, FullCalendar, VChart, …) is only fetched the first time that view is
 * opened (README §3.3/§9.1).
 */
import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import {
  CalendarDays,
  ChartGantt,
  ChartPie,
  Images,
  Network,
  SquareKanban,
  Table2,
} from "lucide-react";
import type {
  DataViewConfig,
  DataViewConfigOf,
  DataViewSource,
  DataViewSourceKind,
  DataViewType,
} from "@workspace/interfaces";

import { createDefaultConfig } from "./defaults";
import type {
  DataViewConfigEditorProps,
  DataViewRendererProps,
} from "./source/types";

export type DataViewRendererComponent = ComponentType<
  DataViewRendererProps<DataViewConfig>
>;
export type DataViewConfigEditorComponent = ComponentType<
  DataViewConfigEditorProps<DataViewConfig>
>;

export interface DataViewDescriptor {
  type: DataViewType;
  /** Menu / tab label, e.g. "表格". */
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Host kinds this view may appear on. */
  nodeTypes: DataViewSourceKind[];
  renderer: LazyExoticComponent<DataViewRendererComponent>;
  /**
   * The view's generic config editor — **absent when the view configures itself
   * entirely from its own toolbar** (the table does: 添加记录 / 字段配置 / 筛选 /
   * 分组 / 排序 / 行高 / 填色 are all dedicated menus, and there is no
   * 视图配置 popover any more).
   */
  configEditor?: LazyExoticComponent<DataViewConfigEditorComponent>;
  defaultConfig: (source: DataViewSource) => DataViewConfig;
}

/**
 * Wraps a per-type renderer so the registry stays uniformly typed. The cast is
 * confined here: each call site still proves that the module it loads has the
 * renderer signature of the type it is registered under.
 */
function defineRenderer<T extends DataViewType>(
  loader: () => Promise<{
    default: ComponentType<DataViewRendererProps<DataViewConfigOf<T>>>;
  }>,
): LazyExoticComponent<DataViewRendererComponent> {
  return lazy(
    loader,
  ) as unknown as LazyExoticComponent<DataViewRendererComponent>;
}

function defineConfigEditor<T extends DataViewType>(
  loader: () => Promise<{
    default: ComponentType<DataViewConfigEditorProps<DataViewConfigOf<T>>>;
  }>,
): LazyExoticComponent<DataViewConfigEditorComponent> {
  return lazy(
    loader,
  ) as unknown as LazyExoticComponent<DataViewConfigEditorComponent>;
}

export const DATA_VIEW_REGISTRY: Record<DataViewType, DataViewDescriptor> = {
  table: {
    type: "table",
    label: "表格",
    icon: Table2,
    nodeTypes: ["database", "collection"],
    renderer: defineRenderer<"table">(() =>
      import("./views/table/table-data-view").then((module) => ({
        default: module.TableDataView,
      })),
    ),
    // No `configEditor`: the table's configuration is the toolbar's menus.
    defaultConfig: (source) => createDefaultConfig("table", source),
  },
  kanban: {
    type: "kanban",
    label: "看板",
    icon: SquareKanban,
    nodeTypes: ["database", "collection"],
    renderer: defineRenderer<"kanban">(() =>
      import("./views/kanban/kanban-data-view").then((module) => ({
        default: module.KanbanDataView,
      })),
    ),
    // No `configEditor`: the kanban's four settings panels (分组 / 卡片 / 排序 /
    // 显示) are its toolbar, exactly like the table's seven menus.
    defaultConfig: (source) => createDefaultConfig("kanban", source),
  },
  calendar: {
    type: "calendar",
    label: "日历",
    icon: CalendarDays,
    nodeTypes: ["database", "collection"],
    renderer: defineRenderer<"calendar">(() =>
      import("./views/calendar/calendar-data-view").then((module) => ({
        default: module.CalendarDataView,
      })),
    ),
    // No `configEditor`: 字段 / 视图 / 交互 / 显示 are the calendar's own toolbar
    // panels, exactly like the table's seven menus and the kanban's four.
    defaultConfig: (source) => createDefaultConfig("calendar", source),
  },
  gantt: {
    type: "gantt",
    label: "甘特图",
    icon: ChartGantt,
    // Gantt needs a start/end date pair; collection exposes created/updated.
    nodeTypes: ["database", "collection"],
    renderer: defineRenderer<"gantt">(() =>
      import("./views/gantt/gantt-data-view").then((module) => ({
        default: module.GanttDataView,
      })),
    ),
    // No `configEditor`: 字段配置 / 视图 cover every `GanttViewConfig` key a user
    // can decide (the five roles as config items, plus 粒度 / 行高 / 今日线 /
    // 周末), exactly like the table's menus, the kanban's panels and the
    // calendar's two.
    defaultConfig: (source) => createDefaultConfig("gantt", source),
  },
  gallery: {
    type: "gallery",
    label: "画廊",
    icon: Images,
    nodeTypes: ["database", "collection"],
    renderer: defineRenderer<"gallery">(() =>
      import("./views/gallery/gallery-data-view").then((module) => ({
        default: module.GalleryDataView,
      })),
    ),
    // No `configEditor`: 字段 / 布局 / 显示 are the gallery's own toolbar panels,
    // exactly like the table's menus, the kanban's four and the calendar's four.
    defaultConfig: (source) => createDefaultConfig("gallery", source),
  },
  chart: {
    type: "chart",
    label: "图表",
    icon: ChartPie,
    nodeTypes: ["database", "collection"],
    renderer: defineRenderer<"chart">(() =>
      import("./views/chart/chart-data-view").then((module) => ({
        default: module.ChartDataView,
      })),
    ),
    // No `configEditor`: 图表 / 字段配置 / 视图 cover every `ChartViewConfig` key
    // a user can decide (the type catalogue, the role encodings, and the
    // presentation), exactly like the table's seven menus and the gantt's two
    // panels.
    defaultConfig: (source) => createDefaultConfig("chart", source),
  },
  nodeGraph: {
    type: "nodeGraph",
    label: "节点图",
    icon: Network,
    // Database rows are not graph nodes, so there is nothing to draw.
    nodeTypes: ["collection"],
    renderer: defineRenderer<"nodeGraph">(() =>
      import("./views/node-graph/node-graph-data-view").then((module) => ({
        default: module.NodeGraphDataView,
      })),
    ),
    configEditor: defineConfigEditor<"nodeGraph">(() =>
      import("./views/node-graph/config-editor").then((module) => ({
        default: module.NodeGraphConfigEditor,
      })),
    ),
    defaultConfig: (source) => createDefaultConfig("nodeGraph", source),
  },
};

/** Registry order — used for the "new view" menu and tab ordering. */
export const DATA_VIEW_DESCRIPTOR_LIST: DataViewDescriptor[] =
  Object.values(DATA_VIEW_REGISTRY);

export function getDataViewDescriptor(type: DataViewType): DataViewDescriptor {
  return DATA_VIEW_REGISTRY[type];
}

/** Descriptors whose `nodeTypes` allow `kind` (capability matrix, README §7). */
export function getDataViewDescriptorsForKind(
  kind: DataViewSourceKind,
): DataViewDescriptor[] {
  return DATA_VIEW_DESCRIPTOR_LIST.filter((descriptor) =>
    descriptor.nodeTypes.includes(kind),
  );
}

export function isDataViewTypeAllowed(
  type: DataViewType,
  kind: DataViewSourceKind,
): boolean {
  return DATA_VIEW_REGISTRY[type].nodeTypes.includes(kind);
}
