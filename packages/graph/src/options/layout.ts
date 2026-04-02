import type { LayoutType } from "@workspace/interfaces";

export const LAYOUT_CONFIGS: Record<LayoutType, any> = {
  force: {
    type: "force",
    preventOverlap: true,
    nodeStrength: 30,
    edgeStrength: 0.1,
    linkDistance: 150,
  },
  "d3-force": {
    type: "force",
    preventOverlap: true,
    nodeStrength: 30,
    edgeStrength: 0.1,
    linkDistance: 150,
  },
  dagre: { type: "dagre", rankdir: "TB", nodesep: 30, ranksep: 50 },
  fruchterman: { type: "fruchterman", gravity: 10, speed: 2 },
  circular: { type: "circular", startRadius: 100, endRadius: 200 },
  grid: { type: "grid", rows: 5, cols: 5 },
  radial: { type: "radial", unitRadius: 200, preventOverlap: true },
  concentric: { type: "concentric", preventOverlap: true },
  fishbone: { type: "fishbone", rankdir: "LR", nodesep: 20, ranksep: 40 },
  mindmap: { type: "mindmap", direction: "H", radius: 20 },
};

export function getLayoutConfig(layoutType?: LayoutType) {
  return LAYOUT_CONFIGS[layoutType || "force"] || LAYOUT_CONFIGS.force;
}
