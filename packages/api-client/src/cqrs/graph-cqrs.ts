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
  type NodeTag,
  type NodeTagId,
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

  // Node Tag operations
  async addNodeTag(tag: NodeTag): Promise<void> {
    const store = useGraphStore.getState();
    store.addNodeTag(tag);
    try {
      await trpcClient.nodeTag.add.mutate(tag);
    } catch (error) {
      store.deleteNodeTag(tag.id);
      throw error;
    }
  },

  async updateNodeTag(
    id: NodeTagId,
    updates: Partial<NodeTag>,
  ): Promise<void> {
    const store = useGraphStore.getState();
    const oldTag = store.nodeTags.get(id);

    if (!oldTag) {
      throw new Error("Node tag not found");
    }

    // Optimistic update
    store.updateNodeTag(id, updates);

    try {
      await trpcClient.nodeTag.update.mutate({ id, updates });
    } catch (error) {
      store.updateNodeTag(id, oldTag);
      throw error;
    }
  },

  async deleteNodeTag(id: NodeTagId): Promise<void> {
    const store = useGraphStore.getState();
    const oldTag = store.nodeTags.get(id);

    if (!oldTag) {
      throw new Error("Node tag not found");
    }

    // Optimistic delete
    store.deleteNodeTag(id);

    try {
      await trpcClient.nodeTag.delete.mutate({ id });
    } catch (error) {
      store.addNodeTag(oldTag);
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

  // ==================== Query ====================

  // Node Semantic sync
  async syncNodeSemantic(ids?: NodeSemanticId[]): Promise<void> {
    const store = useGraphStore.getState();

    if (ids !== undefined) {
      const results: (NodeSemantic | null)[] = await Promise.all(
        ids.map((id) => trpcClient.nodeSemantic.getById.query({ id })),
      );
      store.setNodeSemantics(results.filter((r): r is NodeSemantic => r !== null));
    } else {
      const results = await trpcClient.nodeSemantic.list.query();
      store.setNodeSemantics(results);
    }
  },

  // Edge Semantic sync
  async syncEdgeSemantic(ids?: EdgeSemanticId[]): Promise<void> {
    const store = useGraphStore.getState();

    if (ids !== undefined) {
      const results: (EdgeSemantic | null)[] = await Promise.all(
        ids.map((id) => trpcClient.edgeSemantic.getById.query({ id })),
      );
      store.setEdgeSemantics(results.filter((r): r is EdgeSemantic => r !== null));
    } else {
      const results = await trpcClient.edgeSemantic.list.query();
      store.setEdgeSemantics(results);
    }
  },

  // Node Tag sync
  async syncNodeTag(ids?: NodeTagId[]): Promise<void> {
    const store = useGraphStore.getState();

    if (ids !== undefined) {
      const results: (NodeTag | null)[] = await Promise.all(
        ids.map((id) => trpcClient.nodeTag.getById.query({ id })),
      );
      store.setNodeTags(results.filter((r): r is NodeTag => r !== null));
    } else {
      const results = await trpcClient.nodeTag.list.query();
      store.setNodeTags(results);
    }
  },

  // Node sync
  async syncNode(ids?: NodeId[]): Promise<void> {
    const store = useGraphStore.getState();

    if (ids !== undefined) {
      const results: (NodeData | null)[] = await Promise.all(
        ids.map((id) => trpcClient.node.getById.query({ id })),
      );
      store.setNodes(results.filter((r): r is NodeData => r !== null));
    } else {
      const results = await trpcClient.node.list.query({});
      store.setNodes(results);
    }
  },

  // Edge sync
  async syncEdge(ids?: EdgeId[]): Promise<void> {
    const store = useGraphStore.getState();

    if (ids !== undefined) {
      const results: (EdgeData | null)[] = await Promise.all(
        ids.map((id) => trpcClient.edge.getById.query({ id })),
      );
      store.setEdges(results.filter((r): r is EdgeData => r !== null));
    } else {
      const results = await trpcClient.edge.list.query({});
      store.setEdges(results);
    }
  },

  // View sync
  async syncView(ids?: ViewId[]): Promise<void> {
    const store = useGraphStore.getState();

    if (ids !== undefined) {
      const results: (View | null)[] = await Promise.all(
        ids.map((id) => trpcClient.view.getById.query({ id })),
      );
      store.setViews(results.filter((r): r is View => r !== null));
    } else {
      const results = await trpcClient.view.list.query({});
      store.setViews(results);
    }
  },
};
