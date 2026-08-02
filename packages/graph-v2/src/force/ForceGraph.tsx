"use client";

/**
 * ForceGraph — main-thread orchestrator for the d3-force + OffscreenCanvas
 * pipeline.
 *
 * Responsibilities:
 *
 *   1. **Worker lifecycle**: instantiate a `Worker` from
 *      `./worker/force.worker.ts`, expose its API via Comlink, register
 *      the OffscreenCanvas via `Comlink.transfer(offscreen, [offscreen])`.
 *   2. **Data pipeline**:
 *      - Pull a snapshot from `getDataSnapshot()` (parent `Graph`).
 *      - Apply `view.filterConfig` via the `filter` callback (parent
 *        injects it).
 *      - Convert `NodeData[]` / `EdgeData[]` → `ForceNodeSeed[]` /
 *        `ForceLinkSeed[]` via `transform.ts`.
 *      - Push to worker via `api.initData` (full sync) or
 *        `api.applyDiff` (incremental).
 *   3. **Render loop**: every worker tick pushes an `ImageBitmap` over
 *      the raw `postMessage` channel; we paint it onto a `<canvas>` here.
 *   4. **Event loop**: install DOM listeners via `eventListener.ts` and
 *      forward `ProxiedDomEvent`s to the worker; receive `WorkerEvent`s
 *      back and dispatch them to `props.eventHandler.handleWorkerEvent`
 *      (the shared `GraphEventHandler` from `eventHandler.ts`).
 *   5. **ViewId changes**: re-pull data, re-init the worker.
 *   6. **Theme / style changes**: push a new `ForceStyle` via
 *      `api.updateStyle`.
 *   7. **StrictMode cleanup**: every effect must clean up its worker,
 *      listeners, and frame handlers.
 *
 * Per main design L384, this component does **not** receive a
 * `handlers` / `onSelect` / `onPreviewShow` prop. The only callback
 * surface is `eventHandler` (constructed in `Graph`).
 *
 * Cross-document contract: force/design.md §1-§7, main design L379-432.
 */

import * as Comlink from "comlink";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type {
  EdgeData,
  EdgeId,
  NodeData,
  NodeId,
  View,
  ViewId,
} from "@workspace/interfaces";
import { buildForceStyle, DEFAULT_FORCE_CONFIG } from "./styleConfig";
import type { Theme } from "../types";
import type {
  ForceConfig,
  WorkerEvent,
  WorkerInbound,
} from "./types";
import {
  diffToForcePayload,
  edgeDataToForceSeeds,
  nodeDataToForceSeeds,
} from "./transform";
import { installDomEventProxy } from "./eventListener";
import { useUIStore } from "@workspace/store";
import {
  GraphContextMenu,
  type GraphContextMenuProps,
} from "@workspace/ui/components/graph-context-menu/graph-context-menu";
import { PreviewBlock } from "@workspace/ui/components/preview-block/preview-block";
import type { GraphEventHandler } from "../eventHandler";

// -----------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------

import type { GraphSnapshot, DiffCallback, SourceDiff } from "../types";
import { collectEdgeEndpointIds } from "../types";

export interface ForceGraphProps {
  view: View;
  viewId: ViewId;
  /** Parent `Graph` injects these to keep ForceGraph store-agnostic. */
  getDataSnapshot: () => GraphSnapshot;
  subscribeDiff: (cb: DiffCallback) => () => void;
  /**
   * Filter applied to the raw snapshot. Receives the view so the parent
   * can apply its `filterConfig`.
   */
  filter: (
    nodes: NodeData[],
    edges: EdgeData[],
    view: View,
  ) => { nodes: NodeData[]; edges: EdgeData[] };
  /**
   * The single callback surface. ForceGraph never touches `useUIStore`
   * directly and never calls any of the `useGraph()` 11 callbacks
   * directly — every gesture is routed through here.
   */
  eventHandler: GraphEventHandler;
  theme?: Theme;
  /** Optional className for the outer container. */
  className?: string;
  /** Optional inline style for the outer container. */
  style?: React.CSSProperties;
  /** Show or hide the minimap stub. (Real minimap renders in a future PR.) */
  showMinimap?: boolean;
}

