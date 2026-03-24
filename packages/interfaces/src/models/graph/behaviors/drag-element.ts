import type { IEvent } from "@antv/g6";
import type { DropEffect, HideEdge } from "./types";
import type { CursorStyle } from "../common";

export interface DragElementCursorOptions {
  default?: CursorStyle;
  grab?: CursorStyle;
  grabbing?: CursorStyle;
}

export interface DragElementShadowOptions {
  shadowFill?: string;
  shadowFillOpacity?: number;
  shadowStroke?: string;
  shadowStrokeOpacity?: number;
  shadowLineDash?: number[];
  shadowZIndex?: number;
  shadowWidth?: number;
  shadowHeight?: number;
  shadowOpacity?: number;
  shadowLineWidth?: number;
  shadowLineCap?: "butt" | "round" | "square";
  shadowLineJoin?: "miter" | "round" | "bevel";
  shadowLineDashOffset?: number;
  shadowCursor?: string;
  shadowVisibility?: "visible" | "hidden";
}

export interface DragElementOptions {
  type?: "drag-element" | string;
  key?: string;
  enable?: boolean | ((event: IEvent) => boolean);
  animation?: boolean;
  state?: string;
  dropEffect?: DropEffect;
  hideEdge?: HideEdge;
  shadow?: boolean | DragElementShadowOptions;
  cursor?: DragElementCursorOptions;
  trigger?: string[];
}
