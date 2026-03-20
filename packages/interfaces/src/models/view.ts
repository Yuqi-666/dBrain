import type { NodeId } from "./node/base";
import type {
  FilterConfig,
} from "./filter";

export type ViewSelectionType = "static" | "dynamic";

export type LayoutType = "force" | "timeline" | "matrix" | "free";

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface ViewVisualConfig {
  backgroundColor?: string;
  backgroundStyle?: "solid" | "grid" | "dots" | "none";
  gridSpacing?: number;
  gridColor?: string;
  snapToGrid?: boolean;
  showMinimap?: boolean;
}



export interface ViewConfig {
  selectionType: ViewSelectionType;
  selectedNodeIds?: NodeId[];
  filter?: FilterConfig;
}

export interface View {
  id: string;
  name: string;
  layoutType: LayoutType;
  viewport: ViewportState;
  visualConfig: ViewVisualConfig;
  Config?: ViewConfig;
  isPinned?: boolean;
}
