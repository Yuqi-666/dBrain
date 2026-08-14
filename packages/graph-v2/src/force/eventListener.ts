/**
 * Main-thread DOM event capture → `ProxiedDomEvent` → Comlink RPC.
 *
 * The d3-force worker has no DOM access, so all user gestures (pointer
 * moves, wheel scrolls, context menus, key presses) must be captured on
 * the main thread, then forwarded via `worker.proxyEvent()`.
 *
 * Modifier-key policy (per force/design.md §4.3, main design §5-§6):
 *
 *   - **Alt**: drag is inhibited on the worker (the main thread is in
 *     "create-edge" mode and shows the assist-edge). The main thread
 *     handles the assist-edge visuals itself.
 *   - **Ctrl**: drag is inhibited, instead a lasso-select flow starts
 *     in the main thread.
 *   - **Shift**: reserved for additive selection in the main thread.
 *
 * The `screenToSimulation` helper also lives here because it depends on
 * the same `ViewportState` that drives pan/zoom.
 *
 * Coordinate space: all viewport values (`x`, `y`, `scale`) are kept in
 * **device-pixel space** (matching the OffscreenCanvas backing store).
 * `screenToSimulation` multiplies CSS-pixel offsets by `devicePixelRatio`
 * so that event coords match the renderer's device-pixel transform.
 */

import type { ProxiedDomEvent, ViewportState } from "./types";
import type { Modifiers } from "../types";

// -----------------------------------------------------------------------
// Modifier extraction
// -----------------------------------------------------------------------

export function extractModifiers(
  e: MouseEvent | WheelEvent | KeyboardEvent | PointerEvent,
): Modifiers {
  return {
    ctrl: e.ctrlKey,
    alt: e.altKey,
    shift: e.shiftKey,
    meta: e.metaKey,
  };
}

// -----------------------------------------------------------------------
// Screen-to-simulation conversion
// -----------------------------------------------------------------------

/**
 * Convert a screen-coord (clientX/Y) point to simulation coord space.
 *
 * The worker's OffscreenCanvas + d3-force layout operate in **device-pixel**
 * space (canvas backing store = rect.width × devicePixelRatio). This
 * function multiplies the CSS-pixel offset by `dpr` so the result is
 * directly comparable with `node.x` / `node.y` in the worker.
 */
export function screenToSimulation(
  screenX: number,
  screenY: number,
  canvasRect: DOMRect,
  viewport: ViewportState,
  dpr: number,
): { x: number; y: number } {
  return {
    x: ((screenX - canvasRect.left) * dpr - viewport.x) / viewport.scale,
    y: ((screenY - canvasRect.top) * dpr - viewport.y) / viewport.scale,
  };
}

// -----------------------------------------------------------------------
// Event proxy installation
// -----------------------------------------------------------------------

export interface ProxyHandlers {
  /** Send a serialized event to the worker. */
  proxyEvent: (event: ProxiedDomEvent) => Promise<void>;
  /** Notify the main thread that the user pressed a key (for mod-state). */
  onKeyDown?: (key: string, code: string, modifiers: Modifiers) => void;
  onKeyUp?: (key: string, code: string, modifiers: Modifiers) => void;
  /** Notify the main thread that the canvas viewport changed (pan or zoom). */
  onViewportChange?: (x: number, y: number, scale: number) => void;
}

export interface InstalledListeners {
  /** Tear down all listeners (StrictMode cleanup). */
  dispose: () => void;
  /** Cancel an in-progress drag-to-pan (call when worker reports a node hit). */
  cancelPan: () => void;
}

/**
 * Install all DOM event listeners on the given element. Returns a
 * `dispose` function and a `cancelPan` function for external cancellation.
 *
 * @param dpr — `devicePixelRatio` from `globalThis.devicePixelRatio`.
 *        Must match the ratio used for canvas backing-store sizing.
 */
