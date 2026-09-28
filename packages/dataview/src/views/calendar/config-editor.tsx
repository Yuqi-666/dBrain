"use client";

import { DataViewConfigPlaceholder } from "../../shared/data-view-config-placeholder";
import type {
  CalendarViewConfig,
  DataViewConfigEditorProps,
} from "../../source/types";

/**
 * Config editor for the calendar data view — placeholder.
 */
export function CalendarConfigEditor({
  config,
  readOnly,
  className,
}: DataViewConfigEditorProps<CalendarViewConfig>) {
  return (
    <DataViewConfigPlaceholder
      type="calendar"
      config={config}
      readOnly={readOnly}
      className={className}
    />
  );
}
