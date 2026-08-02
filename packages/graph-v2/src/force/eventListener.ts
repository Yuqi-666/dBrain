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
 * Convert a screen-coord (clientX/Y) point to the simulation coord space
 * (relative to the canvas origin, transformed through the viewport).
 */
export function screenToSimulation(
  screenX: number,
  screenY: number,
  canvasRect: DOMRect,
  viewport: ViewportState,
): { x: number; y: number } {
  return {
    x: (screenX - canvasRect.left - viewport.x) / viewport.scale,
    y: (screenY - canvasRect.top - viewport.y) / viewport.scale,
  };
}

// -----------------------------------------------------------------------
// Event proxy installation
// -----------------------------------------------------------------------

export interface ProxyHandlers {
  /** Send a serialized event to the worker. */
  proxyEvent: (event: ProxiedDomEvent) => Promise<void>;
  /** Notify the main thread that the user requested a context menu. */
  onContextMenu?: (x: number, y: number) => void;
  /** Notify the main thread that the user pressed a key (for mod-state). */
  onKeyDown?: (key: string, code: string, modifiers: Modifiers) => void;
  onKeyUp?: (key: string, code: string, modifiers: Modifiers) => void;
}

export interface InstalledListeners {
  /** Tear down all listeners (StrictMode cleanup). */
  dispose: () => void;
}

/**
 * Install all DOM event listeners on the given canvas element. The
 * `proxy` callbacks are invoked with simulation-coords (already
 * transformed by `screenToSimulation`).
 */
export function installDomEventProxy(
  target: HTMLElement,
  canvasRectRef: { current: DOMRect | null },
  viewportRef: { current: ViewportState },
  handlers: ProxyHandlers,
): InstalledListeners {
  // AbortController makes StrictMode double-mount cleanup trivial:
  // we attach with `{ signal }` so a single `abort()` removes every
  // listener we installed.
  const ac = new AbortController();
  const signal = ac.signal;

  const getSimCoord = (clientX: number, clientY: number) => {
    const rect =
      canvasRectRef.current ?? target.getBoundingClientRect();
    canvasRectRef.current = rect;
    return screenToSimulation(clientX, clientY, rect, viewportRef.current);
  };

  // --- pointerdown -----------------------------------------------------
  target.addEventListener(
    "pointerdown",
    (e: PointerEvent) => {
      const sim = getSimCoord(e.clientX, e.clientY);
      handlers.proxyEvent({
        type: "pointer-down",
        x: sim.x,
        y: sim.y,
        button: e.button,
        modifiers: extractModifiers(e),
      });
    },
    { signal, passive: true },
  );

  // --- pointermove -----------------------------------------------------
  target.addEventListener(
    "pointermove",
    (e: PointerEvent) => {
      const sim = getSimCoord(e.clientX, e.clientY);
      handlers.proxyEvent({
        type: "pointer-move",
        x: sim.x,
        y: sim.y,
        buttons: e.buttons,
        modifiers: extractModifiers(e),
      });
    },
    { signal, passive: true },
  );

  // --- pointerup -------------------------------------------------------
  target.addEventListener(
    "pointerup",
    (e: PointerEvent) => {
      const sim = getSimCoord(e.clientX, e.clientY);
      handlers.proxyEvent({
        type: "pointer-up",
        x: sim.x,
        y: sim.y,
        button: e.button,
        modifiers: extractModifiers(e),
      });
    },
    { signal, passive: true },
  );

  // --- wheel (Ctrl+wheel → zoom, plain wheel → pan) --------------------
  target.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      // We need to preventDefault for zoom (Ctrl+wheel) and for any wheel
      // we want to consume — for pan, the default is fine, but the main
      // thread handles it via viewport state.
      e.preventDefault();
      handlers.proxyEvent({
        type: "wheel",
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        modifiers: extractModifiers(e),
      });
    },
    { signal, passive: false },
  );

  // --- contextmenu -----------------------------------------------------
  target.addEventListener(
    "contextmenu",
    (e: MouseEvent) => {
      // Always preventDefault — the main thread shows its own menu.
      e.preventDefault();
      const sim = getSimCoord(e.clientX, e.clientY);
      handlers.proxyEvent({
        type: "context-menu",
        x: sim.x,
        y: sim.y,
        modifiers: extractModifiers(e),
      });
      handlers.onContextMenu?.(e.clientX, e.clientY);
    },
    { signal },
  );

  // --- keydown / keyup ------------------------------------------------
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
    dispose: () => ac.abort(),
  };
}
