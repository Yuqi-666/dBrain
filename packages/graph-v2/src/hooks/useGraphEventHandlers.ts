// packages/graph/src/hooks/useGraphEventHandlers.ts

import React, { useCallback, useRef, useEffect } from 'react';
import { useUIStore, type ContextMenuType } from '@workspace/store';
import type { Node, Edge } from '@xyflow/react';

interface UseGraphEventHandlersProps {
  nodes: Node[];
  edges: Edge[];
}

export function useGraphEventHandlers({
  nodes,
  edges,
}: UseGraphEventHandlersProps) {
  const isDraggingRef = useRef(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ui = useUIStore();

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
      ui.setSelectedNodeIds(new Set(selectedNodes.map((n) => n.id)));
      ui.setSelectedEdgeIds(new Set(selectedEdges.map((e) => e.id)));
    },
    [ui]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      ui.setSelectedNodeIds(new Set([node.id]));
      ui.setSelectedEdgeIds(new Set());
      ui.closeContextMenu();
    },
    [ui]
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      ui.setSelectedNodeIds(new Set());
      ui.setSelectedEdgeIds(new Set([edge.id]));
      ui.closeContextMenu();
    },
    [ui]
  );

  const handlePaneClick = useCallback(
    (_event: React.MouseEvent) => {
      ui.setSelectedNodeIds(new Set());
      ui.setSelectedEdgeIds(new Set());
      ui.closeContextMenu();
      ui.closePreviewBlock();
    },
    [ui]
  );

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      ui.handleNodeEdit(node.id);
      ui.closePreviewBlock();
    },
    [ui]
  );

  const handleNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (isDraggingRef.current || ui.isNodeFocus) return;
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        ui.setPreviewBlock({ nodeId: node.id, visible: true, isFocus: false });
      }, 150);
    },
    [ui]
  );

  const handleNodeMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
    if (ui.isNodeFocus) return;
    ui.closePreviewBlock();
  }, [ui]);

  const handleNodeDragStart = useCallback(
    (event: React.MouseEvent, node: Node) => {
      isDraggingRef.current = true;
      if (ui.isNodeFocus) return;
      ui.closePreviewBlock();
    },
    [ui]
  );

  const handleNodeDragStop = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      ui.closePreviewBlock();
      const { selectedNodeIds, selectedEdgeIds } = ui;
      if (selectedNodeIds.size + selectedEdgeIds.size > 1) {
        ui.setContextMenu({
          x: event.clientX,
          y: event.clientY,
          type: 'groupSelect' as ContextMenuType,
          context: { nodeIds: Array.from(selectedNodeIds), edgeIds: Array.from(selectedEdgeIds) },
          visible: true,
        });
      } else {
        ui.setContextMenu({
          x: event.clientX,
          y: event.clientY,
          type: 'node' as ContextMenuType,
          context: { nodeId: node.id },
          visible: true,
        });
      }
    },
    [ui]
  );

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      ui.setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: 'edge' as ContextMenuType,
        context: { edgeId: edge.id },
        visible: true,
      });
    },
    [ui]
  );

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | globalThis.MouseEvent) => {
      event.preventDefault();
      ui.closePreviewBlock();
      ui.setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: 'canvas' as ContextMenuType,
        context: {} as Record<string, never>,
        visible: true,
      });
    },
    [ui]
  );

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  return {
    handleSelectionChange,
    handleNodeClick,
    handleEdgeClick,
    handlePaneClick,
    handleNodeDoubleClick,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    handleNodeDragStart,
    handleNodeDragStop,
    handleNodeContextMenu,
    handleEdgeContextMenu,
    handlePaneContextMenu,
  };
}