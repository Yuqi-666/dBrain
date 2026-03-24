import type { BasePluginOptions } from "./common";

export interface SnaplineOptions extends BasePluginOptions {
  type: "snapline";
  tolerance?: number;
  offset?: number;
  autoSnap?: boolean;
  shape?: string | ((node: unknown) => unknown);
  verticalLineStyle?: Record<string, unknown>;
  horizontalLineStyle?: Record<string, unknown>;
  filter?: (node: unknown) => boolean;
}
