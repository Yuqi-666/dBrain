import type { FilterConfig } from "@workspace/interfaces/models/filter";

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
  viewType: "Force" | "Flow";
  visualConfig: VisualConfigDTO;
  filterConfig: FilterConfig;
  isPinned: boolean;
}