// packages/graph/src/hooks/useEdgeCreation.ts

import { useCallback, useRef } from 'react';
import { type OnConnectStart, type OnConnectEnd } from '@xyflow/react';
import type { GraphEdgeData } from '../types';

interface UseEdgeCreationProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodes: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  edges: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upsertEdge: any;
  selectedNodeIds: Set<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setContextMenu: any;
}

export function useEdgeCreation({
  nodes,
  edges,
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const exists = (edges as any[]).some(
            (e: any) =>
              (e.source === sourceId && e.target === targetNodeId) ||
              (e.source === targetNodeId && e.target === sourceId)
          );
          if (exists) continue;

          const newEdge = {
            id: `tmp_`,
            source: sourceId,
            target: targetNodeId,
            type: 'association',
            data: {
              semanticId: '',
              direction: 'forward',
              edgeType: 'association',
            } as GraphEdgeData,
          };

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
    [edges, upsertEdge, setContextMenu]
  );

  return { onConnectStart, onConnectEnd, altPressedRef };
}