export function installDomEventProxy(
  target: HTMLElement,
  canvasRectRef: { current: DOMRect | null },
  viewportRef: { current: ViewportState },
  handlers: ProxyHandlers,
  dpr: number,
): InstalledListeners {
  // AbortController makes StrictMode double-mount cleanup trivial:
  // we attach with `{ signal }` so a single `abort()` removes every
  // listener we installed.
  const ac = new AbortController();
  const signal = ac.signal;

  const getSimCoord = (clientX: number, clientY: number) => {
    // Use the cached rect from ResizeObserver when available to avoid
    // forced layout on every pointermove. Falls back to live
    // getBoundingClientRect() when the cache is cold (first event).
    const rect = canvasRectRef.current ?? target.getBoundingClientRect();
    if (!canvasRectRef.current) canvasRectRef.current = rect;
    return screenToSimulation(clientX, clientY, rect, viewportRef.current, dpr);
  };

  // ---- Pointer-move throttle: at most one proxyEvent per rAF ---------
  let pendingPointerMove: ProxiedDomEvent | null = null;
  let pointerMoveRafId: number | null = null;

  // ---- Drag-to-pan state machine -------------------------------------
  // Pan does NOT start on pointerdown. Instead we enter "pending" and
  // only start actual panning on pointermove when:
  //   1. The pointer has moved more than a 3-device-pixel threshold
  //   2. cancelPan() has not been called (worker confirmed a node hit)
  //
  // This deferral avoids a race: without it, the first few pointermove
  // events trigger viewport panning BEFORE the async worker response
  // reaches the main thread, breaking node drag (the viewport jumps).
  let isPanning = false;
  let panPending = false;
  let panCancelled = false;
  /** Screen (CSS-pixel) position where pointerdown started. */
  let panStartX = 0;
  let panStartY = 0;
  /** Viewport at pointerdown moment — used as anchor for accumulated delta. */
  let panOriginViewportX = 0;
  let panOriginViewportY = 0;

  function cancelPan(): void {
    panCancelled = true;
    isPanning = false;
  }

  // ---- pointerdown ----------------------------------------------------
  target.addEventListener(
    "pointerdown",
    (e: PointerEvent) => {
      // Right-click is handled by the contextmenu listener below.
      if (e.button !== 0) return;

      // Refresh the cached bounding rect on every interaction start
      // to cover scroll / reflow edge cases between ResizeObserver ticks.
      canvasRectRef.current = target.getBoundingClientRect();

      const sim = getSimCoord(e.clientX, e.clientY);
      const mods = extractModifiers(e);

      // Alt/Ctrl drags are reserved for create-edge / lasso — the
      // worker also inhibits node drag for these, so we skip pan too.
      if (!mods.alt && !mods.ctrl) {
        panPending = true;
        panCancelled = false;
        isPanning = false;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panOriginViewportX = viewportRef.current.x;
        panOriginViewportY = viewportRef.current.y;
      }

      handlers.proxyEvent({
        type: "pointer-down",
        x: sim.x,
        y: sim.y,
        button: e.button,
        clientX: e.clientX,
        clientY: e.clientY,
        modifiers: mods,
      }).catch(() => {});
    },
    { signal, passive: false },
  );

  // ---- pointermove ----------------------------------------------------
  target.addEventListener(
    "pointermove",
    (e: PointerEvent) => {
      const sim = getSimCoord(e.clientX, e.clientY);

      // Deferred pan start: wait until the pointer has moved enough
      // AND the worker hasn't cancelled (node hit detected).
      if (panPending && !panCancelled && !isPanning) {
        const dx = Math.abs((e.clientX - panStartX) * dpr);
        const dy = Math.abs((e.clientY - panStartY) * dpr);
        if (dx > 6 || dy > 6) {
          isPanning = true;
        }
      }

      // Active pan: update viewport anchored to the pointerdown origin.
      // (panStart - currentClient) * dpr = device-pixel delta from the
      // pointerdown position — this gives a 1:1 drag-to-pan feel.
      if (isPanning) {
        viewportRef.current.x =
          panOriginViewportX + (e.clientX - panStartX) * dpr;
        viewportRef.current.y =
          panOriginViewportY + (e.clientY - panStartY) * dpr;
        handlers.onViewportChange?.(
          viewportRef.current.x,
          viewportRef.current.y,
          viewportRef.current.scale,
        );
      }

      // proxyEvent: during drag/pan (buttons held), send immediately
      // for minimal latency. Hover-only moves (no buttons) are throttled
      // to rAF to avoid redundant hit-tests.
      const isDragging = (e.buttons & 1) !== 0;
      if (isDragging) {
        handlers.proxyEvent({
          type: "pointer-move",
          x: sim.x,
          y: sim.y,
          buttons: e.buttons,
          clientX: e.clientX,
          clientY: e.clientY,
          modifiers: extractModifiers(e),
        }).catch(() => {});
      } else {
        pendingPointerMove = {
          type: "pointer-move",
          x: sim.x,
          y: sim.y,
          buttons: e.buttons,
          clientX: e.clientX,
          clientY: e.clientY,
          modifiers: extractModifiers(e),
        };
        if (pointerMoveRafId === null) {
          pointerMoveRafId = requestAnimationFrame(() => {
            pointerMoveRafId = null;
            if (pendingPointerMove) {
              handlers.proxyEvent(pendingPointerMove).catch(() => {});
              pendingPointerMove = null;
            }
          });
        }
      }
    },
    { signal, passive: false },
  );

  // ---- pointerup ------------------------------------------------------
  target.addEventListener(
    "pointerup",
    (e: PointerEvent) => {
      isPanning = false;
      panPending = false;
      panCancelled = false;

      const sim = getSimCoord(e.clientX, e.clientY);
      handlers.proxyEvent({
        type: "pointer-up",
        x: sim.x,
        y: sim.y,
        button: e.button,
        clientX: e.clientX,
        clientY: e.clientY,
        modifiers: extractModifiers(e),
      }).catch(() => {});
    },
    { signal, passive: false },
  );

  // ---- wheel ----------------------------------------------------------
  // Two branches:
  //   ctrlKey → zoom around cursor (trackpad pinch, Ctrl+scroll wheel)
  //   else    → pan by delta (two-finger swipe, plain scroll wheel)
  target.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      e.preventDefault();

      const rect = target.getBoundingClientRect();

      if (e.ctrlKey) {
        // --- Zoom around cursor (trackpad pinch / Ctrl+wheel) ----------
        const mouseX = (e.clientX - rect.left) * dpr;
        const mouseY = (e.clientY - rect.top) * dpr;
        const zoom = 1 + (-e.deltaY) / 100;
        const newScale = Math.max(
          0.1,
          Math.min(5, viewportRef.current.scale * zoom),
        );
        viewportRef.current.x =
          mouseX - zoom * (mouseX - viewportRef.current.x);
        viewportRef.current.y =
          mouseY - zoom * (mouseY - viewportRef.current.y);
        viewportRef.current.scale = newScale;
      } else {
        // --- Pan by scroll delta (two-finger swipe / plain wheel) ------
        const panScale = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? 20 : 1;
        viewportRef.current.x -= e.deltaX * panScale * dpr;
        viewportRef.current.y -= e.deltaY * panScale * dpr;
        // Clamp pan so the viewport doesn't drift to astronomically
        // large values (accumulated from many small wheel deltas).
        viewportRef.current.x = Math.max(
          -100000,
          Math.min(100000, viewportRef.current.x),
        );
        viewportRef.current.y = Math.max(
          -100000,
          Math.min(100000, viewportRef.current.y),
        );
      }

      if (handlers.onViewportChange) {
        handlers.onViewportChange(
          viewportRef.current.x,
          viewportRef.current.y,
          viewportRef.current.scale,
        );
      }
    },
    { signal, passive: false },
  );

  // ---- contextmenu ----------------------------------------------------
  target.addEventListener(
    "contextmenu",
    (e: MouseEvent) => {
      e.preventDefault();
      const sim = getSimCoord(e.clientX, e.clientY);
      handlers.proxyEvent({
        type: "context-menu",
        x: sim.x,
        y: sim.y,
        clientX: e.clientX,
        clientY: e.clientY,
        modifiers: extractModifiers(e),
      }).catch(() => {});
    },
    { signal },
  );

  // ---- keydown / keyup ------------------------------------------------
  // We attach to `window` so the canvas doesn't have to be focused.
  window.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      handlers.onKeyDown?.(e.key, e.code, extractModifiers(e));
    },
    { signal, passive: true },
  );
  window.addEventListener(
    "keyup",
    (e: KeyboardEvent) => {
      handlers.onKeyUp?.(e.key, e.code, extractModifiers(e));
    },
    { signal, passive: true },
  );

  return {
    dispose: () => {
      ac.abort();
      if (pointerMoveRafId !== null) cancelAnimationFrame(pointerMoveRafId);
    },
    cancelPan,
  };
}
