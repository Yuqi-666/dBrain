import type {
  NodeData,
  NodeId,
  WorkspaceId,
} from "@workspace/interfaces";
import { trpcClient } from "@workspace/api-client";
import { useDataStore, useWorkspaceStore } from "@workspace/store";
import {
  DebounceScheduler,
  resolveDebounceMs,
  shouldDebounce,
} from "@workspace/utils";
import {
  syncViewEnumerationOnCreate,
  syncViewEnumerationOnDelete,
} from "./view-enum-sync";

const DEFAULT_NODE_UPDATE_DEBOUNCE_MS = 500;
const nodeUpdateScheduler = new DebounceScheduler<NodeData, void>(
  DEFAULT_NODE_UPDATE_DEBOUNCE_MS,
);

export interface NodeUpsertOptions {
  /**
   * Debounce the API call (tRPC mutation) while keeping the local store
   * update immediate.
   *
   * - `undefined` / `false` (default): call API synchronously, no debounce.
   * - `true`: debounce with the default delay (500ms).
   * - `number`: debounce with the provided delay in milliseconds.
   *
   * Local state is always updated synchronously regardless of this flag.
   */
  debounce?: boolean | number;
}

export const NodeService = {
  async upsert(
    idOrNode: NodeId | NodeData,
    updates?: Partial<NodeData>,
    options?: NodeUpsertOptions,
  ): Promise<NodeData | void> {
    const store = useDataStore.getState();

    if (typeof idOrNode === "string") {
      const id = idOrNode;
      if (!updates) throw new Error("Updates are required for update operation");
      const oldNode = store.nodes.get(id);
      if (!oldNode) throw new Error("Node not found");
      const merged = { ...oldNode, ...updates } as NodeData;

      // 1. Immediately apply to local store for snappy UX.
      store.upsertNode(merged);

      // 2. Choose the API path.
      if (!shouldDebounce(options?.debounce)) {
        try {
          await trpcClient.node.update.mutate({ id, updates: merged });
        } catch (error) {
          store.upsertNode(oldNode);
          throw error;
        }
        return;
      }

      // 3. Debounced path — schedule (or merge into) the pending tRPC call.
      const delayMs = resolveDebounceMs(
        options?.debounce,
        DEFAULT_NODE_UPDATE_DEBOUNCE_MS,
      );

      return nodeUpdateScheduler.schedule(
        id,
        merged,
        async (payload) => {
          await trpcClient.node.update.mutate({ id, updates: payload });
        },
        (error, originalPayload) => {
          // Roll back to the snapshot captured before the first change in
          // this debounce window.
          store.upsertNode(originalPayload);
          console.error(
            `[NodeService] Debounced update failed for ${id}, rolled back.`,
            error,
          );
        },
        { delay: delayMs },
      );
    }

    // Create flow — never debounced (we need the backend-generated id).
    // Stamp the current workspace id so every created node is scoped to the
    // active workspace, regardless of which UI code triggered the create.
    const node = idOrNode;
    const workspaceId =
      node.workspaceId ?? useWorkspaceStore.getState().currentWorkspaceId ?? undefined;
    const scopedNode = workspaceId ? { ...node, workspaceId } : node;
    const result = await trpcClient.node.add.mutate(scopedNode);
    store.upsertNode(result);
    syncViewEnumerationOnCreate(result.id);
    return result;
  },

  async delete(id: NodeId): Promise<void> {
    const store = useDataStore.getState();
    const oldNode = store.nodes.get(id);
    if (!oldNode) throw new Error("Node not found");
    store.deleteNode(id);
    syncViewEnumerationOnDelete(id);
    try {
      await trpcClient.node.delete.mutate({ id });
    } catch (error) {
      store.upsertNode(oldNode);
      throw error;
    }
  },

  async sync(ids?: NodeId[]): Promise<void> {
    const store = useDataStore.getState();
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

  /**
   * Load all nodes scoped to a workspace into the data store.
   * Relies on the `node.listByWorkspace` tRPC procedure (backend B3 pending).
   */
  async syncByWorkspace(workspaceId: WorkspaceId): Promise<void> {
    const store = useDataStore.getState();
    const results = await trpcClient.node.listByWorkspace.query({ workspaceId });
    store.loadWorkspaceData({ nodes: results });
  },

  /**
   * Flush any pending debounced node update immediately. Useful for tests
   * or for ensuring persistence before unmount.
   */
  flushPendingUpdate(id: NodeId): Promise<void> | null {
    return nodeUpdateScheduler.flush(id);
  },

  /** Cancel a pending debounced update for `id` without persisting. */
  cancelPendingUpdate(id: NodeId): void {
    nodeUpdateScheduler.cancel(id);
  },
};