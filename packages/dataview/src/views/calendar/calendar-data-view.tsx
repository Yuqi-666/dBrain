"use client";

import { CalendarDays } from "lucide-react";

import { DataViewPlaceholder } from "../../shared/data-view-placeholder";
import type {
  CalendarViewConfig,
  DataViewRendererProps,
} from "../../source/types";

/**
 * Calendar data view — placeholder.
 *
 * Planned implementation: FullCalendar (react, core, daygrid, timegrid, list,
 * multimonth, interaction).
 */
export function CalendarDataView({
  source,
  config,
  readOnly,
  onConfigChange,
  className,
}: DataViewRendererProps<CalendarViewConfig>) {
  return (
    <DataViewPlaceholder
      type="calendar"
      icon={CalendarDays}
      label="日历视图"
      description="计划基于 FullCalendar 实现月/周/日/列表视图与拖拽改期；当前仅渲染占位。"
      plannedDependencies={[
        "@fullcalendar/react",
        "@fullcalendar/core",
        "@fullcalendar/daygrid",
        "@fullcalendar/timegrid",
        "@fullcalendar/list",
        "@fullcalendar/multimonth",
        "@fullcalendar/interaction",
      ]}
      source={source}
      config={config}
      readOnly={readOnly}
      onConfigChange={onConfigChange}
      className={className}
    />
  );
}
