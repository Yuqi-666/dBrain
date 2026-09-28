"use client";

import { DataViewConfigPlaceholder } from "../../shared/data-view-config-placeholder";
import type {
  DataViewConfigEditorProps,
  GanttViewConfig,
} from "../../source/types";

/**
 * Config editor for the gantt data view — placeholder.
 */
export function GanttConfigEditor({
  config,
  readOnly,
  className,
}: DataViewConfigEditorProps<GanttViewConfig>) {
  return (
    <DataViewConfigPlaceholder
      type="gantt"
      config={config}
      readOnly={readOnly}
      className={className}
    />
  );
}
