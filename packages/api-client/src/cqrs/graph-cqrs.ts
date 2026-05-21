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
  async upsertNodeSemantic(
    idOrSemantic: NodeSemanticId | NodeSemantic,
    updates?: Partial<NodeSemantic>,
  ): Promise<void> {
    const store = useGraphStore.getState();

    if (typeof idOrSemantic === "string") {
      const id = idOrSemantic;
      const oldSemantic = store.nodeSemantics.get(id);
      if (!oldSemantic) throw new Error("Node semantic not found");
      const merged = { ...oldSemantic, ...updates };
      store.upsertNodeSemantic(merged);
      try {
        await trpcClient.nodeSemantic.update.mutate({ id, updates: merged });
      } catch (error) {
        store.upsertNodeSemantic(oldSemantic);
        throw error;
      }
    } else {
      const semantic = idOrSemantic;
      const oldSemantic = store.nodeSemantics.get(semantic.id);
      store.upsertNodeSemantic(semantic);
      try {
        if (oldSemantic) {
          await trpcClient.nodeSemantic.update.mutate({ id: semantic.id, updates: semantic });
        } else {
          await trpcClient.nodeSemantic.add.mutate(semantic);
        }
      } catch (error) {
        if (oldSemantic) store.upsertNodeSemantic(oldSemantic);
        else store.deleteNodeSemantic(semantic.id);
        throw error;
      }
    }
  },

  async deleteNodeSemantic(id: NodeSemanticId): Promise<void> {
    const store = useGraphStore.getState();
    const oldSemantic = store.nodeSemantics.get(id);
    if (!oldSemantic) throw new Error("Node semantic not found");
    store.deleteNodeSemantic(id);
    try {
      await trpcClient.nodeSemantic.delete.mutate({ id });
    } catch (error) {
      store.upsertNodeSemantic(oldSemantic);
      throw error;
    }
  },

  // Edge Semantic operations
  async upsertEdgeSemantic(
    idOrSemantic: EdgeSemanticId | EdgeSemantic,
    updates?: Partial<EdgeSemantic>,
  ): Promise<void> {
    const store = useGraphStore.getState();

    if (typeof idOrSemantic === "string") {
      const id = idOrSemantic;
      const oldSemantic = store.edgeSemantics.get(id);
      if (!oldSemantic) throw new Error("Edge semantic not found");
      const merged = { ...oldSemantic, ...updates };
      store.upsertEdgeSemantic(merged);
      try {
        await trpcClient.edgeSemantic.update.mutate({ id, updates: merged });
      } catch (error) {
        store.upsertEdgeSemantic(oldSemantic);
        throw error;
      }
    } else {
      const semantic = idOrSemantic;
      const oldSemantic = store.edgeSemantics.get(semantic.id);
      store.upsertEdgeSemantic(semantic);
      try {
        if (oldSemantic) {
          await trpcClient.edgeSemantic.update.mutate({ id: semantic.id, updates: semantic });
        } else {
          await trpcClient.edgeSemantic.add.mutate(semantic);
        }
      } catch (error) {
        if (oldSemantic) store.upsertEdgeSemantic(oldSemantic);
        else store.deleteEdgeSemantic(semantic.id);
        throw error;
      }
    }
  },

  async deleteEdgeSemantic(id: EdgeSemanticId): Promise<void> {
    const store = useGraphStore.getState();
    const oldSemantic = store.edgeSemantics.get(id);
    if (!oldSemantic) throw new Error("Edge semantic not found");
    store.deleteEdgeSemantic(id);
    try {
      await trpcClient.edgeSemantic.delete.mutate({ id });
    } catch (error) {
      store.upsertEdgeSemantic(oldSemantic);
      throw error;
    }
  },

  // Node Tag operations
  async upsertNodeTag(
    idOrTag: NodeTagId | NodeTag,
    updates?: Partial<NodeTag>,
  ): Promise<void> {
    const store = useGraphStore.getState();

    if (typeof idOrTag === "string") {
      const id = idOrTag;
      const oldTag = store.nodeTags.get(id);
      if (!oldTag) throw new Error("Node tag not found");
      const merged = { ...oldTag, ...updates };
      store.upsertNodeTag(merged);
      try {
        await trpcClient.nodeTag.update.mutate({ id, updates: merged });
      } catch (error) {
        store.upsertNodeTag(oldTag);
        throw error;
      }
    } else {
      const tag = idOrTag;
      const oldTag = store.nodeTags.get(tag.id);
      store.upsertNodeTag(tag);
      try {
        if (oldTag) {
          await trpcClient.nodeTag.update.mutate({ id: tag.id, updates: tag });
        } else {
          await trpcClient.nodeTag.add.mutate(tag);
        }
      } catch (error) {
        if (oldTag) store.upsertNodeTag(oldTag);
        else store.deleteNodeTag(tag.id);
        throw error;
      }
    }
  },

  async deleteNodeTag(id: NodeTagId): Promise<void> {
    const store = useGraphStore.getState();
    const oldTag = store.nodeTags.get(id);
    if (!oldTag) throw new Error("Node tag not found");
    store.deleteNodeTag(id);
    try {
      await trpcClient.nodeTag.delete.mutate({ id });
    } catch (error) {
      store.upsertNodeTag(oldTag);
      throw error;
    }
  },

  // Node operations
  async upsertNode(
    idOrNode: NodeId | NodeData,
    updates?: Partial<NodeData>,
  ): Promise<void> {
    const store = useGraphStore.getState();

    if (typeof idOrNode === "string") {
      const id = idOrNode;
      const oldNode = store.nodes.get(id);
      if (!oldNode) throw new Error("Node not found");
      const merged = { ...oldNode, ...updates } as NodeData;
      store.upsertNode(merged);
      try {
        await trpcClient.node.update.mutate({ id, updates: merged });
      } catch (error) {
        store.upsertNode(oldNode);
        throw error;
      }
    } else {
      const node = idOrNode;
      const oldNode = store.nodes.get(node.id);
      store.upsertNode(node);
      try {
        if (oldNode) {
          await trpcClient.node.update.mutate({ id: node.id, updates: node });
        } else {
          await trpcClient.node.add.mutate(node);
        }
      } catch (error) {
        if (oldNode) store.upsertNode(oldNode);
        else store.deleteNode(node.id);
        throw error;
      }
    }
  },

  async deleteNode(id: NodeId): Promise<void> {
    const store = useGraphStore.getState();
    const oldNode = store.nodes.get(id);
    if (!oldNode) throw new Error("Node not found");
    store.deleteNode(id);
    try {
      await trpcClient.node.delete.mutate({ id });
    } catch (error) {
      store.upsertNode(oldNode);
      throw error;
    }
  },

  // Edge operations
  async upsertEdge(
    idOrEdge: EdgeId | EdgeData,
    updates?: Partial<EdgeData>,
  ): Promise<void> {
    const store = useGraphStore.getState();

    if (typeof idOrEdge === "string") {
      const id = idOrEdge;
      const oldEdge = store.edges.get(id);
      if (!oldEdge) throw new Error("Edge not found");
      const merged = { ...oldEdge, ...updates };
      store.upsertEdge(merged);
      try {
        await trpcClient.edge.update.mutate({ id, updates: merged });
      } catch (error) {
        store.upsertEdge(oldEdge);
        throw error;
      }
    } else {
      const edge = idOrEdge;
      const oldEdge = store.edges.get(edge.id);
      store.upsertEdge(edge);
      try {
        if (oldEdge) {
          await trpcClient.edge.update.mutate({ id: edge.id, updates: edge });
        } else {
          await trpcClient.edge.add.mutate(edge);
        }
      } catch (error) {
        if (oldEdge) store.upsertEdge(oldEdge);
        else store.deleteEdge(edge.id);
        throw error;
      }
    }
  },

  async deleteEdge(id: EdgeId): Promise<void> {
    const store = useGraphStore.getState();
    const oldEdge = store.edges.get(id);
    if (!oldEdge) throw new Error("Edge not found");
    store.deleteEdge(id);
    try {
      await trpcClient.edge.delete.mutate({ id });
    } catch (error) {
      store.upsertEdge(oldEdge);
      throw error;
    }
  },

  // View operations
  async upsertView(
    idOrView: ViewId | View,
    updates?: Partial<View>,
  ): Promise<void> {
    const store = useGraphStore.getState();

    if (typeof idOrView === "string") {
      const id = idOrView;
      const oldView = store.views.get(id);
      if (!oldView) throw new Error("View not found");
      const merged = { ...oldView, ...updates };
      store.upsertView(merged);
      try {
        await trpcClient.view.update.mutate({ id, updates: merged });
      } catch (error) {
        store.upsertView(oldView);
        throw error;
      }
    } else {
      const view = idOrView;
      const oldView = store.views.get(view.id);
      store.upsertView(view);
      try {
        if (oldView) {
          await trpcClient.view.update.mutate({ id: view.id, updates: view });
        } else {
          await trpcClient.view.add.mutate(view);
        }
      } catch (error) {
        if (oldView) store.upsertView(oldView);
        else store.deleteView(view.id);
        throw error;
      }
    }
  },

  async deleteView(id: ViewId): Promise<void> {
    const store = useGraphStore.getState();
    const oldView = store.views.get(id);
    if (!oldView) throw new Error("View not found");
    store.deleteView(id);
    try {
      await trpcClient.view.delete.mutate({ id });
    } catch (error) {
      store.upsertView(oldView);
      throw error;
    }
  },

  // ==================== Query ====================

  async syncNodeSemantic(ids?: NodeSemanticId[]): Promise<void> {
    const store = useGraphStore.getState();
    if (ids !== undefined) {
      const results: (NodeSemantic | null)[] = await Promise.all(
        ids.map((id) => trpcClient.nodeSemantic.getById.query({ id })),
      );
      store.upsertNodeSemantics(results.filter((r): r is NodeSemantic => r !== null));
    } else {
      const results = await trpcClient.nodeSemantic.list.query();
      store.upsertNodeSemantics(results);
    }
  },

  async syncEdgeSemantic(ids?: EdgeSemanticId[]): Promise<void> {
    const store = useGraphStore.getState();
    if (ids !== undefined) {
      const results: (EdgeSemantic | null)[] = await Promise.all(
        ids.map((id) => trpcClient.edgeSemantic.getById.query({ id })),
      );
      store.upsertEdgeSemantics(results.filter((r): r is EdgeSemantic => r !== null));
    } else {
      const results = await trpcClient.edgeSemantic.list.query();
      store.upsertEdgeSemantics(results);
    }
  },

  async syncNodeTag(ids?: NodeTagId[]): Promise<void> {
    const store = useGraphStore.getState();
    if (ids !== undefined) {
      const results: (NodeTag | null)[] = await Promise.all(
        ids.map((id) => trpcClient.nodeTag.getById.query({ id })),
      );
      store.upsertNodeTags(results.filter((r): r is NodeTag => r !== null));
    } else {
      const results = await trpcClient.nodeTag.list.query();
      store.upsertNodeTags(results);
    }
  },

  async syncNode(ids?: NodeId[]): Promise<void> {
    const store = useGraphStore.getState();
    if (ids !== undefined) {
      const results: (NodeData | null)[] = await Promise.all(
        ids.map((id) => trpcClient.node.getById.query({ id })),
      );
      store.upsertNodes(results.filter((r): r is NodeData => r !== null));
    } else {
      const results = await trpcClient.node.list.query({});
      store.upsertNodes(results);
    }
  },

  async syncEdge(ids?: EdgeId[]): Promise<void> {
    const store = useGraphStore.getState();
    if (ids !== undefined) {
      const results: (EdgeData | null)[] = await Promise.all(
        ids.map((id) => trpcClient.edge.getById.query({ id })),
      );
      store.upsertEdges(results.filter((r): r is EdgeData => r !== null));
    } else {
      const results = await trpcClient.edge.list.query({});
      store.upsertEdges(results);
    }
  },

  async syncView(ids?: ViewId[]): Promise<void> {
    const store = useGraphStore.getState();
    if (ids !== undefined) {
      const results: (View | null)[] = await Promise.all(
        ids.map((id) => trpcClient.view.getById.query({ id })),
      );
      store.upsertViews(results.filter((r): r is View => r !== null));
    } else {
      const results = await trpcClient.view.list.query({});
      store.upsertViews(results);
    }
  },
};
