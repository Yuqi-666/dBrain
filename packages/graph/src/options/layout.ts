import type { LayoutOptions, EdgeData } from "@antv/g6";
import type { LayoutType } from "@workspace/interfaces";
// TODO: 改造为数据驱动布局参数，为一部分布局参数配备布局参数函数，输入数据字段，输出对应参数值
export const LAYOUT_CONFIGS: Record<LayoutType, LayoutOptions> = {
  D3force:
  {
    type: "d3-force",
    link: {
      distance: (d) => {
        // console.log(d)
        return (d.data.weight || 2) * 24 + 76
      },
      strength: (d) => {
        return 1.4 - (d.data.weight || 2) * 0.2
      },

    },
    // 配置多体力 - 控制节点间的排斥力
    manyBody: {
      strength: -500,
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
  radial: { type: "radial", unitRadius: 200, preventOverlap: true },
  compactBox: {
    type: 'compact-box',
    direction: 'LR',
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

export function getLayoutConfig(layoutType?: LayoutType) {
  return LAYOUT_CONFIGS[layoutType || "D3force"];
}
