"use client";

import { Network } from "lucide-react";

import { DataViewPlaceholder } from "../../shared/data-view-placeholder";
import type {
  DataViewRendererProps,
  NodeGraphViewConfig,
} from "../../source/types";

/**
 * Node graph data view — placeholder.
 *
 * Planned implementation: reuse the @workspace/graph <Graph /> router to
 * render a collection subgraph.
 */
export function NodeGraphDataView({
  source,
  config,
  readOnly,
  onConfigChange,
  className,
}: DataViewRendererProps<NodeGraphViewConfig>) {
  return (
    <DataViewPlaceholder
      type="nodeGraph"
      icon={Network}
      label="节点图视图"
      description="计划复用 @workspace/graph 的 <Graph /> 渲染 collection 子图；当前仅渲染占位。"
      plannedDependencies={["@workspace/graph"]}
      source={source}
      config={config}
      readOnly={readOnly}
      onConfigChange={onConfigChange}
      className={className}
    />
  );
}
