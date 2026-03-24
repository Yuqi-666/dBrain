/**
 * Layout type identifiers
 */
export type LayoutType = "d3-force" | "dagre" | "fishbone" | "compact-box";

/**
 * Layout direction options
 */
export type LayoutDirection = "TB" | "BT" | "LR" | "RL" | "H" | "V";

/**
 * Dagre layout ranker algorithms
 */
export type DagreRanker = "network-simplex" | "tight-tree" | "longest-path";

/**
 * Dagre layout alignment options
 */
export type DagreAlign = "UL" | "UR" | "DL" | "DR";

/**
 * Base layout configuration shared by all layout types
 */
export interface BaseLayout {
  /** Layout type */
  layoutType: LayoutType;
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
  /** Node size (number or [width, height] or function) */
  nodeSize?: number | number[] | ((node: unknown) => number | number[]);
  /** Callback on each layout tick */
  onTick?: (data: unknown) => void;
}
