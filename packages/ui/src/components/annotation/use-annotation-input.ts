"use client";

/**
 * The ink layer's **pointer state machine** — design §4 in one file.
 *
 * Splitting it out of `annotation-canvas.tsx` follows the plan's §5.1 W2-c
 * boundary: everything in here is input arbitration (which pointer may draw,
 * when a gesture starts and, above all, when it *ends*), while the canvas only
 * owns pixels. The two exchange exactly three things through
 * {@link GestureHandle}: the points sampled so far, the ids erased by the pass
 * in flight, and a "something changed, draw a frame" callback.
 *
 * ## The one rule that must not be broken
 *
 * **An input callback pushes a sample and asks for a frame. It never
 * `setState`s, never serialises and never writes a store** (design §3.2, §4.4).
 * That is what keeps a stroke within one frame of the pen, and it is the only
 * rule a reviewer can check by reading this file — so every mutable piece of an
 * in-flight gesture lives in a ref (`GestureHandle.points`, `activePointers`,
 * `gesture`) and none of it is React state.
 *
 * ## Why the end-of-gesture list has four entries
 *
 * A stroke that is never closed keeps drawing forever (design §0.3-8). `pointerup`
 * is not enough: a browser gesture, a focus trap, a tab switch or dragging the
 * pointer out of the window all end a stroke **without** one. So the machine
 * closes on `pointerup`, `pointercancel`, `lostpointercapture`, and — attached
 * for the component's lifetime with cleanup, because they are not pointer events
 * on the canvas — `visibilitychange → hidden` and `window blur`. All of them are
 * idempotent: a stroke is committed from the points already sampled, never left
 * "in progress".
 *
 * ## Pen vs. touch
 *
 * `pointerType === "pen"` always draws. `touch` draws **only** when the host
 * turns `touchDraws` on, and never while a pen pointer is down — that is the
 * application-level half of palm rejection (design §0.3-5: the specification
 * lets a device ignore touch while a pen is in use, so an app must assume it
 * does not). `mouse` draws, with velocity-simulated pressure.
 *
 * ## Not in P0
 *
 * No pinch arbitration on an image host: `touch` simply does not produce ink
 * (design §4.1), and the image host has no zoom for P0 to take over. There is
 * also no hover preview, no `pointerrawupdate` and no `getPredictedEvents()`
 * (design §0.3-4) — the next step there is measured latency, not guesswork.
 */
import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { Annotation, AnnotationPoint } from "@workspace/interfaces";

import { hitTestItem, simplifyPoints, withBBox } from "./geometry";
import { shouldSimulatePressure } from "./draw";
import type { AnnotationColorKey, AnnotationTool } from "./types";

/**
 * The mutable state of one in-flight gesture, shared with the renderer.
 *
 * Everything here is written from a pointer callback, so it must stay out of
 * React state: a re-render per sample is exactly the cost the "push + rAF" rule
 * exists to avoid. The renderer reads it during its own frame, which is the only
 * moment a coherent triples is needed.
 */
export interface GestureHandle {
  /** Already normalized and clamped by the canvas's `onPoint`. */
  readonly points: AnnotationPoint[];
  /**
   * Ids the eraser hit during **this** pass; the renderer skips them.
   *
   * Written by the eraser branch below and cleared by the **renderer** once the
   * `items` prop reflects the removal — never by the state machine at release,
   * or the marks would flash back for the frames between the emitted operation
   * and the parent landing it.
   */
  readonly erasedIds: Set<string>;
  /**
   * Bumped whenever a sample lands or the eraser's set grows.
   *
   * A ref cannot trigger a render, so this is the renderer's only way to learn
   * that the un-committed state changed: it is a plain number in a dependency
   * array, which lets a discrete input event (the eraser touching a mark) repaint
   * the cached layer without a per-frame replay.
   */
  tick: number;
  /** `true` from `pointerdown` until the gesture is committed. */
  active: boolean;
}

/** The three knobs the canvas owns and the state machine only reads. */
export interface AnnotationInputOptions {
  /** The live gesture, allocated once by the canvas via `useRef`. */
  gesture: RefObject<GestureHandle>;
  tool: AnnotationTool;
  /** Nib width in normalized units — also the eraser's reach (`size × 2`). */
  size: number;
  color: AnnotationColorKey;
  /** Design §0.3-5's fallback: when on, a single finger draws like a pen. */
  touchDraws: boolean;
  /** `hidden` means "show nothing, take nothing" — pointerdown is ignored. */
  hidden?: boolean;
  /** Live items, for the eraser's hit test. Owned by the canvas. */
  itemsRef: RefObject<Annotation[]>;
  /**
   * Viewport CSS px → normalized storage point (`normalizePoint(rect, …)`),
   * carrying the pointer's pressure through untouched.
   */
  onPoint: (
    clientX: number,
    clientY: number,
    pressure: number,
  ) => AnnotationPoint;
  /** One finished gesture, reported once (design §1.2 boundary 2). */
  onOperation: (operation:
    | { kind: "add"; item: Annotation }
    | { kind: "remove"; items: Annotation[] }) => void;
  /** A gesture started / ended — the layer uses it for the cursor and ⌘Z focus. */
  onActiveChange?: (active: boolean) => void;
  /** Ask the canvas for a frame. Called from input callbacks; never mutates. */
  requestFrame: () => void;
  /**
   * Called after every mutation of `gesture` **before** the frame request, so a
   * renderer can react to a discrete input event (the eraser's live removal)
   * without polling. Must not `setState` — it runs inside a pointer callback.
   */
  onGestureChange?: () => void;
}

