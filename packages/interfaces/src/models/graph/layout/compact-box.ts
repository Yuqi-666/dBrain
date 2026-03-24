import type { BaseLayout, LayoutDirection } from "./type";

export interface CompactBoxLayoutConfig extends BaseLayout {
  layoutType: "compact-box";

  direction?: LayoutDirection;
  getSide?: (d: { data?: unknown }) => string;
  getId?: (d?: unknown) => string;
  getWidth?: (d?: unknown) => number;
  getHeight?: (d?: unknown) => number;
  getHGap?: (d?: unknown) => number;
  getVGap?: (d?: unknown) => number;
  radial?: boolean;
}
