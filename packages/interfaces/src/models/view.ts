import type { NodeId } from "./node/base";
import type {
  FilterConfig,
} from "./filter";

export type ViewScope = "global" | "local";

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



export interface LocalViewConfig {
  selectionType: ViewSelectionType;
  selectedNodeIds?: NodeId[];
  filter?: FilterConfig;
}

export interface ViewState {
  id: string;
  name: string;
  scope: ViewScope;
  layoutType: LayoutType;
  viewport: ViewportState;
  visualConfig: ViewVisualConfig;
  localConfig?: LocalViewConfig;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  isPinned?: boolean;
}
