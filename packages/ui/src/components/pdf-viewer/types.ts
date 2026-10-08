import type { ReactNode } from "react";
import type { PDFPageProxy } from "pdfjs-dist";

/** Layout axis of the page strip. */
export type PdfDirection = "vertical" | "horizontal";

/**
 * `continuous` scrolls the whole document; `paged` keeps the same page strip but
 * snaps it one page at a time, so the axis still means something.
 */
export type PdfScrollMode = "continuous" | "paged";

/** `free` uses the multiplier as-is; the other two derive it from the viewport. */
export type PdfFitMode = "free" | "width" | "page";

/**
 * `single` is one page per strip slot; `double` puts two consecutive pages side
 * by side in the same slot (两两一组), always left page then right page. The
 * pairing never flips with 方向 — 方向 only decides which way the *slots* run.
 */
export type PdfSpread = "single" | "double";

export type PdfSidebarTab = "thumbs" | "outline";

/** One outline entry, with its destination already resolved to a page. */
export interface PdfOutlineEntry {
  title: string;
  /** 1-based page, or `null` when the destination cannot be resolved. */
  page: number | null;
  items: PdfOutlineEntry[];
}

export interface PdfViewMode {
  direction: PdfDirection;
  scroll: PdfScrollMode;
  spread: PdfSpread;
}

export const PDF_DEFAULT_MODE: PdfViewMode = {
  direction: "vertical",
  scroll: "continuous",
  spread: "single",
};

/** How many pages one slot of the strip holds. */
export function pdfSpreadStep(spread: PdfSpread): number {
  return spread === "double" ? 2 : 1;
}

/** One slot of the strip: its 1-based index and the pages it shows. */
export interface PdfSlot {
  index: number;
  pages: number[];
}

/**
 * The strip's slots — the unit the viewer renders, observes, snaps to and
 * measures. 单页 is one page per slot; 双页 pairs consecutive pages, leaving the
 * last page alone when the document has an odd count.
 */
export function pdfSlots(pageCount: number, spread: PdfSpread): PdfSlot[] {
  const step = pdfSpreadStep(spread);
  const slots: PdfSlot[] = [];
  for (let start = 1; start <= pageCount; start += step) {
    const pages = [start];
    if (step > 1 && start + 1 <= pageCount) pages.push(start + 1);
    slots.push({ index: slots.length + 1, pages });
  }
  return slots;
}

/** 1-based index of the slot that shows `page`. */
export function pdfSlotOf(page: number, spread: PdfSpread): number {
  return Math.ceil(page / pdfSpreadStep(spread));
}

/** The slot's first (leading) page — what a spread view calls "the page". */
export function pdfSlotStartPage(slot: number, spread: PdfSpread): number {
  return (slot - 1) * pdfSpreadStep(spread) + 1;
}

export const PDF_MIN_SCALE = 0.25;
export const PDF_MAX_SCALE = 6;

/** Multipliers the zoom in/out buttons walk through. */
export const PDF_ZOOM_STEPS: readonly number[] = [
  0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4,
];

/**
 * Within this factor of the multiplier a page's bitmap was painted at, the
 * bitmap is stretched instead of re-painted: at 2% the difference is not
 * visible, and a re-paint costs a frame every time.
 */
export const PDF_ZOOM_CRISP_RATIO = 1.02;

/**
 * The largest stretch the cheap path paints before it has to re-paint. A pinch
 * that keeps growing past this bound gets a mid-gesture repaint, so the canvas
 * cannot stay visibly soft for the whole of a long gesture.
 *
 * This is the one knob that trades mid-gesture sharpness for how often a gesture
 * still rasterises: a mouse spin from 1× to 6× costs 2 repaints at 2.0 and 3 at
 * 1.6, while a trackpad pinch to 2× costs none. Leaving it at 2.0 is what the
 * device-pixel-ratio budget allows — pages are painted at `min(dpr, 2)`, so a 2×
 * stretch still lands on one device pixel per CSS pixel of a 2× display.
 */
export const PDF_ZOOM_STRETCH_LIMIT = 2;

/**
 * Whether a page box at `scale` may keep the bitmap painted at `painted`, i.e.
 * whether the two multipliers are close enough that a re-paint would not change
 * what the reader sees.
 */
export function pdfZoomIsCrisp(scale: number, painted: number): boolean {
  const stretch = scale / painted;
  return stretch < PDF_ZOOM_CRISP_RATIO && stretch > 1 / PDF_ZOOM_CRISP_RATIO;
}

/** What a change of multiplier has to do about the painted bitmap. */
export type PdfZoomRaster = "skip" | "now" | "later";

