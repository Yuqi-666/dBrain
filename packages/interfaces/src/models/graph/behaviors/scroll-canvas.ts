import type { IEvent } from "@antv/g6";

export interface ScrollCanvasOptions {
  type?: "scroll-canvas" | string;
  enable?: boolean | ((event: IEvent) => boolean);
  direction?: "x" | "y" | undefined;
  range?: number | number[];
  sensitivity?: number;
  trigger?: {
    up?: string[];
    down?: string[];
    left?: string[];
    right?: string[];
  };
  onFinish?: () => void;
  preventDefault?: boolean;
}
