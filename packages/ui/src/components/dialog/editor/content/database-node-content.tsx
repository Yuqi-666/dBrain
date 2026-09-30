"use client";

import { useCallback, useMemo, useRef } from "react";
import type {
  DatabaseCell,
  DatabaseContent,
  DatabaseField,
  DatabaseNodeData,
  DataRow,
  DataView,
} from "@workspace/interfaces";
import { DataViewRoot, databaseToDataViewSource } from "@workspace/dataview";
import { NodeService } from "@workspace/services";
import { useDataStore, useUIStore } from "@workspace/store";
import { cn } from "@workspace/ui/lib/utils";

interface DatabaseNodeContentProps {
  node: DatabaseNodeData;
  className?: string;
}

/**
 * DatabaseNodeContent - the `database` node's content editor.
 *
 * The node owns its table (`content.fields` / `content.rows`); this component
 * only adapts it into a `DataViewSource` and persists what the data views
 * report back. Every write goes through `NodeService.upsert`, i.e. the same
 * optimistic path the rest of the app uses — data views never touch the store.
 *
 * Two rules make that persistence safe, and both are load-bearing:
 *
 * 1. **Patch the freshest content, never the render's copy.** One gesture can
 *    report two changes (adding a field writes its column config _and_ the
 *    field), and a patch built from a snapshot taken before the first write
 *    silently drops it. Every handler therefore reads the node back from the
 *    store through {@link liveContent}; `NodeService.upsert` updates the store
 *    optimistically and synchronously, so the second read sees the first write.
 * 2. **Serialize the writes.** Two writes for the same node must never be in
 *    flight together: PocketBase's SDK cancels a pending request when another
 *    one for the same record starts (the repositories pass the record id as the
 *    `requestKey`), which used to abort the first half of a gesture and roll the
 *    store back — the new row of an empty table flashed and vanished with
 *    `TRPCClientError: The request was aborted (most likely autocancelled…)`.
 *    A microtask-queued drain merges every patch raised in the same tick into a
 *    single upsert, then awaits it before sending the next.
 */
export function DatabaseNodeContent({
  node,
  className,
}: DatabaseNodeContentProps) {
  const content = node.content;

  const source = useMemo(
    () => databaseToDataViewSource(content, node.id),
    [content, node.id],
  );

  const liveContent = useCallback((): DatabaseContent => {
    const live = useDataStore.getState().nodes.get(node.id);
    return live?.nodeType === "database" ? live.content : node.content;
  }, [node.content, node.id]);

  /** Patches queued for the current drain; merged one write at a time. */
  const pendingPatches = useRef<Partial<DatabaseContent>[]>([]);
  const draining = useRef(false);
  const drainScheduled = useRef(false);

  const drainWrites = useCallback(async () => {
    if (draining.current) return;
    draining.current = true;
    try {
      // Re-checks the queue every round, so a patch raised while a write is in
      // flight is picked up instead of being left to a later gesture.
      while (pendingPatches.current.length > 0) {
        const merged = Object.assign(
          {},
          ...pendingPatches.current.splice(0),
        ) as Partial<DatabaseContent>;
        const current = liveContent();
        try {
          await NodeService.upsert(node.id, {
            content: { ...current, ...merged },
          });
        } catch (error) {
          console.error(
            "[DatabaseNodeContent] Failed to persist database content",
            error,
          );
        }
      }
    } finally {
      draining.current = false;
    }
  }, [liveContent, node.id]);

  const patchContent = useCallback(
    (patch: Partial<DatabaseContent>) => {
      pendingPatches.current.push(patch);
      if (draining.current || drainScheduled.current) return;
      drainScheduled.current = true;
      queueMicrotask(() => {
        drainScheduled.current = false;
        void drainWrites();
      });
    },
    [drainWrites],
  );

  const handleViewsChange = useCallback(
    (views: DataView[]) => {
      patchContent({ views });
    },
    [patchContent],
  );

  const handleCellChange = useCallback(
    (rowId: string, fieldId: string, cell: DatabaseCell) => {
      const rows = liveContent().rows.map((row) =>
        row.id === rowId
          ? { ...row, cells: { ...row.cells, [fieldId]: cell } }
          : row,
      );
      patchContent({ rows });
    },
    [liveContent, patchContent],
  );

  const handleOpenNode = useCallback((nodeId: string) => {
    useUIStore.getState().handleNodeEdit(nodeId);
  }, []);

  const handleRowInsert = useCallback(
    (row: DataRow) => {
      patchContent({ rows: [...liveContent().rows, row] });
    },
    [liveContent, patchContent],
  );

  const handleRowDelete = useCallback(
    (rowIds: readonly string[]) => {
      if (rowIds.length === 0) return;
      const removed = new Set(rowIds);
      patchContent({
        rows: liveContent().rows.filter((row) => !removed.has(row.id)),
      });
    },
    [liveContent, patchContent],
  );

  const handleRowReorder = useCallback(
    (rowIds: readonly string[]) => {
      if (rowIds.length === 0) return;
      const rows = liveContent().rows;
      const byId = new Map(rows.map((row) => [row.id, row]));
      const ordered = rowIds
        .map((rowId) => byId.get(rowId))
        .filter((row): row is DataRow => row !== undefined);
      const listed = new Set(rowIds);
      const rest = rows.filter((row) => !listed.has(row.id));
      patchContent({ rows: [...ordered, ...rest] });
    },
    [liveContent, patchContent],
  );

  /**
   * Schema writes from the table view (字段配置 / 字段编辑 / 删除字段).
   *
   * The data view reports the whole next field list plus, when it also had to
   * rewrite cells (a deleted field's cells, a retyped or default-valued one),
   * the matching row set. Both halves land in one `NodeService.upsert`.
   */
  const handleFieldsChange = useCallback(
    (fields: DatabaseField[], rows?: DataRow[]) => {
      patchContent({ fields, rows: rows ?? liveContent().rows });
    },
    [liveContent, patchContent],
  );

  /**
   * Relation cells display the referenced node's title. Read through
   * `getState()` rather than a store selector so a database node does not
   * re-render on every unrelated node change; the lookup runs while the data
   * views build their records.
   */
  const resolveNodeTitle = useCallback(
    (nodeId: string) => useDataStore.getState().nodes.get(nodeId)?.title,
    [],
  );

  return (
    <div className={cn("h-full min-h-0 w-full p-4", className)}>
      <DataViewRoot
        // Remount per node so the view/active-view state re-seeds.
        key={node.id}
        source={source}
        views={content.views}
        onViewsChange={handleViewsChange}
        onCellChange={handleCellChange}
        onOpenNode={handleOpenNode}
        onRowInsert={handleRowInsert}
        onRowDelete={handleRowDelete}
        onRowReorder={handleRowReorder}
        onFieldsChange={handleFieldsChange}
        resolveNodeTitle={resolveNodeTitle}
      />
    </div>
  );
}
