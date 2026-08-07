"use client";

/**
 * Shared event handler for graph-v2.
 *
 * Per main design L40 / L102 / L365-367, the *only* callback that
 * `ForceGraph` and `FlowGraph` receive is this `eventHandler`. It is the
 * single entry point through which user gestures (worker events in force
 * mode, ReactFlow callbacks in flow mode) are routed to side effects.
 *
 * The orchestrators never touch `useUIStore` directly and never call any
 * of the 11 `useGraph()` callbacks directly — they package the gesture +
 * its context and hand it to one of the `eventHandler.xxx` methods. The
 * event handler internally decides what to do:
 *
 *   - mutate `useUIStore` (selection, preview block, context menu, ...)
 *   - delegate to a `useGraph()` callback (edit node, create edge, ...)
 *   - or both
 *
 * Cross-document contract: docs/07-agent/graph-v2/src/design.md §3.1,
 * main design L384, L402, L365-367.
 */

import { useMemo, useRef } from "react";
import type { EdgeId, NodeId } from "@workspace/interfaces";
import { useUIStore } from "@workspace/store";
import type { WorkerEvent } from "./force/types";
import { useGraph } from "@workspace/hooks";

// -----------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------

/** Context menu target. */
export type ContextMenuKind = "node" | "edge" | "canvas";

export interface NodeContextMenuArgs {
  kind: "node";
  nodeId: NodeId;
  clientX: number;
  clientY: number;
}

export interface EdgeContextMenuArgs {
  kind: "edge";
  edgeId: EdgeId;
  clientX: number;
  clientY: number;
}

export interface CanvasContextMenuArgs {
  kind: "canvas";
  clientX: number;
  clientY: number;
}

export type ContextMenuArgs =
  | NodeContextMenuArgs
  | EdgeContextMenuArgs
  | CanvasContextMenuArgs;

/**
 * The single callback surface that every orchestrator (ForceGraph,
 * FlowGraph) receives. Each method corresponds to one user gesture and
 * carries the minimum context the handler needs to do its job.
 *
 * The handler is intentionally a *flat namespace of imperative methods*
 * rather than a single `dispatch(event)` entry point. This keeps the
 * orchestrators' call sites self-documenting (e.g. `eventHandler.onNodeDoubleClick(id)`
 * reads better than `eventHandler.dispatch({ type: 'node:dblclick', nodeId: id })`).
 */
export interface GraphEventHandler {
  /**
   * Force-mode entry point: receive a `WorkerEvent` straight from the
   * Comlink proxy and let the handler decide what (if anything) to do.
   */
  handleWorkerEvent(event: WorkerEvent): void;

  // ---- Selection -----------------------------------------------------

  /** Single node click → select only this node. */
  onSelectNode(nodeId: NodeId): void;
  /** Single edge click → select only this edge. */
  onSelectEdge(edgeId: EdgeId): void;
  /**
   * Multi-selection sync (ReactFlow `onSelectionChange`). Replaces both
   * `selectedNodeIds` and `selectedEdgeIds` with the given sets.
   */
  onSelectMany(args: { nodes: NodeId[]; edges: EdgeId[] }): void;
  /** Clear every selection (canvas click, lasso empty, etc). */
  onClearSelection(): void;

  // ---- Node gestures -------------------------------------------------

  /** Node double click → close preview, open editor. */
  onNodeDoubleClick(nodeId: NodeId): void;
  /**
   * Pointer enters a node (150ms debounce on caller side).
   * Show non-focused preview block.
   */
  onNodePointerEnter(nodeId: NodeId): void;
  /** Pointer leaves a node. Close preview unless it is focused. */
  onNodePointerLeave(): void;
  /** Drag started — close preview block (per main design L80). */
  onNodeDragStart(): void;

  // ---- Canvas gestures -----------------------------------------------

  /** Click on the empty canvas — clear selection + close overlays. */
  onCanvasClick(): void;
  /** ReactFlow `onPaneClick`. Same as `onCanvasClick`. */
  onPaneClick(): void;

