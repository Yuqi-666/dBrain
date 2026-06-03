"use client";

import { useCallback } from "react";
import type {
  NodeId,
  EdgeId,
  NodeData,
  NodeDataType,
  TextNodeData,
  ImageNodeData,
  PdfNodeData,
  VideoNodeData,
  AudioNodeData,
  WebpageNodeData,
  WebsiteNodeData,
  CollectionNodeData,
  RichTextNodeData,
  EdgeDirection,
  EdgeData,
  NodeTag,
  NodeTagId,
} from "@workspace/interfaces";
import { useUIStore, useDataStore } from "@workspace/store";
import { GraphCQRS } from "@workspace/api-client";


export function useGraph() {
  const setCurrentEditingNodeId = useUIStore(
    (state) => state.setCurrentEditingNodeId,
  );

  const onEditNode = useCallback(
    (nodeId: NodeId) => {
      setCurrentEditingNodeId(nodeId);
    },
    [setCurrentEditingNodeId],
  );

  const onDeleteNode = useCallback(async (nodeId: NodeId) => {
    try {
      await GraphCQRS.deleteNode(nodeId);
    } catch (error) {
      console.error("Failed to delete node:", error);
    }
  }, []);

  const onAddNode = useCallback(
    async (nodeType: NodeDataType, semanticId: string) => {
      const now = new Date().toISOString();

      const baseNode = {
        id: "tmp_" as NodeId,
        title: "New Node",
        nodeType,
        permission: "private" as const,
        semanticId,
        createdAt: now,
        updatedAt: now,
      };

      let newNode: NodeData;

      switch (nodeType) {
        case "text": {
          const textNode: TextNodeData = {
            ...baseNode,
            nodeType: "text",
            content: { docs: {} },
          };
          newNode = textNode;
          break;
        }
        case "image": {
          const imageNode: ImageNodeData = {
            ...baseNode,
            nodeType: "image",
            width: 0,
            height: 0,
            fileSize: 0,
            content: { url: "" },
          };
          newNode = imageNode;
          break;
        }
        case "pdf": {
          const pdfNode: PdfNodeData = {
            ...baseNode,
            nodeType: "pdf",
            pageCount: 0,
            fileSize: 0,
            content: { url: "", coverUrl: "" },
          };
          newNode = pdfNode;
          break;
        }
        case "video": {
          const videoNode: VideoNodeData = {
            ...baseNode,
            nodeType: "video",
            duration: 0,
            source: "local",
            fileSize: 0,
            content: { url: "", coverUrl: "" },
          };
          newNode = videoNode;
          break;
        }
        case "audio": {
          const audioNode: AudioNodeData = {
            ...baseNode,
            nodeType: "audio",
            duration: 0,
            fileSize: 0,
            content: { url: "" },
          };
          newNode = audioNode;
          break;
        }
        case "webpage": {
          const webpageNode: WebpageNodeData = {
            ...baseNode,
            nodeType: "webpage",
            content: { html: "", url: "" },
          };
          newNode = webpageNode;
          break;
        }
        case "website": {
          const websiteNode: WebsiteNodeData = {
            ...baseNode,
            nodeType: "website",
            content: { url: "" },
          };
          newNode = websiteNode;
          break;
        }
        case "collection": {
          const collectionNode: CollectionNodeData = {
            ...baseNode,
            nodeType: "collection",
            content: { filterConfig: {} },
          };
          newNode = collectionNode;
          break;
        }
        case "rich-text":
        default: {
          const richTextNode: RichTextNodeData = {
            ...baseNode,
            nodeType: "rich-text",
            content: { docs: {}, referencedNodes: [] },
          };
          newNode = richTextNode;
          break;
        }
      }

      try {
        const result = await GraphCQRS.upsertNode(newNode) as NodeData;
        setCurrentEditingNodeId(result.id as NodeId);
      } catch (error) {
        console.error("Failed to add node:", error);
      }
    },
    [setCurrentEditingNodeId],
  );

  const onCreateEdge = useCallback(
    async (sourceIds: string[], targetId: string | null, x: number, y: number, setContextMenu: (menu: any) => any) => {
      if (targetId === null) {
        setContextMenu({
          x,
          y,
          type: "add-edge",
          context: { sourceIds, targetId },
          visible: true,
        })
        return;
      };

      const now = new Date().toISOString();
      let firstEdgeId: EdgeId | null = null;

      for (const sourceId of sourceIds) {
        if (sourceId === targetId) continue;

        const edgeData: EdgeData = {
          id: "tmp_",
          from: sourceId as NodeId,
          to: targetId as NodeId,
          direction: "forward",
          edgeType: "association",
          semanticId: "",
          createdAt: now,
          updatedAt: now,
        };

        try {
          const newEdge = await GraphCQRS.upsertEdge(edgeData) as EdgeData;
          if (firstEdgeId === null) {
            firstEdgeId = newEdge.id;
          }
        } catch (error) {
          console.error("Failed to add edge:", error);
        }
      }

      setContextMenu({ x, y, type: "edge", context: { edgeId: firstEdgeId }, visible: true })
    },
    [],
  );

  const onDeleteEdge = useCallback(async (edgeId: EdgeId) => {
    try {
      await GraphCQRS.deleteEdge(edgeId);
    } catch (error) {
      console.error("Failed to delete edge:", error);
    }
  }, []);

  const onDeleteTag = useCallback(async (tagId: NodeTagId) => {
    try {
      console.log(tagId)
      await GraphCQRS.deleteNodeTag(tagId);
    } catch (error) {
      console.error("Failed to delete tag:", error);
    }
  }, []);

  const getEdge = useCallback((edgeId: EdgeId) => {
    return useDataStore.getState().edges.get(edgeId);
  }, []);

  const onChangeEdgeDirection = useCallback(
    async (edgeId: EdgeId, direction: EdgeDirection) => {
      try {
        await GraphCQRS.upsertEdge(edgeId, { direction });
      } catch (error) {
        console.error("Failed to change edge direction:", error);
      }
    },
    [],
  );

  const onChangeEdgeSemantic = useCallback(
    async (edgeId: EdgeId, semanticId: string) => {
      try {
        await GraphCQRS.upsertEdge(edgeId, { semanticId });
      } catch (error) {
        console.error("Failed to change edge semantic:", error);
      }
    },
    [],
  );

  const onCreateTag = useCallback(async (tagName: string) => {
    const tagId = `tmp_${tagName.toLowerCase().replace(/\s+/g, "-")}`;
    const colors = [
      "#3B82F6",
      "#10B981",
      "#8B5CF6",
      "#F59E0B",
      "#EF4444",
      "#EC4899",
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newTag = {
      id: tagId,
      name: tagName,
      color: randomColor,
    };
    try {
      const result = await GraphCQRS.upsertNodeTag(newTag);
      return result as NodeTag | null;
    } catch (error) {
      console.error("Failed to create tag:", error);
      return null;
    }
  }, []);

  const onDeleteSelected = useCallback(
    async (nodeIds: string[], edgeIds: string[]) => {
      for (const id of edgeIds) {
        try {
          await GraphCQRS.deleteEdge(id as EdgeId);
        } catch (error) {
          console.error("Failed to delete edge:", id, error);
        }
      }
      for (const id of nodeIds) {
        try {
          await GraphCQRS.deleteNode(id as NodeId);
        } catch (error) {
          console.error("Failed to delete node:", id, error);
        }
      }
    },
    [],
  );

  return {
    onEditNode,
    onDeleteNode,
    onAddNode,
    onCreateEdge,
    onDeleteEdge,
    onDeleteTag,
    onDeleteSelected,
    getEdge,
    onChangeEdgeDirection,
    onChangeEdgeSemantic,
    onCreateTag,
  };
}
