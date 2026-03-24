import type { NodeId } from "./node/base";
import type { FilterConfig } from "./filter";
import type { LayoutConfig } from "./graph/layout";


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

export interface Scope {
  selectedNodeIds?: NodeId[];
  filter?: FilterConfig;
}

export interface View {
  id: string;
  name: string;
  layout: LayoutConfig;
  viewport: ViewportState;
  visualConfig: VisualConfig;
  scope?: Scope;
  isPinned?: boolean;
}
