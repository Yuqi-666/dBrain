import { create } from "zustand";
import type {
  NodeSemantic,
  NodeSemanticId,
  NodeData,
  NodeId,
  EdgeSemantic,
  EdgeSemanticId,
  EdgeData,
  EdgeId,
  View,
  ViewId,
} from "@workspace/interfaces";
// 1. 引入你封装好的 WebSocket 单例服务
import { WebSocketService } from "@workspace/services/websocket";

// 定义变更操作的类型
type Mutation =
  | { type: "addNodeSemantic"; payload: NodeSemantic }
  | {
    type: "updateNodeSemantic";
    payload: { id: NodeSemanticId; updates: Partial<NodeSemantic> };
  }
  | { type: "deleteNodeSemantic"; payload: { id: NodeSemanticId } }
  | { type: "addEdgeSemantic"; payload: EdgeSemantic }
  | {
    type: "updateEdgeSemantic";
    payload: { id: EdgeSemanticId; updates: Partial<EdgeSemantic> };
  }
  | { type: "deleteEdgeSemantic"; payload: { id: EdgeSemanticId } }
  | { type: "addNode"; payload: NodeData }
  | {
    type: "updateNode";
    payload: {
      id: NodeId;
      updates: Partial<Omit<NodeData, "id" | "nodeType">>;
    };
  }
  | { type: "deleteNode"; payload: { id: NodeId } }
  | { type: "addEdge"; payload: EdgeData }
  | { type: "updateEdge"; payload: { id: EdgeId; updates: Partial<EdgeData> } }
  | { type: "deleteEdge"; payload: { id: EdgeId } }
  | { type: "addView"; payload: View }
  | { type: "updateView"; payload: { id: ViewId; updates: Partial<View> } }
  | { type: "deleteView"; payload: { id: ViewId } };

/**
 * Action Options for graph store operations
 */
export interface ActionOptions {
  /** 是否为服务端远程触发的操作 (默认: false) */
  isRemote?: boolean;
}
/**
 * Unified Zustand store for managing all cognitive graph data
 */
export interface GraphStore {
  // ==================== 核心状态 ====================
  nodeSemantics: Map<NodeSemanticId, NodeSemantic>;
  edgeSemantics: Map<EdgeSemanticId, EdgeSemantic>;
  nodes: Map<NodeId, NodeData>;
  edges: Map<EdgeId, EdgeData>;
  views: Map<ViewId, View>;

  // ==================== 变更队列状态 ====================
  /** 用于 G6 消费的变更队列 */
  latestMutations: Mutation[];

  /** G6 消费完变更后，调用此方法清空队列 */
  clearMutations: () => void;

  // ====================WebSocket 连接状态====================
  isWsConnected: boolean;
  setWsConnected: (connected: boolean) => void;

  // ==================== CRUD Actions ====================
  // -- Node Semantic --
  addNodeSemantic: (semantic: NodeSemantic, options?: ActionOptions) => void;
  updateNodeSemantic: (
    id: NodeSemanticId,
    updates: Partial<NodeSemantic>,
    options?: ActionOptions,
  ) => void;
  deleteNodeSemantic: (id: NodeSemanticId, options?: ActionOptions) => void;
  setNodeSemantics: (semantics: NodeSemantic[]) => void;

  // -- Edge Semantic --
  addEdgeSemantic: (semantic: EdgeSemantic, options?: ActionOptions) => void;
  updateEdgeSemantic: (
    id: EdgeSemanticId,
    updates: Partial<EdgeSemantic>,
    options?: ActionOptions,
  ) => void;
  deleteEdgeSemantic: (id: EdgeSemanticId, options?: ActionOptions) => void;
  setEdgeSemantics: (semantics: EdgeSemantic[]) => void;

  // -- Nodes --
  addNode: (node: NodeData, options?: ActionOptions) => void;
  updateNode: (
    id: NodeId,
    updates: Partial<Omit<NodeData, "id" | "nodeType">>,
    options?: ActionOptions,
  ) => void;
  deleteNode: (id: NodeId, options?: ActionOptions) => void;
  setNodes: (nodes: NodeData[]) => void;

  // -- Edges --
  addEdge: (edge: EdgeData, options?: ActionOptions) => void;
  updateEdge: (
    id: EdgeId,
    updates: Partial<EdgeData>,
    options?: ActionOptions,
  ) => void;
  deleteEdge: (id: EdgeId, options?: ActionOptions) => void;
  setEdges: (edges: EdgeData[]) => void;

