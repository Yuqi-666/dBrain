"use client";

import { useCallback, useMemo } from "react";
import type {
  CollectionContent,
  CollectionNodeData,
  DataView,
} from "@workspace/interfaces";
import { DataViewRoot, collectionToDataViewSource } from "@workspace/dataview";
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

  return (
    <div className={cn("h-full min-h-0 w-full p-4", className)}>
      <DataViewRoot
        // Remount per node so the view/active-view state re-seeds.
        key={node.id}
        source={source}
        views={content.views}
        readOnly
        onViewsChange={handleViewsChange}
        onOpenNode={handleOpenNode}
      />
    </div>
  );
}
