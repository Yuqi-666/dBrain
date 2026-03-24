import type { IEvent } from "@antv/g6";
import type { CursorStyle } from "../common";

export type ElementState =
  | "selected"
  | "active"
  | "inactive"
  | "disabled"
  | "highlight";

export type HideEdge = "none" | "all" | "in" | "out" | "both";

export type DropEffect = "link" | "move" | "none";

export type BrushSelectMode = "union" | "intersect" | "diff" | "default";

export type LassoSelectMode = "union" | "intersect" | "diff" | "default";

export type NodeCentralityType =
  | "degree"
  | "betweenness"
  | "closeness"
  | "eigenvector"
  | "pagerank";

export type NodeCentralityOptions =
  | { type: "degree"; direction?: "in" | "out" | "both" }
  | { type: "betweenness"; directed?: boolean; weightPropertyName?: string }
  | { type: "closeness"; directed?: boolean; weightPropertyName?: string }
  | { type: "eigenvector"; directed?: boolean }
  | { type: "pagerank"; epsilon?: number; linkProb?: number };

export type FocusElementAnimation =
  | boolean
  | { easing?: string; duration?: number };

export interface FixShapeConfig {
  shape: string | ((shapes: unknown[]) => unknown);
  fields?: string[];
}

export interface BrushSelectStyleOptions {
  cursor?: CursorStyle;
  fill?: string | null;
  fillOpacity?: number | string;
  isBillboard?: boolean;
  isSizeAttenuation?: boolean;
  lineCap?: "butt" | "round" | "square";
  lineDash?: number | string | (string | number)[];
  lineDashOffset?: number;
  lineJoin?: "miter" | "round" | "bevel";
  lineWidth?: number | string;
  opacity?: number | string;
  radius?: number | string | number[];
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  stroke?: string | null;
  strokeOpacity?: number | string;
  visibility?: "visible" | "hidden";
  zIndex?: number;
}

export { type IEvent };
