/**
 * The annotation layer's UI-side contract — the **one** declaration of what the
 * toolbar, the ink canvas and the host exchange.
 *
 * The persisted shape is *not* here: `Annotation` / `AnnotationLayerData` live in
 * `@workspace/interfaces` (`models/node/nodes/annotation.ts`, landed by M1 and
 * frozen), because they cross the node boundary and reach PocketBase. This file
 * only adds what the UI needs on top of that shape: which tool is selected, what
 * a colour token is called, how a host hands over the base image's rectangle, and
 * what a gesture reports back.
 *
 * Read `docs/node-content/annotation.md` for the reasoning behind any number:
 * §1.2 (the layer's three boundaries), §2 (toolbar), §3.2/§3.4 (rendering and the
 * coordinate chain), §4 (pen vs. touch). Three rules from §1.2 are structural:
 *
 * 1. the layer never learns who its host is — it eats `items` + `onItemsChange` +
 *    `getBaseRect()`;
 * 2. the layer never touches the store — the host persists;
 * 3. the layer registers no global keyboard — it handles keys on its own subtree.
 */
import type { Annotation } from "@workspace/interfaces";

import type { PanZoomController } from "../pan-zoom/types";

/**
 * The selected drawing tool.
 *
 * **P0 ships pen + eraser only.** The plan puts the rest of the design's §2.1 tool
 * table (荧光笔 / 套索 / 文本框 / 箭头 / 矩形 / 椭圆) in **M7**, together with the
 * text layer, and registers that split as R20. `draw.ts` already *renders* every
 * item kind, so M7 only has to extend this union and add the input branches —
 * widening it earlier would mean shipping toolbar buttons that draw nothing.
 */
export type AnnotationTool = "pen" | "eraser";

/** A rectangle in **viewport** (client) CSS pixels. */
export interface BaseRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The ink layer's own box, in its **container's** CSS pixels — i.e. the values the
 * canvas writes to `style.left/top/width/height`.
 *
 * It is the same rectangle as {@link BaseRect} minus the layer root's viewport
 * origin; the two are separate types so a mixed-up pair is visible in a diff
 * rather than silently drawing the ink at the wrong offset.
 */
export interface LayerBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * A colour **token key** — never a hex value (design §2.3).
 *
 * Storing a key keeps the data theme-independent: the same annotation renders on
 * light and dark themes because the key resolves to a different `oklch()` in each.
 */
export type AnnotationColorKey =
  | "red"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "ink";

export interface AnnotationColorSpec {
  key: AnnotationColorKey;
  /** The custom property the key resolves to, declared in `styles/globals.css`. */
  cssVar: string;
  /** Swatch tooltip / accessible name. */
  label: string;
}

/**
 * The six tokens, in swatch order, exactly as `globals.css` declares them
 * (`--annotation-1..6` in both `:root` and `.dark`, added by this milestone).
 */
export const ANNOTATION_COLORS: readonly AnnotationColorSpec[] = [
  { key: "red", cssVar: "--annotation-1", label: "红" },
  { key: "yellow", cssVar: "--annotation-2", label: "黄" },
  { key: "green", cssVar: "--annotation-3", label: "绿" },
  { key: "blue", cssVar: "--annotation-4", label: "蓝" },
  { key: "purple", cssVar: "--annotation-5", label: "紫" },
  { key: "ink", cssVar: "--annotation-6", label: "墨" },
];

export const DEFAULT_ANNOTATION_COLOR: AnnotationColorKey = "red";

/**
 * The three nib widths, as a fraction of the base image's **short edge** — the
 * unit `Annotation.size` is stored in, so a stroke keeps its weight on another
 * device or after a resize (design §0.2-② last line).
 *
 * 0.004 / 0.008 / 0.016 ≈ 3 / 6 / 12 CSS px on a 720px-tall image.
 */
export const ANNOTATION_SIZES: readonly number[] = [0.004, 0.008, 0.016];

export const DEFAULT_ANNOTATION_SIZE = ANNOTATION_SIZES[1]!;

export const DEFAULT_ANNOTATION_TOOL: AnnotationTool = "pen";

/** Highlighter alpha and blend (design §2.1 / §2.3). M7 renders these. */
export const HIGHLIGHT_OPACITY = 0.35;
export const HIGHLIGHT_BLEND_LIGHT = "multiply" as const;
export const HIGHLIGHT_BLEND_DARK = "screen" as const;

/**
 * Distance-threshold thinning and the bbox pad are **not** here: they are
 * numerical properties of the geometry module that consumes them, and they live in
 * `geometry.ts` (`SIMPLIFY_EPSILON`, `BBOX_MARGIN`) so that module stays free of
 * runtime imports — `node --test` resolves relative specifiers literally.
 */

/**
 * What one finished gesture reports.
 *
 * The layer, not the canvas, owns the undo stack: a stroke is one `add`, and an
 * eraser pass over N marks is **one** `remove` carrying every item it deleted, so
 * one ⌘Z restores the whole pass (design §0.3-7 "栈里存操作记录").
 */
export type AnnotationOperation =
  | { kind: "add"; item: Annotation }
  | { kind: "remove"; items: Annotation[] };

/**
 * Props of the host-agnostic assembly point (`annotation-layer.tsx`).
 *
 * Design §1.2 lists `items` + `onItemsChange` + `tool` + `getBaseRect()`. This
 * contract keeps the first two and `getBaseRect` verbatim, but **keeps the tool as
 * internal state** (`defaultTool` only seeds it): the toolbar lives inside the
 * layer, so lifting the selected tool into every host would make each host own a
 * piece of the layer's own UI state for no benefit. Recorded as a chapter decision
 * (`docs/plan/annotation.md` §M5.2).
 */