/**
 * The DOM handlers the canvas spreads onto its `<canvas>` element.
 *
 * Declared structurally so the hook does not depend on React's synthetic-event
 * generics: the canvas passes `onPointerDown={input.handlers.onPointerDown}`
 * and nothing here needs to know it came from JSX.
 */
export interface AnnotationInputHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onLostPointerCapture: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
}

export interface AnnotationInput {
  handlers: AnnotationInputHandlers;
}

/** No Web API dependency: `crypto.randomUUID` needs a secure context (§0.3-3). */
function randomId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  let hex = "";
  for (let i = 0; i < 32; i += 1) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * `getCoalescedEvents()` is **not Baseline** and needs a secure context
 * (design §0.3-3) — feature-detect it and fall back to the single delivered
 * point, which is the only correct degradation.
 */
function coalescedPoints(event: PointerEvent): PointerEvent[] {
  if (typeof event.getCoalescedEvents === "function") {
    const coalesced = event.getCoalescedEvents();
    if (coalesced.length > 0) return coalesced;
  }
  return [event];
}

/**
 * Wire the pointer state machine to a canvas.
 *
 * The returned handlers are fresh on every render, but they reach the canvas
 * through the canvas's own event attributes — there are no `addEventListener`
 * calls for pointer events, so nothing needs to be re-attached and no listener
 * can hold a stale closure. Only the two **global** end-of-stroke signals
 * (`visibilitychange`, `blur`) are effects, and their cleanup is a plain
 * remove.
 */
