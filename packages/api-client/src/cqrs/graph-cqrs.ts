import {
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
  type SyncQuery,
} from "@workspace/interfaces";
import { trpcClient } from "../trpc/client";
import { useGraphStore } from "@workspace/store";

export const GraphCQRS = {
  // ================== Command ==================

  // Node Semantic operations
  async addNodeSemantic(semantic: NodeSemantic): Promise<void> {
    const store = useGraphStore.getState();

    // Optimistic add
    store.addNodeSemantic(semantic);

    try {
      await trpcClient.nodeSemantic.add.mutate(semantic);
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
      await trpcClient.nodeSemantic.update.mutate({ id, updates });
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
      await trpcClient.nodeSemantic.delete.mutate({ id });
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
      await trpcClient.edgeSemantic.add.mutate(semantic);
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
      await trpcClient.edgeSemantic.update.mutate({ id, updates });
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
      await trpcClient.edgeSemantic.delete.mutate({ id });
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
      await trpcClient.node.add.mutate(node);
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
      await trpcClient.node.update.mutate({ id, updates });
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
      await trpcClient.node.delete.mutate({ id });
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
      await trpcClient.edge.add.mutate(edge);
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
      await trpcClient.edge.update.mutate({ id, updates });
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
      await trpcClient.edge.delete.mutate({ id });
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
      await trpcClient.view.add.mutate(view);
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
      await trpcClient.view.update.mutate({ id, updates });
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
      await trpcClient.view.delete.mutate({ id });
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
      const data = await trpcClient.graph.sync.query(query);

      if (data) {
        store.syncFromServer(data);
      }
    } catch (error) {
      throw error;
    }
  },
};
