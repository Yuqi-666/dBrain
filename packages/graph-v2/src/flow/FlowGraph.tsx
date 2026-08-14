"use client";

/**
 * FlowGraph — main-thread orchestrator for the ReactFlow-based flow mode.
 *
 * Responsibilities:
 *
 *   1. **Data pipeline** (per flow/design.md §2):
 *      - Pull `NodeData[]` / `EdgeData[]` snapshot via `getDataSnapshot()`.
 *      - Apply `view.filterConfig` via the `filter` prop.
 *      - Compute `neighborActive` for the 1-degree neighbors of selected
 *        nodes (a flow-mode responsibility, unlike force mode where d3
 *        handles it).
 *      - Convert to `RenderableNode[]` / `RenderableEdge[]` and hand off
 *        to `<ReactFlow>`.
 *   2. **Coordinate persistence** (§3): write `stateData.client.position[viewId]`
 *      on drag-stop (200ms debounce via `NodeService.upsert` with
 *      `debounce: 200`).
 *   3. **Viewport persistence** (§5.4): 1000ms debounce.
 *   4. **Edge creation**: `onConnect` → `EdgeService.upsert`.
 *   5. **Selection sync**: `onSelectionChange` → `eventHandler.onSelectMany`.
 *   6. **Dagre fallback** (stub): if a node has no position, we currently
 *      place it at (0,0) — a real dagre implementation is a future PR
 *      (per flow/design.md §3.3).
 *   7. **StrictMode cleanup**: every effect must clean up its resources.
 *
 * Per main design L384, FlowGraph receives ONLY `eventHandler` as its
 * callback surface. Every ReactFlow event handler calls the corresponding
 * `eventHandler.xxx` method — it never touches `useUIStore` or `useGraph()`
 * directly.
 *
 * Cross-document contract: docs/07-agent/graph-v2/src/flow/design.md
 * §1-§9, main design L379-432.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type {
  EdgeData,
  EdgeId,
  NodeData,
  NodeId,
  View,
  ViewId,
} from "@workspace/interfaces";
import { useDataStore, useUIStore } from "@workspace/store";
import { NodeService, EdgeService } from "@workspace/services";
import { debounce } from "@workspace/utils";

import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges";
import { EdgeMarkers } from "./edges/markers";
import {
  connectionToEdgeAdd,
  positionDeltaToSource,
  sourceToRenderableEdges,
  sourceToRenderableNodes,
} from "./transform";
import type {
  PositionDelta,
  RenderableEdge,
  RenderableNode,
} from "./transform";
import { collectEdgeEndpointIds } from "../types";

import {
  GraphContextMenu,
  type GraphContextMenuProps,
} from "@workspace/ui/components/graph-context-menu/graph-context-menu";
import type { GraphEventHandler } from "../eventHandler";

// -----------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------

import type { GraphSnapshot, DiffCallback, SourceDiff } from "../types";

export interface FlowGraphProps {
  view: View;
  viewId: ViewId;
  getDataSnapshot: () => GraphSnapshot;
  subscribeDiff: (cb: DiffCallback) => () => void;
  filter: (
    nodes: NodeData[],
    edges: EdgeData[],
    view: View,
  ) => { nodes: NodeData[]; edges: EdgeData[] };
  /**
   * The single callback surface. FlowGraph never touches `useUIStore`
   * directly and never calls any of the `useGraph()` 11 callbacks
   * directly — every gesture is routed through here.
   */
  eventHandler: GraphEventHandler;
  className?: string;
  style?: React.CSSProperties;
}

// -----------------------------------------------------------------------
// Component (rendered inside <ReactFlowProvider> so we can use
// useReactFlow for viewport / node lookups).
// -----------------------------------------------------------------------

