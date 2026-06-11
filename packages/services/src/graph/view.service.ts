import type {
  View,
  ViewId,
} from "@workspace/interfaces";
import { trpcClient } from "@workspace/api-client";
import { useDataStore } from "@workspace/store";
import {
  DebounceScheduler,
  resolveDebounceMs,
  shouldDebounce,
} from "@workspace/utils";

const DEFAULT_VIEW_UPDATE_DEBOUNCE_MS = 500;
const viewUpdateScheduler = new DebounceScheduler<View, void>(
  DEFAULT_VIEW_UPDATE_DEBOUNCE_MS,
);

export interface ViewUpsertOptions {
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

export const ViewService = {
  async upsert(
    idOrView: ViewId | View,
    updates?: Partial<View>,
    options?: ViewUpsertOptions,
  ): Promise<View | void> {
    const store = useDataStore.getState();

    if (typeof idOrView === "string") {
      if (!updates) throw new Error("Updates are required for update operation");
      const id = idOrView;
      const oldView = store.views.get(id);
      if (!oldView) throw new Error("View not found");
      const merged = { ...oldView, ...updates };

      // 1. Immediately apply to local store.
      store.upsertView(merged);

      if (!shouldDebounce(options?.debounce)) {
        try {
          await trpcClient.view.update.mutate({ id, updates: merged });
        } catch (error) {
          store.upsertView(oldView);
          throw error;
        }
        return;
      }

      const delayMs = resolveDebounceMs(
        options?.debounce,
        DEFAULT_VIEW_UPDATE_DEBOUNCE_MS,
      );

      return viewUpdateScheduler.schedule(
        id,
        merged,
        async (payload) => {
          await trpcClient.view.update.mutate({ id, updates: payload });
        },
        (error, originalPayload) => {
          store.upsertView(originalPayload);
          console.error(
            `[ViewService] Debounced update failed for ${id}, rolled back.`,
            error,
          );
        },
        { delay: delayMs },
      );
    }

    const view = idOrView;
    const result = await trpcClient.view.add.mutate(view);
    store.upsertView(result);
    return result;
  },

  async delete(id: ViewId): Promise<void> {
    const store = useDataStore.getState();
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

  async sync(ids?: ViewId[]): Promise<void> {
    const store = useDataStore.getState();
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

  flushPendingUpdate(id: ViewId): Promise<void> | null {
    return viewUpdateScheduler.flush(id);
  },

  cancelPendingUpdate(id: ViewId): void {
    viewUpdateScheduler.cancel(id);
  },
};