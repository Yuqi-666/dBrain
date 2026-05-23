"use client";

import { useCallback } from "react";
import type { NodeId, EdgeId, TextNodeData, NodeData } from "@workspace/interfaces";
import { useNodeEditorStore } from "@workspace/store";
import { GraphCQRS } from "@workspace/api-client";

export interface GraphTarget {
  type: "node" | "edge";
  id: string;
}

export function useGraphContextMenu() {
  const setCurrentEditingNodeId = useNodeEditorStore(
    (state) => state.setCurrentEditingNodeId,
  );

  const onEditNode = useCallback(
    (target: GraphTarget) => {
      if (target.type !== "node") return;
      setCurrentEditingNodeId(target.id as NodeId);
    },
    [setCurrentEditingNodeId],
  );

  const onDeleteNode = useCallback(async (target: GraphTarget) => {
    if (target.type !== "node") return;
    try {
      await GraphCQRS.deleteNode(target.id as NodeId);
    } catch (error) {
      console.error("Failed to delete node:", error);
    }
  }, []);

  const onAddNode = useCallback(async () => {
    const now = new Date().toISOString();

    const newNode: NodeData = {
      id: "tmp_",
      title: "New Node",
      nodeType: "rich-text",
      content: { docs: {}, referencedNodes: [] },
      permission: "private",
      semanticId: "default",
      createdAt: now,
      updatedAt: now,
    };

    try {
      const result = await GraphCQRS.upsertNode(newNode) as NodeData;
      setCurrentEditingNodeId(result.id as NodeId);
    } catch (error) {
      console.error("Failed to add node:", error);
    }
  }, [setCurrentEditingNodeId]);

  const onEditEdge = useCallback((target: GraphTarget) => {
    if (target.type !== "edge") return;
    console.warn("Edge editing not yet implemented, edgeId:", target.id);
  }, []);

  const onDeleteEdge = useCallback(async (target: GraphTarget) => {
    if (target.type !== "edge") return;
    try {
      await GraphCQRS.deleteEdge(target.id as EdgeId);
    } catch (error) {
      console.error("Failed to delete edge:", error);
    }
  }, []);

  const onAddEdge = useCallback((sourceNodeId: string) => {
    console.warn("Add edge mode initiated from node:", sourceNodeId);
    console.warn("Edge creation flow not yet implemented - requires target node selection");
  }, []);

  return {
    onEditNode,
    onDeleteNode,
    onAddNode,
    onEditEdge,
    onDeleteEdge,
    onAddEdge,
  };
}
