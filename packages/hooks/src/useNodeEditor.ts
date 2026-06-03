"use client";

import { useMemo, useCallback } from "react";
import { useUIStore, useDataStore } from "@workspace/store";
import { GraphCQRS } from "@workspace/api-client";
import type { NodeData, NodeId } from "@workspace/interfaces";

/**
 * Hook for node editing state management
 * Provides access to current editing node and update methods
 */
export function useNodeEditor() {
  // Get current editing node ID from UI store
  const currentEditingNodeId = useUIStore(
    (state) => state.currentEditingNodeId,
  );

  // Get graph store methods
  const getNode = useDataStore((state) => state.getNode);

  // Get current node data
  const node = useMemo(() => {
    if (!currentEditingNodeId) return null;
    return getNode(currentEditingNodeId) ?? null;
  }, [currentEditingNodeId, getNode]);

  // Update node title
  const updateTitle = useCallback(
    async (title: string) => {
      if (!currentEditingNodeId) return;
      await GraphCQRS.updateNode(currentEditingNodeId, { title });
    },
    [currentEditingNodeId],
  );

  // Update node abstract (summary)
  const updateAbstract = useCallback(
    async (abstract: string) => {
      if (!currentEditingNodeId) return;
      await GraphCQRS.updateNode(currentEditingNodeId, { abstract });
    },
    [currentEditingNodeId],
  );

  // Update node tags
  const updateTags = useCallback(
    async (tags: string[]) => {
      if (!currentEditingNodeId) return;
      await GraphCQRS.updateNode(currentEditingNodeId, { tags });
    },
    [currentEditingNodeId],
  );

  // Update node semanticId
  const updateSemanticId = useCallback(
    async (semanticId: string) => {
      if (!currentEditingNodeId) return;
      await GraphCQRS.updateNode(currentEditingNodeId, { semanticId: semanticId as any });
    },
    [currentEditingNodeId],
  );

  // Generic update for any field
  const updateField = useCallback(
    async <K extends keyof NodeData>(field: K, value: NodeData[K]) => {
      if (!currentEditingNodeId) return;
      await GraphCQRS.updateNode(currentEditingNodeId, { [field]: value } as any);
    },
    [currentEditingNodeId],
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
  };
}
