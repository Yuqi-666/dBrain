# Module 6: Interactions

**Parent Document:** [MIGRATION-OVERVIEW.md](./MIGRATION-OVERVIEW.md)

---

## 1. useGraphEventHandlers Hook

```typescript
// packages/graph/src/hooks/useGraphEventHandlers.ts

import { useCallback, useRef, useEffect } from 'react';
import { useGraphUIStore } from '@workspace/store';
import type { Node, Edge, NodeChange } from '@xyflow/react';

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
  const ui = useGraphUIStore();

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

  const handleNodeDragStart = useCallback(() => {
    isDraggingRef.current = true;
    if (ui.isNodeFocus) return;
    ui.closePreviewBlock();
  }, [ui]);

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
          type: 'groupSelect',
          context: { nodeIds: Array.from(selectedNodeIds), edgeIds: Array.from(selectedEdgeIds) },
          visible: true,
        });
      } else {
        ui.setContextMenu({
          x: event.clientX,
          y: event.clientY,
          type: 'node',
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
        type: 'edge',
        context: { edgeId: edge.id },
        visible: true,
      });
    },
    [ui]
  );

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      ui.closePreviewBlock();
      ui.setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: 'canvas',
        context: {},
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
```

---

## 2. useEdgeCreation Hook

React Flow natively supports single-source connections only. Scenario 2 (multi-source → canvas drag → multi-source edge creation) requires custom extension.

**Two scenarios:**
- **Scenario 1**: No pre-selected nodes, Alt+drag from single node → single connection line
- **Scenario 2**: Pre-selected nodes, Alt+drag from canvas → multiple connection lines from all selected nodes to cursor

```typescript
// packages/graph/src/hooks/useEdgeCreation.ts

import { useCallback, useRef } from 'react';
import type { Node, Edge, OnConnectStart, OnConnectEnd, Connection, useReactFlow } from '@xyflow/react';
import type { GraphEdgeData } from '../types';

interface UseEdgeCreationProps {
  nodes: Node[];
  edges: Edge[];
  setEdges: (edges: Edge<GraphEdgeData>[]) => void;
  upsertEdge: (edge: any) => void;
  selectedNodeIds: Set<string>;
  setContextMenu: (menu: { x: number; y: number; type: string; context: any; visible: boolean }) => void;
}

export function useEdgeCreation({
  nodes,
  edges,
  setEdges,
  upsertEdge,
  selectedNodeIds,
  setContextMenu,
}: UseEdgeCreationProps) {
  const isCreatingRef = useRef(false);
  const sourceIdsRef = useRef<string[]>([]);
  const altPressedRef = useRef(false);

  // Track Alt key
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Alt') altPressedRef.current = true;
  }, []);

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Alt') {
      altPressedRef.current = false;
      // Cancel if creating when Alt released
      if (isCreatingRef.current) {
        isCreatingRef.current = false;
        sourceIdsRef.current = [];
      }
    }
  }, []);

  // Attach global key listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  // onConnectStart: Record source nodes when edge creation begins
  const onConnectStart: OnConnectStart = useCallback(
    (event, params) => {
      if (!altPressedRef.current) return;

      isCreatingRef.current = true;

      if (params.nodeId && !selectedNodeIds.size) {
        // Scenario 1: Single node drag, no pre-selection
        sourceIdsRef.current = [params.nodeId];
      } else if (selectedNodeIds.size > 0) {
        // Scenario 2: Multiple selected nodes, drag from canvas
        sourceIdsRef.current = Array.from(selectedNodeIds);
      } else {
        sourceIdsRef.current = [];
      }
    },
    [selectedNodeIds]
  );

  // onConnectEnd: Complete or cancel edge creation
  const onConnectEnd: OnConnectEnd = useCallback(
    (event) => {
      if (!isCreatingRef.current) return;

      const sourceIds = sourceIdsRef.current;
      isCreatingRef.current = false;
      sourceIdsRef.current = [];

      if (!sourceIds.length) return;

      // Check if connection ended on a valid target node
      const target = (event as any).target;
      const targetNodeId = target?.props?.['data-testid'] || target?.id;

      if (targetNodeId && targetNodeId !== sourceIds[0]) {
        // Valid target — create edges from all sources to target
        for (const sourceId of sourceIds) {
          if (sourceId === targetNodeId) continue;

          // Check for duplicate edges
          const exists = edges.some(
            (e) =>
              (e.source === sourceId && e.target === targetNodeId) ||
              (e.source === targetNodeId && e.target === sourceId)
          );
          if (exists) continue;

          const newEdge: Edge<GraphEdgeData> = {
            id: `e-${sourceId}-${targetNodeId}-${Date.now()}`,
            source: sourceId,
            target: targetNodeId,
            type: 'association',
            data: {
              semanticId: '',
              direction: 'forward',
              edgeType: 'association',
            },
          };

          setEdges((eds) => addEdge(newEdge, eds));
          upsertEdge({
            id: newEdge.id,
            from: sourceId,
            to: targetNodeId,
            direction: 'forward',
            semanticId: '',
            edgeType: 'association',
          } as any);
        }
      } else {
        // No valid target — show "add-edge" context menu at cursor position
        const clientX = (event as any)?.clientX ?? 0;
        const clientY = (event as any)?.clientY ?? 0;
        setContextMenu({
          x: clientX,
          y: clientY,
          type: 'add-edge',
          context: { sourceIds },
          visible: true,
        });
      }
    },
    [edges, setEdges, upsertEdge, setContextMenu]
  );

  return { onConnectStart, onConnectEnd, altPressedRef };
}
```
