import type { IEvent } from "@antv/g6";

export interface DragCanvasOptions {
  type?: "drag-canvas" | string;
  enable?: boolean | ((event: IEvent | KeyboardEvent) => boolean);
  animation?: {
    duration?: number;
    easing?: string;
  };
  direction?: "x" | "y" | "both";
  range?: number | number[];
  sensitivity?: number;
  trigger?: {
    up?: string[];
    down?: string[];
    left?: string[];
    right?: string[];
  };
  onFinish?: () => void;
}
