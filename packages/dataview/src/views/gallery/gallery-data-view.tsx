"use client";

import { Images } from "lucide-react";

import { DataViewPlaceholder } from "../../shared/data-view-placeholder";
import type {
  DataViewRendererProps,
  GalleryViewConfig,
} from "../../source/types";

/**
 * Gallery data view — placeholder.
 *
 * Planned implementation: custom card grid/masonry on top of @workspace/ui
 * (shadcn) primitives.
 */
export function GalleryDataView({
  source,
  config,
  readOnly,
  onConfigChange,
  className,
}: DataViewRendererProps<GalleryViewConfig>) {
  return (
    <DataViewPlaceholder
      type="gallery"
      icon={Images}
      label="画廊视图"
      description="计划自研卡片网格/瀑布流并复用节点预览；当前仅渲染占位。"
      plannedDependencies={["@workspace/ui (shadcn)"]}
      source={source}
      config={config}
      readOnly={readOnly}
      onConfigChange={onConfigChange}
      className={className}
    />
  );
}
