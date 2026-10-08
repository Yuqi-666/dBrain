"use client";

/**
 * The ink layer — L1 in design §1.2 and the layer's **only pointer target**.
 *
 * ## What this file owns
 *
 * Pixels, and nothing else. `use-annotation-input.ts` decides *when* a stroke
 * starts and ends; this file decides what is on screen:
 *
 * - **two canvases, one visible.** `committed` is an offscreen
 *   (`document.createElement("canvas")`) replay of `items`; `live` is the
 *   element on screen. Every frame is `clearRect` → `drawImage(committed)` →
 *   the stroke in flight (design §3.2). Replaying finished marks every frame is
 *   pure waste, and the offscreen cache is what removes it.
 * - **the coordinate chain** (design §3.4). `box` (container-relative) places
 *   the element; `rect` (viewport) is what `draw.ts` uses to turn normalized
 *   storage into pixels. **The canvas is exactly as large as the base
 *   rectangle**, so the context origin *is* the rectangle's top-left and there
 *   is no letterbox offset to apply inside it: nothing here ever reads
 *   `rect.left/top`, and the committed cache is blitted 1:1 at `(0, 0)`. The
 *   viewport origin lives in `style.left/top`, which is why it must not be
 *   subtracted again.
 * - **dpr** (design §0.3-6): the backing store is `box.size × dpr` while the CSS
 *   box stays `box.size`, and *both* canvases get the same
 *   `Math.max(1, devicePixelRatio ?? 1)` — the repository's rule from
 *   `packages/graph/src/force/ForceGraph.tsx`. A different dpr on the offscreen
 *   cache would composite at the wrong scale. Moving the window to a screen with
 *   another density (or zooming the browser) changes the ratio *without* a
 *   re-render, so a watcher below turns it into state and rebuilds both stores.
 * - **colour tokens** (design §2.3): an item stores `"red"`, never an
 *   `oklch(…)`. The resolution is a DOM question, so it happens here, once per
 *   replay, by parking `var(--annotation-N)` on a hidden span and reading the
 *   computed colour back.
 * - **`hidden`** (design §1.2 / §2.1): "隐藏批注" is a *visibility* concern — the
 *   data is not touched by a single byte. It stops the ink being **painted**
 *   (the cache is emptied and the stroke in flight is skipped) but leaves the
 *   element hit-testable: since the canvas is also the host's gesture surface,
 *   making it `pointer-events: none` would take pan/zoom away from "let me look
 *   at the original".
 *
 * ## The one rule this file must not break
 *
 * Nothing that a pointer callback can reach may call `setState`, serialise or
 * touch a store (design §3.2/§4.4). The points of the stroke in flight and the
 * ids the eraser just removed live in {@link GestureHandle} — a ref — and the
 * pointer handlers only push and ask for a frame.
 *
 * ## Not in P0
 *
 * One canvas for the whole image: no pdf pages, and no dirty rectangles (design
 * §3.2 explicitly defers them until a measurement says the full-frame blit is too
 * slow).
 *
 * The **viewport** is not this file's either: pan / pinch / 恢复位置大小 (单指双击)
 * are recognised by `use-annotation-input.ts` but *owned* by the host, which hands
 * in a `PanZoomController`. This canvas therefore never reads a transform — it
 * only reports gestures, exactly as it reports strokes. Its own geometry stays
 * whatever `box`/`rect` the layer measured, which is the rectangle the host
 * derived from that same transform; that is the whole overlap guarantee.
 *
 * There is deliberately **no `onDoubleClick`** here any more. 恢复位置大小 is a
 * single-finger double *tap* (the mouse half is the host's
 * `pan-zoom/reset-button.tsx`), because a mouse click is ink: a `dblclick`
 * listener would have to suppress the first click's dot, and "click once, get a
 * dot" is worth more than a desktop gesture the button already covers.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Annotation, AnnotationPoint } from "@workspace/interfaces";
import { cn } from "@workspace/ui/lib/utils";

import { drawAnnotation, drawAnnotations } from "./draw";
import { normalizePoint } from "./geometry";
import { ANNOTATION_COLORS, type AnnotationCanvasProps } from "./types";
import { useAnnotationInput, type GestureHandle } from "./use-annotation-input";

/** `var(--annotation-N)` → the key that maps onto it, built once from the tokens. */
const KEY_TO_CSS_VAR = new Map<string, string>(
  ANNOTATION_COLORS.map((spec) => [spec.key, spec.cssVar]),
);