export function useAnnotationInput(options: AnnotationInputOptions): AnnotationInput {
  // `tool` / `size` / `color` / `touchDraws` / `hidden` / `itemsRef` are read
  // through `latest` rather than bound here on purpose: a handler that lives for
  // one render would capture the tool selected when it was created, and the pen
  // would keep writing with yesterday's nib after the toolbar changed.
  const { gesture, onActiveChange, requestFrame, onGestureChange } = options;

  /**
   * Props read from *inside* a callback must come from the render that is
   * current when the callback runs. A live object ref rather than a dependency
   * array: the pointer handlers are re-created every render anyway, but the
   * effect-attached ones are not, and this is what keeps them honest.
   */
  const latest = useRef(options);
  latest.current = options;

  /** Which pointer owns the gesture, and whether a pen pointer is down. */
  const activePointers = useRef<Map<number, string>>(new Map());

  const penIsDown = useCallback((): boolean => {
    for (const type of activePointers.current.values()) {
      if (type === "pen") return true;
    }
    return false;
  }, []);

  const isDrawable = useCallback((pointerType: string): boolean => {
    if (pointerType === "pen") return true;
    if (pointerType === "mouse") return true;
    return pointerType === "touch" && latest.current.touchDraws;
  }, []);

  /**
   * Close the gesture in flight, idempotently.
   *
   * Called by all five end paths; `onActiveChange(false)` only fires when
   * something was actually open, so a `pointerup` after a `pointercancel` (or
   * vice versa) cannot report two ends for one stroke.
   */
  const endGesture = useCallback(() => {
    const current = gesture.current;
    if (!current || !current.active) return;

    const { tool: activeTool, size: activeSize, color: activeColor, onOperation: emit } =
      latest.current;

    current.active = false;
    onActiveChange?.(false);

    if (activeTool === "eraser") {
      // One eraser pass is **one** operation carrying every item it deleted, so a
      // single ⌘Z restores the whole pass (design §0.3-7). Already-erased items
      // cannot be in here twice: the set is keyed by id.
      const removed = (latest.current.itemsRef.current ?? []).filter((item) =>
        current.erasedIds.has(item.id),
      );
      // The skip set is deliberately **not** cleared here. The parent lands the
      // removal a tick later, and drawing a frame between this call and that
      // one would replay the deleted marks straight back onto the screen (the
      // flash design §3.3's "立刻从画面消失" rules out). Ownership of the set
      // therefore passes to the renderer, which clears it when the `items` prop
      // actually changes — the layer having landed the deletion.
      current.points.length = 0;
      if (removed.length > 0) emit({ kind: "remove", items: removed });
      requestFrame();
      return;
    }

    const points = current.points;
    if (points.length > 0) {
      // Everything after the id is derived and settled here, never at sample
      // time: the id is stable for the item's whole life, `simulatePressure` is
      // decided once on release (design §4.5), `points` are thinned only on the
      // way to storage (design §3.2) and `bbox` is derived, not hand-written.
      const items = latest.current.itemsRef.current ?? [];
      let z = 0;
      for (const item of items) {
        if (item.z > z) z = item.z;
      }
      const item: Annotation = withBBox({
        id: randomId(),
        kind: "stroke",
        z: z + 1,
        bbox: [0, 0, 0, 0],
        color: activeColor,
        opacity: 1,
        createdAt: Date.now(),
        points: simplifyPoints(points),
        size: activeSize,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: shouldSimulatePressure(points),
      });
      current.points.length = 0;
      emit({ kind: "add", item });
    }
    requestFrame();
  }, [gesture, onActiveChange, requestFrame]);

  /**
   * The two end signals that are not pointer events on the canvas.
   *
   * Both are lifecycle-wide rather than gesture-wide, so they are attached once
   * for the component's life and removed on unmount — the same reason
   * `packages/graph/src/force/eventListener.ts` keeps a single teardown handle
   * for its DOM listeners.
   */
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") endGesture();
    };
    const onBlur = () => endGesture();
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("blur", onBlur);
    };
    // Deliberately mounted once, not re-attached when `endGesture` changes
    // identity: `endGesture` reads every prop through `latest`, so re-attaching
    // would only churn the listeners. The effect owns no state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (latest.current.hidden) return;
      const current = gesture.current;
      if (!current) return;
      // One gesture at a time: a second pointer landing mid-stroke is a palm,
      // another finger or a second stylus tip — never a second stroke.
      if (current.active) return;
      if (event.button !== 0) return;

      const pointerType = event.pointerType;
      // Palm rejection: while the pen is down every touch is dropped.
      if (pointerType === "touch" && (penIsDown() || !latest.current.touchDraws)) return;
      if (!isDrawable(pointerType)) return;

      activePointers.current.set(event.pointerId, pointerType);
      current.active = true;

      // Capture as early as possible so a sequence that leaves the canvas still
      // arrives here. Failure is non-fatal (some synthetic pointers cannot be
      // captured) — the four other end paths already cover it.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignored on purpose: capture is an optimisation, not a requirement.
      }

      // The very first point is recorded **from pointerdown**, not from the first
      // `pointermove`: a quick tap delivers no move at all and would otherwise
      // lose the whole stroke (design §0.3-3).
      current.points.push(
        latest.current.onPoint(event.clientX, event.clientY, event.pressure),
      );
      current.tick += 1;
      onActiveChange?.(true);
      onGestureChange?.();
      requestFrame();
    },
    [
      gesture,
      isDrawable,
      onActiveChange,
      onGestureChange,
      penIsDown,
      requestFrame,
    ],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const current = gesture.current;
      if (!current || !current.active) return;

      // `pointerType` is "" when the browser cannot tell — treat that as neither.
      if (event.pointerType === "touch" && penIsDown()) return;

      const native = event.nativeEvent;
      const samples = coalescedPoints(native);
      const { onPoint: toPoint, tool: activeTool, size: activeSize } = latest.current;

      let last: AnnotationPoint | null = null;
      for (const sample of samples) {
        last = toPoint(sample.clientX, sample.clientY, sample.pressure);
        current.points.push(last);
      }
      current.tick += 1;

      if (activeTool === "eraser" && last) {
        // Whole-stroke erase, reach = nib × 2 (design §3.3). The reach is
        // normalized like the nib, so it stays a constant fraction of the image.
        // Radius 0 would make the bbox prefilter contain every point, so an
        // unmeasurable image (no size yet) erases nothing instead.
        const radius = activeSize * 2;
        if (radius > 0) {
          for (const item of latest.current.itemsRef.current ?? []) {
            if (current.erasedIds.has(item.id)) continue;
            if (hitTestItem(item, last, radius)) {
              current.erasedIds.add(item.id);
              // The pass is not over yet, but this mark must already be gone
              // from the screen (design §3.3): bumping the tick makes the
              // cached layer replay without it.
              current.tick += 1;
            }
          }
        }
      }

      onGestureChange?.();
      requestFrame();
    },
    [gesture, onGestureChange, penIsDown, requestFrame],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!gesture.current?.active) return;
      endGesture();
      activePointers.current.delete(event.pointerId);
    },
    [endGesture, gesture],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      // The browser took the sequence over (scroll, system gesture, a Radix
      // focus trap). The stroke still has to be committed from what was sampled
      // — dropping it here is what "停在半截" looks like (design §0.3-8).
      endGesture();
      activePointers.current.delete(event.pointerId);
    },
    [endGesture],
  );

  const onLostPointerCapture = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      endGesture();
      activePointers.current.delete(event.pointerId);
    },
    [endGesture],
  );

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture,
    },
  };
}
