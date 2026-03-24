import type { BasePluginOptions, CornerType, LabelPlacement } from "./common";

export interface HullOptions extends BasePluginOptions {
  type: "hull";
  members: string[];
  concavity?: number;
  corner?: CornerType;
  padding?: number;
  label?: boolean;
  labelPlacement?: LabelPlacement;
  labelBackground?: boolean;
  labelPadding?: number | number[];
  labelCloseToPath?: boolean;
  labelAutoRotate?: boolean;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelMaxWidth?: number;
  labelText?: string;
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeOpacity?: number;
  lineWidth?: number;
}
