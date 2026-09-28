"use client";

import { DataViewConfigPlaceholder } from "../../shared/data-view-config-placeholder";
import type {
  DataViewConfigEditorProps,
  NodeGraphViewConfig,
} from "../../source/types";

/**
 * Config editor for the node graph data view — placeholder.
 */
export function NodeGraphConfigEditor({
  config,
  readOnly,
  className,
}: DataViewConfigEditorProps<NodeGraphViewConfig>) {
  return (
    <DataViewConfigPlaceholder
      type="nodeGraph"
      config={config}
      readOnly={readOnly}
      className={className}
    />
  );
}
