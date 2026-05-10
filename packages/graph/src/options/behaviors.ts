import type {
  BehaviorOptions,
  IPointerEvent,
  CustomBehaviorOption,
  Graph,
} from "@antv/g6";
// Import to register the custom behavior
import "../extensions/behaviors/custom-canvas-gesture";

export interface BehaviorConfigOptions {
  onNodeSelect?: (nodeIds: string[]) => void;
  onEdgeSelect?: (edgeIds: string[]) => void;
  onPreviewShow?: (nodeId: string) => void;
  graph?: Graph;
}

export function createBehaviorOptions(
  options?: BehaviorConfigOptions,
): BehaviorOptions {
  const { onNodeSelect, onEdgeSelect, onPreviewShow, graph } = options || {};

  const BASE_BEHAVIORS: CustomBehaviorOption[] = [
    {
      type: "custom-canvas-gesture",
      key: "custom-canvas-gesture",
      minScale: 0.1,
      maxScale: 10,
      sensitivity: 1,
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
      type: "click-select",
      // key: 'click-select-1',
      degree: 1, // 选中扩散范围
      state: "selected", // 选中的状态
      neighborState: "neighborActive", // 相邻节点附着状态
      unselectedState: "inactive", // 未选中节点状态
      onClick: (event: IPointerEvent) => {
        const targetType = (event as any).targetType;
        const id = (event as any).target?.id;

        if (!id) return;

        // Clear all selections first, then set new selection based on target type
        if (targetType === "node") {
          onNodeSelect?.([id]);
          onEdgeSelect?.([]);
          onPreviewShow?.(id);
        } else if (targetType === "edge") {
          onNodeSelect?.([]);
          onEdgeSelect?.([id]);
        }
      },
    },
    {
      type: "lasso-select",
      key: "lasso-select",
      // immediately: true,
      mode: "diff",
      trigger: ["control"],
      onSelect: (states: Record<string, any>) => {
        if (!graph) return;

        const selectedIds = Object.keys(states);
        const selectedNodeIds: string[] = [];
        const selectedEdgeIds: string[] = [];
        selectedIds.forEach((id) => {
          // Query the element to determine its type
          let data = graph.getElementData(id);
          if ("nodeType" in data) {
            selectedNodeIds.push(id);
          } else {
            selectedEdgeIds.push(id);
          }
        });

        onNodeSelect?.(selectedNodeIds);
        onEdgeSelect?.(selectedEdgeIds);
      },
    },
    // {
    //   type: 'brush-select',
    //   key: 'brush-select',
    //   immediately: true,
    //   trigger: ['control'],
    // },
    {
      type: "hover-activate",
      key: "hover-activate-1", // 为交互指定标识符，方便动态更新
    },
    {
      type: "drag-element-force",
      key: "drag-element-force",
      state: "selected",
    },
    {
      type: "drag-element",
      key: "drag-element",
      state: "selected",
    },
  ];

  return BASE_BEHAVIORS;
}
