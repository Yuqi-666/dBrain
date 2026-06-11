import type {
  NodeTag,
  NodeTagId,
} from "@workspace/interfaces";
import { trpcClient } from "@workspace/api-client";
import { useDataStore } from "@workspace/store";
import {
  DebounceScheduler,
  resolveDebounceMs,
  shouldDebounce,
} from "@workspace/utils";

const DEFAULT_NODE_TAG_UPDATE_DEBOUNCE_MS = 500;
const nodeTagUpdateScheduler = new DebounceScheduler<NodeTag, void>(
  DEFAULT_NODE_TAG_UPDATE_DEBOUNCE_MS,
);

export interface NodeTagUpsertOptions {
  /**
   * Debounce the API call (tRPC mutation) while keeping the local store
   * update immediate.
   *
   * - `undefined` / `false` (default): call API synchronously, no debounce.
   * - `true`: debounce with the default delay (500ms).
   * - `number`: debounce with the provided delay in milliseconds.
   */
  debounce?: boolean | number;
}

export const NodeTagService = {
  async upsert(
    idOrTag: NodeTagId | NodeTag,
    updates?: Partial<NodeTag>,
    options?: NodeTagUpsertOptions,
  ): Promise<NodeTag | void> {
    const store = useDataStore.getState();

    if (typeof idOrTag === "string") {
      if (!updates) throw new Error("Updates are required for update operation");
      const id = idOrTag;
      const oldTag = store.nodeTags.get(id);
      if (!oldTag) throw new Error("Node tag not found");
      const merged = { ...oldTag, ...updates };

      store.upsertNodeTag(merged);

      if (!shouldDebounce(options?.debounce)) {
        try {
          await trpcClient.nodeTag.update.mutate({ id, updates: merged });
        } catch (error) {
          store.upsertNodeTag(oldTag);
          throw error;
        }
        return;
      }

      const delayMs = resolveDebounceMs(
        options?.debounce,
        DEFAULT_NODE_TAG_UPDATE_DEBOUNCE_MS,
      );

      return nodeTagUpdateScheduler.schedule(
        id,
        merged,
        async (payload) => {
          await trpcClient.nodeTag.update.mutate({ id, updates: payload });
        },
        (error, originalPayload) => {
          store.upsertNodeTag(originalPayload);
          console.error(
            `[NodeTagService] Debounced update failed for ${id}, rolled back.`,
            error,
          );
        },
        { delay: delayMs },
      );
    }

    const tag = idOrTag;
    const result = await trpcClient.nodeTag.add.mutate(tag);
    store.upsertNodeTag(result);
    return result;
  },

  async delete(id: NodeTagId): Promise<void> {
    const store = useDataStore.getState();
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

  async sync(ids?: NodeTagId[]): Promise<void> {
    const store = useDataStore.getState();
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

  flushPendingUpdate(id: NodeTagId): Promise<void> | null {
    return nodeTagUpdateScheduler.flush(id);
  },

  cancelPendingUpdate(id: NodeTagId): void {
    nodeTagUpdateScheduler.cancel(id);
  },
};