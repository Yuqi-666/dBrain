import type { GraphData } from "./data";
import type { FitViewType } from "./type";
import type { NodeOptions } from "../node";
import type { EdgeOptions } from "../edge";
import type { NodeAnimationConfig } from "../node/animate";
import type { CursorStyle } from "../common";
import type { LayoutConfig } from "../layout";
import type { BehaviorConfig } from "../behaviors";
import type { PluginConfig } from "../plugin";

export interface AnimationEffectTiming {
  delay?: number;
  direction?: "alternate" | "alternate-reverse" | "normal" | "reverse";
  duration?: number;
  easing?: string;
  fill?: "auto" | "backwards" | "both" | "forwards" | "none";
  iterations?: number;
}

export type GraphAnimationConfig = boolean | AnimationEffectTiming;

export interface CustomExtensionOptions {
  type: string;
  key?: string;
  [key: string]: unknown;
}


export type TransformConfig =
  | string
  | CustomExtensionOptions
  | ((graph: unknown) => CustomExtensionOptions);

export interface GraphOptions {
  container?: string | HTMLElement | unknown;
  width?: number;
  height?: number;
  autoFit?: FitViewType;
  autoResize?: boolean;
  background?: string;
  canvas?: Record<string, unknown>;
  cursor?: CursorStyle;
  devicePixelRatio?: number;
  padding?: number | number[];
  renderer?: (layer: "background" | "main" | "label" | "transient") => unknown;
  rotation?: number;
  zoom?: number;
  zoomRange?: [number, number];
  x?: number;
  y?: number;
  data?: GraphData;
  node?: NodeOptions;
  edge?: EdgeOptions;
  animation?: GraphAnimationConfig;
  theme?: false | "light" | "dark" | string;
  layout?: LayoutConfig;
  behaviors?: BehaviorConfig[];
  plugins?: PluginConfig[];
  transforms?: TransformConfig[];
}
