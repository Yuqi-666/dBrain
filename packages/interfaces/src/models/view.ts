import type { FilterConfig } from "./filter";

export type ViewId = string;
export type ViewType = "Force" | "Flow";
export interface VisualConfig {
  backgroundColor?: string;
  backgroundStyle?: "solid" | "grid" | "dots" | "none";
  gridSpacing?: number;
  gridColor?: string;
  snapToGrid?: boolean;
  showMinimap?: boolean;
}

export interface View {
  id: ViewId;
  name: string;
  viewType: ViewType;
  visualConfig: VisualConfig;
  filterConfig: FilterConfig;
  isPinned?: boolean;
  workspaceId?: string;
}
