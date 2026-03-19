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

export interface EdgeVisualStyle {
  color?: string;
  lineType?: "solid" | "dashed" | "dotted";
  lineWidth?: number;
  showArrow?: boolean;
}

export const DEFAULT_EDGE_VISUAL_STYLE: EdgeVisualStyle = {
  color: "#888888",
  lineType: "solid",
  lineWidth: 2,
  showArrow: true,
};

export interface EdgeBase {
  id: string;
  from: NodeId;
  to: NodeId;
  direction: EdgeDirection;
  type: RelationTypeId;
  name?: string;
  weight?: number;
  visualStyle?: EdgeVisualStyle;
  createdAt: string;
  updatedAt: string;
}

export interface EdgeData extends EdgeBase { }
