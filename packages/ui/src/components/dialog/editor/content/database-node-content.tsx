"use client";

import { useCallback, useMemo } from "react";
import type {
  DatabaseCell,
  DatabaseContent,
  DatabaseNodeData,
  DataView,
} from "@workspace/interfaces";
import { DataViewRoot, databaseToDataViewSource } from "@workspace/dataview";
import { NodeService } from "@workspace/services";
import { useUIStore } from "@workspace/store";
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

  const persistContent = useCallback(
    (next: DatabaseContent) => {
      void NodeService.upsert(node.id, { content: next }).catch(
        (error: unknown) => {
          console.error(
            "[DatabaseNodeContent] Failed to persist database content",
            error,
          );
        },
      );
    },
    [node.id],
  );

  const handleViewsChange = useCallback(
    (views: DataView[]) => {
      persistContent({ ...content, views });
    },
    [content, persistContent],
  );

  const handleCellChange = useCallback(
    (rowId: string, fieldId: string, cell: DatabaseCell) => {
      const rows = content.rows.map((row) =>
        row.id === rowId
          ? { ...row, cells: { ...row.cells, [fieldId]: cell } }
          : row,
      );
      persistContent({ ...content, rows });
    },
    [content, persistContent],
  );

  const handleOpenNode = useCallback((nodeId: string) => {
    useUIStore.getState().handleNodeEdit(nodeId);
  }, []);

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
      />
    </div>
  );
}
