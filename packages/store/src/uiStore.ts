import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ViewId, NodeId, NodeSemantic, EdgeSemantic } from "@workspace/interfaces";

// ==================== Shared Types ====================

export type ContextMenuType = "node" | "edge" | "canvas" | "groupSelect" | "add-edge";

export type ContextMenuContext =
  | { nodeId: string }
  | { edgeId: string }
  | Record<string, never>
  | { nodeIds: string[]; edgeIds: string[] }
  | { sourceIds: string[]; targetId: string | null };

export type MainViewType = "graph" | "editor";

/** Quick Panel 模式：search（搜索）+ agent（智能体，占位） */
export type QuickPanelMode = "search" | "agent";

/**
 * Sidebar 显示模式
 * - "closed": 关闭状态
 * - "fixed": 固定显示（推开右侧内容）
 * - "temp": 临时显示（浮动面板，不推开内容）
 */
export type SidebarMode = "closed" | "fixed" | "temp";

// ==================== Store Interface ====================

export interface UIStore {
  // ==================== Graph UI Section ====================
  // Selection state
  selectedNodeIds: Set<string>;
  selectedEdgeIds: Set<string>;
  setSelectedNodeIds: (ids: Set<string>) => void;
  setSelectedEdgeIds: (ids: Set<string>) => void;

  // Context menu
  contextMenu: {
    x: number;
    y: number;
    visible: boolean;
    type: ContextMenuType | null;
    context: ContextMenuContext | null;
  };
  setContextMenu: (menu: UIStore["contextMenu"]) => void;
  closeContextMenu: () => void;

  // Preview block
  previewBlock: {
    nodeId: string | null;
    visible: boolean;
    isFocus: boolean;
  };
  setPreviewBlock: (block: UIStore["previewBlock"]) => void;
  closePreviewBlock: () => void;

  // Node focus
  isNodeFocus: boolean;
  setIsNodeFocus: (value: boolean) => void;

  // Semantic dialogs - Node
  nodeSemanticDialog: {
    open: boolean;
    editingSemantic: NodeSemantic | null;
  };
  openNodeSemanticDialog: (semantic?: NodeSemantic | null) => void;
  closeNodeSemanticDialog: () => void;

  // Semantic dialogs - Edge
  edgeSemanticDialog: {
    open: boolean;
    editingSemantic: EdgeSemantic | null;
  };
  openEdgeSemanticDialog: (semantic?: EdgeSemantic | null) => void;
  closeEdgeSemanticDialog: () => void;

  // Graph UI actions
  handleNodeEdit: (nodeId: string) => void;
  handleCreateEdge: (from: string[], to: string | null, x?: number, y?: number) => Promise<void>;

  // ==================== Node Editor Section ====================
  /** 当前正在编辑的节点ID */
  currentEditingNodeId: NodeId | null;
  /** 设置当前正在编辑的节点 */
  setCurrentEditingNodeId: (nodeId: NodeId | null) => void;
  /** 最近打开的节点ID队列（长度上限 10，队首为最新） */
  recentlyOpenedNodeIds: NodeId[];
  /** 将节点ID推入最近打开队列（去重置顶，超出 10 淘汰队尾） */
  pushRecentlyOpenedNode: (nodeId: NodeId) => void;

  // ==================== Attributes Sidebar Section ====================
  /** 属性侧边栏是否展开 */
  attributesSidebarOpen: boolean;
  /** 切换属性侧边栏展开状态 */
  toggleAttributesSidebar: () => void;
  /** 设置属性侧边栏展开状态 */
  setAttributesSidebarOpen: (open: boolean) => void;

