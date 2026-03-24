export * from "./drag-canvas";
export * from "./zoom-canvas";
export * from "./scroll-canvas";
export * from "./optimize-viewport-transform";
export * from "./click-select";
export * from "./brush-select";
export * from "./lasso-select";
export * from "./create-edge";
export * from "./drag-element";
export * from "./drag-element-force";
export * from "./collapse-expand";
export * from "./focus-element";
export * from "./hover-activate";
export * from "./fix-element-size";
export * from "./auto-adapt-label";
export * from "./types";

import type { DragCanvasOptions } from "./drag-canvas";
import type { ZoomCanvasOptions } from "./zoom-canvas";
import type { ScrollCanvasOptions } from "./scroll-canvas";
import type { OptimizeViewportTransformOptions } from "./optimize-viewport-transform";
import type { ClickSelectOptions } from "./click-select";
import type { BrushSelectOptions } from "./brush-select";
import type { LassoSelectOptions } from "./lasso-select";
import type { CreateEdgeOptions } from "./create-edge";
import type { DragElementOptions } from "./drag-element";
import type { DragElementForceOptions } from "./drag-element-force";
import type { CollapseExpandOptions } from "./collapse-expand";
import type { FocusElementOptions } from "./focus-element";
import type { HoverActivateOptions } from "./hover-activate";
import type { FixElementSizeOptions } from "./fix-element-size";
import type { AutoAdaptLabelOptions } from "./auto-adapt-label";

export type BehaviorConfig =
  | DragCanvasOptions
  | ZoomCanvasOptions
  | ScrollCanvasOptions
  | OptimizeViewportTransformOptions
  | ClickSelectOptions
  | BrushSelectOptions
  | LassoSelectOptions
  | CreateEdgeOptions
  | DragElementOptions
  | DragElementForceOptions
  | CollapseExpandOptions
  | FocusElementOptions
  | HoverActivateOptions
  | FixElementSizeOptions
  | AutoAdaptLabelOptions;
