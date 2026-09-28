"use client";

import { DataViewConfigPlaceholder } from "../../shared/data-view-config-placeholder";
import type {
  DataViewConfigEditorProps,
  KanbanViewConfig,
} from "../../source/types";

/**
 * Config editor for the kanban data view — placeholder.
 */
export function KanbanConfigEditor({
  config,
  readOnly,
  className,
}: DataViewConfigEditorProps<KanbanViewConfig>) {
  return (
    <DataViewConfigPlaceholder
      type="kanban"
      config={config}
      readOnly={readOnly}
      className={className}
    />
  );
}
