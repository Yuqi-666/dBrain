import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { NodeId } from "@workspace/interfaces";

/**
 * NodeEditor Store - 编辑器状态管理
 */
export interface NodeEditorStore {
  // ==================== 编辑器状态 ====================
  /** 当前正在编辑的节点ID */
  currentEditingNodeId: NodeId | null;
  /** 设置当前正在编辑的节点 */
  setCurrentEditingNodeId: (nodeId: NodeId | null) => void;

  // ==================== 属性侧边栏状态 ====================
  /** 属性侧边栏是否展开 */
  attributesSidebarOpen: boolean;
  /** 切换属性侧边栏展开状态 */
  toggleAttributesSidebar: () => void;
  /** 设置属性侧边栏展开状态 */
  setAttributesSidebarOpen: (open: boolean) => void;
}

export const useNodeEditorStore = create<NodeEditorStore>()(
  devtools(
    (set) => ({
      // ==================== 编辑器状态 ====================
      currentEditingNodeId: null,

      setCurrentEditingNodeId: (nodeId) =>
        set({
          currentEditingNodeId: nodeId,
        }),

      // ==================== 属性侧边栏状态 ====================
      attributesSidebarOpen: false,

      toggleAttributesSidebar: () =>
        set((state) => ({ attributesSidebarOpen: !state.attributesSidebarOpen })),

      setAttributesSidebarOpen: (open) => set({ attributesSidebarOpen: open }),
    }),
    { name: "nodeEditor-store" },
  ),
);
