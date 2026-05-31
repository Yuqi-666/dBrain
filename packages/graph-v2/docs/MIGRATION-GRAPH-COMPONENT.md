# Module 7: Main Graph Component

**Parent Document:** [MIGRATION-OVERVIEW.md](./MIGRATION-OVERVIEW.md)

---

## 1. Graph Component

```typescript
// packages/graph/src/graph.tsx

"use client";

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
  type Edge,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useGraphStore, useGraphUIStore } from '@workspace/store';
import { transformToRFData, transformNodeToRF, transformEdgeToRF } from './transform';
import { applyForceLayout, reheatForceSimulation, setForceNodePosition } from './layouts/force';
import { applyDagreLayout } from './layouts/dagre';
import { applyRadialLayout } from './layouts/elk';
import { nodeTypes } from './components/nodes';
import { edgeTypes } from './components/edges';
import { useGraphEventHandlers } from './hooks/useGraphEventHandlers';
import { useEdgeCreation } from './hooks/useEdgeCreation';
import { GraphContextMenu } from '@workspace/ui/components/graph-context-menu/graph-context-menu';
import { PreviewBlock } from '@workspace/ui/components/preview-block';
import type { View, ViewId, LayoutType } from '@workspace/interfaces';
import type { GraphNodeData, GraphEdgeData, GraphMutation } from './types';

// ----------------------------------------------------------------------
// 1. Props
// ----------------------------------------------------------------------
export interface GraphProps {
  viewId?: ViewId;
  view?: View;
  theme?: 'light' | 'dark';
  enableMinimap?: boolean;
  enableGrid?: boolean;
  enableFisheye?: boolean;
  enableNodeDragging?: boolean;
  enableEdgeInteractions?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (graph: any) => void;
}

// ----------------------------------------------------------------------
// 2. Inner component (needs ReactFlowProvider context)
// ----------------------------------------------------------------------
function GraphInner({
  viewId,
  view,
  theme = 'light',
  enableMinimap = true,
  enableGrid = true,
  className,
  style,
  onLoad,
}: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resolvedViewRef = useRef<View | undefined>(undefined);
  const isFirstRenderRef = useRef(true);

  const ui = useGraphUIStore();
  const { fitView } = useReactFlow();

  // Get domain state
  const domainNodes = useGraphStore((s) => s.nodes);
  const domainEdges = useGraphStore((s) => s.edges);
  const views = useGraphStore((s) => s.views);
  const upsertNode = useGraphStore((s) => s.upsertNode);
  const deleteNode = useGraphStore((s) => s.deleteNode);
  const upsertEdge = useGraphStore((s) => s.upsertEdge);
  const deleteEdge = useGraphStore((s) => s.deleteEdge);
  const clearMutations = useGraphStore((s) => s.clearMutations);

  // Resolve current view
  useEffect(() => {
    if (view) {
      resolvedViewRef.current = view;
    } else if (viewId) {
      resolvedViewRef.current = views.get(viewId);
    }
  }, [view, viewId, views]);

  // Transform domain data to RF format
  const rfData = useMemo(
    () => transformToRFData(domainNodes, domainEdges, resolvedViewRef.current),
    [domainNodes, domainEdges, resolvedViewRef.current]
  );

  // Controlled state
  const [nodes, setNodes, onNodesChange] = useNodesState(rfData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfData.edges);

  // Event handlers
  const eventHandlers = useGraphEventHandlers({ nodes, edges });

  // Edge creation (Alt+drag)
  const edgeCreation = useEdgeCreation({
    nodes,
    edges,
    setEdges,
    upsertEdge,
    selectedNodeIds: ui.selectedNodeIds,
    setContextMenu: ui.setContextMenu,
  });

  // ------------------------------------------------------------------
  // Apply layout when view changes
  // ------------------------------------------------------------------
  const applyLayout = useCallback(
    async (layoutType: LayoutType) => {
      if (layoutType === 'D3force') {
        // d3-force runs in Web Worker — never blocks main thread
        const layouted = await applyForceLayout(nodes, edges);
        setNodes(layouted);
      } else if (layoutType === 'radial') {
        // ELK radial — concentric circle layout
        const layouted = await applyRadialLayout(nodes, edges);
        setNodes(layouted);
      } else {
        // dagre for standard directed layout
        const layouted = applyDagreLayout(nodes, edges, { direction: 'TB' });
        setNodes(layouted);
      }
    },
    [nodes, edges, setNodes]
  );

  // Apply layout when view layout changes
  useEffect(() => {
    if (!resolvedViewRef.current?.layout) return;
    applyLayout(resolvedViewRef.current.layout);
  }, [resolvedViewRef.current?.layout, applyLayout]);

  // ------------------------------------------------------------------
  // Handle node changes (position, selection, dimension, remove)
  // ------------------------------------------------------------------
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Apply to RF state
      setNodes((nds) => applyNodeChanges(changes, nds));

      // Sync back to domain store; also drive force simulation during drag
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          const domainNode = domainNodes.get(change.id);
          if (domainNode) {
            upsertNode({
              ...domainNode,
              stateData: {
                ...domainNode.stateData,
                position: change.position,
              },
            });
          }
          // Drag interaction → reheat + pin dragged node in force sim
          if (change.dragging && resolvedViewRef.current?.layout === 'D3force') {
            reheatForceSimulation();
            setForceNodePosition(change.id, change.position.x, change.position.y);
          } else if (!change.dragging && change.position) {
            // Drag ended → unpin
            setForceNodePosition(change.id, null, null);
          }
        }
        if (change.type === 'remove') {
          deleteNode({ id: change.id });
        }
      });
    },
    [setNodes, upsertNode, deleteNode, domainNodes, resolvedViewRef]
  );

  // ------------------------------------------------------------------
  // Handle edge changes
  // ------------------------------------------------------------------
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));

      changes.forEach((change) => {
        if (change.type === 'remove') {
          deleteEdge({ id: change.id });
        }
      });
    },
    [setEdges, deleteEdge]
  );

  // ------------------------------------------------------------------
  // Handle new connections
  // ------------------------------------------------------------------
  // Note: Alt+drag edge creation is handled in useEdgeCreation (onConnectEnd).
  // This handler only fires for default (non-Alt) connections.
  // If Alt was pressed, the edge was already created in onConnectEnd — skip here.
  const handleConnect = useCallback(
    (connection: Connection) => {
      // Skip if Alt was pressed — edge creation handled by useEdgeCreation
      if (edgeCreation.altPressedRef.current) return;

      const newEdge: Edge<GraphEdgeData> = {
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        type: 'association',
        data: {
          semanticId: '',
          direction: 'forward',
          edgeType: 'association',
        },
      };
      setEdges((eds) => addEdge(connection, eds));
      upsertEdge({
        id: newEdge.id,
        from: connection.source!,
        to: connection.target!,
        direction: 'forward',
        semanticId: '',
        edgeType: 'association',
      } as any);
    },
    [setEdges, upsertEdge, edgeCreation.altPressedRef]
  );

  // ------------------------------------------------------------------
  // Subscribe to domain store mutations
  // ------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = useGraphStore.subscribe((state) => {
      if (state.latestMutations.length === 0) return;

      state.latestMutations.forEach((mutation: GraphMutation) => {
        switch (mutation.type) {
          case 'upsertNode': {
            const rfNode = transformNodeToRF(mutation.payload, resolvedViewRef.current);
            setNodes((nds) => {
              const idx = nds.findIndex((n) => n.id === rfNode.id);
              if (idx >= 0) {
                const updated = [...nds];
                updated[idx] = rfNode;
                return updated;
              }
              return [...nds, rfNode];
            });
            break;
          }
          case 'deleteNode':
            setNodes((nds) => nds.filter((n) => n.id !== mutation.payload.id));
            break;
          case 'upsertEdge': {
            const rfEdge = transformEdgeToRF(mutation.payload);
            setEdges((eds) => {
              const idx = eds.findIndex((e) => e.id === rfEdge.id);
              if (idx >= 0) {
                const updated = [...eds];
                updated[idx] = rfEdge;
                return updated;
              }
              return [...eds, rfEdge];
            });
            break;
          }
          case 'deleteEdge':
            setEdges((eds) => eds.filter((e) => e.id !== mutation.payload.id));
            break;
          case 'upsertView':
            if (mutation.payload.id === resolvedViewRef.current?.id) {
              resolvedViewRef.current = mutation.payload;
              applyLayout(mutation.payload.layout);
            }
            break;
        }
      });

      clearMutations();
    });

    return unsubscribe;
  }, [setNodes, setEdges, applyLayout, clearMutations]);

  // ------------------------------------------------------------------
  // Initial fitView after first render
  // ------------------------------------------------------------------
  useEffect(() => {
    if (isFirstRenderRef.current && nodes.length > 0) {
      isFirstRenderRef.current = false;
      setTimeout(() => fitView({ padding: 0.2 }), 0);
    }
  }, [nodes, fitView]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onSelectionChange={eventHandlers.handleSelectionChange}
        onNodeClick={eventHandlers.handleNodeClick}
        onEdgeClick={eventHandlers.handleEdgeClick}
        onPaneClick={eventHandlers.handlePaneClick}
        onNodeDoubleClick={eventHandlers.handleNodeDoubleClick}
        onNodeMouseEnter={eventHandlers.handleNodeMouseEnter}
        onNodeMouseLeave={eventHandlers.handleNodeMouseLeave}
        onNodeDragStart={eventHandlers.handleNodeDragStart}
        onNodeDragStop={eventHandlers.handleNodeDragStop}
        onNodeContextMenu={eventHandlers.handleNodeContextMenu}
        onEdgeContextMenu={eventHandlers.handleEdgeContextMenu}
        onPaneContextMenu={eventHandlers.handlePaneContextMenu}
        onConnectStart={edgeCreation.onConnectStart}
        onConnectEnd={edgeCreation.onConnectEnd}
        onlyRenderVisibleElements={true}
        fitView={false}
        defaultEdgeOptions={{
          type: 'hierarchy',
        }}
      >
        {enableGrid && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
          />
        )}
        {enableMinimap && (
          <MiniMap
            zoomable
            pannable
            nodeColor={(node) => {
              const data = node.data as GraphNodeData;
              return data?.semanticId
                ? useGraphStore.getState().getNodeSemantic(data.semanticId)?.color || '#165DFF'
                : '#165DFF';
            }}
          />
        )}
        <Controls />
      </ReactFlow>

      {/* Context Menu Overlay */}
      {ui.contextMenu.visible && ui.contextMenu.type && ui.contextMenu.context && (
        <GraphContextMenu
          x={ui.contextMenu.x}
          y={ui.contextMenu.y}
          visible={ui.contextMenu.visible}
          type={ui.contextMenu.type}
          context={ui.contextMenu.context as never}
          onClose={ui.closeContextMenu}
          setContextMenu={ui.setContextMenu}
        />
      )}

      {/* Preview Block Overlay */}
      {ui.previewBlock.visible && ui.previewBlock.nodeId && (
        <PreviewBlock
          nodeId={ui.previewBlock.nodeId}
          containerRef={containerRef}
          onClose={ui.closePreviewBlock}
          visible={ui.previewBlock.visible}
          isFocus={ui.previewBlock.isFocus}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. Wrapper with Provider
// ----------------------------------------------------------------------
export function Graph(props: GraphProps) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}
```
