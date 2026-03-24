import type { BaseLayout } from "./type";

export interface FishboneLayoutConfig extends BaseLayout {
  layoutType: "fishbone";

  direction?: "RL" | "LR";
  hGap?: number;
  vGap?: number;
  getRibSep?: (node: unknown) => number;
  isLayoutInvisibleNodes?: boolean;
  nodeFilter?: (node: unknown) => boolean;
  preLayout?: boolean;
}
