import type { IEvent } from "@antv/g6";

export interface OptimizeViewportTransformOptions {
  type?: "optimize-viewport-transform" | string;
  enable?: boolean | ((event: IEvent) => boolean);
  debounce?: number;
  shapes?: (type: string, shape: unknown) => boolean;
}
