import type { NodeId } from "../node/base";

export type EdgeDirection = "forward" | "reverse" | "bidirectional" | "undirected";

export type EdgeType = "hierarchy" | "flow" | "association" | "interaction";

export type EdgeSemanticId = string;

export type EdgeId = string;
export type EdgeWeight = 1 | 2 | 3 | 4 | 5; //数字越小关系越近
export interface EdgeSemantic {
  id: EdgeSemanticId;
  name: string;
  category: EdgeType;
  color?: string;
  description?: string;
}

export interface EdgeBase {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  direction: EdgeDirection;
  semanticId: EdgeSemanticId;
  edgeType: EdgeType;
  weight?: EdgeWeight;
  stateData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface EdgeData extends EdgeBase { }
