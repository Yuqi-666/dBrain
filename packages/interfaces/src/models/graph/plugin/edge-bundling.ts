import type { BasePluginOptions } from "./common";

export interface EdgeBundlingOptions extends BasePluginOptions {
  type: "edge-bundling";
  bundleThreshold?: number;
  cycles?: number;
  divisions?: number;
  divRate?: number;
  iterations?: number;
  iterRate?: number;
  K?: number;
  lambda?: number;
}
