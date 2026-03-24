export * from "./common";
export * from "./grid-line";
export * from "./background";
export * from "./watermark";
export * from "./hull";
export * from "./bubble-sets";
export * from "./snapline";
export * from "./minimap";
export * from "./fullscreen";
export * from "./timebar";
export * from "./toolbar";
export * from "./contextmenu";
export * from "./tooltip";
export * from "./legend";
export * from "./fisheye";
export * from "./edge-filter-lens";
export * from "./edge-bundling";
export * from "./history";
export * from "./title";

import type { GridLineOptions } from "./grid-line";
import type { BackgroundOptions } from "./background";
import type { WatermarkOptions } from "./watermark";
import type { HullOptions } from "./hull";
import type { BubbleSetsOptions } from "./bubble-sets";
import type { SnaplineOptions } from "./snapline";
import type { MinimapOptions } from "./minimap";
import type { FullscreenOptions } from "./fullscreen";
import type { TimebarOptions } from "./timebar";
import type { ToolbarOptions } from "./toolbar";
import type { ContextMenuOptions } from "./contextmenu";
import type { TooltipOptions } from "./tooltip";
import type { LegendOptions } from "./legend";
import type { FisheyeOptions } from "./fisheye";
import type { EdgeFilterLensOptions } from "./edge-filter-lens";
import type { EdgeBundlingOptions } from "./edge-bundling";
import type { HistoryOptions } from "./history";
import type { TitleOptions } from "./title";

export type PluginConfig =
  | GridLineOptions
  | BackgroundOptions
  | WatermarkOptions
  | HullOptions
  | BubbleSetsOptions
  | SnaplineOptions
  | MinimapOptions
  | FullscreenOptions
  | TimebarOptions
  | ToolbarOptions
  | ContextMenuOptions
  | TooltipOptions
  | LegendOptions
  | FisheyeOptions
  | EdgeFilterLensOptions
  | EdgeBundlingOptions
  | HistoryOptions
  | TitleOptions;