  // ---- Context menu (all surface to the same UIStore) ----------------

  onContextMenu(args: ContextMenuArgs): void;

  // ---- Alt-drag edge creation (force mode only) ----------------------

  /**
   * User starts Alt+drag from one or more source nodes. `targetId` is
   * the current hover target (or null when hovering empty canvas).
   */
  onAltDragUpdate(args: {
    sourceIds: NodeId[];
    targetId: NodeId | null;
    clientX: number;
    clientY: number;
  }): void;
  /**
   * User releases Alt+drag. `targetId === null` means release on empty
   * canvas (cancelled, main design L139).
   */
  onAltDragEnd(args: {
    sourceIds: NodeId[];
    targetId: NodeId | null;
    clientX: number;
    clientY: number;
  }): void;
}

// -----------------------------------------------------------------------
// Bridge implementation (closes over useUIStore + useGraph())
// -----------------------------------------------------------------------

/**
 * Build a `GraphEventHandler` bound to the current `useUIStore` and
 * `useGraph()`. The returned object is stable across renders thanks to
 * `useRef` of the underlying handler set + a single `useMemo`.
 *
 * Per main design L384 ("将 event handler 传递给 Force Graph 和 Flow
 * Graph 的 Callback"), this is the *only* callback the parent `Graph`
 * injects into its children.
 */
