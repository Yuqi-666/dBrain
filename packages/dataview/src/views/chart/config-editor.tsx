"use client";

import { DataViewConfigPlaceholder } from "../../shared/data-view-config-placeholder";
import type {
  ChartViewConfig,
  DataViewConfigEditorProps,
} from "../../source/types";

/**
 * Config editor for the chart data view — placeholder.
 */
export function ChartConfigEditor({
  config,
  readOnly,
  className,
}: DataViewConfigEditorProps<ChartViewConfig>) {
  return (
    <DataViewConfigPlaceholder
      type="chart"
      config={config}
      readOnly={readOnly}
      className={className}
    />
  );
}
