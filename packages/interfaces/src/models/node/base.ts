export type Permission = "private" | "public" | "restricted";

export type NodeSemanticId = string;
export interface NodeSemantic {
  id: NodeSemanticId;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export type NodeTagId = string;
export interface NodeTag {
  id: NodeTagId;
  name: string;
  color?: string;
}

export type NodeId = string;

export type PositionMode = "force" | "flow";

export interface PositionEntry {
  viewId: string;
  x: number;
  y: number;
  mode: PositionMode;
}

export interface NodeClientStyle {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  labelColor?: string;
  labelSize?: number;
  radius?: number;
}

export interface NodeClientState {
  position?: PositionEntry[];
  style?: NodeClientStyle;
  [key: string]: unknown;
}

export interface NodeServerState {
  weight?: number;
  [key: string]: unknown;
}

export interface NodeStateData {
  client: NodeClientState;
  server: NodeServerState;
}

export interface NodeBase {
  id: NodeId;
  title: string;
  abstract?: string;
  permission: Permission;
  semanticId: NodeSemanticId;
  tags?: NodeTagId[];
  isPinned?: boolean;
  stateData?: NodeStateData;
  createdAt: string;
  updatedAt: string;
}
