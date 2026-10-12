import type { Workspace, WorkspaceId } from "@workspace/interfaces";
import { trpcClient } from "@workspace/api-client";
import { useWorkspaceStore, useDataStore, useUIStore } from "@workspace/store";
import { NodeService } from "./node.service";
import { EdgeService } from "./edge.service";
import { ViewService } from "./view.service";
import { NodeSemanticService } from "./node-semantic.service";
import { EdgeSemanticService } from "./edge-semantic.service";
import { NodeTagService } from "./node-tag.service";

/**
 * Workspace-scoped service. Follows the same optimistic store-first + tRPC +
 * rollback pattern as NodeService/ViewService, but is scoped to the workspace
 * domain (best-effort optimistic local state; the workspace backend procedures
 * are expected in the B5 backend task).
 */
export const WorkspaceService = {
  /**
   * Create or update a workspace.
   * - `string` (WorkspaceId): update — merge `updates` into the current store
   *   copy, then `trpc.workspace.update`; roll back on error.
   * - `Workspace`: create — `trpc.workspace.add`, then merge into the store.
   */
  async upsert(
    idOrWorkspace: WorkspaceId | Workspace,
    updates?: Partial<Workspace>,
  ): Promise<Workspace | void> {
    const wsStore = useWorkspaceStore.getState();

    if (typeof idOrWorkspace === "string") {
      const id = idOrWorkspace;
      if (!updates) throw new Error("Updates are required for update operation");
      const oldWorkspace = wsStore.workspaces.get(id);
      if (!oldWorkspace) throw new Error("Workspace not found");
      const merged = { ...oldWorkspace, ...updates } as Workspace;

      // 1. Immediately apply to local store for snappy UX.
      wsStore.setWorkspaces(
        Array.from(wsStore.workspaces.values()).map((w) =>
          w.id === id ? merged : w,
        ),
      );

      // 2. Persist via tRPC; roll back on failure.
      try {
        await trpcClient.workspace.update.mutate({ id, updates: merged });
      } catch (error) {
        wsStore.setWorkspaces(
          Array.from(wsStore.workspaces.values()).map((w) =>
            w.id === id ? oldWorkspace : w,
          ),
        );
        throw error;
      }
      return;
    }

    // Create flow — never debounced (we need the backend-generated id).
    const workspace = idOrWorkspace;
    const result = await trpcClient.workspace.add.mutate(workspace);
    const existing = Array.from(wsStore.workspaces.values()).filter(
      (w) => w.id !== result.id,
    );
    wsStore.setWorkspaces([...existing, result]);
    return result;
  },

  async delete(id: WorkspaceId): Promise<void> {
    const wsStore = useWorkspaceStore.getState();
    const oldWorkspace = wsStore.workspaces.get(id);
    if (!oldWorkspace) throw new Error("Workspace not found");
    wsStore.setWorkspaces(
      Array.from(wsStore.workspaces.values()).filter((w) => w.id !== id),
    );
    try {
      await trpcClient.workspace.delete.mutate({ id });
    } catch (error) {
      wsStore.setWorkspaces([
        ...Array.from(wsStore.workspaces.values()),
        oldWorkspace,
      ]);
      throw error;
    }
  },

  async sync(ids?: WorkspaceId[]): Promise<void> {
    const wsStore = useWorkspaceStore.getState();
    if (ids !== undefined) {
      const results: (Workspace | null)[] = await Promise.all(
        ids.map((id) => trpcClient.workspace.getById.query({ id })),
      );
      wsStore.setWorkspaces(results.filter((r): r is Workspace => r !== null));
      return;
    }

    // First login: a brand-new user has zero workspaces. Auto-provision a
    // default workspace (owned by them, with a global view), then re-list.
    const current = await trpcClient.workspace.listByUser.query({});
    if (current.length === 0) {
      await trpcClient.workspace.provisionDefault.mutate();
    }
    const results = await trpcClient.workspace.listByUser.query({});
    wsStore.setWorkspaces(results);
  },

  /**
   * Open a workspace: set it as the current workspace, then load the
   * workspace-scoped data via the per-model `syncByWorkspace` calls. Finally,
   * set the active view to the first view that was loaded (if any).
   *
   * Data isolation: switching to a *different* workspace resets the data store
   * first so the previous workspace's nodes/edges/views never leak into the new
   * one, and leaves a focused editor while preserving dashboard mode. Opening the
   * *same* workspace only reloads when its data is not present
   * (e.g. an initially-empty workspace just seeded — the seed writes to the
   * backend, so re-open reloads it into the store).
   */
  async open(workspaceId: WorkspaceId): Promise<void> {
    const prevWorkspaceId = useWorkspaceStore.getState().currentWorkspaceId;
    useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceId);

    const dataStore = useDataStore.getState();
    const isWorkspaceSwitch = prevWorkspaceId !== null && prevWorkspaceId !== workspaceId;

    // Leave a focused editor when switching workspaces. Dashboard stays open
    // and selects its new workspace-scoped pages. The editor view is a
    // focused, single-node surface whose context belongs to the previous
    // workspace, so returning to it would show stale content.
    if (isWorkspaceSwitch && useUIStore.getState().mainViewType === "editor") {
      useUIStore.getState().setMainViewType(useUIStore.getState().editorReturnViewType);
    }

    if (isWorkspaceSwitch || dataStore.nodes.size === 0 || dataStore.views.size === 0) {
      if (isWorkspaceSwitch) {
        useDataStore.getState().reset();
      }
      // Semantics and tags are workspace-scoped, so they are loaded alongside
      // the workspace data via their per-workspace sync. The reset() above
      // clears them on a workspace switch; the per-workspace sync re-fills only
      // the current workspace's own semantic set, preventing cross-workspace
      // leakage.
      await Promise.all([
        NodeService.syncByWorkspace(workspaceId),
        EdgeService.syncByWorkspace(workspaceId),
        ViewService.syncByWorkspace(workspaceId),
        NodeSemanticService.syncByWorkspace(workspaceId),
        EdgeSemanticService.syncByWorkspace(workspaceId),
        NodeTagService.syncByWorkspace(workspaceId),
      ]);
    }

    const views = useDataStore.getState().views;
    if (views.size > 0) {
      const firstViewId = views.values().next().value?.id;
      if (firstViewId) {
        useUIStore.getState().setCurrentViewId(firstViewId);
      }
    }
  },
};