  // -- Views --
  addView: (view: View, options?: ActionOptions) => void;
  updateView: (
    id: ViewId,
    updates: Partial<View>,
    options?: ActionOptions,
  ) => void;
  deleteView: (id: ViewId, options?: ActionOptions) => void;
  setViews: (views: View[]) => void;

  // ==================== Getters ====================
  getNodeSemantic: (id: NodeSemanticId) => NodeSemantic | undefined;
  getAllNodeSemantics: () => NodeSemantic[];
  getEdgeSemantic: (id: EdgeSemanticId) => EdgeSemantic | undefined;
  getAllEdgeSemantics: () => EdgeSemantic[];
  getNode: (id: NodeId) => NodeData | undefined;
  getEdge: (id: EdgeId) => EdgeData | undefined;
  getEdgesForNode: (nodeId: NodeId) => EdgeData[];
  getView: (id: ViewId) => View | undefined;

  // ==================== 服务端同步专用 Action (供 WebSocket 调用) ====================
  /**
   * 接收服务端全量数据推送，强制覆盖本地状态
   * 注意：此方法仅应由 WebSocket 服务调用，UI/G6 组件禁止调用
   */
  syncFromServer: (payload: ServerSyncPayload) => void;
}

// 定义服务端同步数据的接口
interface ServerSyncPayload {
  nodeSemantics?: NodeSemantic[];
  edgeSemantics?: EdgeSemantic[];
  nodes?: NodeData[];
  edges?: EdgeData[];
  views?: View[];
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  // ==================== 初始状态 ====================
  nodeSemantics: new Map(),
  edgeSemantics: new Map(),
  nodes: new Map(),
  edges: new Map(),
  views: new Map(),
  isWsConnected: false,
  latestMutations: [],

  // ==================== WebSocket 状态设置 ====================
  setWsConnected: (connected) => set({ isWsConnected: connected }),

  // 清空队列的方法
  clearMutations: () => set({ latestMutations: [] }),

  // ==================== Node Semantic Actions (集成 WS) ====================
  addNodeSemantic: (semantic, options = {}) => {
    const { isRemote = false } = options;
    // 1. 更新本地状态
    set((state) => {
      const newSemantics = new Map(state.nodeSemantics);
      newSemantics.set(semantic.id, semantic);
      return { nodeSemantics: newSemantics };
    });
    // 2. 推入变更队列
    set((state) => ({
      latestMutations: [
        ...state.latestMutations,
        { type: "addNodeSemantic", payload: semantic },
      ],
    }));
    // 3. 非远程操作才通知服务端
    if (!isRemote) {
      WebSocketService.send({ type: "ADD_NODE_SEMANTIC", payload: semantic });
    }
  },

  updateNodeSemantic: (id, updates, options = {}) => {
    const { isRemote = false } = options;
    set((state) => {
      if (!state.nodeSemantics.has(id)) return state;
      const newSemantics = new Map(state.nodeSemantics);
      const existing = newSemantics.get(id)!;
      newSemantics.set(id, { ...existing, ...updates });
      return { nodeSemantics: newSemantics };
    });
    // 推入变更队列
    set((state) => ({
      latestMutations: [
        ...state.latestMutations,
        { type: "updateNodeSemantic", payload: { id, updates } },
      ],
    }));
    if (!isRemote) {
      WebSocketService.send({
        type: "UPDATE_NODE_SEMANTIC",
        payload: { id, updates },
      });
    }
  },

  deleteNodeSemantic: (id, options = {}) => {
    const { isRemote = false } = options;
    set((state) => {
      const newSemantics = new Map(state.nodeSemantics);
      newSemantics.delete(id);
      return { nodeSemantics: newSemantics };
    });
    // 推入变更队列
    set((state) => ({
      latestMutations: [
        ...state.latestMutations,
        { type: "deleteNodeSemantic", payload: { id } },
      ],
    }));
    if (!isRemote) {
      WebSocketService.send({ type: "DELETE_NODE_SEMANTIC", payload: { id } });
    }
  },

  setNodeSemantics: (semantics) => {
    set({ nodeSemantics: new Map(semantics.map((s) => [s.id, s])) });
    // 注意：setXxx 通常用于初始化，视业务需求决定是否发 WS
  },

  // ==================== Edge Semantic Actions (集成 WS，逻辑同上) ====================
  addEdgeSemantic: (semantic, options = {}) => {
    const { isRemote = false } = options;
    set((state) => {
      const newSemantics = new Map(state.edgeSemantics);
      newSemantics.set(semantic.id, semantic);
      return { edgeSemantics: newSemantics };
    });
    // 推入变更队列
    set((state) => ({
      latestMutations: [
        ...state.latestMutations,
        { type: "addEdgeSemantic", payload: semantic },
      ],
    }));
    if (!isRemote) {
      WebSocketService.send({ type: "ADD_EDGE_SEMANTIC", payload: semantic });
    }
  },

