import type { LayoutOptions } from "@antv/g6";
import type { ViewType } from "@workspace/interfaces";

/**
 * G6 layout algorithm names.
 * Internal to the graph package — these are G6-specific implementation details,
 * not exposed via the domain layer.
 */
export type G6LayoutName =
  | "D3force"
  | "dagre"
  | "radial"
  | "compactBox"
  | "fishbone"
  | "mindmap";

export const LAYOUT_CONFIGS: Record<G6LayoutName, LayoutOptions> = {
  D3force: {
    type: "d3-force",
    link: {
      distance: (d) => {
        return (d.data.weight || 2) * 24 + 76;
      },
      strength: (d) => {
        return 1.4 - (d.data.weight || 2) * 0.2;
      },
    },
    // 配置多体力 - 控制节点间的排斥力
    manyBody: {
      strength: -500,
    },
    // 配置中心力 - 保持图形在画布中心
    center: {
      strength: 0.5,
    },
    iterations: 100,
    alphaDecay: 0.04,
    // enableWorker: true,
  },
  dagre: { type: "dagre", rankdir: "TB", nodesep: 30, ranksep: 50 },
  radial: { type: "radial", unitRadius: 200, preventOverlap: true },
  compactBox: {
    type: "compact-box",
    direction: "LR",
    getHeight: function getHeight() {
      return 32;
    },
    getWidth: function getWidth() {
      return 32;
    },
    getVGap: function getVGap() {
      return 10;
    },
    getHGap: function getHGap() {
      return 100;
    },
  },
  fishbone: { type: "fishbone", rankdir: "LR", nodesep: 20, ranksep: 40 },
  mindmap: { type: "mindmap", direction: "H", radius: 20 },
};

/**
 * Map high-level ViewType to a G6 layout name.
 * This keeps the layout algorithm choice encapsulated in the graph package
 * while respecting the ViewType contract from the domain.
 */
const VIEW_TYPE_TO_LAYOUT: Record<ViewType, G6LayoutName> = {
  Force: "D3force",
  Flow: "dagre",
};

export interface LayoutConfigOptions {
  layoutType?: G6LayoutName;
  viewType?: ViewType;
}

export function createLayoutOptions(
  options?: LayoutConfigOptions,
): LayoutOptions {
  const layoutName =
    options?.layoutType ??
    (options?.viewType ? VIEW_TYPE_TO_LAYOUT[options.viewType] : undefined) ??
    "dagre";
  return LAYOUT_CONFIGS[layoutName];
}
