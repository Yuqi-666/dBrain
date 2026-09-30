"use client";

import { SquareKanban } from "lucide-react";

import { DataViewPlaceholder } from "../../shared/data-view-placeholder";
import type {
  DataViewRendererProps,
  KanbanViewConfig,
} from "../../source/types";

/**
 * Kanban data view — placeholder.
 *
 * Planned implementation: shadcn kanban lanes with @dnd-kit/core,
 * @dnd-kit/sortable and @dnd-kit/utilities.
 */
export function KanbanDataView({
  source,
  config,
  readOnly,
  onConfigChange,
  className,
}: DataViewRendererProps<KanbanViewConfig>) {
  return (
    <DataViewPlaceholder
      type="kanban"
      icon={SquareKanban}
      label="看板视图"
      description="计划基于 shadcn 看板与 dnd-kit 实现分组泳道与拖拽；当前仅渲染占位。"
      plannedDependencies={[
        "@dnd-kit/core",
        "@dnd-kit/sortable",
        "@dnd-kit/utilities",
      ]}
      source={source}
      config={config}
      readOnly={readOnly}
      onConfigChange={onConfigChange}
      className={className}
    />
  );
}
