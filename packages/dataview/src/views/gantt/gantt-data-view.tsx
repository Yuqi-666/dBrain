"use client";

import { ChartGantt } from "lucide-react";

import { DataViewPlaceholder } from "../../shared/data-view-placeholder";
import type {
  DataViewRendererProps,
  GanttViewConfig,
} from "../../source/types";

/**
 * Gantt data view — placeholder.
 *
 * Planned implementation: @visactor/vtable-gantt built on @visactor/vtable.
 */
export function GanttDataView({
  source,
  config,
  readOnly,
  className,
}: DataViewRendererProps<GanttViewConfig>) {
  return (
    <DataViewPlaceholder
      type="gantt"
      icon={ChartGantt}
      label="甘特图视图"
      description="计划基于 @visactor/vtable-gantt 实现时间轴任务条与日期写回；当前仅渲染占位。"
      plannedDependencies={["@visactor/vtable", "@visactor/vtable-gantt"]}
      source={source}
      config={config}
      readOnly={readOnly}
      className={className}
    />
  );
}
