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

export interface NodeBase {
  id: NodeId;
  title: string;
  abstract?: string;
  permission: Permission;
  semanticId: NodeSemanticId;
  tags?: NodeTagId[];
  isPinned?: boolean;
  stateData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