export interface AnnotationLayerProps {
  /**
   * The persisted layer. `undefined` is normal — an old record has no
   * `annotations` key at all (design §0.2-①), and it means "empty".
   */
  items?: Annotation[];
  /**
   * One gesture = one call (a stroke, or one eraser pass). The host owns
   * persistence; the layer never writes to the store.
   */
  onItemsChange?: (items: Annotation[]) => void;
  /**
   * The base image's drawn rectangle, in viewport CSS pixels, or `null` while it
   * is not measurable (image not loaded, container collapsed). The layer re-reads
   * it on resize/scroll and on every pointer event; it must not be cached by the
   * implementation.
   */
  getBaseRect: () => BaseRect | null;
  /** Initial tool; the toolbar changes it from then on. */
  defaultTool?: AnnotationTool;
  /** Dialog mode: the toolbar starts folded (design §2.4). */
  compact?: boolean;
  /**
   * Hides the toolbar and stops accepting pointers (design §2.4), for a future
   * read-only share view. **No host passes it today** — `node-content-editor.tsx`
   * only forwards `node` + `className` (plan §5.2-9, registration candidate for
   * plan §9). It is implemented, but G5 does not test it.
   */
  readOnly?: boolean;
  /**
   * The **shared viewport transform**, owned by the host (design: the base and
   * the ink must never each own a pan/zoom, or they drift). The layer does not
   * read a transform of its own — it learns the result through
   * {@link AnnotationLayerProps.getBaseRect}, which the host derives from this
   * same controller. What the controller buys the layer is the *gestures*: one
   * finger pans, two pinch, a single-finger double tap restores fit, and the
   * canvas is the only surface a pointer actually lands on. The desktop half of
   * 恢复位置大小 is not here — a mouse click is ink, so the host renders
   * `pan-zoom/reset-button.tsx` instead.
   *
   * `undefined` (no host transform, e.g. a plain `readOnly` embed) means the ink
   * canvas takes no viewport gestures at all.
   */
  panZoom?: PanZoomController;
  className?: string;
}

/**
 * Props of `annotation-toolbar.tsx`.
 *
 * The toolbar is **presentational**: it renders state and calls back, and it owns
 * exactly one piece of local state — the two-stage confirmation of 清除 (the
 * design allows an `AlertDialog` "或两段式按钮"; the repo has no `alert-dialog`
 * primitive, so it is the second option).
 */
export interface AnnotationToolbarProps {
  tool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  color: AnnotationColorKey;
  onColorChange: (color: AnnotationColorKey) => void;
  /** One of {@link ANNOTATION_SIZES} (normalized to the short edge). */
  size: number;
  onSizeChange: (size: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Called only after the toolbar's own confirmation step. */
  onClear: () => void;
  /** `hidden` hides the ink without touching the data (design §2.1 隐藏批注). */
  hidden: boolean;
  onToggleHidden: () => void;
  /** The "finger draws too" fallback switch (design §0.3-5); default off. */
  touchDraws: boolean;
  onToggleTouchDraws: () => void;
  /** How many items the layer currently holds — 清除 is disabled at zero. */
  itemCount: number;
  /** Folded layout for the Dialog host (design §2.4). */
  compact?: boolean;
  className?: string;
}

/**
 * Props of `annotation-canvas.tsx` — the ink layer (L1 in design §1.2) and the
 * only pointer target.
 *
 * `box` and `rect` are the same rectangle in two coordinate systems on purpose:
 * the ink is drawn through `box` (the base rectangle in the layer root's own CSS
 * pixels) and pointers are normalized with `rect` (viewport). Deriving one from
 * the other inside the canvas would mean measuring its own offset parent, which
 * is exactly the kind of hidden coupling the frozen contract exists to avoid.
 *
 * The canvas element itself is bigger than that rectangle: it covers the whole
 * layer root ({@link AnnotationCanvasProps.canvas}). Two reasons, both about
 * gestures — the host's pan/pinch must work when a finger lands on the
 * `object-contain` letterbox beside the photo, and the ink must not be clipped
 * any earlier than the host clips it. The ink simply stops being drawn outside
 * `box`.
 */
export interface AnnotationCanvasProps {
  /** The base rectangle, in the layer root's own CSS pixels — the ink origin. */
  box: LayerBox;
  /** The canvas element's own CSS box; always the layer root's layout size. */
  canvas: { width: number; height: number };
  rect: BaseRect;
  items: Annotation[];
  tool: AnnotationTool;
  /** Nib width in normalized units ({@link ANNOTATION_SIZES}). */
  size: number;
  color: AnnotationColorKey;
  /**
   * Design §0.3-5's fallback switch: when on, a single finger draws like a pen.
   * It is a **layer** decision (the toolbar owns it) that reaches the state machine
   * through here, because the canvas is the only thing that sees the pointers.
   */
  touchDraws?: boolean;
  hidden?: boolean;
  /**
   * The host's viewport controller. When present the ink canvas also becomes the
   * gesture surface for the whole stack (see
   * {@link AnnotationLayerProps.panZoom}).
   */
  panZoom?: PanZoomController;
  /** 双指轻点撤回 — the layer's own history, so the canvas only reports the tap. */
  onUndo?: () => void;
  /** 三指轻点重做. */
  onRedo?: () => void;
  /** One finished gesture, reported once. */
  onOperation: (operation: AnnotationOperation) => void;
  /** A gesture started / ended — the layer uses it for the cursor and for ⌘Z focus. */
  onActiveChange?: (active: boolean) => void;
}
