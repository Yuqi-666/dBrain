import type { IEvent } from "@antv/g6";
import type { HideEdge } from "./types";
import type { CursorStyle } from "../common";

export interface DragElementForceCursorOptions {
  default?: CursorStyle;
  grab?: CursorStyle;
  grabbing?: CursorStyle;
}

export interface DragElementForceOptions {
  type?: "drag-element-force" | string;
  key?: string;
  fixed?: boolean;
  enable?: boolean | ((event: IEvent) => boolean);
  state?: string;
  hideEdge?: HideEdge;
  cursor?: DragElementForceCursorOptions;
  trigger?: string[];
}
