import type { NodeId } from "../node/base";

export type EdgeDirection = "forward" | "reverse" | "bidirectional";

export type EdgeCategory = "hierarchy" | "flow" | "association" | "interaction";

export type EdgeSemanticId = string;

export type EdgeId = string;

export interface EdgeSemantic {
  id: EdgeSemanticId;
  name: string;
  category: EdgeCategory;
  description?: string;
}

export interface EdgeBase {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  direction: EdgeDirection;
  semanticId: EdgeSemanticId;
  name?: string;
  weight?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EdgeData extends EdgeBase { }
