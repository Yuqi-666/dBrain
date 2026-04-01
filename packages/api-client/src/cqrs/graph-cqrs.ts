import {
  CommandMessageType,
  QueryMessageType,
  type AddNodeSemanticAck,
  type UpdateNodeSemanticAck,
  type DeleteNodeSemanticAck,
  type AddEdgeSemanticAck,
  type UpdateEdgeSemanticAck,
  type DeleteEdgeSemanticAck,
  type AddNodeAck,
  type UpdateNodeAck,
  type DeleteNodeAck,
  type AddEdgeAck,
  type UpdateEdgeAck,
  type DeleteEdgeAck,
  type AddViewAck,
  type UpdateViewAck,
  type DeleteViewAck,
  type SyncAck,
  type SyncQuery,
  type NodeData,
  type EdgeData,
  type NodeSemantic,
  type EdgeSemantic,
  type View,
  type NodeSemanticId,
  type EdgeSemanticId,
  type NodeId,
  type EdgeId,
  type ViewId,
} from "@workspace/interfaces";
import { socketClient as socketClientInstance } from "@workspace/api-client";
import { useGraphStore } from "@workspace/store";

const socketClient = socketClientInstance;

export const GraphCQRS = {
  // ================== Command ==================

  // Node Semantic operations
  async addNodeSemantic(semantic: NodeSemantic): Promise<void> {
    const store = useGraphStore.getState();

    // Optimistic add
    store.addNodeSemantic(semantic);

    try {
      const ack = await socketClient.emitWithAck<AddNodeSemanticAck>(
        "ADD_NODE_SEMANTIC",
        {
          type: CommandMessageType.ADD_NODE_SEMANTIC,
          requestId: "",
          payload: semantic,
        },
      );

      if (!ack.success) {
        throw new Error(ack.error?.message || "Add node semantic failed");
      }
    } catch (error) {
      // Rollback
      store.deleteNodeSemantic(semantic.id);
      throw error;
    }
  },

  async updateNodeSemantic(
    id: NodeSemanticId,
    updates: Partial<NodeSemantic>,
  ): Promise<void> {
    const store = useGraphStore.getState();
    const oldSemantic = store.nodeSemantics.get(id);

    if (!oldSemantic) {
      throw new Error("Node semantic not found");
    }

    // Optimistic update
    store.updateNodeSemantic(id, updates);

    try {
      const ack = await socketClient.emitWithAck<UpdateNodeSemanticAck>(
        "UPDATE_NODE_SEMANTIC",
        {
          type: CommandMessageType.UPDATE_NODE_SEMANTIC,
          requestId: "",
          payload: { id, updates },
        },
      );

      if (!ack.success) {
        throw new Error(ack.error?.message || "Update node semantic failed");
      }
    } catch (error) {
      // Rollback
      store.updateNodeSemantic(id, oldSemantic);
      throw error;
    }
  },

  async deleteNodeSemantic(id: NodeSemanticId): Promise<void> {
    const store = useGraphStore.getState();
    const oldSemantic = store.nodeSemantics.get(id);

    if (!oldSemantic) {
      throw new Error("Node semantic not found");
    }

    // Optimistic delete
    store.deleteNodeSemantic(id);

    try {
      const ack = await socketClient.emitWithAck<DeleteNodeSemanticAck>(
        "DELETE_NODE_SEMANTIC",
        {
          type: CommandMessageType.DELETE_NODE_SEMANTIC,
          requestId: "",
          payload: { id },
        },
      );

      if (!ack.success) {
        throw new Error(ack.error?.message || "Delete node semantic failed");
      }
    } catch (error) {
      // Rollback
      store.addNodeSemantic(oldSemantic);
      throw error;
    }
  },

  // Edge Semantic operations
  async addEdgeSemantic(semantic: EdgeSemantic): Promise<void> {
    const store = useGraphStore.getState();

    // Optimistic add
    store.addEdgeSemantic(semantic);

    try {
      const ack = await socketClient.emitWithAck<AddEdgeSemanticAck>(
        "ADD_EDGE_SEMANTIC",
        {
          type: CommandMessageType.ADD_EDGE_SEMANTIC,
          requestId: "",
          payload: semantic,
        },
      );

      if (!ack.success) {
        throw new Error(ack.error?.message || "Add edge semantic failed");
      }
    } catch (error) {
      // Rollback
      store.deleteEdgeSemantic(semantic.id);
      throw error;
    }
  },

  async updateEdgeSemantic(
    id: EdgeSemanticId,
    updates: Partial<EdgeSemantic>,
  ): Promise<void> {
    const store = useGraphStore.getState();
    const oldSemantic = store.edgeSemantics.get(id);

    if (!oldSemantic) {
      throw new Error("Edge semantic not found");
    }

    // Optimistic update
    store.updateEdgeSemantic(id, updates);

    try {
      const ack = await socketClient.emitWithAck<UpdateEdgeSemanticAck>(
        "UPDATE_EDGE_SEMANTIC",
        {
          type: CommandMessageType.UPDATE_EDGE_SEMANTIC,
          requestId: "",
          payload: { id, updates },
        },
      );

      if (!ack.success) {
        throw new Error(ack.error?.message || "Update edge semantic failed");
      }
    } catch (error) {
      // Rollback
      store.updateEdgeSemantic(id, oldSemantic);
      throw error;
    }
  },

  async deleteEdgeSemantic(id: EdgeSemanticId): Promise<void> {
    const store = useGraphStore.getState();
    const oldSemantic = store.edgeSemantics.get(id);

    if (!oldSemantic) {
      throw new Error("Edge semantic not found");
    }

    // Optimistic delete
    store.deleteEdgeSemantic(id);

    try {
      const ack = await socketClient.emitWithAck<DeleteEdgeSemanticAck>(
        "DELETE_EDGE_SEMANTIC",
        {
          type: CommandMessageType.DELETE_EDGE_SEMANTIC,
          requestId: "",
          payload: { id },
        },
      );

      if (!ack.success) {
        throw new Error(ack.error?.message || "Delete edge semantic failed");
      }
    } catch (error) {
      // Rollback
      store.addEdgeSemantic(oldSemantic);
      throw error;
    }
  },

  // Node operations
  async addNode(node: NodeData): Promise<void> {
    const store = useGraphStore.getState();

    // Optimistic add
    store.addNode(node);

    try {
      const ack = await socketClient.emitWithAck<AddNodeAck>("ADD_NODE", {
        type: CommandMessageType.ADD_NODE,
        requestId: "",
        payload: node,
      });

      if (!ack.success) {
        throw new Error(ack.error?.message || "Add node failed");
      }
    } catch (error) {
      // Rollback
      store.deleteNode(node.id);
      throw error;
    }
  },

  async updateNode(id: NodeId, updates: Partial<NodeData>): Promise<void> {
    const store = useGraphStore.getState();
    const oldNode = store.nodes.get(id);

    if (!oldNode) {
      throw new Error("Node not found");
    }

    // Optimistic update
    store.updateNode(id, updates);

    try {
      const ack = await socketClient.emitWithAck<UpdateNodeAck>("UPDATE_NODE", {
        type: CommandMessageType.UPDATE_NODE,
        requestId: "",
        payload: { id, updates },
      });

      if (!ack.success) {
        throw new Error(ack.error?.message || "Update node failed");
      }
    } catch (error) {
      // Rollback
      store.updateNode(id, oldNode);
      throw error;
    }
  },

  async deleteNode(id: NodeId): Promise<void> {
    const store = useGraphStore.getState();
    const oldNode = store.nodes.get(id);

    if (!oldNode) {
      throw new Error("Node not found");
    }

    // Optimistic delete
    store.deleteNode(id);

    try {
      const ack = await socketClient.emitWithAck<DeleteNodeAck>("DELETE_NODE", {
        type: CommandMessageType.DELETE_NODE,
        requestId: "",
        payload: { id },
      });

      if (!ack.success) {
        throw new Error(ack.error?.message || "Delete node failed");
      }
    } catch (error) {
      // Rollback
      store.addNode(oldNode);
      throw error;
    }
  },

  // Edge operations
  async addEdge(edge: EdgeData): Promise<void> {
    const store = useGraphStore.getState();

    // Optimistic add
    store.addEdge(edge);

    try {
      const ack = await socketClient.emitWithAck<AddEdgeAck>("ADD_EDGE", {
        type: CommandMessageType.ADD_EDGE,
        requestId: "",
        payload: edge,
      });

      if (!ack.success) {
        throw new Error(ack.error?.message || "Add edge failed");
      }
    } catch (error) {
      // Rollback
      store.deleteEdge(edge.id);
      throw error;
    }
  },

  async updateEdge(id: EdgeId, updates: Partial<EdgeData>): Promise<void> {
    const store = useGraphStore.getState();
    const oldEdge = store.edges.get(id);

    if (!oldEdge) {
      throw new Error("Edge not found");
    }

    // Optimistic update
    store.updateEdge(id, updates);

    try {
      const ack = await socketClient.emitWithAck<UpdateEdgeAck>("UPDATE_EDGE", {
        type: CommandMessageType.UPDATE_EDGE,
        requestId: "",
        payload: { id, updates },
      });

      if (!ack.success) {
        throw new Error(ack.error?.message || "Update edge failed");
      }
    } catch (error) {
      // Rollback
      store.updateEdge(id, oldEdge);
      throw error;
    }
  },

  async deleteEdge(id: EdgeId): Promise<void> {
    const store = useGraphStore.getState();
    const oldEdge = store.edges.get(id);

    if (!oldEdge) {
      throw new Error("Edge not found");
    }

    // Optimistic delete
    store.deleteEdge(id);

    try {
      const ack = await socketClient.emitWithAck<DeleteEdgeAck>("DELETE_EDGE", {
        type: CommandMessageType.DELETE_EDGE,
        requestId: "",
        payload: { id },
      });

      if (!ack.success) {
        throw new Error(ack.error?.message || "Delete edge failed");
      }
    } catch (error) {
      // Rollback
      store.addEdge(oldEdge);
      throw error;
    }
  },

  // View operations
  async addView(view: View): Promise<void> {
    const store = useGraphStore.getState();

    // Optimistic add
    store.addView(view);

    try {
      const ack = await socketClient.emitWithAck<AddViewAck>("ADD_VIEW", {
        type: CommandMessageType.ADD_VIEW,
        requestId: "",
        payload: view,
      });

      if (!ack.success) {
        throw new Error(ack.error?.message || "Add view failed");
      }
    } catch (error) {
      // Rollback
      store.deleteView(view.id);
      throw error;
    }
  },

  async updateView(id: ViewId, updates: Partial<View>): Promise<void> {
    const store = useGraphStore.getState();
    const oldView = store.views.get(id);

    if (!oldView) {
      throw new Error("View not found");
    }

    // Optimistic update
    store.updateView(id, updates);

    try {
      const ack = await socketClient.emitWithAck<UpdateViewAck>("UPDATE_VIEW", {
        type: CommandMessageType.UPDATE_VIEW,
        requestId: "",
        payload: { id, updates },
      });

      if (!ack.success) {
        throw new Error(ack.error?.message || "Update view failed");
      }
    } catch (error) {
      // Rollback
      store.updateView(id, oldView);
      throw error;
    }
  },

  async deleteView(id: ViewId): Promise<void> {
    const store = useGraphStore.getState();
    const oldView = store.views.get(id);

    if (!oldView) {
      throw new Error("View not found");
    }

    // Optimistic delete
    store.deleteView(id);

    try {
      const ack = await socketClient.emitWithAck<DeleteViewAck>("DELETE_VIEW", {
        type: CommandMessageType.DELETE_VIEW,
        requestId: "",
        payload: { id },
      });

      if (!ack.success) {
        throw new Error(ack.error?.message || "Delete view failed");
      }
    } catch (error) {
      // Rollback
      store.addView(oldView);
      throw error;
    }
  },
  // ================== Query ==================

  async sync(query: SyncQuery): Promise<void> {
    const store = useGraphStore.getState();

    try {
      const ack = await socketClient.emitWithAck<SyncAck>("SYNC", {
        type: QueryMessageType.SYNC,
        requestId: "",
        payload: query,
      });

      if (!ack.success) {
        throw new Error(ack.error?.message || "Sync query failed");
      }

      if (ack.data) {
        store.syncFromServer(ack.data);
      }
    } catch (error) {
      throw error;
    }
  },
};
