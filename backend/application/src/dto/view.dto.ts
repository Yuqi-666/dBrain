import type { FilterConfig } from "@workspace/interfaces/models/filter";
import type { LayoutType } from "@workspace/interfaces/models/layout";

export interface VisualConfigDTO {
  backgroundColor?: string;
  backgroundStyle?: "solid" | "grid" | "dots" | "none";
  gridSpacing?: number;
  gridColor?: string;
  snapToGrid?: boolean;
  showMinimap?: boolean;
}

export interface ViewDTO {
  id: string;
  name: string;
  layout: LayoutType;
  visualConfig: VisualConfigDTO;
  filterConfig: FilterConfig;
  isPinned: boolean;
}
