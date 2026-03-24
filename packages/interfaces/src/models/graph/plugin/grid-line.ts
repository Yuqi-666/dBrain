import type { BasePluginOptions } from "./common";

export interface GridLineOptions extends BasePluginOptions {
  type: "grid-line";
  border?: boolean;
  borderLineWidth?: number;
  borderStroke?: string;
  borderStyle?: string;
  follow?: boolean | { translate?: boolean; zoom?: boolean };
  lineWidth?: number | string;
  size?: number;
  stroke?: string;
}
