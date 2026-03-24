import type { BasePluginOptions, ScaleByType, TriggerType } from "./common";

export interface FisheyeOptions extends BasePluginOptions {
  type: "fisheye";
  trigger?: TriggerType | "pointermove" | "click" | "drag";
  r?: number;
  maxR?: number;
  minR?: number;
  d?: number;
  maxD?: number;
  minD?: number;
  scaleRBy?: ScaleByType | "wheel" | "drag";
  scaleDBy?: ScaleByType | "wheel" | "drag";
  showDPercent?: boolean;
  style?: Record<string, unknown>;
  nodeStyle?:
    | Record<string, unknown>
    | ((datum: Record<string, unknown>) => Record<string, unknown>);
  preventDefault?: boolean;
}
