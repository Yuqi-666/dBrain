import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  NodeSemantic,
  NodeSemanticId,
  NodeTag,
  NodeTagId,
  NodeData,
  NodeId,
  EdgeSemantic,
  EdgeSemanticId,
  EdgeData,
  EdgeId,
  View,
  ViewId,
} from "@workspace/interfaces";

// 定义变更操作的类型
export type Mutation =
  | { type: "upsertNodeSemantic"; payload: NodeSemantic }
  | { type: "deleteNodeSemantic"; payload: { id: NodeSemanticId } }
  | { type: "upsertNodeTag"; payload: NodeTag }
  | { type: "deleteNodeTag"; payload: { id: NodeTagId } }
  | { type: "upsertEdgeSemantic"; payload: EdgeSemantic }
  | { type: "deleteEdgeSemantic"; payload: { id: EdgeSemanticId } }
  | { type: "upsertNode"; payload: NodeData }
  | { type: "deleteNode"; payload: { id: NodeId } }
  | { type: "upsertEdge"; payload: EdgeData }
  | { type: "deleteEdge"; payload: { id: EdgeId } }
  | { type: "upsertView"; payload: View }
  | { type: "deleteView"; payload: { id: ViewId } };

/**
 * Unified Zustand store for managing all cognitive graph data
 */
export interface GraphStore {
  // ==================== 核心状态 ====================
  nodeSemantics: Map<NodeSemanticId, NodeSemantic>;
  nodeTags: Map<NodeTagId, NodeTag>;
  edgeSemantics: Map<EdgeSemanticId, EdgeSemantic>;
  nodes: Map<NodeId, NodeData>;
  edges: Map<EdgeId, EdgeData>;
  views: Map<ViewId, View>;

  // ==================== 变更队列状态 ====================
  /** 用于 G6 消费的变更队列 */
  latestMutations: Mutation[];

  /** G6 消费完变更后，调用此方法清空队列 */
  clearMutations: () => void;

  // ==================== CRUD Actions (upsert/delete only) ====================
  // -- Node Semantic --
  upsertNodeSemantic: (semantic: NodeSemantic) => void;
  upsertNodeSemantics: (semantics: NodeSemantic[]) => void;
  deleteNodeSemantic: (id: NodeSemanticId) => void;

  // -- Node Tag --
  upsertNodeTag: (tag: NodeTag) => void;
  upsertNodeTags: (tags: NodeTag[]) => void;
  deleteNodeTag: (id: NodeTagId) => void;

  // -- Edge Semantic --
  upsertEdgeSemantic: (semantic: EdgeSemantic) => void;
  upsertEdgeSemantics: (semantics: EdgeSemantic[]) => void;
  deleteEdgeSemantic: (id: EdgeSemanticId) => void;

  // -- Nodes --
  upsertNode: (node: NodeData) => void;
  upsertNodes: (nodes: NodeData[]) => void;
  deleteNode: (id: NodeId) => void;

  // -- Edges --
  upsertEdge: (edge: EdgeData) => void;
  upsertEdges: (edges: EdgeData[]) => void;
  deleteEdge: (id: EdgeId) => void;

  // -- Views --
  upsertView: (view: View) => void;
  upsertViews: (views: View[]) => void;
  deleteView: (id: ViewId) => void;

  // ==================== Getters ====================
  getNodeSemantic: (id: NodeSemanticId) => NodeSemantic | undefined;
  getAllNodeSemantics: () => NodeSemantic[];
  getNodeTag: (id: NodeTagId) => NodeTag | undefined;
  getAllNodeTags: () => NodeTag[];
  getEdgeSemantic: (id: EdgeSemanticId) => EdgeSemantic | undefined;
  getAllEdgeSemantics: () => EdgeSemantic[];
  getNode: (id: NodeId) => NodeData | undefined;
  getEdge: (id: EdgeId) => EdgeData | undefined;
  getEdgesForNode: (nodeId: NodeId) => EdgeData[];
  getView: (id: ViewId) => View | undefined;

}

