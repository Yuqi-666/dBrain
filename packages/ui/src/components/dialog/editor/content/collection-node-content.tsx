"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  CollectionContent,
  CollectionNodeData,
  DataView,
} from "@workspace/interfaces";
import {
  DataViewRoot,
  RecordEditor,
  collectionToDataViewSource,
  type OpenRecordOptions,
} from "@workspace/dataview";
import { NodeService } from "@workspace/services";
import { useDataStore, useUIStore } from "@workspace/store";
import { cn } from "@workspace/ui/lib/utils";

interface CollectionNodeContentProps {
  node: CollectionNodeData;
  className?: string;
}

/**
 * CollectionNodeContent - the `collection` node's content editor.
 *
 * The collection's rows are a read-only projection of the graph nodes its
 * `filterConfig` selects, so the embedded data views are read-only for data
 * but still fully manageable (add / rename / configure views). Opening a row
 * navigates the editor to the underlying graph node.
 */
export function CollectionNodeContent({
  node,
  className,
}: CollectionNodeContentProps) {
  const nodes = useDataStore((state) => state.nodes);
  const nodeSemantics = useDataStore((state) => state.nodeSemantics);
  const nodeTags = useDataStore((state) => state.nodeTags);

  const content = node.content;

  const source = useMemo(
    () =>
      collectionToDataViewSource(node, nodes, {
        semantics: nodeSemantics,
        tags: nodeTags,
      }),
    [node, nodes, nodeSemantics, nodeTags],
  );

  const persistContent = useCallback(
    (next: CollectionContent) => {
      void NodeService.upsert(node.id, { content: next }).catch(
        (error: unknown) => {
          console.error(
            "[CollectionNodeContent] Failed to persist collection content",
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

  const handleOpenNode = useCallback((nodeId: string) => {
    useUIStore.getState().handleNodeEdit(nodeId);
  }, []);

  /**
   * The record editing page — the host's, like the database host's (see
   * `database-node-content.tsx`). Here the projection is read-only, so the page
   * shows the row's fields without editing affordances and offers 打开节点 to
   * jump to the graph node behind it.
   */
  const [openRecord, setOpenRecord] = useState<{
    rowId: string;
    hiddenFieldIds: readonly string[];
  } | null>(null);

  const handleOpenRecord = useCallback(
    (rowId: string, options?: OpenRecordOptions) => {
      setOpenRecord({ rowId, hiddenFieldIds: options?.hiddenFieldIds ?? [] });
    },
    [],
  );

  /**
   * Node lookup for the views that draw a node itself rather than a cell (the
   * gallery's card cover). Read through `getState()` so resolving a cover never
   * subscribes this projection to unrelated node changes; the host already
   * re-renders when the node map it projects changes.
   */
  const resolveNode = useCallback(
    (nodeId: string) => useDataStore.getState().nodes.get(nodeId),
    [],
  );

  return (
    <div
      className={cn(
        "relative h-full min-h-0 w-full overflow-hidden",
        className,
      )}
    >
      {/* The record page covers this box, not the viewport — see the database
          host for why the covered view goes `inert`. */}
      <div
        className="h-full min-h-0 w-full p-4"
        inert={openRecord ? true : undefined}
      >
        <DataViewRoot
          // Remount per node so the view/active-view state re-seeds.
          key={node.id}
          source={source}
          views={content.views}
          readOnly
          onViewsChange={handleViewsChange}
          onOpenRecord={handleOpenRecord}
          onOpenNode={handleOpenNode}
          resolveNode={resolveNode}
        />
      </div>
      <RecordEditor
        open={openRecord !== null}
        rowId={openRecord?.rowId ?? null}
        hiddenFieldIds={openRecord?.hiddenFieldIds}
        source={source}
        editable={false}
        onOpenNode={handleOpenNode}
        onOpenChange={(next) => {
          if (!next) setOpenRecord(null);
        }}
      />
    </div>
  );
}
