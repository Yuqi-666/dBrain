import type { NodeId } from "../../common/metadata/system";

export type EdgeDirection = "forward" | "reverse" | "bidirectional";

export type EdgeDimension = "vertical" | "horizontal";

export type EdgeCategory = "hierarchy" | "flow" | "association" | "interaction";

export type EdgeType = string;

export interface EdgeVisualStyle {
  color?: string;
  lineType?: "solid" | "dashed" | "dotted";
  lineWidth?: number;
  showArrow?: boolean;
}

export interface EdgeBase {
  id: string;
  from: NodeId;
  to: NodeId;
  direction: EdgeDirection;
  dimension: EdgeDimension;
  category: EdgeCategory;
  type: EdgeType;
  name?: string;
  weight?: number;
  visualStyle?: EdgeVisualStyle;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_EDGE_VISUAL_STYLE: EdgeVisualStyle = {
  color: "#888888",
  lineType: "solid",
  lineWidth: 2,
  showArrow: true,
};