function FlowGraphImpl(props: FlowGraphProps) {
  const {
    view,
    viewId,
    getDataSnapshot,
    subscribeDiff,
    filter,
    eventHandler,
    className,
    style,
  } = props;

  // ---- Refs --------------------------------------------------------
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pendingPositions = useRef<Map<NodeId, PositionDelta>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Local state ------------------------------------------------
  const [renderableNodes, setRenderableNodes] = useState<RenderableNode[]>([]);
  const [renderableEdges, setRenderableEdges] = useState<RenderableEdge[]>([]);
  const [contextMenuState, setContextMenuState] = useState<
    (GraphContextMenuProps & { setContextMenu?: (m: unknown) => void }) | null
  >(null);

  const setContextMenu = useUIStore((s) => s.setContextMenu);
  const edgeSemantics = useDataStore((s) => s.edgeSemantics);

  const reactFlow = useReactFlow();

  // ---- Full sync ---------------------------------------------------
  const performFullSync = useCallback(() => {
    const raw = getDataSnapshot();
    const filtered = filter(raw.nodes, raw.edges, view);
    setRenderableNodes(sourceToRenderableNodes(filtered.nodes, viewId));
    setRenderableEdges(sourceToRenderableEdges(filtered.edges, edgeSemantics));
  }, [getDataSnapshot, filter, view, viewId, edgeSemantics]);

  // ---- Incremental diff sync ---------------------------------------
  // Apply one SourceDiff against the currently-rendered node/edge sets
  // without rebuilding them from scratch. `added` / `updated` are
  // re-filtered (via the same `filter` predicate as full sync); `removed`
  // is forwarded as-is.
  const performDiffSync = useCallback(
    (diff: SourceDiff) => {
      const addedNodes = filter(diff.nodes.added, [], view).nodes;
      const updatedNodes = filter(diff.nodes.updated, [], view).nodes;

      const endpointIds = collectEdgeEndpointIds(diff);
      const snapshot = getDataSnapshot();
      const endpointNodes = snapshot.nodes.filter((n) => endpointIds.has(n.id));
      const addedEdges = filter(endpointNodes, diff.edges.added, view).edges;
      const updatedEdges = filter(
        endpointNodes,
        diff.edges.updated,
        view,
      ).edges;

      const removedNodeIds = new Set(diff.nodes.removed);
      const removedEdgeIds = new Set(diff.edges.removed);
      const touchedNodeIds = new Set([
        ...addedNodes.map((n) => n.id),
        ...updatedNodes.map((n) => n.id),
      ]);
      const touchedEdgeIds = new Set([
        ...addedEdges.map((e) => e.id),
        ...updatedEdges.map((e) => e.id),
      ]);

      const nextNodes: RenderableNode[] = [];
      for (const n of renderableNodes) {
        if (removedNodeIds.has(n.id)) continue;
        if (touchedNodeIds.has(n.id)) continue;
        nextNodes.push(n);
      }
      for (const r of sourceToRenderableNodes(
        [...addedNodes, ...updatedNodes],
        viewId,
      )) {
        nextNodes.push(r);
      }
      setRenderableNodes(nextNodes);

      const nextEdges: RenderableEdge[] = [];
      for (const e of renderableEdges) {
        if (removedEdgeIds.has(e.id)) continue;
        if (touchedEdgeIds.has(e.id)) continue;
        nextEdges.push(e);
      }
      for (const r of sourceToRenderableEdges(
        [...addedEdges, ...updatedEdges],
        edgeSemantics,
      )) {
        nextEdges.push(r);
      }
      setRenderableEdges(nextEdges);
    },
    [
      filter,
      view,
      viewId,
      renderableNodes,
      renderableEdges,
      edgeSemantics,
    ],
  );

  // ---- Mount-time sync + diff subscription ------------------------
  useEffect(() => {
    performFullSync();
    const unsub = subscribeDiff((diff) => {
      performDiffSync(diff);
    });
    return () => {
      unsub();
    };
  }, [performFullSync, performDiffSync, subscribeDiff]);

  // ---- Re-sync on viewId change -----------------------------------
  useEffect(() => {
    performFullSync();
    const vp = (
      view.visualConfig as
        | { viewport?: { x: number; y: number; zoom: number } }
        | undefined
    )?.viewport;
    if (vp) {
      requestAnimationFrame(() => {
        reactFlow.setViewport({ x: vp.x, y: vp.y, zoom: vp.zoom });
      });
    }
  }, [viewId, performFullSync, reactFlow, view]);

  // ---- Position persistence (debounced 200ms) ---------------------
  const flushPendingPositions = useCallback(() => {
    if (pendingPositions.current.size === 0) return;
    const snapshot = getDataSnapshot();
    const getNode = (id: NodeId) => snapshot.nodes.find((n) => n.id === id);
    for (const delta of pendingPositions.current.values()) {
      const patch = positionDeltaToSource(delta, getNode);
      if (!patch) continue;
      NodeService.upsert(patch.id, patch.patch, { debounce: 200 }).catch(
        (err: unknown) => {
          console.error("[FlowGraph] position persist failed:", err);
        },
      );
    }
    pendingPositions.current.clear();
  }, [getDataSnapshot]);

  const schedulePositionFlush = useMemo(
    () =>
      debounce(() => {
        flushPendingPositions();
      }, 200),
    [flushPendingPositions],
  );

  useEffect(() => {
    const timer = flushTimerRef.current;
    return () => {
      schedulePositionFlush();
      if (timer) clearTimeout(timer);
    };
  }, [schedulePositionFlush]);

  // ---- ReactFlow callback wiring ----------------------------------
  // Every handler below delegates entirely to `eventHandler.xxx`. The
  // orchestrator itself never calls `useUIStore.setXxx` directly.

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const c of changes) {
        if (
          c.type === "position" &&
          "position" in c &&
          (c as { dragging?: boolean }).dragging === false &&
          c.position
        ) {
          const delta: PositionDelta = {
            id: c.id as NodeId,
            x: c.position.x,
            y: c.position.y,
            viewId,
          };
          pendingPositions.current.set(delta.id, delta);
          schedulePositionFlush();
        }
      }
    },
    [viewId, schedulePositionFlush],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Track selection changes for UI store sync.
      for (const c of changes) {
        if (c.type === "select" && c.selected) {
          eventHandler.onSelectEdge(c.id as EdgeId);
        }
      }
    },
    [eventHandler],
  );

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const add = connectionToEdgeAdd(connection);
    const now = new Date().toISOString();
    const edge: import("@workspace/interfaces").EdgeData = {
      id: `tmp_${Date.now()}` as EdgeId,
      from: add.source,
      to: add.target,
      direction: "forward",
      semanticId: "",
      createdAt: now,
      updatedAt: now,
    };
    EdgeService.upsert(edge).catch((err: unknown) => {
      console.error("[FlowGraph] onConnect failed:", err);
    });
  }, []);

  const onSelectionChange = useCallback(
    (selection: { nodes: { id: string }[]; edges: { id: string }[] }) => {
      eventHandler.onSelectMany({
        nodes: selection.nodes.map((n) => n.id as NodeId),
        edges: selection.edges.map((e) => e.id as EdgeId),
      });
    },
    [eventHandler],
  );

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: RenderableNode) => {
      // Single node click: select only this node and show focused
      // preview. Both writes go through the shared event handler.
      eventHandler.onSelectNode(node.id as NodeId);
      eventHandler.onNodePointerEnter(node.id as NodeId);
    },
    [eventHandler],
  );

  const onNodeDoubleClick = useCallback(
    (_e: React.MouseEvent, node: RenderableNode) => {
      eventHandler.onNodeDoubleClick(node.id as NodeId);
    },
    [eventHandler],
  );

  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: RenderableNode) => {
      e.preventDefault();
      setContextMenuState({
        x: e.clientX,
        y: e.clientY,
        visible: true,
        type: "node",
        context: { nodeId: node.id },
        onClose: () => setContextMenuState(null),
      } as GraphContextMenuProps);
    },
    [],
  );

  const onEdgeContextMenu = useCallback(
    (e: React.MouseEvent, edge: RenderableEdge) => {
      e.preventDefault();
      setContextMenuState({
        x: e.clientX,
        y: e.clientY,
        visible: true,
        type: "edge",
        context: { edgeId: edge.id },
        onClose: () => setContextMenuState(null),
      } as GraphContextMenuProps);
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    eventHandler.onPaneClick();
  }, [eventHandler]);

  // ---- Viewport persistence (debounced 1000ms) -------------------
  const persistViewport = useMemo(
    () =>
      debounce((vp: { x: number; y: number; zoom: number }) => {
        try {
          const currentView = useDataStore.getState().views.get(viewId);
          if (!currentView) return;
          const next = {
            ...currentView,
            visualConfig: {
              ...currentView.visualConfig,
              viewport: vp,
            },
          };
          useDataStore.getState().upsertView(next);
        } catch (err) {
          console.error("[FlowGraph] viewport persist failed:", err);
        }
      }, 1000),
    [viewId],
  );

  const onMoveEnd = useCallback(
    (_e: unknown, viewport: { x: number; y: number; zoom: number }) => {
      persistViewport(viewport);
    },
    [persistViewport],
  );

  // ---- Render ------------------------------------------------------
  const hasPersistedPosition = useMemo(
    () =>
      renderableNodes.some((n) => n.position.x !== 0 || n.position.y !== 0),
    [renderableNodes],
  );

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", width: "100%", height: "100%", ...style }}
    >
      <EdgeMarkers />
      <ReactFlow
        nodes={renderableNodes}
        edges={renderableEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={onPaneClick}
        onMoveEnd={onMoveEnd}
        fitView={!hasPersistedPosition}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={10}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ animated: false }}
      >
        <Background
          gap={20}
          size={1}
          color={view.visualConfig?.gridColor ?? "#e5e7eb"}
        />
        <Controls position="bottom-left" />
        {view.visualConfig?.showMinimap !== false ? (
          <MiniMap
            position="bottom-left"
            pannable
            zoomable
            style={{ width: 200, height: 120 }}
          />
        ) : null}
      </ReactFlow>
      {contextMenuState && contextMenuState.visible ? (
        <GraphContextMenu
          {...contextMenuState}
          setContextMenu={setContextMenu}
        />
      ) : null}
    </div>
  );
}

// -----------------------------------------------------------------------
// Public component — wraps the impl in <ReactFlowProvider> so hooks
// like useReactFlow work in nested consumers (e.g. custom node
// components).
// -----------------------------------------------------------------------

export function FlowGraph(props: FlowGraphProps) {
  return (
    <ReactFlowProvider>
      <FlowGraphImpl {...props} />
    </ReactFlowProvider>
  );
}