export const useGraphStore = create<GraphStore>()(
  devtools(
    (set, get) => ({
      // ==================== 初始状态 ====================
      nodeSemantics: new Map(),
      nodeTags: new Map(),
      edgeSemantics: new Map(),
      nodes: new Map(),
      edges: new Map(),
      views: new Map(),
      latestMutations: [],

      // 清空队列的方法
      clearMutations: () => set({ latestMutations: [] }),

      // ==================== Node Semantic Actions ====================
      upsertNodeSemantic: (semantic) => {
        set((state) => {
          const newSemantics = new Map(state.nodeSemantics);
          newSemantics.set(semantic.id, semantic);
          return { nodeSemantics: newSemantics };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            { type: "upsertNodeSemantic", payload: semantic },
          ],
        }));
      },

      upsertNodeSemantics: (semantics) => {
        set((state) => {
          const newSemantics = new Map(state.nodeSemantics);
          for (const s of semantics) {
            newSemantics.set(s.id, s);
          }
          return { nodeSemantics: newSemantics };
        });
        // Batch mutation - one per item
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            ...semantics.map((s) => ({ type: "upsertNodeSemantic" as const, payload: s })),
          ],
        }));
      },

      deleteNodeSemantic: (id) => {
        set((state) => {
          const newSemantics = new Map(state.nodeSemantics);
          newSemantics.delete(id);
          return { nodeSemantics: newSemantics };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            { type: "deleteNodeSemantic", payload: { id } },
          ],
        }));
      },

      // ==================== Node Tag Actions ====================
      upsertNodeTag: (tag) => {
        set((state) => {
          const newTags = new Map(state.nodeTags);
          newTags.set(tag.id, tag);
          return { nodeTags: newTags };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            { type: "upsertNodeTag", payload: tag },
          ],
        }));
      },

      upsertNodeTags: (tags) => {
        set((state) => {
          const newTags = new Map(state.nodeTags);
          for (const t of tags) {
            newTags.set(t.id, t);
          }
          return { nodeTags: newTags };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            ...tags.map((t) => ({ type: "upsertNodeTag" as const, payload: t })),
          ],
        }));
      },

      deleteNodeTag: (id) => {
        set((state) => {
          const newTags = new Map(state.nodeTags);
          newTags.delete(id);
          return { nodeTags: newTags };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            { type: "deleteNodeTag", payload: { id } },
          ],
        }));
      },

      // ==================== Edge Semantic Actions ====================
      upsertEdgeSemantic: (semantic) => {
        set((state) => {
          const newSemantics = new Map(state.edgeSemantics);
          newSemantics.set(semantic.id, semantic);
          return { edgeSemantics: newSemantics };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            { type: "upsertEdgeSemantic", payload: semantic },
          ],
        }));
      },

      upsertEdgeSemantics: (semantics) => {
        set((state) => {
          const newSemantics = new Map(state.edgeSemantics);
          for (const s of semantics) {
            newSemantics.set(s.id, s);
          }
          return { edgeSemantics: newSemantics };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            ...semantics.map((s) => ({ type: "upsertEdgeSemantic" as const, payload: s })),
          ],
        }));
      },

      deleteEdgeSemantic: (id) => {
        set((state) => {
          const newSemantics = new Map(state.edgeSemantics);
          newSemantics.delete(id);
          return { edgeSemantics: newSemantics };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            { type: "deleteEdgeSemantic", payload: { id } },
          ],
        }));
      },

      // ==================== Node Actions ====================
      upsertNode: (node) => {
        set((state) => {
          const newNodes = new Map(state.nodes);
          newNodes.set(node.id, node);
          return { nodes: newNodes };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            { type: "upsertNode", payload: node },
          ],
        }));
      },

      upsertNodes: (nodes) => {
        set((state) => {
          const newNodes = new Map(state.nodes);
          for (const n of nodes) {
            newNodes.set(n.id, n);
          }
          return { nodes: newNodes };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            ...nodes.map((n) => ({ type: "upsertNode" as const, payload: n })),
          ],
        }));
      },

      deleteNode: (id) => {
        set((state) => {
          const newNodes = new Map(state.nodes);
          newNodes.delete(id);
          // Cascade delete edges
          const newEdges = new Map(state.edges);
          for (const [edgeId, edge] of state.edges) {
            if (edge.from === id || edge.to === id) {
              newEdges.delete(edgeId);
            }
          }
          return { nodes: newNodes, edges: newEdges };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            { type: "deleteNode", payload: { id } },
          ],
        }));
      },

      // ==================== Edge Actions ====================
      upsertEdge: (edge) => {
        set((state) => {
          const newEdges = new Map(state.edges);
          newEdges.set(edge.id, edge);
          return { edges: newEdges };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            { type: "upsertEdge", payload: edge },
          ],
        }));
      },

      upsertEdges: (edges) => {
        set((state) => {
          const newEdges = new Map(state.edges);
          for (const e of edges) {
            newEdges.set(e.id, e);
          }
          return { edges: newEdges };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            ...edges.map((e) => ({ type: "upsertEdge" as const, payload: e })),
          ],
        }));
      },

      deleteEdge: (id) => {
        set((state) => {
          const newEdges = new Map(state.edges);
          newEdges.delete(id);
          return { edges: newEdges };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            { type: "deleteEdge", payload: { id } },
          ],
        }));
      },

      // ==================== View Actions ====================
      upsertView: (view) => {
        set((state) => {
          const newViews = new Map(state.views);
          newViews.set(view.id, view);
          return { views: newViews };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            { type: "upsertView", payload: view },
          ],
        }));
      },

      upsertViews: (views) => {
        set((state) => {
          const newViews = new Map(state.views);
          for (const v of views) {
            newViews.set(v.id, v);
          }
          return { views: newViews };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            ...views.map((v) => ({ type: "upsertView" as const, payload: v })),
          ],
        }));
      },

      deleteView: (id) => {
        set((state) => {
          const newViews = new Map(state.views);
          newViews.delete(id);
          return { views: newViews };
        });
        set((state) => ({
          latestMutations: [
            ...state.latestMutations,
            { type: "deleteView", payload: { id } },
          ],
        }));
      },

      // ==================== Getters  ====================
      getNodeSemantic: (id) => get().nodeSemantics.get(id),
      getAllNodeSemantics: () => Array.from(get().nodeSemantics.values()),
      getNodeTag: (id) => get().nodeTags.get(id),
      getAllNodeTags: () => Array.from(get().nodeTags.values()),
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

    }),
    { name: "graph-store" },
  ),
);

export const graphStore = useGraphStore;
