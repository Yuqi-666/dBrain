export type LayoutType = "d3-force" | "dagre" | "fishbone" | "compact-box";

export type LayoutDirection = "TB" | "BT" | "LR" | "RL" | "H" | "V";

export type DagreRanker = "network-simplex" | "tight-tree" | "longest-path";

export type DagreAlign = "UL" | "UR" | "DL" | "DR";

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

// ============================================
// D3-Force Layout (力导向布局)
// ============================================

// Link force configuration
export interface D3ForceLinkForce {
  /** Edge id generator function */
  id?: (edge: unknown, index: number, edges: unknown[]) => string;
  /** Ideal edge length */
  distance?:
    | number
    | ((edge: unknown, index: number, edges: unknown[]) => number);
  /** Force strength */
  strength?:
    | number
    | ((edge: unknown, index: number, edges: unknown[]) => number);
  /** Link force iterations */
  iterations?: number;
}

// Many-body force configuration (magnetic-like effect)
export interface D3ForceManyBodyForce {
  /** Force strength (negative = repulsion, positive = attraction) */
  strength?:
    | number
    | ((node: unknown, index: number, nodes: unknown[]) => number);
  /** Barnes-Hut algorithm precision parameter */
  theta?: number;
  /** Minimum effective distance */
  distanceMin?: number;
  /** Maximum effective distance */
  distanceMax?: number;
}

// Center force configuration
export interface D3ForceCenterForce {
  /** Center x coordinate */
  x?: number;
  /** Center y coordinate */
  y?: number;
  /** Force strength */
  strength?: number;
}

// Collision force configuration
export interface D3ForceCollideForce {
  /** Collision radius */
  radius?:
    | number
    | ((node: unknown, index: number, nodes: unknown[]) => number);
  /** Force strength */
  strength?: number;
  /** Collision detection iterations */
  iterations?: number;
}

// Radial force configuration
export interface D3ForceRadialForce {
  /** Force strength */
  strength?:
    | number
    | ((node: unknown, index: number, nodes: unknown[]) => number);
  /** Target radius */
  radius?:
    | number
    | ((node: unknown, index: number, nodes: unknown[]) => number);
  /** Circle center x */
  x?: number;
  /** Circle center y */
  y?: number;
}

// X-axis force configuration
export interface D3ForceXForce {
  /** Force strength */
  strength?:
    | number
    | ((node: unknown, index: number, nodes: unknown[]) => number);
  /** Target x coordinate */
  x?: number | ((node: unknown, index: number, nodes: unknown[]) => number);
}

// Y-axis force configuration
export interface D3ForceYForce {
  /** Force strength */
  strength?:
    | number
    | ((node: unknown, index: number, nodes: unknown[]) => number);
  /** Target y coordinate */
  y?: number | ((node: unknown, index: number, nodes: unknown[]) => number);
}

// D3-Force layout configuration
export interface D3ForceLayoutConfig extends Omit<BaseLayout, "nodeSize"> {
  layoutType: "d3-force";

  nodeSize?:
    | number
    | ((node: unknown, index: number, nodes: unknown[]) => number);

  // Iteration control
  /** Current iteration alpha (energy) */
  alpha?: number;
  /** Minimum alpha threshold to stop iteration */
  alphaMin?: number;
  /** Alpha decay rate (0-1) */
  alphaDecay?: number;
  /** Target alpha */
  alphaTarget?: number;
  /** Velocity decay factor */
  velocityDecay?: number;

  // Force models
  /** Link force configuration */
  link?: D3ForceLinkForce;
  /** Many-body force configuration */
  manyBody?: D3ForceManyBodyForce;
  /** Center force configuration */
  center?: D3ForceCenterForce;
  /** Collision force configuration */
  collide?: D3ForceCollideForce;
  /** Radial force configuration */
  radial?: D3ForceRadialForce;
  /** X-axis force configuration */
  x?: D3ForceXForce;
  /** Y-axis force configuration */
  y?: D3ForceYForce;

  // Advanced options
  /** Number of force iterations */
  iterations?: number;
  /** Custom force simulation function */
  forceSimulation?: unknown;
  /** Random number generator function */
  randomSource?: () => number;
}

