"use client";

import { DataViewConfigPlaceholder } from "../../shared/data-view-config-placeholder";
import type {
  DataViewConfigEditorProps,
  TableViewConfig,
} from "../../source/types";

/**
 * Config editor for the table data view — placeholder.
 */
export function TableConfigEditor({
  config,
  readOnly,
  className,
}: DataViewConfigEditorProps<TableViewConfig>) {
  return (
    <DataViewConfigPlaceholder
      type="table"
      config={config}
      readOnly={readOnly}
      className={className}
    />
  );
}
