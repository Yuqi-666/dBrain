/**
 * WorkerInbound implementation.
 *
 * This module exposes the `WorkerInbound` methods that the main thread
 * calls via Comlink. Each method delegates to `simulation.ts` and
 * `canvas.ts` — the routing table matches worker/design.md §3.1.
 *
 * IMPORTANT: every method signature MUST match `force/types.ts` →
 * `WorkerInbound` exactly.
 */

import type { NodeId } from "@workspace/interfaces";
import type {
  ForceConfig,
  ForceDiffPayload,
  ForceLinkSeed,
  ForceNodeSeed,
  ForceStyle,
  ProxiedDomEvent,
  WorkerEvent,
  WorkerInbound,
} from "../types";
import {
  applyDiff,
  createOrUpdate,
  emit,
  getStatus,
  handleProxiedEvent,
  onTickListener,
  reheat,
  resumeSimulation,
  setEventHandler,
  setNodeFixed,
  setNodePosition,
  stopSimulation,
  updateConfig,
  updateDims,
} from "./simulation";
import {
  createCanvas,
  renderAndTransfer,
  resizeCanvas,
  setStyle,
  setViewport as setCanvasViewport,
} from "./canvas";

// -----------------------------------------------------------------------
// Bound viewport (for canvas.ts + event routing)
// -----------------------------------------------------------------------

let canvasViewport = { x: 0, y: 0, scale: 1 };

// -----------------------------------------------------------------------
// Frame loop
// -----------------------------------------------------------------------

/**
 * Push a single ImageBitmap to the main thread via the raw `postMessage`
 * channel. ImageBitmap is not a default Comlink Transferable, so we
 * cannot route it through the Comlink proxy callback — we must use
 * `self.postMessage` directly.
 */
function pushFrame(): void {
  const bitmap = renderAndTransfer();
  if (!bitmap) return;
  // `self` is the DedicatedWorkerGlobalScope in module workers.
  (self as unknown as Worker).postMessage(
    { type: "__FRAME__", bitmap },
    [bitmap],
  );
}

// Throttle frame pushes to at most one per animation frame to avoid
// flooding the main thread.
let pendingFrame = false;
function scheduleFrame(): void {
  if (pendingFrame) return;
  pendingFrame = true;
  // We can't use requestAnimationFrame inside all worker environments; fall
  // back to a microtask coalescing.
  queueMicrotask(() => {
    pendingFrame = false;
    pushFrame();
  });
}

// Subscribe to simulation ticks so we re-render every step.
onTickListener(() => {
  scheduleFrame();
});

// -----------------------------------------------------------------------
// WorkerInbound
// -----------------------------------------------------------------------

export const api: WorkerInbound = {
  async initData(
    nodes: ForceNodeSeed[],
    links: ForceLinkSeed[],
    dims: { width: number; height: number },
  ): Promise<void> {
    try {
      createCanvas(dims.width, dims.height);
    } catch (err) {
      postError(`Canvas init failed: ${err}`);
      throw err;
    }
    updateDims(dims.width, dims.height);
    createOrUpdate(nodes, links, dims);
    scheduleFrame();
  },

  async applyDiff(diff: ForceDiffPayload): Promise<void> {
    applyDiff(diff);
    scheduleFrame();
  },

  async updateConfig(config: ForceConfig): Promise<void> {
    updateConfig(config);
    scheduleFrame();
  },

  async updateStyle(style: ForceStyle): Promise<void> {
    setStyle(style);
    scheduleFrame();
  },

  async setNodeFixed(
    nodeId: NodeId,
    fixed: boolean,
    x?: number,
    y?: number,
  ): Promise<void> {
    setNodeFixed(nodeId, fixed, x, y);
    scheduleFrame();
  },

  async setNodePosition(
    nodeId: NodeId,
    x: number,
    y: number,
  ): Promise<void> {
    setNodePosition(nodeId, x, y);
    scheduleFrame();
  },

  async reheat(): Promise<void> {
    reheat();
    scheduleFrame();
  },

  async stop(): Promise<void> {
    stopSimulation();
    emit({ type: "status", status: getStatus() });
  },

  async resume(): Promise<void> {
    resumeSimulation();
    emit({ type: "status", status: getStatus() });
  },

  async setViewport(x: number, y: number, scale: number): Promise<void> {
    canvasViewport = { x, y, scale };
    setCanvasViewport(canvasViewport);
    scheduleFrame();
  },

  async setDimensions(width: number, height: number): Promise<void> {
    updateDims(width, height);
    try {
      resizeCanvas({ width, height });
    } catch (err) {
      postError(`Canvas resize failed: ${err}`);
      throw err;
    }
    scheduleFrame();
  },

  async setEventHandler(
    handler: ((event: WorkerEvent) => void) | null,
  ): Promise<void> {
    setEventHandler(handler);
  },

  async proxyEvent(event: ProxiedDomEvent): Promise<void> {
    handleProxiedEvent(event);
    // Interaction may change selection/hover state without restarting
    // the d3 simulation. Always push a frame so the canvas stays in
    // sync with the worker's internal UI state.
    scheduleFrame();
  },
};

// -----------------------------------------------------------------------
// Error reporting
// -----------------------------------------------------------------------

function postError(msg: string): void {
  try {
    self.postMessage({ type: "__ERROR__", message: msg });
  } catch {
    // The message channel may already be gone (worker is shutting down).
  }
}
