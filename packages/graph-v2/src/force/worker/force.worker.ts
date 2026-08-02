/**
 * d3-force WebWorker entry point.
 *
 * Loaded via `new Worker(new URL('./force.worker.ts', import.meta.url), { type: 'module' })`
 * from the main thread (`ForceGraph.tsx`). Responsibilities:
 *
 *   1. Expose the `WorkerInbound` API to the main thread via Comlink.
 *   2. Listen for raw `postMessage` events carrying `ImageBitmap` frames
 *      (push them to the OffscreenCanvas owner).
 *   3. Handle worker-level lifecycle (init canvas from a one-time
 *      Comlink.transfer call).
 *
 * The OffscreenCanvas itself is sent in from the main thread *after*
 * `Comlink.expose`, via a separate `postMessage` (see `setOffscreenCanvas`
 * in `api.ts`'s extension). The canvas is **not** part of the Comlink
 * surface because Comlink cannot transfer it by default (issue #512).
 *
 * Cross-document contract: worker/design.md §1, §2.
 */

import * as Comlink from "comlink";
import { api } from "./api";
import { initCanvas } from "./canvas";

// -----------------------------------------------------------------------
// 1. Expose the Comlink API surface.
// -----------------------------------------------------------------------

Comlink.expose(api);

// -----------------------------------------------------------------------
// 2. Raw message channel — handles two distinct message shapes:
//    (a) { type: "__SET_CANVAS__", canvas: OffscreenCanvas } — from main
//        thread, transfers the OffscreenCanvas to us.
//    (b) { type: "__PING__" } — health check from the main thread.
// -----------------------------------------------------------------------

const ctx = self as unknown as Worker;

ctx.addEventListener("message", (ev: MessageEvent) => {
  const data = ev.data;
  if (!data || typeof data !== "object") return;

  switch (data.type) {
    case "__SET_CANVAS__": {
      const canvas = data.canvas as OffscreenCanvas;
      const width = (data.width as number) ?? canvas.width;
      const height = (data.height as number) ?? canvas.height;
      try {
        initCanvas(canvas, { width, height });
      } catch (err) {
        console.error("[force.worker] initCanvas failed:", err);
      }
      break;
    }
    case "__PING__": {
      ctx.postMessage({ type: "__PONG__" });
      break;
    }
    default:
      // Comlink handles everything else internally.
      break;
  }
});

// -----------------------------------------------------------------------
// 3. Notify readiness so the main thread knows the worker booted.
// -----------------------------------------------------------------------

ctx.postMessage({ type: "__READY__" });
