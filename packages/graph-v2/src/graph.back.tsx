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
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useDataStore, useUIStore } from '@workspace/store';
import { GraphCQRS } from '@workspace/api-client';
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
import type { GraphNodeData, RFNode, RFEdge } from './types';

// --------------------------------------------------------------------------
// 1. Props
// --------------------------------------------------------------------------
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

// --------------------------------------------------------------------------
// 2. Inner component (needs ReactFlowProvider context)
// --------------------------------------------------------------------------
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

  const ui = useUIStore();
  const { fitView } = useReactFlow();

  // Get domain state
  const domainNodes = useDataStore((s) => s.nodes);
  const domainEdges = useDataStore((s) => s.edges);
  const views = useDataStore((s) => s.views);
  const clearMutations = useDataStore((s) => s.clearMutations);

  const rfData = useMemo(
    () => {
      const resolvedView = view ?? (viewId ? views.get(viewId) : undefined);
      resolvedViewRef.current = resolvedView; // 新增：同步ref值
      const frdata = transformToRFData(domainNodes, domainEdges, resolvedView)
      console.log(frdata)
      return frdata;
    },
    [domainNodes, domainEdges, view, viewId, views]
  );

  // Controlled state
  const [nodes, setNodes] = useNodesState(rfData.nodes);
  const [edges, setEdges] = useEdgesState(rfData.edges);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Event handlers
  // const eventHandlers = useGraphEventHandlers({ nodes, edges });

  // Edge creation (Alt+drag)
  // const edgeCreation = useEdgeCreation({
  //   nodes,
  //   edges,
  //   upsertEdge: GraphCQRS.upsertEdge,
  //   selectedNodeIds: ui.selectedNodeIds,
  //   setContextMenu: ui.setContextMenu,
  // });

  // --------------------------------------------------------------------------
  // Apply layout when view changes
  // --------------------------------------------------------------------------
  const applyLayout = useCallback(
    async (layoutType: LayoutType) => {
      if (layoutType === 'D3force') {
        // d3-force runs in Web Worker — never blocks main thread
        const layouted = await applyForceLayout(nodesRef.current, edgesRef.current);
        setNodes(layouted as RFNode[]);
      } else if (layoutType === 'radial') {
        // ELK radial — concentric circle layout
        const layouted = await applyRadialLayout(nodesRef.current, edgesRef.current);
        setNodes(layouted as RFNode[]);
      } else {
        // dagre for standard directed layout
        const layouted = applyDagreLayout(nodesRef.current, edgesRef.current, { direction: 'TB' });
        setNodes(layouted as RFNode[]);
      }
    },
    []
  );

  useEffect(() => {
    applyLayout(resolvedViewRef.current!.layout);
  }, [view, viewId, views, applyLayout]);

  // --------------------------------------------------------------------------
  // Handle node changes (position, selection, dimension, remove)
  // --------------------------------------------------------------------------
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          // const domainNode = domainNodes.get(change.id);
          // if (domainNode) {
          //   GraphCQRS.upsertNode(domainNode.id, {
          //     stateData: {
          //       ...domainNode.stateData,
          //       position: change.position,
          //     },
          //   });
          // }
          if (change.dragging && resolvedViewRef.current?.layout === 'D3force') {
            reheatForceSimulation();
            setForceNodePosition(change.id, change.position.x, change.position.y);
          } else if (!change.dragging) {
            setForceNodePosition(change.id, null, null);
          }
        }
        if (change.type === 'replace') {

        }
        if (change.type === 'remove') {
          GraphCQRS.deleteNode(change.id);
        }
      });
    },
    [resolvedViewRef]
  );

  // --------------------------------------------------------------------------
  // Handle edge changes
  // --------------------------------------------------------------------------
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'remove') {
          GraphCQRS.deleteEdge(change.id);
        }
      });
    },
    []
  );

  // --------------------------------------------------------------------------
  // Handle new connections
  // --------------------------------------------------------------------------
  // Note: Alt+drag edge creation is handled in useEdgeCreation (onConnectEnd).
  // This handler only fires for default (non-Alt) connections.
  // If Alt was pressed, the edge was already created in onConnectEnd — skip here.
  // const handleConnect = useCallback(
  //   (connection: Connection) => {
  //     if (edgeCreation.altPressedRef.current) return;
  //
  //     GraphCQRS.upsertEdge({
  //       id: "tmp_",
  //       from: connection.source!,
  //       to: connection.target!,
  //       direction: 'forward',
  //       semanticId: '',
  //       edgeType: 'association',
  //     } as any);
  //   },
  //   [edgeCreation.altPressedRef]
  // );

  // useEffect(() => {
  //   const unsubscribe = useDataStore.subscribe((state) => {
  //     if (state.latestMutations.length === 0) return;
  //
  //     state.latestMutations.forEach((mutation) => {
  //       switch (mutation.type) {
  //         case 'upsertNode': {
  //           const rfNode = transformNodeToRF(mutation.payload, resolvedViewRef.current);
  //           setNodes((nds: RFNode[]) => {
  //             const idx = nds.findIndex((n) => n.id === rfNode.id);
  //             if (idx >= 0) {
  //               const updated: RFNode[] = [...nds];
  //               updated[idx] = rfNode;
  //               return updated;
  //             }
  //             return [...nds, rfNode];
  //           });
  //           break;
  //         }
  //         case 'deleteNode':
  //           setNodes((nds: RFNode[]) => nds.filter((n) => n.id !== mutation.payload.id));
  //           break;
  //         case 'upsertEdge': {
  //           const rfEdge = transformEdgeToRF(mutation.payload);
  //           setEdges((eds: RFEdge[]) => {
  //             const idx = eds.findIndex((e) => e.id === rfEdge.id);
  //             if (idx >= 0) {
  //               const updated: RFEdge[] = [...eds];
  //               updated[idx] = rfEdge;
  //               return updated;
  //             }
  //             return [...eds, rfEdge];
  //           });
  //           break;
  //         }
  //         case 'deleteEdge':
  //           setEdges((eds: RFEdge[]) => eds.filter((e) => e.id !== mutation.payload.id));
  //           break;
  //         case 'upsertView':
  //           if (mutation.payload.id === resolvedViewRef.current?.id) {
  //             resolvedViewRef.current = mutation.payload;
  //             applyLayout(mutation.payload.layout);
  //           }
  //           break;
  //       }
  //     });
  //
  //     clearMutations();
  //   });
  //
  //   return unsubscribe;
  // }, [setNodes, setEdges, applyLayout, clearMutations]);

  useEffect(() => {
    if (isFirstRenderRef.current && nodes.length > 0) {
      isFirstRenderRef.current = false;
      setTimeout(() => fitView({ padding: 0.2 }), 0);
    }
    console.log("fitview")
  }, [nodes, fitView]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        // onConnect={handleConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        // onSelectionChange={eventHandlers.handleSelectionChange}
        // onNodeClick={eventHandlers.handleNodeClick}
        // onEdgeClick={eventHandlers.handleEdgeClick}
        // onPaneClick={eventHandlers.handlePaneClick}
        // onNodeDoubleClick={eventHandlers.handleNodeDoubleClick}
        // onNodeMouseEnter={eventHandlers.handleNodeMouseEnter}
        // onNodeMouseLeave={eventHandlers.handleNodeMouseLeave}
        // onNodeDragStart={eventHandlers.handleNodeDragStart}
        // onNodeDragStop={eventHandlers.handleNodeDragStop}
        // onNodeContextMenu={eventHandlers.handleNodeContextMenu}
        // onEdgeContextMenu={eventHandlers.handleEdgeContextMenu}
        // onPaneContextMenu={eventHandlers.handlePaneContextMenu}
        // onConnectStart={edgeCreation.onConnectStart}
        // onConnectEnd={edgeCreation.onConnectEnd}
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
        {/* {enableMinimap && ( */}
        {/*   <MiniMap */}
        {/*     zoomable */}
        {/*     pannable */}
        {/*     nodeColor={(node) => { */}
        {/*       const data = node.data as GraphNodeData; */}
        {/*       return data?.semanticId */}
        {/*         ? useDataStore.getState().getNodeSemantic(data.semanticId)?.color || '#165DFF' */}
        {/*         : '#165DFF'; */}
        {/*     }} */}
        {/*   /> */}
        {/* )} */}
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

// --------------------------------------------------------------------------
// 3. Wrapper with Provider
// --------------------------------------------------------------------------
export function Graph(props: GraphProps) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}
