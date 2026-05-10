import type { NodeId } from "./node/base";
import type { FilterConfig } from "./filter";
import type { LayoutType } from "./layout";

// export interface ViewportState {
//   x: number;
//   y: number;
//   zoom: number;
// }

export type ViewId = string;
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
  layout: LayoutType;
  // viewport: ViewportState;
  visualConfig: VisualConfig;
  filterConfig: FilterConfig;
  isPinned?: boolean;
}