// ============================================
// Dagre Layout (有向无环图层次布局)
// ============================================

export interface DagreLayoutConfig extends BaseLayout {
  layoutType: "dagre";

  /** Layout direction: TB (top-to-bottom), BT, LR, RL */
  rankdir?: LayoutDirection;
  /** Node alignment: UL, UR, DL, DR */
  align?: DagreAlign;
  /** Node spacing (horizontal for TB/BT, vertical for LR/RL) */
  nodesep?: number;
  /** Layer/rank spacing (vertical for TB/BT, horizontal for LR/RL) */
  ranksep?: number;
  /** Rank assignment algorithm */
  ranker?: DagreRanker;
  /** Whether to preserve edge control points */
  controlPoints?: boolean;
}

// ============================================
// Fishbone Layout (鱼骨布局)
// ============================================

export interface FishboneLayoutConfig extends BaseLayout {
  layoutType: "fishbone";

  /** Direction: RL (right-to-left, fish head on right) or LR (left-to-right) */
  direction?: "RL" | "LR";
  /** Horizontal gap */
  hGap?: number;
  /** Vertical gap */
  vGap?: number;
  /** Fishbone rib separation function */
  getRibSep?: (node: unknown) => number;
  /** Whether invisible nodes participate in layout */
  isLayoutInvisibleNodes?: boolean;
  /** Node filter for layout participation */
  nodeFilter?: (node: unknown) => boolean;
  /** Use pre-layout (calculate before initializing elements) */
  preLayout?: boolean;
}

// ============================================
// CompactBox Layout (紧凑树布局)
// ============================================

export interface CompactBoxLayoutConfig extends BaseLayout {
  layoutType: "compact-box";

  /** Layout direction: LR, RL, TB, BT, H (horizontal symmetric), V (vertical symmetric) */
  direction?: LayoutDirection;
  /** Side getter for H direction (left/right distribution) */
  getSide?: (d: { data?: unknown }) => string;
  /** Node id getter function */
  getId?: (d?: unknown) => string;
  /** Node width getter */
  getWidth?: (d?: unknown) => number;
  /** Node height getter */
  getHeight?: (d?: unknown) => number;
  /** Horizontal gap getter */
  getHGap?: (d?: unknown) => number;
  /** Vertical gap getter */
  getVGap?: (d?: unknown) => number;
  /** Enable radial layout */
  radial?: boolean;
}

// ============================================
// Union type for all layout configurations
// ============================================

export type LayoutConfig =
  | D3ForceLayoutConfig
  | DagreLayoutConfig
  | FishboneLayoutConfig
  | CompactBoxLayoutConfig;

// ============================================
// Layout presets for common use cases
// ============================================

/** Default force layout configuration */
export const defaultForceLayout: D3ForceLayoutConfig = {
  layoutType: "d3-force",
  alpha: 1,
  alphaMin: 0.001,
  alphaDecay: 0.028,
  alphaTarget: 0,
  velocityDecay: 0.4,
  link: {
    distance: 30,
    strength: 1,
    iterations: 1,
  },
  manyBody: {
    strength: -30,
    theta: 0.9,
    distanceMin: 1,
    distanceMax: Infinity,
  },
  center: {
    x: 0,
    y: 0,
    strength: 1,
  },
  collide: {
    radius: 10,
    strength: 1,
    iterations: 1,
  },
};

/** Default dagre layout configuration */
export const defaultDagreLayout: DagreLayoutConfig = {
  layoutType: "dagre",
  rankdir: "TB",
  align: "UL",
  nodesep: 50,
  ranksep: 100,
  ranker: "network-simplex",
  controlPoints: false,
};

/** Default fishbone layout configuration */
export const defaultFishboneLayout: FishboneLayoutConfig = {
  layoutType: "fishbone",
  direction: "RL",
  hGap: 50,
  vGap: 50,
  getRibSep: () => 60,
};

/** Default compact-box layout configuration */
export const defaultCompactBoxLayout: CompactBoxLayoutConfig = {
  layoutType: "compact-box",
  direction: "LR",
  getHeight: () => 16,
  getWidth: () => 16,
  getVGap: () => 16,
  getHGap: () => 40,
  radial: false,
};
