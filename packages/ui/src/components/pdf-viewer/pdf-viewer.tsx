"use client";

/**
 * The pdf viewer: a document surface plus its toolbar.
 *
 * Layout is **one scroller with two axes, two scroll behaviours and one or two
 * pages per slot** rather than eight separate views — the page strip is always
 * the same flex list, and 方向 / 滚动 / 单双页 only decide the axis, whether the
 * strip scroll-snaps, and how many pages a slot holds. That is what keeps
 * "垂直连续单页" and "水平翻页双页" from drifting apart as the viewer grows: page
 * navigation, virtualisation, search jumps and zoom anchoring are written once,
 * against the strip's geometry.
 *
 * A slot is the unit of everything: it is what the `IntersectionObserver`
 * watches, what scroll-snapping snaps to, what "the current page" is derived
 * from, and what a fit mode measures. 单页 makes it one page, 双页 makes it a
 * left/right pair — so the reader never has to know which mode is on.
 *
 * Three things are deliberate:
 *
 * - **Pages render from the viewport, outwards.** An `IntersectionObserver`
 *   with a one-viewport margin decides which canvases exist; everything else
 *   keeps its measured size, so the strip never reflows while scrolling.
 * - **A zoom gesture paints twice, not once per notch.** The page box and the
 *   scroll anchor follow the multiplier immediately, but the *bitmap* lags: a
 *   wheel or pinch burst is painted by stretching the canvas from the scale it
 *   was last rasterised at, and pdfjs is re-run once the gesture settles.
 *   Rasterising per notch is what made zooming stutter — a heavy page takes tens
 *   of milliseconds, so every notch cancelled the render the notch before it had
 *   started and no notch ever finished. Only the pixels are stale while the
 *   gesture lasts (and the text layer is hidden, because its spans are still
 *   laid out for the old box).
 * - **The current page is derived, not stored.** It is whichever page is
 *   nearest the viewport centre, so it stays right during a trackpad fling, a
 *   toolbar jump and a search jump without any of them owning it.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CircleAlert, Loader2 } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { PdfPage } from "./pdf-page";
import { PdfSidebar } from "./pdf-sidebar";
import { PdfToolbar } from "./pdf-toolbar";
import { usePdfDocument } from "./use-pdf-document";
import { usePdfSearch } from "./use-pdf-search";
import {
  PDF_DEFAULT_MODE,
  PDF_MAX_SCALE,
  PDF_MIN_SCALE,
  PDF_ZOOM_STEPS,
  pdfSlotOf,
  pdfSlots,
  pdfSlotStartPage,
  pdfSpreadStep,
  pdfZoomRaster,
  type PdfFitMode,
  type PdfOutlineEntry,
  type PdfSidebarTab,
  type PdfViewMode,
  type PdfViewerProps,
} from "./types";
import "./pdf-text-layer.css";

const FALLBACK_PAGE = { width: 595, height: 842 };

/** Space kept free around a page when a fit mode computes the multiplier. */
const FIT_PADDING = 48;

/**
 * Gap painted between the two pages of a 双页 slot. It has to be a *pixel*
 * amount because two pages keep their own width, so the fit maths subtracts it
 * from the viewport instead of scaling it — which means this number and the
 * `gap-2` class on the slot's inner row must agree. They do at the default 16px
 * root; under a different one the fit is a few pixels out, which at worst clips
 * a hairline off a page in 适配宽度.
 */
const SPREAD_GAP = 8;

/**
 * Multiplier change per pixel of wheel delta. A mouse notch reports 100px, i.e.
 * ×1.28 zooming in and ×0.78 zooming out (the mapping is exponential, so the two
 * directions are not symmetric); a trackpad pinch reports a stream of small
 * deltas that accumulate into the same feel.
 *
 * This is the *feel* knob only — it is not what makes a zoom smooth. A notch far
 * larger than this does not zoom faster, it just jumps further past
 * `PDF_ZOOM_STRETCH_LIMIT` and forces the repaint the deferral exists to avoid.
 */
const WHEEL_ZOOM_SENSITIVITY = 0.01;

/**
 * How long a deferred zoom stays on the cheap path after its last notch, i.e.
 * how long the stretched bitmap may be on screen before pdfjs is re-run. Short
 * enough that a single wheel notch is crisp again almost at once, long enough
 * that a stream of notches never pays for a raster it is about to invalidate.
 */
const ZOOM_SETTLE_MS = 180;

/**
 * One line of a line-mode wheel event, in pixels. Firefox reports wheel deltas
 * in lines, and pdfjs itself converts them at 30px per line
 * (`web/pdf_viewer.mjs`, `normalizeWheelEventDelta`); anything smaller makes a
 * notch on that browser a fraction of a notch anywhere else.
 */
const WHEEL_LINE_HEIGHT = 30;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Wheel deltas arrive in pixels, lines or pages depending on the device and the
 * browser (Firefox on Linux reports *lines*), and an un-normalised unit is the
 * difference between "zooms" and "does not move": three lines is `3`, which
 * would be a 0.7% step.
 */
