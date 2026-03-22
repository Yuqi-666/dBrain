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

export interface VisualConfig {
  backgroundColor?: string;
  backgroundStyle?: "solid" | "grid" | "dots" | "none";
  gridSpacing?: number;
  gridColor?: string;
  snapToGrid?: boolean;
  showMinimap?: boolean;
}


//if the type is "static" then selectedNodeIds exists,or filter exists
export interface Scope {
  selectionType: ViewSelectionType;
  selectedNodeIds?: NodeId[];
  filter?: FilterConfig;
}

export interface View {
  id: string;
  name: string;
  layoutType: LayoutType;
  viewport: ViewportState;
  visualConfig: VisualConfig;
  scope?: Scope;
  isPinned?: boolean;
}
