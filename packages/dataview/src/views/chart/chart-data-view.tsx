"use client";

import { ChartPie } from "lucide-react";

import { DataViewPlaceholder } from "../../shared/data-view-placeholder";
import type {
  ChartViewConfig,
  DataViewRendererProps,
} from "../../source/types";

/**
 * Chart data view — placeholder.
 *
 * Planned implementation: VChart via @visactor/vchart and
 * @visactor/react-vchart.
 */
export function ChartDataView({
  source,
  config,
  readOnly,
  onConfigChange,
  className,
}: DataViewRendererProps<ChartViewConfig>) {
  return (
    <DataViewPlaceholder
      type="chart"
      icon={ChartPie}
      label="图表视图"
      description="计划基于 VChart 实现维度/度量编码与聚合；当前仅渲染占位。"
      plannedDependencies={["@visactor/vchart", "@visactor/react-vchart"]}
      source={source}
      config={config}
      readOnly={readOnly}
      onConfigChange={onConfigChange}
      className={className}
    />
  );
}
