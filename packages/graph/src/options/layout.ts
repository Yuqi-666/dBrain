import type { LayoutType } from "@workspace/interfaces";
// TODO: 改造为数据驱动布局参数，为一部分布局参数配备布局参数函数，输入数据字段，输出对应参数值
export const LAYOUT_CONFIGS: Record<LayoutType, any> = {
  force: {
    type: "force",
    preventOverlap: true,
    // 节点大小
    nodeSize: 20,
    // 向心力
    gravity: 0.9,
    // 迭代次数
    iterations: 100,
  },
  "d3-force": {
    type: "d3-force",
    link: {
      distance: 100,
      strength: 0.7,
    },
    // 配置多体力 - 控制节点间的排斥力
    manyBody: {
      strength: -30,
    },
    // 配置碰撞力 - 防止节点重叠
    collide: {
      radius: 35,
      strength: 0.8,
    },
    // 配置中心力 - 保持图形在画布中心
    center: {
      strength: 0.05,
    },
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
  return LAYOUT_CONFIGS[layoutType || "d3-force"];
}
