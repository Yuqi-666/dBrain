export type Permission = "private" | "public" | "restricted";

export type NodeSemanticId = string;
export interface NodeSemantic {
  id: NodeSemanticId;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export type NodeId = string;

export interface NodeBase {
  id: NodeId;
  title: string;
  abstract?: string;
  permission: Permission;
  semanticId: NodeSemanticId;
  tags?: string[];
  stateData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