/** `Math.max(1, devicePixelRatio ?? 1)` — the repository's dpr rule (§0.3-6). */
function readDpr(): number {
  return Math.max(1, globalThis.devicePixelRatio ?? 1);
}

/**
 * `pointerType === "pen"` reports real pressure; a mouse reports a constant
 * `0.5` and a pressure-less touchscreen `0` or `1` (design §4.5). All of them
 * are sampled verbatim — `shouldSimulatePressure` decides at release whether the
 * numbers meant anything.
 */
function toPressure(value: number): number | undefined {
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return value > 1 ? 1 : value;
}

function hasSize(rect: { width: number; height: number }): boolean {
  return (
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width > 0 &&
    rect.height > 0
  );
}

/**
 * A live 2D context is not guaranteed: a canvas larger than the browser's limit
 * silently yields `null`. Returning `null` keeps every call site honest instead
 * of asserting.
 */
function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  return canvas.getContext("2d");
}

export function AnnotationCanvas({
  box,
  canvas: canvasBox,
  rect,
  items,
  tool,
  size,
  color,
  touchDraws = false,
  hidden = false,
  panZoom,
  onUndo,
  onRedo,
  onOperation,
  onActiveChange,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const committedRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);

  /**
   * The one gesture that can be in flight, allocated once so its identity is
   * stable across renders (the state machine and the renderer both hold it).
   */
  const gestureRef = useRef<GestureHandle>({
    points: [],
    erasedIds: new Set<string>(),
    tick: 0,
    active: false,
    pointerId: -1,
  });
  const gesture = gestureRef.current;

  /** The items the eraser hit-tests against — a prop mirror, written in render. */
  const itemsRef = useRef<Annotation[]>(items);
  itemsRef.current = items;

  /**
   * Values the render callback reads. A frame can be requested from an input
   * callback that outlives the render that created it, so the colours and the
   * nib have to come from a ref rather than from a closure.
   */
  const styleRef = useRef({ tool, size, color });
  styleRef.current = { tool, size, color };

  /** A resolved token colour is worth caching: the token set is fixed. */
  const colorCacheRef = useRef(new Map<string, string>());

  /**
   * `devicePixelRatio` as **state**.
   *
   * Reading it during render (as the rest of the repository does) is not enough
   * here: moving the window to a screen with a different density, or zooming the
   * browser, changes the ratio without changing a single prop — nothing would
   * re-render, so the backing stores would keep their old size and the ink would
   * come out blurry (design §0.3-6). A media query pinned to the current ratio
   * fires exactly when it stops matching, and the state update re-runs the
   * sizing/rebuild effects.
   */
  const [dpr, setDpr] = useState(readDpr);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(`(resolution: ${dpr}dppx)`);
    const onChange = () => setDpr(readDpr());
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [dpr]);

  /**
   * Resolve one stored colour key to a CSS colour that is correct **in the
   * current theme**.
   *
   * The span is parked on the canvas element (which has no children of its own)
   * and removed immediately; every replay re-reads the six tokens because a
   * theme switch changes what `var(--annotation-1)` means, and the cache is
   * dropped in that case.
   */
  const resolveColor = useCallback((key: string): string => {
    const cached = colorCacheRef.current.get(key);
    if (cached) return cached;

    const cssVar = KEY_TO_CSS_VAR.get(key);
    const canvas = canvasRef.current;
    let resolved = cssVar ?? "";
    if (cssVar && canvas && typeof getComputedStyle === "function") {
      const probe = document.createElement("span");
      probe.style.color = `var(${cssVar})`;
      probe.style.display = "none";
      canvas.appendChild(probe);
      const computed = getComputedStyle(probe).color;
      probe.remove();
      if (computed) resolved = computed;
    }
    if (resolved) colorCacheRef.current.set(key, resolved);
    return resolved;
  }, []);

  // ---- The frame ---------------------------------------------------------

  /**
   * One frame: the cached marks, then the mark in flight.
   *
   * Called from the rAF callback and *only* from there, which is what keeps a
   * burst of pointer events down to one paint per frame.
   */
  const renderFrame = useCallback(() => {
    frameRef.current = null;
    const canvas = canvasRef.current;
    const committed = committedRef.current;
    if (!canvas || !committed) return;

    const ctx = context2d(canvas);
    if (!ctx) return;

    const currentDpr = readDpr();
    const inside = gesture;
    const {
      tool: activeTool,
      size: activeSize,
      color: activeColor,
    } = styleRef.current;

    // The canvas element covers the whole layer root (`style.left/top/width/
    // height` below), so `box` is *inside* it: translate to the base rectangle's
    // origin and every coordinate from here on is in the rectangle's own CSS
    // pixel space — the convention `draw.ts` is written against.
    ctx.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);
    ctx.clearRect(0, 0, canvasBox.width, canvasBox.height);

    if (hasSize(rect) && hasSize(box) && committed.width > 0) {
      // 1:1: the cache has the canvas's dimensions too, so there is nothing to
      // letterbox — just the same translation the ink below uses.
      ctx.drawImage(committed, 0, 0, canvasBox.width, canvasBox.height);
    }

    if (
      !hidden &&
      activeTool === "pen" &&
      inside.points.length > 0 &&
      hasSize(rect)
    ) {
      // The in-flight stroke goes through the same renderer as the stored ones —
      // the normalized input becomes a display-space item here and nowhere else,
      // so a stroke cannot change shape the moment it is committed.
      const live: Annotation = {
        id: "",
        kind: "stroke",
        z: 0,
        bbox: [0, 0, 0, 0],
        color: activeColor,
        opacity: 1,
        createdAt: 0,
        points: inside.points,
        size: activeSize,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: false,
      };
      ctx.save();
      ctx.translate(box.left, box.top);
      drawAnnotation(ctx, live, rect, resolveColor);
      ctx.restore();
    }
  }, [
    box,
    canvasBox.height,
    canvasBox.width,
    gesture,
    hidden,
    rect,
    resolveColor,
  ]);

  /** Request a frame; a request already outstanding is not queued twice. */
  const requestFrame = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(renderFrame);
  }, [renderFrame]);

  // ---- Sizing, dpr and the committed cache -------------------------------

  const outsideWidth = Math.max(1, Math.round(canvasBox.width * dpr));
  const outsideHeight = Math.max(1, Math.round(canvasBox.height * dpr));

  /**
   * Size both backing stores and place the element.
   *
   * The element covers the whole layer root (`left: 0 / top: 0`), **not** just the
   * base rectangle: the extra area is where a finger lands when it pinches beside
   * a letterboxed photo, and it costs nothing because the ink is clipped by the
   * same box the canvas is. `canvasBox` is layout pixels, `outsideWidth/Height` the
   * device-pixel store — setting only the CSS box is the classic blurry-ink bug
   * (design §0.3-6). Re-running on a dpr change is what rebuilds the cache.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.style.left = "0px";
    canvas.style.top = "0px";
    canvas.style.width = `${canvasBox.width}px`;
    canvas.style.height = `${canvasBox.height}px`;

    if (canvas.width !== outsideWidth) canvas.width = outsideWidth;
    if (canvas.height !== outsideHeight) canvas.height = outsideHeight;

    const ctx = context2d(canvas);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The offscreen cache is **not** attached to the DOM; it only has to exist so
    // `drawImage` has a source. A resize or a dpr change invalidates it, so it is
    // rebuilt here and replayed by the effect below.
    const committed = document.createElement("canvas");
    committed.width = outsideWidth;
    committed.height = outsideHeight;
    committedRef.current = committed;

    requestFrame();
  }, [
    canvasBox.height,
    canvasBox.width,
    dpr,
    outsideWidth,
    outsideHeight,
    requestFrame,
  ]);

  /**
   * Replay the committed marks into the offscreen cache.
   *
   * Two callers, and they are the two reasons the cache can go stale:
   *
   * 1. the effect below, i.e. a prop changed (the data, the rectangle, the dpr,
   *    the hidden flag);
   * 2. `onGestureChange`, i.e. the eraser just touched a mark. That one is a
   *    *discrete input event*, not a sample, and it must repaint without a render:
   *    a ref cannot re-run an effect, so "the ghost set grew" has to be a direct
   *    call. Replaying once per hit is what the cache is for — replaying per pointer
   *    sample is what it exists to avoid.
   *
   * While `hidden` the cache is left empty, which is what makes hiding cost nothing
   * per frame.
   */
  const replayCommitted = useCallback(() => {
    const committed = committedRef.current;
    if (!committed) return;
    if (!hasSize(rect) || !hasSize(box)) return;

    const ctx = context2d(committed);
    if (!ctx) return;

    // A theme change rewrites the tokens' computed values, so the cache is
    // dropped on every replay: six `getComputedStyle` calls cost far less than
    // the replay itself, and a stale colour is a wrong colour.
    colorCacheRef.current.clear();

    // The *state* ratio, not `readDpr()`: the cache must be written at the same
    // density the sizing effect just gave both stores, and a live read could differ
    // from it for the frame between the screen change and the media query firing.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasBox.width, canvasBox.height);
    if (!hidden) {
      // The translate puts the cache into the base rectangle's own space, which
      // is the convention `draw.ts` is written against (§3.4). Marks the eraser
      // hit are passed along as ghosts: they stay visible at reduced alpha until
      // the layer lands the removal, so the user can see what the pass is about
      // to delete (G5's third report).
      ctx.translate(box.left, box.top);
      drawAnnotations(ctx, items, rect, resolveColor, {
        ghostIds: gesture.erasedIds,
      });
    }
  }, [
    box,
    canvasBox.height,
    canvasBox.width,
    dpr,
    gesture,
    hidden,
    items,
    rect,
    resolveColor,
  ]);

  useEffect(() => {
    replayCommitted();
    requestFrame();
  }, [replayCommitted, requestFrame]);

  /** A new `items` array means the parent has landed the last gesture.
   *
   * This is where the eraser's ghost set is released: it was kept alive at release
   * so the deleted marks could not flash back, and it must go as soon as the
   * deletion is real, because an id that no longer exists in `items` has nothing
   * left to fade.
   */
  const lastItemsRef = useRef(items);
  useEffect(() => {
    if (lastItemsRef.current === items) return;
    lastItemsRef.current = items;
    gesture.erasedIds.clear();
    requestFrame();
  }, [items, gesture, requestFrame]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    },
    [],
  );

  // ---- Input -------------------------------------------------------------

  const onPoint = useCallback(
    (clientX: number, clientY: number, pressure: number): AnnotationPoint => {
      const point = normalizePoint(rect, clientX, clientY);
      const p = toPressure(pressure);
      return p === undefined ? point : { ...point, p };
    },
    [rect],
  );

  /**
   * The base rectangle test a stroke has to pass to *begin* (the canvas is larger
   * than the base — see {@link AnnotationCanvasProps.canvas}).
   */
  const inBounds = useCallback(
    (clientX: number, clientY: number): boolean =>
      clientX >= rect.left &&
      clientX <= rect.left + rect.width &&
      clientY >= rect.top &&
      clientY <= rect.top + rect.height,
    [rect],
  );

  // The options object is rebuilt every render on purpose: the hook mirrors the
  // latest one into a ref, so a callback that outlives its render still reads the
  // current tool, nib, colour and 手指=书写 switch. `onGestureChange` is the eraser's
  // discrete signal (a mark was just hit): it replays the cached layer at once,
  // without a render — the hook never calls it for a plain pen sample.
  const input = useAnnotationInput({
    gesture: gestureRef,
    tool,
    size,
    color,
    touchDraws,
    hidden,
    itemsRef,
    onPoint,
    inBounds,
    onOperation,
    onActiveChange,
    requestFrame,
    onGestureChange: replayCommitted,
    // The host's viewport (image / pdf). `panEnabled` is the 手指=书写 contract:
    // while a finger draws, only two or more fingers may pan/zoom — which also
    // means a pinch still works, because the second finger closes the stroke.
    viewport: panZoom
      ? { controller: panZoom, panEnabled: !touchDraws, onUndo, onRedo }
      : undefined,
  });

  return (
    <canvas
      ref={canvasRef}
      data-annotation-canvas
      tabIndex={0}
      aria-label="批注画布"
      // `touch-action: none` is written as a style rather than a class for one
      // reason: a class can be purged, and without this the browser claims the
      // pen's moves as a scroll and never delivers them (design §0.3-2). It is
      // also why the canvas — not its parent — is `pointer-events: auto`.
      //
      // `hidden` is "do not paint the ink" — never `display`, never a data change,
      // and deliberately **not** `pointer-events: none`: the element stays the
      // host's gesture surface, so 隐藏批注 can be inspected with pan/zoom (design
      // §2.1's 隐藏批注 row says the data is untouched; the layer header says why
      // the pointers stay).
      //
      // `pointer-events: auto` is **load-bearing**, not decoration: the layer root
      // is `pointer-events: none` and the property is inherited, so a canvas
      // without this line is not hit-testable at all — the whole gesture surface
      // silently disappears.
      style={{
        position: "absolute",
        touchAction: "none",
        pointerEvents: "auto",
        cursor: tool === "eraser" ? "cell" : "crosshair",
      }}
      className={cn("z-10 block select-none")}
      onPointerDown={input.handlers.onPointerDown}
      onPointerMove={input.handlers.onPointerMove}
      onPointerUp={input.handlers.onPointerUp}
      onPointerCancel={input.handlers.onPointerCancel}
      onLostPointerCapture={input.handlers.onLostPointerCapture}
    />
  );
}
