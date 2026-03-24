import type { D3ForceLayoutConfig } from "./d3-force";
import type { DagreLayoutConfig } from "./dagre";
import type { FishboneLayoutConfig } from "./fishbone";
import type { CompactBoxLayoutConfig } from "./compact-box";

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

export const defaultDagreLayout: DagreLayoutConfig = {
  layoutType: "dagre",
  rankdir: "TB",
  align: "UL",
  nodesep: 50,
  ranksep: 100,
  ranker: "network-simplex",
  controlPoints: false,
};

export const defaultFishboneLayout: FishboneLayoutConfig = {
  layoutType: "fishbone",
  direction: "RL",
  hGap: 50,
  vGap: 50,
  getRibSep: () => 60,
};

export const defaultCompactBoxLayout: CompactBoxLayoutConfig = {
  layoutType: "compact-box",
  direction: "LR",
  getHeight: () => 16,
  getWidth: () => 16,
  getVGap: () => 16,
  getHGap: () => 40,
  radial: false,
};
