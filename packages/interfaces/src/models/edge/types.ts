import type { NodeId } from "../node/base";

export type EdgeDirection = "forward" | "reverse" | "bidirectional";

export type EdgeCategory = "hierarchy" | "flow" | "association" | "interaction";

export type RelationTypeId = string;

export interface RelationType {
  id: RelationTypeId;
  name: string;
  category: EdgeCategory;
  description?: string;
}

export interface EdgeBase {
  id: string;
  from: NodeId;
  to: NodeId;
  direction: EdgeDirection;
  type: RelationTypeId;
  name?: string;
  weight?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EdgeData extends EdgeBase { }
