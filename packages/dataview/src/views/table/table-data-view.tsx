"use client";

import { Table2 } from "lucide-react";

import { DataViewPlaceholder } from "../../shared/data-view-placeholder";
import type {
  DataViewRendererProps,
  TableViewConfig,
} from "../../source/types";

/**
 * Table data view — placeholder.
 *
 * Planned implementation: @visactor/vtable with vtable-editors, vtable-export
 * and vtable-search.
 */
export function TableDataView({
  source,
  config,
  readOnly,
  className,
}: DataViewRendererProps<TableViewConfig>) {
  return (
    <DataViewPlaceholder
      type="table"
      icon={Table2}
      label="表格视图"
      description="计划基于 @visactor/vtable 实现可编辑二维表；当前仅渲染占位。"
      plannedDependencies={[
        "@visactor/vtable",
        "@visactor/vtable-editors",
        "@visactor/vtable-export",
        "@visactor/vtable-search",
      ]}
      source={source}
      config={config}
      readOnly={readOnly}
      className={className}
    />
  );
}