export function useGraphEventHandler(): GraphEventHandler {
  const ui = useUIStore.getState();
  const graph = useGraph();

  // Cache the stable UI setters we use most often. The `getState()` call
  // above gives us the current values; for stable references across
  // re-renders we need refs.
  const uiRef = useRef(ui);
  uiRef.current = ui;
  const graphRef = useRef(graph);
  graphRef.current = graph;

  return useMemo<GraphEventHandler>(() => {
    const set = (mutator: (s: ReturnType<typeof useUIStore.getState>) => void) =>
      mutator(useUIStore.getState());

    return {
      handleWorkerEvent(event) {
        switch (event.type) {
          case "node:dblclick":
            set((s) => {
              s.closePreviewBlock();
              s.handleNodeEdit(event.nodeId);
            });
            return;
          case "node:pointer-enter":
            set((s) =>
              s.setPreviewBlock({
                nodeId: event.nodeId,
                visible: true,
                isFocus: false,
              }),
            );
            return;
          case "node:pointer-leave":
            set((s) => {
              if (!s.previewBlock.isFocus) s.closePreviewBlock();
            });
            return;
          case "node:drag-start":
            set((s) => s.closePreviewBlock());
            return;
          case "edge:click":
            set((s) => s.setSelectedEdgeIds(new Set([event.edgeId])));
            return;
          // Context-menu results (selection only — menu is opened
          // by ForceGraph's onWorkerEvent from the same event).
          case "context-menu:node":
            set((s) => s.setSelectedNodeIds(new Set([event.nodeId])));
            return;
          case "context-menu:edge":
            set((s) => s.setSelectedEdgeIds(new Set([event.edgeId])));
            return;
          case "context-menu:canvas":
            set((s) => {
              s.setSelectedNodeIds(new Set());
              s.setSelectedEdgeIds(new Set());
            });
            return;
          case "canvas:click":
            set((s) => {
              s.setSelectedNodeIds(new Set());
              s.setSelectedEdgeIds(new Set());
              s.closePreviewBlock();
              s.closeContextMenu();
            });
            return;
          case "selection:changed":
            set((s) => {
              s.setSelectedNodeIds(new Set(event.selectedNodeIds));
              s.setSelectedEdgeIds(new Set(event.selectedEdgeIds));
            });
            return;
          // Pure noise / informational events — nothing to do.
          case "frame":
          case "tick":
          case "status":
          case "canvas:pointer-down":
          case "canvas:pointer-move":
          case "canvas:pointer-up":
          case "canvas:wheel":
          case "node:drag":
          case "node:drag-end":
            return;
          default: {
            const _exhaustive: never = event;
            void _exhaustive;
          }
        }
      },

      onSelectNode(nodeId) {
        set((s) => s.setSelectedNodeIds(new Set([nodeId])));
      },

      onSelectEdge(edgeId) {
        set((s) => s.setSelectedEdgeIds(new Set([edgeId])));
      },

      onSelectMany({ nodes, edges }) {
        set((s) => {
          s.setSelectedNodeIds(new Set(nodes));
          s.setSelectedEdgeIds(new Set(edges));
        });
      },

      onClearSelection() {
        set((s) => {
          s.setSelectedNodeIds(new Set());
          s.setSelectedEdgeIds(new Set());
        });
      },

      onNodeDoubleClick(nodeId) {
        set((s) => {
          s.closePreviewBlock();
          s.handleNodeEdit(nodeId);
        });
      },

      onNodePointerEnter(nodeId) {
        set((s) =>
          s.setPreviewBlock({
            nodeId,
            visible: true,
            isFocus: false,
          }),
        );
      },

      onNodePointerLeave() {
        // Caller (ForceGraph) is responsible for the "don't close if
        // already focused" check — we just provide the close primitive.
        set((s) => s.closePreviewBlock());
      },

      onNodeDragStart() {
        set((s) => s.closePreviewBlock());
      },

      onCanvasClick() {
        set((s) => {
          s.setSelectedNodeIds(new Set());
          s.setSelectedEdgeIds(new Set());
          s.closePreviewBlock();
          s.closeContextMenu();
        });
      },

      onPaneClick() {
        // ReactFlow's onPaneClick and our own onCanvasClick do the
        // same thing: clear all transient UI.
        set((s) => {
          s.setSelectedNodeIds(new Set());
          s.setSelectedEdgeIds(new Set());
          s.closeContextMenu();
          s.closePreviewBlock();
        });
      },

      onContextMenu(args) {
        set((s) => {
          // Always close transient overlays first.
          s.closePreviewBlock();
          if (args.kind === "canvas") {
            s.setContextMenu({
              x: args.clientX,
              y: args.clientY,
              visible: true,
              type: "canvas",
              context: {} as Record<string, never>,
            });
            return;
          }
          if (args.kind === "node") {
            s.setContextMenu({
              x: args.clientX,
              y: args.clientY,
              visible: true,
              type: "node",
              context: { nodeId: args.nodeId },
            });
            return;
          }
          s.setContextMenu({
            x: args.clientX,
            y: args.clientY,
            visible: true,
            type: "edge",
            context: { edgeId: args.edgeId },
          });
        });
      },

      onAltDragUpdate({ sourceIds, targetId, clientX, clientY }) {
        // The main UI mirror of the drag itself is the worker (which
        // moves nodes via `setNodePosition`); the event handler's role
        // here is only to keep the selection consistent.
        if (targetId !== null) {
          set((s) => s.setSelectedNodeIds(new Set([targetId])));
        } else {
          set((s) => s.setSelectedNodeIds(new Set(sourceIds)));
        }
        // No preview/menu changes mid-drag (per main design L80).
        void clientX;
        void clientY;
      },

      onAltDragEnd({ sourceIds, targetId, clientX, clientY }) {
        // Delegate to useGraph().onCreateEdge — it implements the
        // "create edges on target" / "open add-edge menu on canvas"
        // split (useGraph.ts L168-211). `onCreateEdge` expects a
        // 5th `setContextMenu` callback we provide by binding the
        // store setter.
        const setContextMenu = (menu: Parameters<typeof useUIStore.getState> extends infer S
          ? S extends { setContextMenu: (m: infer M) => void }
            ? M
            : never
          : never) => {
          useUIStore.getState().setContextMenu(menu);
        };
        graphRef.current.onCreateEdge(
          sourceIds as string[],
          targetId as string | null,
          clientX,
          clientY,
          setContextMenu as (m: unknown) => unknown,
        );
      },
    };
  }, []);
}