function wheelDelta(event: WheelEvent, element: HTMLElement): number {
  if (event.deltaMode === 1) return event.deltaY * WHEEL_LINE_HEIGHT;
  if (event.deltaMode === 2) return event.deltaY * element.clientHeight;
  return event.deltaY;
}

function downloadName(title: string | undefined): string {
  const base = (title || "document").replace(/[\\/:*?"<>|]+/g, "_").trim();
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

export function PdfViewer({
  url,
  title,
  className,
  defaultMode,
  defaultScale,
  defaultFit,
  toolbarExtras,
  onPageChange,
  onError,
}: PdfViewerProps) {
  const {
    status,
    pageCount,
    metrics,
    failure,
    progress,
    getPage,
    getTextContent,
    createTextLayer,
    getOutline,
  } = usePdfDocument(url);

  const [mode, setMode] = useState<PdfViewMode>(
    defaultMode ?? PDF_DEFAULT_MODE,
  );
  /**
   * 适配宽度 is the useful first view: the alternative is a 1:1 page that is
   * either clipped by the dialog or swimming in empty space.
   */
  const [fit, setFit] = useState<PdfFitMode>(
    defaultFit ?? (defaultScale === undefined ? "width" : "free"),
  );
  const [scale, setScale] = useState(defaultScale ?? 1);
  /**
   * The multiplier the visible bitmaps were actually rasterised at, which trails
   * the multiplier the boxes are laid out at while a gesture is streaming. `null`
   * means "no page has ever been stretched": a page renders at the laid-out
   * multiplier directly, so the first paint is never a stretched one.
   */
  const [paintedScale, setPaintedScale] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [sidebarTab, setSidebarTab] = useState<PdfSidebarTab | null>(null);
  const [visibleSlots, setVisibleSlots] = useState<ReadonlySet<number>>(
    () => new Set([1]),
  );
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [outline, setOutline] = useState<PdfOutlineEntry[] | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const slotRefs = useRef(new Map<number, HTMLDivElement>());
  const zoomAnchor = useRef<{ scroll: number } | null>(null);
  const scrollFrame = useRef(0);
  /**
   * Two multipliers, because they answer different questions. `scaleRef` is what
   * is *laid out* — the anchor maths needs it. `zoomTargetRef` is what the user
   * last *asked for*: a fast wheel spin delivers several notches before React has
   * re-rendered, and composing each notch on the laid-out scale instead of the
   * intended one silently swallows them, which is exactly what an insensitive
   * zoom feels like.
   */
  const scaleRef = useRef(1);
  const zoomTargetRef = useRef(1);
  const pageRef = useRef(1);
  const searchOpenRef = useRef(false);
  /**
   * The visual multiplier is written at most once a frame — React batching does
   * not merge wheel events (each is its own task), so without this a trackpad
   * pinch re-renders the strip per input event rather than per frame.
   */
  const zoomFrameRef = useRef(0);
  /** The newest multiplier a queued frame still owes the page boxes, if any. */
  const pendingScaleRef = useRef<number | null>(null);
  const rasterTimerRef = useRef(0);
  /** Set by a gesture handler: this scale change may paint by stretching. */
  const deferRasterRef = useRef(false);

  const horizontal = mode.direction === "horizontal";
  const pagesPerSlot = pdfSpreadStep(mode.spread);

  const search = usePdfSearch({
    getTextContent,
    pageCount,
    enabled: status === "ready",
  });
  /** `useState` setter — stable, so the window listener binds once. */
  const setSearchOpen = search.setOpen;

  /* ---------------------------------------------------------------- *
   * Document-level reporting
   * ---------------------------------------------------------------- */

  useEffect(() => {
    if (failure) onError?.(failure);
  }, [failure, onError]);

  useEffect(() => {
    if (status === "ready") onPageChange?.(page, pageCount);
  }, [page, pageCount, status, onPageChange]);

  /** The host may reuse this component for another node; the paging state must not. */
  useEffect(() => {
    setPage(1);
    setOutline(null);
    setVisibleSlots(new Set([1]));
    // Another document's pages are not this document's pixels: whatever the last
    // gesture left painted does not describe anything in the new file.
    setPaintedScale(null);
    // Nor does a scroll offset computed against the old document's layout.
    zoomAnchor.current = null;
  }, [url]);

  useEffect(() => {
    if (status !== "ready" || sidebarTab !== "outline" || outline) return;
    let cancelled = false;
    void getOutline().then((entries) => {
      if (!cancelled) setOutline(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [status, sidebarTab, outline, getOutline]);

  /* ---------------------------------------------------------------- *
   * Geometry: viewport, fit, zoom
   * ---------------------------------------------------------------- */

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const measure = () =>
      setViewport({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [status, sidebarTab]);

  /** The slot the reader is on — the unit every fit and snap is measured on. */
  const slotIndex = pdfSlotOf(page, mode.spread);

  /**
   * A slot's extent in PDF points at scale 1. 单页 it is the page itself; 双页 it
   * is both pages plus the gap between them, and as tall as the taller one — so
   * 适配页面 means "both pages are visible", not "one and a half of them".
   */
  const unitMetrics = useMemo(() => {
    const start = pdfSlotStartPage(slotIndex, mode.spread);
    const first = metrics.get(start) ?? metrics.get(1) ?? FALLBACK_PAGE;
    const paired =
      pagesPerSlot > 1 && start + 1 <= pageCount
        ? (metrics.get(start + 1) ?? metrics.get(1) ?? FALLBACK_PAGE)
        : null;
    return {
      width: first.width + (paired?.width ?? 0),
      height: Math.max(first.height, paired?.height ?? 0),
      gap: paired ? SPREAD_GAP : 0,
    };
  }, [slotIndex, mode.spread, pagesPerSlot, pageCount, metrics]);

  /** The multiplier a fit mode resolves to for the current slot and viewport. */
  const resolveFitScale = useCallback(
    (next: PdfFitMode): number => {
      if (next === "free") return clamp(scale, PDF_MIN_SCALE, PDF_MAX_SCALE);
      // The gap is a fixed pixel amount, so it comes off the viewport while the
      // pages themselves are scaled.
      const width = Math.max(1, viewport.width - FIT_PADDING - unitMetrics.gap);
      const height = Math.max(1, viewport.height - FIT_PADDING);
      if (next === "page") {
        return clamp(
          Math.min(width / unitMetrics.width, height / unitMetrics.height),
          PDF_MIN_SCALE,
          PDF_MAX_SCALE,
        );
      }
      // 适配宽度 follows the reading axis: full width when pages stack, full
      // height when they sit side by side.
      return clamp(
        horizontal ? height / unitMetrics.height : width / unitMetrics.width,
        PDF_MIN_SCALE,
        PDF_MAX_SCALE,
      );
    },
    [scale, viewport, unitMetrics, horizontal],
  );

  const effectiveScale = useMemo(
    () => resolveFitScale(fit),
    [resolveFitScale, fit],
  );

  /**
   * The multiplier the page bitmaps are painted at, which is what every page
   * takes as its `renderScale`. Until the first repaint records one it is the
   * laid-out multiplier, so the first paint is crisp rather than stretched.
   */
  const canvasScale = paintedScale ?? effectiveScale;

  /**
   * Publishes the multiplier the page boxes are laid out at, and answers the one
   * question a page has to ask before it rasterises: repaint now, or paint this
   * change by stretching the bitmap it already has?
   *
   * A layout effect rather than a passive one for two reasons. The anchor has to
   * move the scroll in the same frame as the reflow it compensates for; and a
   * step that repaints *now* has to land before the browser paints, otherwise
   * the stretched frame would be shown and then replaced by the crisp one.
   */
  useLayoutEffect(() => {
    scaleRef.current = effectiveScale;
    // A queued frame is *newer* than this commit, so it owns the intended
    // multiplier — syncing here would clobber it and swallow the notches it
    // carries. With nothing queued this commit is the truth (a resize, a fit
    // mode) and the next notch has to compose on it.
    if (pendingScaleRef.current === null)
      zoomTargetRef.current = effectiveScale;

    const defer = deferRasterRef.current;
    deferRasterRef.current = false;

    if (rasterTimerRef.current) {
      window.clearTimeout(rasterTimerRef.current);
      rasterTimerRef.current = 0;
    }

    const repaint = () => {
      rasterTimerRef.current = 0;
      setPaintedScale(effectiveScale);
    };

    // `paintedScale` is `null` until the first repaint records one; the policy
    // answers "now" for that, which is what seeds the baseline the next notch is
    // compared against. See `pdfZoomRaster`.
    const decision = pdfZoomRaster(effectiveScale, paintedScale, defer);
    if (decision === "skip") return;
    if (decision === "now") {
      repaint();
      return;
    }
    // "later": a gesture is in flight, so every page keeps the bitmap it has and
    // stretches it to the new box, and pdfjs is re-run once the gesture stops.
    // Deferred, never dropped — the box is already at `effectiveScale`, so the
    // pixels are the only part of the frame that is behind.
    rasterTimerRef.current = window.setTimeout(repaint, ZOOM_SETTLE_MS);
  }, [effectiveScale, paintedScale]);

  /** A deferred repaint or a queued frame must not outlive the viewer. */
  useEffect(
    () => () => {
      if (rasterTimerRef.current) window.clearTimeout(rasterTimerRef.current);
      if (zoomFrameRef.current) cancelAnimationFrame(zoomFrameRef.current);
      // Both are also reset, not just cancelled: a frame id left behind would
      // make `queueScale` skip scheduling for good, and a stranded multiplier
      // would be committed by the next zoom to arrive.
      zoomFrameRef.current = 0;
      pendingScaleRef.current = null;
    },
    [],
  );

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    searchOpenRef.current = search.open;
  }, [search.open]);

  /**
   * Remember where the reader is standing, in a form that survives the remount
   * of every page at a new multiplier.
   *
   * Pages scale by exactly `target / current`, so the scroll offset that keeps
   * the point under the cursor (or the viewport centre) in place is the same
   * linear map — no ratio against `scrollWidth`, which also contains the strip's
   * padding and gaps and therefore does not scale with the pages.
   *
   * An anchor is a *pending* value: it is consumed by the next commit that moves
   * the boxes. So a call that decides nothing has to move must also disarm any
   * anchor an earlier call left behind — otherwise the offset computed for one
   * zoom would be applied by an unrelated reflow (a window resize, a sidebar
   * toggle) and scroll the reader somewhere neither gesture asked for.
   */
  const anchorScroll = useCallback(
    (target: number, clientX?: number, clientY?: number) => {
      const element = scrollRef.current;
      const current = scaleRef.current;
      if (!element || Math.abs(target - current) <= 0.001) {
        zoomAnchor.current = null;
        return;
      }
      const rect = element.getBoundingClientRect();
      const offset = horizontal
        ? (clientX ?? rect.left + rect.width / 2) - rect.left
        : (clientY ?? rect.top + rect.height / 2) - rect.top;
      const position = horizontal
        ? element.scrollLeft + offset
        : element.scrollTop + offset;
      zoomAnchor.current = { scroll: position * (target / current) - offset };
    },
    [horizontal],
  );

  /**
   * React does not batch wheel events — each one is dispatched in its own task —
   * so without this a trackpad pinch re-renders the whole strip per input event
   * instead of per frame. Only the newest multiplier is committed, which loses
   * nothing: the intended one is already in `zoomTargetRef` and every
   * intermediate frame is about to be superseded.
   */
  const flushScale = useCallback(() => {
    zoomFrameRef.current = 0;
    const next = pendingScaleRef.current;
    pendingScaleRef.current = null;
    if (next === null) return;
    // `fit` and `scale` land together. A `free` multiplier read before the scale
    // it belongs to would re-resolve to the *previous* one for a paint, which is
    // a visible jump away from the offset the anchor maths was computed against.
    setFit("free");
    setScale(next);
  }, []);

  const queueScale = useCallback(
    (next: number) => {
      pendingScaleRef.current = next;
      if (!zoomFrameRef.current) {
        zoomFrameRef.current = requestAnimationFrame(flushScale);
      }
    },
    [flushScale],
  );

  /**
   * Drop a multiplier a gesture queued but has not committed. Only a non-gesture
   * path needs this: a fit mode picked in the frame a wheel notch was queued for
   * would otherwise be overwritten by that notch when the frame ran.
   */
  const cancelQueuedScale = useCallback(() => {
    pendingScaleRef.current = null;
    if (zoomFrameRef.current) {
      cancelAnimationFrame(zoomFrameRef.current);
      zoomFrameRef.current = 0;
    }
  }, []);

  /**
   * `defer` says whether this step belongs to a gesture that is still streaming:
   * a wheel notch or a pinch paints by stretching the bitmap it has, while a
   * button or a toolbar pick repaints at once — one deliberate step is not worth
   * a window of soft pixels.
   */
  const applyZoom = useCallback(
    (next: number, clientX?: number, clientY?: number, defer = false) => {
      const target = clamp(next, PDF_MIN_SCALE, PDF_MAX_SCALE);
      // Synced here rather than in an effect: the next notch of a fast spin has
      // to compose on this one even if React has not re-rendered.
      zoomTargetRef.current = target;
      // Assigned, not raised: a non-deferred step must not inherit a deferral a
      // gesture left behind, e.g. a pinch that ended at the clamp where the
      // queued multiplier stopped changing and so never committed again — which
      // is also why the flag needs `target` to be a *change*: at the clamp the
      // commit is a no-op, the effect never runs, and a flag raised there would
      // survive to soften the next resize.
      deferRasterRef.current = defer && target !== scaleRef.current;
      anchorScroll(target, clientX, clientY);
      queueScale(target);
    },
    [anchorScroll, queueScale],
  );

  useLayoutEffect(() => {
    const anchor = zoomAnchor.current;
    // Consumed before the scroller is checked: an anchor that cannot be applied
    // now (a loading document, an unmounted strip) must not be applied later,
    // when the boxes it was computed against no longer exist.
    if (!anchor) return;
    zoomAnchor.current = null;
    const element = scrollRef.current;
    if (!element) return;
    if (horizontal) element.scrollLeft = anchor.scroll;
    else element.scrollTop = anchor.scroll;
  }, [effectiveScale, horizontal]);

  /**
   * A fit mode changes the multiplier on its own, so it goes through the same
   * anchor: switching 适配宽度 → 适配页面 keeps the reader on the page they were
   * looking at instead of on whatever pixel offset happens to survive.
   */
  const applyFit = useCallback(
    (next: PdfFitMode) => {
      // No "already selected" guard: it would have to read the committed `fit`,
      // and picking 适配宽度 on the same tick as a wheel zoom (which sets `free`)
      // would then be swallowed. Re-picking the active mode resolves to the scale
      // already laid out, and `anchorScroll` ignores a no-op change anyway.
      const target = resolveFitScale(next);
      zoomTargetRef.current = target;
      // A fit mode is a deliberate step, not a gesture: repaint at once, and let
      // go of a gesture's queued multiplier so it cannot land on top of this.
      deferRasterRef.current = false;
      cancelQueuedScale();
      anchorScroll(target);
      setFit(next);
    },
    [anchorScroll, cancelQueuedScale, resolveFitScale],
  );

  /**
   * The steps compose on the *intended* multiplier, not the laid-out one: two
   * clicks inside one frame would otherwise both step up from the same value and
   * the second would be lost.
   */
  const zoomIn = useCallback(() => {
    const base = zoomTargetRef.current;
    const next = PDF_ZOOM_STEPS.find((step) => step > base * 1.001);
    applyZoom(next ?? PDF_MAX_SCALE);
  }, [applyZoom]);

  const zoomOut = useCallback(() => {
    const base = zoomTargetRef.current;
    const next = [...PDF_ZOOM_STEPS]
      .reverse()
      .find((step) => step < base * 0.999);
    applyZoom(next ?? PDF_MIN_SCALE);
  }, [applyZoom]);

  /* ---------------------------------------------------------------- *
   * Navigation
   * ---------------------------------------------------------------- */

  /**
   * Jump to whichever slot shows `target`.
   *
   * In 双页 the *slot* is what a page number addresses: asking for page 4 lands on
   * the 3–4 spread and the viewer reports 3, so 上一页/下一页 walk spreads rather
   * than stepping twice into the same pair.
   *
   * `behavior` defaults to a smooth scroll (a navigation the reader asked for);
   * the layout changes pass `auto`, because there the scroll is a correction
   * that has to land in the same frame as the reflow.
   */
  const goToPage = useCallback(
    (target: number, behavior: ScrollBehavior = "smooth") => {
      const clamped = clamp(Math.round(target), 1, pageCount || 1);
      const index = pdfSlotOf(clamped, mode.spread);
      const next = pdfSlotStartPage(index, mode.spread);
      setPage(next);

      const element = scrollRef.current;
      const slot = slotRefs.current.get(index);
      if (!element || !slot) return;

      const elementRect = element.getBoundingClientRect();
      const slotRect = slot.getBoundingClientRect();
      const offset = horizontal
        ? slotRect.left - elementRect.left
        : slotRect.top - elementRect.top;
      const overflow = horizontal
        ? slotRect.width - element.clientWidth
        : slotRect.height - element.clientHeight;
      // A slot smaller than the viewport is centred; a slot larger than it is
      // aligned to its leading edge so its first words are what you land on.
      const lead = overflow > 0 ? 0 : -overflow / 2;

      if (horizontal) {
        element.scrollTo({
          left: element.scrollLeft + offset + lead,
          behavior,
        });
      } else {
        element.scrollTo({
          top: element.scrollTop + offset + lead,
          behavior,
        });
      }
    },
    [pageCount, horizontal, mode.spread],
  );

  const handleScroll = useCallback(() => {
    if (scrollFrame.current) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = 0;
      const element = scrollRef.current;
      if (!element) return;
      const elementRect = element.getBoundingClientRect();
      const centre = horizontal
        ? elementRect.left + element.clientWidth / 2
        : elementRect.top + element.clientHeight / 2;

      let best = 0;
      let bestDistance = Infinity;
      slotRefs.current.forEach((slot, number) => {
        const rect = slot.getBoundingClientRect();
        const middle = horizontal
          ? rect.left + rect.width / 2
          : rect.top + rect.height / 2;
        const distance = Math.abs(middle - centre);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = number;
        }
      });

      // The nearest *slot* names the page as its leading page, so a 双页 strip
      // never reports the right-hand page of a pair it is showing.
      if (best > 0) {
        const next = pdfSlotStartPage(best, mode.spread);
        setPage((current) => (current === next ? current : next));
      }
    });
  }, [horizontal, mode.spread]);

  useEffect(
    () => () => {
      if (scrollFrame.current) cancelAnimationFrame(scrollFrame.current);
    },
    [],
  );

  /**
   * Every one of the three layout switches reflows the strip under a fixed pixel
   * offset, so the reader has to be re-seated *and* the scroll has to move with
   * them: 单双页 decides how many pages a slot holds (双页 halves the slot count,
   * so the same offset lands about twice as far in), 方向 switches to the other
   * axis, where the old offset does not exist at all, and 翻页 stretches the slot
   * pitch to at least a viewport, which pushes every following slot further in
   * than 连续 left it. Nothing else would correct any of them — the offset stays
   * in range, so no scroll event fires and `handleScroll` never re-derives,
   * leaving the counter and the rail pointing at a page that is not on screen. A
   * layout effect, so the correction lands in the same frame as the reflow (no
   * flash of the wrong position), and `auto` because it is a correction rather
   * than a navigation the reader asked for.
   */
  const layoutKey = `${mode.direction}:${mode.scroll}:${mode.spread}`;
  const layoutRef = useRef(layoutKey);
  useLayoutEffect(() => {
    if (layoutRef.current === layoutKey) return;
    layoutRef.current = layoutKey;
    goToPage(page, "auto");
  }, [layoutKey, page, goToPage]);

  /* ---------------------------------------------------------------- *
   * Rendering window
   * ---------------------------------------------------------------- */

  const registerSlot = useCallback(
    (number: number, element: HTMLDivElement | null) => {
      const previous = slotRefs.current.get(number);
      if (element) {
        slotRefs.current.set(number, element);
        observerRef.current?.observe(element);
      } else if (previous) {
        slotRefs.current.delete(number);
        observerRef.current?.unobserve(previous);
      }
    },
    [],
  );

  /**
   * One stable ref callback per page. An inline arrow is a new function every
   * render, so React detaches (`ref(null)`) and re-attaches every slot — two
   * calls per page per render, plus an unobserve/observe storm in the observer.
   */
  const slotCallbacks = useRef(
    new Map<number, (element: HTMLDivElement | null) => void>(),
  );
  const slotRef = useCallback(
    (number: number) => {
      const cache = slotCallbacks.current;
      let callback = cache.get(number);
      if (!callback) {
        callback = (element) => registerSlot(number, element);
        cache.set(number, callback);
      }
      return callback;
    },
    [registerSlot],
  );

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || status !== "ready") return;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleSlots((previous) => {
          const next = new Set(previous);
          let changed = false;
          for (const entry of entries) {
            const number = Number(
              (entry.target as HTMLElement).dataset.pdfSlot,
            );
            if (!number) continue;
            if (entry.isIntersecting) {
              if (!next.has(number)) {
                next.add(number);
                changed = true;
              }
            } else if (next.delete(number)) {
              changed = true;
            }
          }
          return changed ? next : previous;
        });
      },
      { root, rootMargin: "1000px 0px 1000px 0px" },
    );
    observerRef.current = observer;
    slotRefs.current.forEach((slot) => observer.observe(slot));
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [status]);

  /* ---------------------------------------------------------------- *
   * Gestures
   * ---------------------------------------------------------------- */

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || status !== "ready") return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const factor = Math.exp(
        -wheelDelta(event, element) * WHEEL_ZOOM_SENSITIVITY,
      );
      // Composed on the *intended* multiplier: a fast spin or a trackpad pinch
      // delivers a whole burst of events before React commits, and each one has
      // to build on the last or the gesture is thrown away. Deferred, because
      // this is exactly the stream of events that must not each start a raster.
      applyZoom(
        zoomTargetRef.current * factor,
        event.clientX,
        event.clientY,
        true,
      );
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [applyZoom, status]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || status !== "ready") return;

    const pointers = new Map<number, { x: number; y: number }>();
    let startDistance = 0;
    let startScale = 1;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        const [first, second] = [...pointers.values()];
        if (!first || !second) return;
        startDistance = Math.hypot(first.x - second.x, first.y - second.y);
        startScale = zoomTargetRef.current;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const tracked = pointers.get(event.pointerId);
      if (!tracked) return;
      tracked.x = event.clientX;
      tracked.y = event.clientY;
      if (pointers.size !== 2 || startDistance <= 0) return;
      const [first, second] = [...pointers.values()];
      if (!first || !second) return;
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      if (!distance) return;
      event.preventDefault();
      // A pinch is a stream of moves, so it paints by stretching and repaints
      // when the fingers stop — one raster per gesture, not one per move.
      applyZoom(
        startScale * (distance / startDistance),
        (first.x + second.x) / 2,
        (first.y + second.y) / 2,
        true,
      );
    };

    const onPointerEnd = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      const [first, second] = [...pointers.values()];
      if (!first || !second) {
        startDistance = 0;
        return;
      }
      // Lifting one finger of a three-finger pinch leaves a *different* pair
      // under the remaining two; keeping the old baseline would make the very
      // next move jump by the ratio between the two pairs.
      startDistance = Math.hypot(first.x - second.x, first.y - second.y);
      startScale = zoomTargetRef.current;
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerEnd);
    element.addEventListener("pointercancel", onPointerEnd);
    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerEnd);
      element.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [applyZoom, status]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const modifier = event.ctrlKey || event.metaKey;
      const target = event.target as HTMLElement | null;
      const inField = Boolean(
        target?.closest("input, textarea, select, [contenteditable='true']"),
      );
      // A field owns its keys (arrow keys move the caret, not the page). The one
      // exception is the search shortcut, which has to work from anywhere.
      if (inField && !(modifier && (event.key === "f" || event.key === "F"))) {
        return;
      }

      if (modifier && (event.key === "f" || event.key === "F")) {
        event.preventDefault();
        search.setOpen(true);
        return;
      }
      if (modifier && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        zoomIn();
        return;
      }
      if (modifier && (event.key === "-" || event.key === "_")) {
        event.preventDefault();
        zoomOut();
        return;
      }
      // Escape is owned by the window-capture listener above while the search
      // bar is open; with it closed the dialog above keeps its own Escape.
      if (event.key === "PageDown") {
        event.preventDefault();
        goToPage(page + pagesPerSlot);
        return;
      }
      if (event.key === "PageUp") {
        event.preventDefault();
        goToPage(page - pagesPerSlot);
        return;
      }
      if (modifier && event.key === "Home") {
        event.preventDefault();
        goToPage(1);
        return;
      }
      if (modifier && event.key === "End") {
        event.preventDefault();
        goToPage(pageCount);
        return;
      }
      if (mode.scroll === "paged") {
        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          event.preventDefault();
          goToPage(page + pagesPerSlot);
        } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          event.preventDefault();
          goToPage(page - pagesPerSlot);
        }
      }
    },
    [
      search,
      zoomIn,
      zoomOut,
      goToPage,
      page,
      pageCount,
      pagesPerSlot,
      mode.scroll,
    ],
  );

  /* ---------------------------------------------------------------- *
   * Search jumps
   * ---------------------------------------------------------------- */

  const activeMatchPage = search.activeMatch?.page ?? null;
  const goToPageRef = useRef(goToPage);
  useEffect(() => {
    goToPageRef.current = goToPage;
  }, [goToPage]);

  /**
   * Jump on *hit changes* only, and only when the hit is on another *slot*: a hit
   * inside the spread already on screen is better served by the rect-level
   * `scrollIntoView` in `PdfPage`, and firing both at once leaves them fighting
   * over the scroll position. `page` is deliberately not a dependency — once the
   * user scrolls away from a hit, the viewer must not drag them back.
   */
  useEffect(() => {
    if (
      activeMatchPage &&
      pdfSlotOf(activeMatchPage, mode.spread) !==
      pdfSlotOf(pageRef.current, mode.spread)
    ) {
      goToPageRef.current(activeMatchPage);
    }
  }, [activeMatchPage, search.activePosition, mode.spread]);

  /**
   * Escape belongs to the search bar while it is open.
   *
   * This has to be a *window* capture listener: Radix dismisses layers from a
   * `document` capture listener (see `@radix-ui/react-dismissable-layer`, which
   * only calls `onDismiss` when the event is not default-prevented), and every
   * React handler runs after it. Preventing the default here is therefore the
   * only way to keep the keystroke from closing the node editor dialog behind
   * us. The target check keeps it local: a dropdown's content is portalled
   * outside this subtree, so its own Escape handling is untouched.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !searchOpenRef.current) return;
      const target = event.target as Node | null;
      if (!target || !rootRef.current?.contains(target)) return;
      event.preventDefault();
      event.stopPropagation();
      setSearchOpen(false);
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [setSearchOpen]);

  /* ---------------------------------------------------------------- *
   * Download
   * ---------------------------------------------------------------- */

  const handleDownload = useCallback(() => {
    void (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(String(response.status));
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = downloadName(title);
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      } catch {
        // The file lives on the API origin: without CORS headers a `download`
        // attribute is ignored, so the honest fallback is to open it.
        window.open(url, "_blank", "noopener,noreferrer");
      }
    })();
  }, [url, title]);

  /* ---------------------------------------------------------------- *
   * Render
   * ---------------------------------------------------------------- */

  const paged = mode.scroll === "paged";
  const axis = horizontal ? "x" : "y";

  /**
   * The strip's slots: what the observer watches, what snapping snaps to, and
   * what a page number addresses. 单页 is one page per slot; 双页 pairs them up,
   * leaving the last page alone when the document has an odd count.
   */
  const slots = useMemo(
    () => pdfSlots(pageCount, mode.spread),
    [pageCount, mode.spread],
  );

  const viewportMain = horizontal ? viewport.width : viewport.height;
  const slotMain = horizontal
    ? unitMetrics.width * effectiveScale + unitMetrics.gap
    : unitMetrics.height * effectiveScale;
  /**
   * `mandatory` snapping is what makes 翻页 feel like paging — and it is also
   * what would trap a slot that is *larger* than the viewport, since every
   * scroll position inside it is nearer a snap point than the next slot's. So
   * the axis only snaps hard while the current slot fits; a long one falls back
   * to `proximity`, which still pages on a deliberate flick but allows reading
   * it. (The mode is per scroller, so this is measured on the slot in view, the
   * same way the fit modes are.)
   */
  const snapType = !paged
    ? undefined
    : `${axis} ${slotMain <= viewportMain ? "mandatory" : "proximity"}`;

  if (status === "loading") {
    return (
      <div
        data-pdf-viewer
        className={cn(
          "relative flex h-full min-h-0 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border bg-muted/30",
          className,
        )}
      >
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          正在加载 PDF
          {progress !== null ? ` · ${Math.round(progress * 100)}%` : "…"}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        data-pdf-viewer
        className={cn(
          "relative flex h-full min-h-0 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border bg-muted/30 px-6 text-center",
          className,
        )}
      >
        <CircleAlert className="size-6 text-muted-foreground" />
        <p className="text-sm text-foreground">
          {failure?.message ?? "PDF 加载失败。"}
        </p>
        <p className="text-xs text-muted-foreground">
          已停止自绘渲染，宿主可以回退到浏览器内置预览。
        </p>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      data-pdf-viewer
      onKeyDown={handleKeyDown}
      className={cn(
        "relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border bg-background",
        className,
      )}
    >
      <PdfToolbar
        page={page}
        pageCount={pageCount}
        onPageChange={goToPage}
        zoom={{
          scale: effectiveScale,
          fit,
          onZoomIn: zoomIn,
          onZoomOut: zoomOut,
          onSelectScale: applyZoom,
          onSelectFit: applyFit,
        }}
        mode={mode}
        onModeChange={setMode}
        search={{
          open: search.open,
          query: search.query,
          caseSensitive: search.caseSensitive,
          wholeWord: search.wholeWord,
          count: search.matches.length,
          active: search.activePosition,
          pending: search.pending,
          onOpenChange: search.setOpen,
          onQueryChange: search.setQuery,
          onCaseSensitiveChange: search.setCaseSensitive,
          onWholeWordChange: search.setWholeWord,
          onPrev: search.prev,
          onNext: search.next,
        }}
        sidebar={{ tab: sidebarTab, onTabChange: setSidebarTab }}
        downloadUrl={url}
        onDownload={handleDownload}
        title={title}
        extras={toolbarExtras}
      />

      <div className="flex min-h-0 flex-1">
        {sidebarTab && (
          <PdfSidebar
            tab={sidebarTab}
            page={page}
            pageCount={pageCount}
            spread={mode.spread}
            metrics={metrics}
            getPage={getPage}
            outline={outline}
            onSelectPage={goToPage}
            onTabChange={setSidebarTab}
            onClose={() => setSidebarTab(null)}
          />
        )}

        <div
          ref={scrollRef}
          tabIndex={0}
          role="region"
          aria-label={title ? `${title} 文档` : "PDF 文档"}
          onScroll={handleScroll}
          data-pdf-scroller
          className={cn(
            "relative flex min-h-0 flex-1 gap-3 overflow-auto overscroll-contain bg-muted/40 p-3 outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring/40",
            horizontal ? "flex-row" : "flex-col",
            paged && "gap-6 p-4",
          )}
          style={{
            scrollSnapType: snapType,
            // The browser keeps single-finger panning; our pointer handler only
            // claims the two-finger gesture, which `pan-x pan-y` leaves free.
            touchAction: "pan-x pan-y",
          }}
        >
          {slots.map((slot) => {
            const render = visibleSlots.has(slot.index);
            return (
              <div
                key={slot.index}
                ref={slotRef(slot.index)}
                data-pdf-slot={slot.index}
                className={cn(
                  "flex shrink-0 justify-center",
                  horizontal ? "items-center" : "w-full",
                  // A continuous column starts each slot at its own top (the
                  // reading position is the first line). A paged strip shows one
                  // slot at a time, so it centres — `-safe` keeps a slot taller
                  // than the viewport reachable from its first line instead of
                  // overflowing out of both ends.
                  !horizontal && (paged ? "items-center-safe" : "items-start"),
                  paged && (horizontal ? "min-w-full" : "min-h-full"),
                )}
                style={paged ? { scrollSnapAlign: "center" } : undefined}
              >
                {/*
                  The slot's inner row carries the 双页 pairing: the pages always
                  sit left page then right page, on both axes — 方向 decides which
                  way the *slots* run, never how a pair is arranged. `items-start`
                  keeps the two tops flush when the pages differ in height.
                */}
                <div
                  className={cn(
                    "flex flex-row items-start justify-center",
                    // Must agree with SPREAD_GAP — the fit maths subtracts it.
                    slot.pages.length > 1 && "gap-2",
                  )}
                >
                  {slot.pages.map((number) => (
                    <PdfPage
                      key={number}
                      pageNumber={number}
                      metrics={metrics.get(number) ?? FALLBACK_PAGE}
                      scale={effectiveScale}
                      renderScale={canvasScale}
                      active={render}
                      getPage={getPage}
                      getTextContent={getTextContent}
                      createTextLayer={createTextLayer}
                      matches={search.matchesForPage(number)}
                      activeMatch={
                        search.activeMatch?.page === number
                          ? search.activeMatch
                          : null
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