  // ==================== Sidebar Section ====================
  /** Sidebar 显示模式 */
  sidebarMode: SidebarMode;
  /** 切换 sidebar 显示（固定模式） */
  toggleSidebar: () => void;
  /** 设置 sidebar 模式 */
  setSidebarMode: (mode: SidebarMode) => void;
  /** 切换到固定显示模式 */
  convertTempToFixed: () => void;
  /** 关闭 sidebar */
  closeSidebar: () => void;
  /** 临时显示 sidebar（浮动面板） */
  showTempSidebar: () => void;
  /** Sidebar 当前激活的 tab（认知侧边栏） */
  sidebarActiveTab: string;
  /** 设置 sidebar 激活的 tab */
  setSidebarActiveTab: (tab: string) => void;

  // ==================== Main View Section ====================
  /** 当前主视图类型：节点图 或 节点编辑页面 */
  mainViewType: MainViewType;
  /** 设置主视图类型 */
  setMainViewType: (type: MainViewType) => void;

  // ==================== View Section ====================
  /** 当前选中的视图ID */
  currentViewId: ViewId | null;
  /** 设置当前选中的视图 */
  setCurrentViewId: (viewId: ViewId | null) => void;

  // ==================== Command Panel Section ====================
  /** 命令面板是否显示 */
  commandDialogOpen: boolean;
  /** 设置命令面板显示状态 */
  setCommandDialogOpen: (open: boolean) => void;
  /** 切换命令面板显示状态 */
  toggleCommandDialog: () => void;

  // ==================== Quick Panel Section ====================
  /** Quick Panel 状态：open + mode（mode 关闭时保留，ctr+k 复用） */
  quickPanel: {
    open: boolean;
    mode: QuickPanelMode;
  };
  /** 以指定模式打开 Quick Panel（按钮入口用，强制 mode） */
  openQuickPanel: (mode: QuickPanelMode) => void;
  /** 只切换 Quick Panel 的 mode（面板内 tab 用，不影响 open） */
  setQuickPanelMode: (mode: QuickPanelMode) => void;
  /** ctrl/⌘+K 切换：已开则关，未开则以当前 quickPanel.mode 打开 */
  toggleQuickPanelFromKeyboard: () => void;
  /** 关闭 Quick Panel（保留 mode） */
  closeQuickPanel: () => void;

  // ==================== Panel Visibility Section ====================
  /** 视图配置面板是否显示 */
  viewConfigPanelOpen: boolean;
  /** 设置视图配置面板显示状态 */
  setViewConfigPanelOpen: (open: boolean) => void;

  /** 选项菜单是否显示 */
  optionsMenuOpen: boolean;
  /** 设置选项菜单显示状态 */
  setOptionsMenuOpen: (open: boolean) => void;
}

// ==================== Store Implementation ====================

