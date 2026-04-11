import { create } from "zustand";
import type { ViewId, NodeId } from "@workspace/interfaces";

/**
 * UI 状态类型定义
 */
export type MainViewType = "graph" | "editor";

/**
 * UI Store 接口 - 管理认知图谱的UI状态
 */
export interface UIStore {
  // ==================== Sidebar 状态 ====================
  /** Sidebar 是否显示 */
  sidebarOpen: boolean;
  /** Sidebar 是否处于临时显示状态（鼠标滑入） */
  sidebarTempOpen: boolean;
  /** 切换 sidebar 显示 */
  toggleSidebar: () => void;
  /** 设置 sidebar 显示状态 */
  setSidebarOpen: (open: boolean) => void;
  /** 设置 sidebar 临时显示状态 */
  setSidebarTempOpen: (tempOpen: boolean) => void;

  // ==================== 主视图状态 ====================
  /** 当前主视图类型：节点图 或 节点编辑页面 */
  mainViewType: MainViewType;
  /** 设置主视图类型 */
  setMainViewType: (type: MainViewType) => void;

  // ==================== 视图状态 ====================
  /** 当前选中的视图ID */
  currentViewId: ViewId | null;
  /** 设置当前选中的视图 */
  setCurrentViewId: (viewId: ViewId | null) => void;

  // ==================== 编辑器状态 ====================
  /** 当前正在编辑的节点ID */
  currentEditingNodeId: NodeId | null;
  /** 设置当前正在编辑的节点 */
  setCurrentEditingNodeId: (nodeId: NodeId | null) => void;
  /** 编辑器是否置顶 */
  editorPinned: boolean;
  /** 切换编辑器置顶状态 */
  toggleEditorPinned: () => void;
  /** 设置编辑器置顶状态 */
  setEditorPinned: (pinned: boolean) => void;

  // ==================== 命令面板状态 ====================
  /** 命令面板是否显示 */
  commandDialogOpen: boolean;
  /** 设置命令面板显示状态 */
  setCommandDialogOpen: (open: boolean) => void;
  /** 切换命令面板显示状态 */
  toggleCommandDialog: () => void;

  // ==================== 面板显示状态 ====================
  /** 视图配置面板是否显示 */
  viewConfigPanelOpen: boolean;
  /** 设置视图配置面板显示状态 */
  setViewConfigPanelOpen: (open: boolean) => void;

  /** 节点信息面板是否显示 */
  nodeInfoPanelOpen: boolean;
  /** 设置节点信息面板显示状态 */
  setNodeInfoPanelOpen: (open: boolean) => void;

  /** 选项菜单是否显示 */
  optionsMenuOpen: boolean;
  /** 设置选项菜单显示状态 */
  setOptionsMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // ==================== 初始状态 ====================
  sidebarOpen: false,
  sidebarTempOpen: false,

  mainViewType: "graph",

  currentViewId: null,

  currentEditingNodeId: null,
  editorPinned: false,

  commandDialogOpen: false,

  viewConfigPanelOpen: false,
  nodeInfoPanelOpen: false,
  optionsMenuOpen: false,

  // ==================== Sidebar Actions ====================
  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
      sidebarTempOpen: false,
    })),

  setSidebarOpen: (open) =>
    set({
      sidebarOpen: open,
      sidebarTempOpen: false,
    }),

  setSidebarTempOpen: (tempOpen) =>
    set({
      sidebarTempOpen: tempOpen,
      // 临时显示时 sidebarOpen 应为 true
      sidebarOpen: tempOpen || undefined,
    }),

  // ==================== 主视图 Actions ====================
  setMainViewType: (type) => set({ mainViewType: type }),

  // ==================== 视图 Actions ====================
  setCurrentViewId: (viewId) => set({ currentViewId: viewId }),

  // ==================== 编辑器 Actions ====================
  setCurrentEditingNodeId: (nodeId) =>
    set({
      currentEditingNodeId: nodeId,
      // 打开编辑器时，主视图类型切换为 editor
      mainViewType: nodeId ? "editor" : "graph",
    }),

  toggleEditorPinned: () =>
    set((state) => ({
      editorPinned: !state.editorPinned,
    })),

  setEditorPinned: (pinned) => set({ editorPinned: pinned }),

  // ==================== 命令面板 Actions ====================
  setCommandDialogOpen: (open) => set({ commandDialogOpen: open }),

  toggleCommandDialog: () =>
    set((state) => ({
      commandDialogOpen: !state.commandDialogOpen,
    })),

  // ==================== 面板 Actions ====================
  setViewConfigPanelOpen: (open) => set({ viewConfigPanelOpen: open }),
  setNodeInfoPanelOpen: (open) => set({ nodeInfoPanelOpen: open }),
  setOptionsMenuOpen: (open) => set({ optionsMenuOpen: open }),
}));
