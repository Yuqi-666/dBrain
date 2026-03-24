export * from "./type";
export * from "./d3-force";
export * from "./dagre";
export * from "./fishbone";
export * from "./compact-box";
export * from "./presets";

import type { D3ForceLayoutConfig } from "./d3-force";
import type { DagreLayoutConfig } from "./dagre";
import type { FishboneLayoutConfig } from "./fishbone";
import type { CompactBoxLayoutConfig } from "./compact-box";

export type LayoutConfig =
  | D3ForceLayoutConfig
  | DagreLayoutConfig
  | FishboneLayoutConfig
  | CompactBoxLayoutConfig;