/**
 * Decides whether a page has to be re-painted for `scale` given a bitmap painted
 * at `painted` — `null` while no bitmap has been recorded, which always has to be
 * painted, at `scale`, because that is the multiplier the boxes are laid out at.
 *
 * That `null` case is part of the policy rather than a special case in the
 * viewer for a reason: a viewer that instead treats "no bitmap recorded" as
 * "nothing to compare against" ends up comparing the multiplier against itself on
 * every commit, answering "skip" forever, and never records one — the deferral
 * below then never runs and a gesture repaints per notch, which is the stutter
 * this whole mechanism exists to remove.
 *
 * `defer` is the caller's answer to "is this a gesture in flight?" — a wheel
 * notch or a pinch is, a button or a fit mode is not. A *deferred* step is
 * painted by stretching the existing bitmap and re-painting once the gesture
 * stops, which is the point: re-painting on every notch makes each one cancel the
 * page render the notch before it started, so a spin repaints nothing and drops
 * every frame. Bounded by `PDF_ZOOM_STRETCH_LIMIT`, so a long pinch still
 * sharpens mid-gesture instead of blurring all the way.
 */
export function pdfZoomRaster(
  scale: number,
  painted: number | null,
  defer: boolean,
): PdfZoomRaster {
  if (painted === null) return "now";
  if (pdfZoomIsCrisp(scale, painted)) return "skip";
  const stretch = scale / painted;
  if (
    !defer ||
    stretch > PDF_ZOOM_STRETCH_LIMIT ||
    stretch < 1 / PDF_ZOOM_STRETCH_LIMIT
  ) {
    return "now";
  }
  return "later";
}

/** Page size in PDF points at scale 1, with the page's own `/Rotate` applied. */
export interface PdfPageMetrics {
  width: number;
  height: number;
}

export type PdfLoadFailureCode =
  | "worker"
  | "network"
  | "password"
  | "invalid"
  | "unknown";

export interface PdfLoadFailure {
  code: PdfLoadFailureCode;
  message: string;
  cause?: unknown;
}

/** `index` / `length` address the page's joined text (see `pdf-text.ts`). */
export interface PdfSearchMatch {
  page: number;
  index: number;
  length: number;
}

export interface PdfViewerProps {
  /** Already resolved against the API origin by the host. */
  url: string;
  title?: string;
  className?: string;
  /** Initial layout — the viewer owns it afterwards. Defaults to 垂直 + 连续 + 单页. */
  defaultMode?: PdfViewMode;
  /** Initial multiplier; ignored unless no `defaultFit` is given. */
  defaultScale?: number;
  /** Initial fit mode. Defaults to 适配宽度 (or `free` when `defaultScale` is set). */
  defaultFit?: PdfFitMode;
  /** Extra controls for the toolbar's right-hand group. */
  toolbarExtras?: ReactNode;
  onPageChange?: (page: number, pageCount: number) => void;
  /** pdfjs could not be used — the host is expected to degrade. */
  onError?: (failure: PdfLoadFailure) => void;
}

export interface PdfToolbarProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;

  zoom: {
    /** Multiplier currently painted (derived when a fit mode is active). */
    scale: number;
    fit: PdfFitMode;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onSelectScale: (scale: number) => void;
    onSelectFit: (fit: PdfFitMode) => void;
  };

  mode: PdfViewMode;
  onModeChange: (mode: PdfViewMode) => void;

  search: {
    open: boolean;
    query: string;
    caseSensitive: boolean;
    wholeWord: boolean;
    /** Total matches in the document. */
    count: number;
    /** 1-based position of the current match, `0` when there is none. */
    active: number;
    /** Still scanning pages. */
    pending: boolean;
    onOpenChange: (open: boolean) => void;
    onQueryChange: (query: string) => void;
    onCaseSensitiveChange: (value: boolean) => void;
    onWholeWordChange: (value: boolean) => void;
    onPrev: () => void;
    onNext: () => void;
  };

  sidebar: {
    tab: PdfSidebarTab | null;
    onTabChange: (tab: PdfSidebarTab | null) => void;
  };

  downloadUrl: string;
  /**
   * Files come from the API origin, where the `download` attribute is ignored —
   * the viewer fetches a blob instead and hands the toolbar a plain action.
   */
  onDownload: () => void;
  title?: string;
  extras?: ReactNode;
  className?: string;
}

/* ------------------------------------------------------------------ *
 * pdfjs-derived types. Kept here so no module outside the loader has
 * to name the package, and so a type-only import never pulls the ~1MB
 * parser into a statically bundled chunk.
 * ------------------------------------------------------------------ */

export type PdfJsModule = typeof import("pdfjs-dist");

export type PdfTextContent = Awaited<
  ReturnType<PDFPageProxy["getTextContent"]>
>;

export type PdfTextLayerInstance = InstanceType<PdfJsModule["TextLayer"]>;

export type PdfTextLayerParams = ConstructorParameters<
  PdfJsModule["TextLayer"]
>[0];

export type PdfRenderTask = ReturnType<PDFPageProxy["render"]>;