export const useUIStore = create<UIStore>()(
  devtools(
    (set, _get) => ({
      // ==================== Graph UI - Selection ====================
      selectedNodeIds: new Set<string>(),
      selectedEdgeIds: new Set<string>(),
      setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
      setSelectedEdgeIds: (ids) => set({ selectedEdgeIds: ids }),

      // ==================== Graph UI - Context Menu ====================
      contextMenu: {
        x: 0,
        y: 0,
        visible: false,
        type: null,
        context: null,
      },
      setContextMenu: (menu) => set({ contextMenu: menu }),
      closeContextMenu: () =>
        set((state) => ({
          contextMenu: { ...state.contextMenu, visible: false },
        })),

      // ==================== Graph UI - Preview Block ====================
      previewBlock: {
        nodeId: null,
        visible: false,
        isFocus: false,
      },
      setPreviewBlock: (block) =>
        set({
          previewBlock: block,
          isNodeFocus: block.isFocus,
        }),
      closePreviewBlock: () =>
        set({
          previewBlock: {
            nodeId: null,
            visible: false,
            isFocus: false,
          },
          isNodeFocus: false,
        }),

      // ==================== Graph UI - Node Focus ====================
      isNodeFocus: false,
      setIsNodeFocus: (value) => set({ isNodeFocus: value }),

      // ==================== Graph UI - Semantic Dialogs ====================
      nodeSemanticDialog: {
        open: false,
        editingSemantic: null,
      },
      openNodeSemanticDialog: (semantic = null) =>
        set({
          nodeSemanticDialog: { open: true, editingSemantic: semantic },
        }),
      closeNodeSemanticDialog: () =>
        set({
          nodeSemanticDialog: { open: false, editingSemantic: null },
        }),

      edgeSemanticDialog: {
        open: false,
        editingSemantic: null,
      },
      openEdgeSemanticDialog: (semantic = null) =>
        set({
          edgeSemanticDialog: { open: true, editingSemantic: semantic },
        }),
      closeEdgeSemanticDialog: () =>
        set({
          edgeSemanticDialog: { open: false, editingSemantic: null },
        }),

      // ==================== Graph UI - Actions ====================
      handleNodeEdit: (nodeId) => {
        // Access internal state setter directly to avoid circular dependency issues
        set({ currentEditingNodeId: nodeId });
      },

      handleCreateEdge: async (_from, _to, _x, _y) => {
        // Placeholder - implementation depends on edge creation logic
      },

      // ==================== Node Editor ====================
      currentEditingNodeId: null,
      setCurrentEditingNodeId: (nodeId) => set({ currentEditingNodeId: nodeId }),
      recentlyOpenedNodeIds: [],
      pushRecentlyOpenedNode: (nodeId) =>
        set((state) => ({
          recentlyOpenedNodeIds: [
            nodeId,
            ...state.recentlyOpenedNodeIds.filter((id) => id !== nodeId),
          ].slice(0, 10),
        })),

      // ==================== Attributes Sidebar ====================
      attributesSidebarOpen: false,
      toggleAttributesSidebar: () =>
        set((state) => ({ attributesSidebarOpen: !state.attributesSidebarOpen })),
      setAttributesSidebarOpen: (open) => set({ attributesSidebarOpen: open }),

      // ==================== Sidebar ====================
      sidebarMode: "closed",
      toggleSidebar: () =>
        set((state) => ({
          sidebarMode: state.sidebarMode === "fixed" ? "closed" : "fixed",
        })),
      setSidebarMode: (mode) => set({ sidebarMode: mode }),
      convertTempToFixed: () => set({ sidebarMode: "fixed" }),
      closeSidebar: () => set({ sidebarMode: "closed" }),
      showTempSidebar: () => set({ sidebarMode: "temp" }),
      sidebarActiveTab: "nodes",
      setSidebarActiveTab: (tab) => set({ sidebarActiveTab: tab }),

      // ==================== Main View ====================
      mainViewType: "graph",
      setMainViewType: (type) => set({ mainViewType: type }),

      // ==================== View ====================
      currentViewId: null,
      setCurrentViewId: (viewId) => set({ currentViewId: viewId }),

      // ==================== Command Panel ====================
      commandDialogOpen: false,
      setCommandDialogOpen: (open) => set({ commandDialogOpen: open }),
      toggleCommandDialog: () =>
        set((state) => ({
          commandDialogOpen: !state.commandDialogOpen,
        })),

      // ==================== Quick Panel ====================
      quickPanel: {
        open: false,
        mode: "search",
      },
      openQuickPanel: (mode) => set({ quickPanel: { open: true, mode } }),
      setQuickPanelMode: (mode) =>
        set((state) => ({
          quickPanel: { ...state.quickPanel, mode },
        })),
      toggleQuickPanelFromKeyboard: () =>
        set((state) => ({
          quickPanel: { mode: state.quickPanel.mode, open: !state.quickPanel.open },
        })),
      closeQuickPanel: () =>
        set((state) => ({
          quickPanel: { mode: state.quickPanel.mode, open: false },
        })),

      // ==================== Panel Visibility ====================
      viewConfigPanelOpen: false,
      setViewConfigPanelOpen: (open) => set({ viewConfigPanelOpen: open }),
      optionsMenuOpen: false,
      setOptionsMenuOpen: (open) => set({ optionsMenuOpen: open }),
    }),
    { name: "ui-store" },
  ),
);