  updateEdgeSemantic: (id, updates, options = {}) => {
    const { isRemote = false } = options;
    set((state) => {
      if (!state.edgeSemantics.has(id)) return state;
      const newSemantics = new Map(state.edgeSemantics);
      const existing = newSemantics.get(id)!;
      newSemantics.set(id, { ...existing, ...updates });
      return { edgeSemantics: newSemantics };
    });
    // 推入变更队列
    set((state) => ({
      latestMutations: [
        ...state.latestMutations,
        { type: "updateEdgeSemantic", payload: { id, updates } },
      ],
    }));
    if (!isRemote) {
      WebSocketService.send({
        type: "UPDATE_EDGE_SEMANTIC",
        payload: { id, updates },
      });
    }
  },

  deleteEdgeSemantic: (id, options = {}) => {
    const { isRemote = false } = options;
    set((state) => {
      const newSemantics = new Map(state.edgeSemantics);
      newSemantics.delete(id);
      return { edgeSemantics: newSemantics };
    });
    // 推入变更队列
    set((state) => ({
      latestMutations: [
        ...state.latestMutations,
        { type: "deleteEdgeSemantic", payload: { id } },
      ],
    }));
    if (!isRemote) {
      WebSocketService.send({ type: "DELETE_EDGE_SEMANTIC", payload: { id } });
    }
  },

  setEdgeSemantics: (semantics) =>
    set({ edgeSemantics: new Map(semantics.map((s) => [s.id, s])) }),

  // ==================== Node Actions (重点：G6 交互会用到) ====================
  addNode: (node, options = {}) => {
    const { isRemote = false } = options;
    set((state) => {
      const newNodes = new Map(state.nodes);
      newNodes.set(node.id, node);
      return { nodes: newNodes };
    });
    // 推入变更队列
    set((state) => ({
      latestMutations: [
        ...state.latestMutations,
        { type: "addNode", payload: node },
      ],
    }));
    if (!isRemote) {
      WebSocketService.send({ type: "ADD_NODE", payload: node });
    }
  },

  updateNode: (id, updates, options = {}) => {
    const { isRemote = false } = options;
    set((state) => {
      const existingNode = state.nodes.get(id);
      if (!existingNode) return state;
      const newNodes = new Map(state.nodes);
      newNodes.set(id, { ...existingNode, ...updates });
      return { nodes: newNodes };
    });

    // 推入变更队列
    set((state) => ({
      latestMutations: [
        ...state.latestMutations,
        { type: "updateNode", payload: { id, updates } },
      ],
    }));

    // 特殊优化：如果是高频的位置更新(x/y)，可以在这里加判断，只在 dragend 发 WS
    // 或者由调用方决定是调用 updateNode (实时发) 还是 updateNodePosition (本地暂存)
    if (!isRemote) {
      WebSocketService.send({ type: "UPDATE_NODE", payload: { id, updates } });
    }
  },

  deleteNode: (id, options = {}) => {
    const { isRemote = false } = options;
    // 级联删除边 (可选业务逻辑，放在 Action 里统一处理)
    set((state) => {
      const newNodes = new Map(state.nodes);
      newNodes.delete(id);
      // 同时删除关联边
      const newEdges = new Map(state.edges);
      for (const [edgeId, edge] of state.edges) {
        if (edge.from === id || edge.to === id) {
          newEdges.delete(edgeId);
        }
      }
      return { nodes: newNodes, edges: newEdges };
    });
    // 推入变更队列
    set((state) => ({
      latestMutations: [
        ...state.latestMutations,
        { type: "deleteNode", payload: { id } },
      ],
    }));
    if (!isRemote) {
      WebSocketService.send({ type: "DELETE_NODE", payload: { id } });
    }
  },

  setNodes: (nodes) => set({ nodes: new Map(nodes.map((n) => [n.id, n])) }),

  // ==================== Edge Actions ====================
  addEdge: (edge, options = {}) => {
    const { isRemote = false } = options;
    set((state) => {
      const newEdges = new Map(state.edges);
      newEdges.set(edge.id, edge);
      return { edges: newEdges };
    });
    // 推入变更队列
    set((state) => ({
      latestMutations: [
        ...state.latestMutations,
        { type: "addEdge", payload: edge },
      ],
    }));
    if (!isRemote) {
      WebSocketService.send({ type: "ADD_EDGE", payload: edge });
    }
  },