export interface ForceGraphHandle {
  /** Imperative re-init (used by the parent Graph). */
  resync: () => void;
  /** Stop the simulation. */
  stop: () => void;
  /** Resume the simulation. */
  resume: () => void;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export const ForceGraph = forwardRef<ForceGraphHandle, ForceGraphProps>(
  function ForceGraph(props, ref) {
    const {
      view,
      viewId,
      getDataSnapshot,
      subscribeDiff,
      filter,
      eventHandler,
      theme = "light",
      className,
      style,
    } = props;

    // ---- Refs --------------------------------------------------------
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const apiRef = useRef<WorkerInbound | null>(null);
    const offscreenRef = useRef<OffscreenCanvas | null>(null);
    const listenersRef = useRef<(() => void) | null>(null);
    const canvasRectRef = useRef<DOMRect | null>(null);
    const viewportRef = useRef({ x: 0, y: 0, scale: 1 });
    const currentViewIdRef = useRef<ViewId>(viewId);

    // ---- Local state ------------------------------------------------
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [contextMenuState, setContextMenuState] = useState<
      (GraphContextMenuProps & { setContextMenu?: (m: unknown) => void }) | null
    >(null);

    // We still read the context menu setter here so the in-canvas
    // `GraphContextMenu` overlay can drive the store on close. This is
    // a *display concern* (the menu component reads the setter) — the
    // actual *opening* of the menu is done via `eventHandler.onContextMenu`.
    const setContextMenu = useUIStore((s) => s.setContextMenu);
    const previewBlock = useUIStore((s) => s.previewBlock);
    const closePreviewBlock = useUIStore((s) => s.closePreviewBlock);

    // ---- Worker setup ------------------------------------------------
    const setupWorker = useCallback(async (): Promise<{
      api: WorkerInbound;
      worker: Worker;
    }> => {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("canvas ref is null");
      const container = containerRef.current;
      if (!container) throw new Error("container ref is null");

      const rect = container.getBoundingClientRect();
      canvasRectRef.current = rect;
      const dpr = Math.max(1, globalThis.devicePixelRatio ?? 1);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const worker = new Worker(
        new URL("./worker/force.worker.ts", import.meta.url),
        { type: "module" },
      );

      await new Promise<void>((resolve, reject) => {
        const onMsg = (ev: MessageEvent) => {
          if (ev.data?.type === "__READY__") {
            worker.removeEventListener("message", onMsg);
            resolve();
          }
        };
        worker.addEventListener("message", onMsg);
        worker.addEventListener("error", reject, { once: true });
        setTimeout(() => reject(new Error("worker boot timeout")), 5000);
      });

      const api = Comlink.wrap<WorkerInbound>(worker);

      const offscreen = canvas.transferControlToOffscreen();
      offscreenRef.current = offscreen;
      worker.postMessage(
        { type: "__SET_CANVAS__", canvas: offscreen, width, height },
        [offscreen],
      );

      const ctx2d = canvas.getContext("2d");
      const onFrame = (ev: MessageEvent) => {
        if (ev.data?.type === "__FRAME__" && ctx2d) {
          const bitmap = ev.data.bitmap as ImageBitmap;
          ctx2d.save();
          ctx2d.setTransform(1, 0, 0, 1, 0, 0);
          ctx2d.clearRect(0, 0, canvas.width, canvas.height);
          ctx2d.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          ctx2d.restore();
          bitmap.close();
        }
      };
      worker.addEventListener("message", onFrame);

      workerRef.current = worker;
      apiRef.current = api;

      return { api, worker };
    }, []);

    // ---- Full sync (re-init from snapshot) ----------------------------
    const performFullSync = useCallback(async () => {
      const api = apiRef.current;
      if (!api) return;
      const raw = getDataSnapshot();
      const filtered = filter(raw.nodes, raw.edges, view);
      const seeds = nodeDataToForceSeeds(filtered.nodes, { viewId });
      const linkSeeds = edgeDataToForceSeeds(filtered.edges);

      const canvas = canvasRef.current;
      const dims = canvas
        ? { width: canvas.width, height: canvas.height }
        : { width: 800, height: 600 };

      await api.initData(seeds, linkSeeds, dims);

      const stylePayload = buildForceStyle({ theme });
      await api.updateStyle(stylePayload);
      const cfg: ForceConfig = {
        ...DEFAULT_FORCE_CONFIG,
        centerX: dims.width / 2,
        centerY: dims.height / 2,
      };
      await api.updateConfig(cfg);
      await api.setViewport(
        viewportRef.current.x,
        viewportRef.current.y,
        viewportRef.current.scale,
      );
    }, [getDataSnapshot, filter, view, viewId, theme]);

    // ---- Diff subscriber ---------------------------------------------
    // Each diff bucket is filtered through the SAME `filter` predicate
    // that full-sync uses, scoped to just that bucket (e.g. for
    // `nodes.added` we pass `{ nodes: <added>, edges: [], view }`).
    // `removed` is passed through untouched — the worker is the source
    // of truth for "what does it currently know about", so it can
    // decide whether each removed id was actually rendered.
    const subscribeStore = useCallback(() => {
      return subscribeDiff((diff) => {
        const api = apiRef.current;
        if (!api) return;

        const filteredNodesAdded = filter(diff.nodes.added, [], view).nodes;
        const filteredNodesUpdated = filter(diff.nodes.updated, [], view).nodes;

        const endpointIds = collectEdgeEndpointIds(diff);
        const snapshot = getDataSnapshot();
        const endpointNodes = snapshot.nodes.filter((n) => endpointIds.has(n.id));
        const filteredEdgesAdded = filter(
          endpointNodes,
          diff.edges.added,
          view,
        ).edges;
        const filteredEdgesUpdated = filter(
          endpointNodes,
          diff.edges.updated,
          view,
        ).edges;

        const trimmed: SourceDiff = {
          nodes: {
            added: filteredNodesAdded,
            updated: filteredNodesUpdated,
            removed: diff.nodes.removed,
          },
          edges: {
            added: filteredEdgesAdded,
            updated: filteredEdgesUpdated,
            removed: diff.edges.removed,
          },
        };
        const payload = diffToForcePayload(trimmed, { viewId });
        api.applyDiff(payload).catch((err) => {
          console.error("[ForceGraph] applyDiff failed:", err);
        });
      });
    }, [subscribeDiff, getDataSnapshot, filter, view, viewId]);

    // ---- WorkerEvent forwarder (from Comlink proxy) -----------------
    // Per main design L229-232 / L365-367, worker events are forwarded
    // straight to the shared event handler, which owns the routing to
    // useUIStore / useGraph().
    const onWorkerEvent = useCallback(
      (event: WorkerEvent) => {
        eventHandler.handleWorkerEvent(event);
      },
      [eventHandler],
    );

    // ---- Effect: boot + cleanup -------------------------------------
    useEffect(() => {
      let cancelled = false;
      let unsubDiff: (() => void) | null = null;
      (async () => {
        try {
          const { api } = await setupWorker();
          if (cancelled) {
            workerRef.current?.terminate();
            workerRef.current = null;
            return;
          }
          await api.setEventHandler(Comlink.proxy(onWorkerEvent));
          await performFullSync();
          unsubDiff = subscribeStore();
          if (!cancelled) setIsReady(true);
        } catch (err) {
          console.error("[ForceGraph] worker init failed:", err);
          if (!cancelled) setError(err as Error);
        }
      })();

      const domListeners = installDomEventProxy(
        containerRef.current!,
        canvasRectRef,
        viewportRef,
        {
          proxyEvent: (ev) => {
            const api = apiRef.current;
            if (!api) return Promise.resolve();
            return api.proxyEvent(ev);
          },
          onContextMenu: (x, y) => {
            // Route the canvas context menu through the shared
            // event handler — keeps all side-effect writes in one
            // place.
            eventHandler.onContextMenu({
              kind: "canvas",
              clientX: x,
              clientY: y,
            });
            // Also keep the local `contextMenuState` in sync so the
            // `<GraphContextMenu>` overlay can render.
            setContextMenuState({
              x,
              y,
              visible: true,
              type: "canvas",
              context: {} as Record<string, never>,
              onClose: () => setContextMenuState(null),
            } as GraphContextMenuProps);
          },
        },
      );
      listenersRef.current = domListeners.dispose;

      return () => {
        cancelled = true;
        domListeners.dispose();
        listenersRef.current = null;
        if (unsubDiff) unsubDiff();
        try {
          apiRef.current?.setEventHandler(null);
        } catch {
          // Worker may already be dead.
        }
        workerRef.current?.terminate();
        workerRef.current = null;
        apiRef.current = null;
        offscreenRef.current = null;
        setIsReady(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subscribeStore]);

    // ---- Effect: viewId change triggers re-init ---------------------
    useEffect(() => {
      if (currentViewIdRef.current === viewId) return;
      currentViewIdRef.current = viewId;
      performFullSync().catch((err) =>
        console.error("[ForceGraph] re-init on viewId change failed:", err),
      );
    }, [viewId, performFullSync]);

    // ---- Effect: theme change pushes a new style -------------------
    useEffect(() => {
      const api = apiRef.current;
      if (!api) return;
      api.updateStyle(buildForceStyle({ theme })).catch((err) => {
        console.error("[ForceGraph] updateStyle failed:", err);
      });
    }, [theme]);

    // ---- Imperative handle ------------------------------------------
    useImperativeHandle(
      ref,
      () => ({
        resync: () => {
          performFullSync().catch((err) =>
            console.error("[ForceGraph] resync failed:", err),
          );
        },
        stop: () => {
          apiRef.current?.stop().catch(() => {
            // ignored
          });
        },
        resume: () => {
          apiRef.current?.resume().catch(() => {
            // ignored
          });
        },
      }),
      [performFullSync],
    );

    // ---- Resize observer --------------------------------------------
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const rect = entry.contentRect;
        canvasRectRef.current = new DOMRect(
          rect.left,
          rect.top,
          rect.width,
          rect.height,
        );
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = Math.max(1, globalThis.devicePixelRatio ?? 1);
        const width = Math.max(1, Math.floor(rect.width * dpr));
        const height = Math.max(1, Math.floor(rect.height * dpr));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          canvas.style.width = `${rect.width}px`;
          canvas.style.height = `${rect.height}px`;
          apiRef.current?.setDimensions(width, height).catch(() => {
            // ignored
          });
        }
      });
      ro.observe(container);
      return () => ro.disconnect();
    }, []);

    // ---- Render ------------------------------------------------------
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          ...style,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            cursor: "grab",
            touchAction: "none",
          }}
        />
        {error ? (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              padding: "4px 8px",
              borderRadius: 4,
              background: "rgba(220,38,38,0.9)",
              color: "white",
              fontSize: 12,
            }}
          >
            Worker init failed: {error.message}
          </div>
        ) : null}
        {!isReady && !error ? (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            Initializing…
          </div>
        ) : null}
        {contextMenuState && contextMenuState.visible ? (
          <GraphContextMenu
            {...contextMenuState}
            setContextMenu={setContextMenu}
          />
        ) : null}
        {previewBlock.visible && previewBlock.nodeId ? (
          <PreviewBlock
            nodeId={previewBlock.nodeId}
            containerRef={containerRef}
            visible={previewBlock.visible}
            isFocus={previewBlock.isFocus}
            onClose={closePreviewBlock}
          />
        ) : null}
      </div>
    );
  },
);

// Re-export for downstream type consumers (so the props type can be
// reached as `ForceGraphProps["eventHandler"]`).
export type { EdgeId, NodeId };
