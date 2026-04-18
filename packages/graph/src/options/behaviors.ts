import type { BehaviorOptions } from "@antv/g6";

const BASE_BEHAVIORS: BehaviorOptions = [
  {
    type: 'drag-canvas',
    key: 'drag-canvas-1',
    direction: 'both',
  },
  {
    type: 'zoom-canvas',
    key: 'zoom-canvas-1', // 为交互指定标识符，方便动态更新
    sensitivity: 0.7, // 设置灵敏度
    animation: true,
    trigger: ['Control'],
  },
  {
    type: 'scroll-canvas',
    key: 'scroll-canvas-1', // 为交互指定标识符，方便动态更新
    sensitivity: 1.5, // 设置灵敏度
    direction: 'both',
  },
  // {
  //   type: 'optimize-viewport-transform',
  //   key: 'optimize-viewport-transform-1', // 为交互指定标识符，方便动态更新
  //   debounce: 300, // 设置更长的防抖时间
  //   shapes: (type: string, shape: any) => {
  //     if (type === 'node' && shape.className === 'key') return true;
  //     return false;
  //   },
  // },
  {
    type: 'click-select',
    // key: 'click-select-1',
    degree: 1, // 选中扩散范围
    state: 'selected', // 选中的状态
    neighborState: 'neighborActive', // 相邻节点附着状态
    unselectedState: 'inactive', // 未选中节点状态
  },
  {
    type: 'lasso-select',
    key: 'lasso-select',
    // immediately: true,
    mode: 'diff',
    trigger: ['control'],
  },
  // {
  //   type: 'brush-select',
  //   key: 'brush-select',
  //   immediately: true,
  //   trigger: ['control'],
  // },
  {
    type: 'hover-activate',
    key: 'hover-activate-1', // 为交互指定标识符，方便动态更新
  },
  {
    type: "drag-element-force",
    key: "drag-element-force",
    state: 'selected'
  },
  {
    type: "drag-element",
    key: "drag-element",
    state: 'selected'
  },
];

export function getBehaviorsConfig() {
  const behaviors = BASE_BEHAVIORS;
  return behaviors;
}
