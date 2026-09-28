"use client";

import { DataViewConfigPlaceholder } from "../../shared/data-view-config-placeholder";
import type {
  DataViewConfigEditorProps,
  GalleryViewConfig,
} from "../../source/types";

/**
 * Config editor for the gallery data view — placeholder.
 */
export function GalleryConfigEditor({
  config,
  readOnly,
  className,
}: DataViewConfigEditorProps<GalleryViewConfig>) {
  return (
    <DataViewConfigPlaceholder
      type="gallery"
      config={config}
      readOnly={readOnly}
      className={className}
    />
  );
}
