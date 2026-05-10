"use client";

import { useMemo, useCallback } from "react";
import { useNodeEditorStore, useGraphStore } from "@workspace/store";
import type { NodeData, NodeId } from "@workspace/interfaces";

/**
 * Hook for node editing state management
 * Provides access to current editing node and update methods
 */
export function useNodeEditor() {
  // Get current editing node ID from UI store
  const currentEditingNodeId = useNodeEditorStore(
    (state) => state.currentEditingNodeId,
  );

  // Get graph store methods
  const getNode = useGraphStore((state) => state.getNode);
  const updateNode = useGraphStore((state) => state.updateNode);

  // Get current node data
  const node = useMemo(() => {
    if (!currentEditingNodeId) return null;
    return getNode(currentEditingNodeId) ?? null;
  }, [currentEditingNodeId, getNode]);

  // Update node title
  const updateTitle = useCallback(
    (title: string) => {
      if (!currentEditingNodeId) return;
      updateNode(currentEditingNodeId, { title });
    },
    [currentEditingNodeId, updateNode],
  );

  // Update node abstract (summary)
  const updateAbstract = useCallback(
    (abstract: string) => {
      if (!currentEditingNodeId) return;
      updateNode(currentEditingNodeId, { abstract });
    },
    [currentEditingNodeId, updateNode],
  );

  // Update node tags
  const updateTags = useCallback(
    (tags: string[]) => {
      if (!currentEditingNodeId) return;
      updateNode(currentEditingNodeId, { tags });
    },
    [currentEditingNodeId, updateNode],
  );

  // Update node semanticId
  const updateSemanticId = useCallback(
    (semanticId: string) => {
      if (!currentEditingNodeId) return;
      updateNode(currentEditingNodeId, { semanticId: semanticId as any });
    },
    [currentEditingNodeId, updateNode],
  );

  // Generic update for any field
  const updateField = useCallback(
    <K extends keyof NodeData>(field: K, value: NodeData[K]) => {
      if (!currentEditingNodeId) return;
      updateNode(currentEditingNodeId, { [field]: value } as any);
    },
    [currentEditingNodeId, updateNode],
  );

  return {
    // Current editing node ID
    nodeId: currentEditingNodeId,
    // Current node data
    node,
    // Whether we're currently editing a node
    isEditing: currentEditingNodeId !== null,
    // Update methods
    updateTitle,
    updateAbstract,
    updateTags,
    updateSemanticId,
    updateField,
    updateNode,
  };
}
