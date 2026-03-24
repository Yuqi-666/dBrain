import type { IEvent, Point } from "@antv/g6";

export interface ZoomCanvasOptions {
  type?: "zoom-canvas" | string;
  animation?: {
    duration?: number;
    easing?: string;
  };
  enable?: boolean | ((event: IEvent) => boolean);
  origin?: Point;
  onFinish?: () => void;
  preventDefault?: boolean;
  sensitivity?: number;
  trigger?: string[] | object;
}