  updateEdge: (id, updates, options = {}) => {
    const { isRemote = false } = options;
    set((state) => {
      const existingEdge = state.edges.get(id);
      if (!existingEdge) return state;
      const newEdges = new Map(state.edges);
      newEdges.set(id, { ...existingEdge, ...updates });
      return { edges: newEdges };
    });
    // 推入变更队列
    set((state) => ({
      latestMutations: [
        ...state.latestMutations,
        { type: "updateEdge", payload: { id, updates } },
      ],
    }));
    if (!isRemote) {
      WebSocketService.send({ type: "UPDATE_EDGE", payload: { id, updates } });
    }
  },

  deleteEdge: (id, options = {}) => {
    const { isRemote = false } = options;
    set((state) => {
      const newEdges = new Map(state.edges);
      newEdges.delete(id);
      return { edges: newEdges };
    });
    // 推入变更队列
    set((state) => ({
      latestMutations: [
        ...state.latestMutations,
        { type: "deleteEdge", payload: { id } },
      ],
    }));
    if (!isRemote) {
      WebSocketService.send({ type: "DELETE_EDGE", payload: { id } });
    }
  },

  setEdges: (edges) => {
    const newEdges = new Map();
    edges.forEach((e) => newEdges.set(e.id, e));
    set({ edges: newEdges });
  },

  // ==================== View Actions ====================
  addView: (view, options = {}) => {
    const { isRemote = false } = options;
    set((state) => {
      const newViews = new Map(state.views);
      newViews.set(view.id, view);
      return { views: newViews };
    });
    // 推入变更队列
    set((state) => ({
      latestMutations: [
        ...state.latestMutations,
        { type: "addView", payload: view },
      ],
    }));
    if (!isRemote) {
      WebSocketService.send({ type: "ADD_VIEW", payload: view });
    }
  },

  updateView: (id, updates, options = {}) => {
    const { isRemote = false } = options;
    set((state) => {
      if (!state.views.has(id)) return state;
      const newViews = new Map(state.views);
      const existing = newViews.get(id)!;
      newViews.set(id, { ...existing, ...updates });
      return { views: newViews };
    });
    // 推入变更队列
    set((state) => ({
      latestMutations: [
        ...state.latestMutations,
        { type: "updateView", payload: { id, updates } },
      ],
    }));
    if (!isRemote) {
      WebSocketService.send({ type: "UPDATE_VIEW", payload: { id, updates } });
    }
  },

  deleteView: (id, options = {}) => {
    const { isRemote = false } = options;
    set((state) => {
      const newViews = new Map(state.views);
      newViews.delete(id);
      return { views: newViews };
    });
    // 推入变更队列
    set((state) => ({
      latestMutations: [
        ...state.latestMutations,
        { type: "deleteView", payload: { id } },
      ],
    }));
    if (!isRemote) {
      WebSocketService.send({ type: "DELETE_VIEW", payload: { id } });
    }
  },

  setViews: (views) => set({ views: new Map(views.map((v) => [v.id, v])) }),

  // ==================== Getters  ====================
  getNodeSemantic: (id) => get().nodeSemantics.get(id),
  getAllNodeSemantics: () => Array.from(get().nodeSemantics.values()),
  getEdgeSemantic: (id) => get().edgeSemantics.get(id),
  getAllEdgeSemantics: () => Array.from(get().edgeSemantics.values()),
  getNode: (id) => get().nodes.get(id),
  getEdge: (id) => get().edges.get(id),
  getEdgesForNode: (nodeId) => {
    const { edges } = get();
    return Array.from(edges.values()).filter(
      (e) => e.from === nodeId || e.to === nodeId,
    );
  },
  getView: (id) => get().views.get(id),

  // ==================== 新增：服务端同步入口 ====================
  syncFromServer: (payload) => {
    // 架构图：WebSocket --入--> Action
    // 这里直接 setState，不发送 WS (避免循环)
    set((state) => {
      const updates: Partial<GraphStore> = {};

      if (payload.nodeSemantics) {
        updates.nodeSemantics = new Map(
          payload.nodeSemantics.map((s) => [s.id, s]),
        );
      }
      if (payload.edgeSemantics) {
        updates.edgeSemantics = new Map(
          payload.edgeSemantics.map((s) => [s.id, s]),
        );
      }
      if (payload.nodes) {
        updates.nodes = new Map(payload.nodes.map((n) => [n.id, n]));
      }
      if (payload.edges) {
        updates.edges = new Map(payload.edges.map((e) => [e.id, e]));
      }
      if (payload.views) {
        updates.views = new Map(payload.views.map((v) => [v.id, v]));
      }

      return updates;
    });
  },
}));
