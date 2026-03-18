import type { NodeId } from "./system";

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

export type FilterField =
  | "type"
  | "tags"
  | "createdAt"
  | "updatedAt"
  | "permission"
  | "customProperty"
  | "incomingEdges"
  | "outgoingEdges"
  | "referenceCount";

export type FilterOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "lt"
  | "between"
  | "in";

export interface FilterRule {
  field: FilterField;
  operator: FilterOperator;
  value: string | number | string[];
}

export type FilterLogic = "and" | "or";

export interface ViewFilter {
  nodeFilters?: FilterRule[];
  edgeFilters?: FilterRule[];
  logic?: FilterLogic;
}

export interface LocalViewConfig {
  selectionType: ViewSelectionType;
  selectedNodeIds?: NodeId[];
  filter?: ViewFilter;
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
