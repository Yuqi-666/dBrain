/**
 * OffscreenCanvas renderer (runs inside the WebWorker).
 *
 * Owns:
 *   - The `OffscreenCanvas` (set via `initCanvas` from the main thread
 *     after Comlink.transfer).
 *   - The 2D rendering context (2d, with webgl fallback per
 *     worker/design.md §5.1).
 *   - The current `ForceStyle` and viewport.
 *
 * Renders one frame into the OffscreenCanvas, then hands the bitmap back
 * to the caller (`force.worker.ts` posts it via raw `postMessage` since
 * ImageBitmap is not a Comlink Transferable).
 *
 * Spec: worker/design.md §5 (rendering).
 */

import type { ForceStyle, ViewportState } from "../types";
import {
  EDGE_STATE_STYLES,
  NODE_STATE_STYLES,
} from "../styleConfig";
import {
  readSimulationState,
  type SimLink,
  type SimNode,
} from "./simulation";

// -----------------------------------------------------------------------
// State
// -----------------------------------------------------------------------

let offscreen: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

let currentStyle: ForceStyle | null = null;
let viewport: ViewportState = { x: 0, y: 0, scale: 1 };

// -----------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------

/**
 * Bind the OffscreenCanvas and select a 2D context. Per
 * worker/design.md §5.1, this must be called exactly once.
 */
export function initCanvas(
  canvas: OffscreenCanvas,
  dims: { width: number; height: number },
): void {
  offscreen = canvas;
  offscreen.width = dims.width;
  offscreen.height = dims.height;

  ctx = offscreen.getContext("2d") as OffscreenCanvasRenderingContext2D | null;
  if (!ctx) {
    // Some environments lack 2D in workers; try webgl as a last resort.
    const gl = offscreen.getContext("webgl");
    if (gl) {
      throw new Error(
        "[canvas] 2D context unavailable and WebGL is not implemented in this renderer",
      );
    }
    throw new Error(
      "[canvas] No 2D or WebGL context available on OffscreenCanvas",
    );
  }
}

export function setStyle(style: ForceStyle): void {
  currentStyle = style;
}

export function setViewport(v: ViewportState): void {
  viewport = v;
}

export function resizeCanvas(dims: { width: number; height: number }): void {
  if (!offscreen) return;
  offscreen.width = dims.width;
  offscreen.height = dims.height;
}

// -----------------------------------------------------------------------
// Render
// -----------------------------------------------------------------------

/**
 * Render a single frame. After this returns, the caller should call
 * `transferToImageBitmap()` and post it to the main thread.
 */
export function renderFrame(): void {
  if (!offscreen || !ctx || !currentStyle) return;
  const { width, height } = offscreen;
  const c = ctx;

  // 1. Clear
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = currentStyle.backgroundColor;
  c.fillRect(0, 0, width, height);
  c.restore();

  // 2. Apply viewport transform
  c.save();
  c.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.x, viewport.y);

  // 3. Draw edges first (under nodes).
  const { links } = readSimulationState();
  for (const link of links) {
    drawEdge(c, link, currentStyle);
  }

  // 4. Draw nodes.
  const { nodes } = readSimulationState();
  for (const node of nodes) {
    drawNode(c, node, currentStyle);
  }

  c.restore();
}

/**
 * Render and immediately return the `ImageBitmap`. The caller is
 * responsible for posting it via `self.postMessage` (raw) and
 * transferring ownership.
 */
export function renderAndTransfer(): ImageBitmap | null {
  if (!offscreen) return null;
  renderFrame();
  return offscreen.transferToImageBitmap();
}

// -----------------------------------------------------------------------
// Node drawing
// -----------------------------------------------------------------------

function drawNode(
  c: OffscreenCanvasRenderingContext2D,
  node: SimNode,
  style: ForceStyle,
): void {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const r = node.weight ?? style.nodeRadius;
  const stateStyle = NODE_STATE_STYLES[node.ui] ?? NODE_STATE_STYLES.default;

  // 1. Fill (semantic color or theme default).
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = node.semanticColor ?? style.nodeColor;
  c.fill();

  // 2. Stroke + shadow.
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.lineWidth = stateStyle.lineWidth;
  if (stateStyle.shadow) {
    c.shadowColor = stateStyle.shadow.color;
    c.shadowBlur = stateStyle.shadow.blur;
  } else {
    c.shadowBlur = 0;
  }
  c.strokeStyle = stateStyle.stroke === "currentColor"
    ? style.nodeColor
    : stateStyle.stroke;
  c.stroke();
  c.shadowBlur = 0;

  // 3. Label (truncated to 100px width via simple character slice).
  if (node.title) {
    c.font = "14px sans-serif";
    c.fillStyle = style.labelColor;
    c.textAlign = "center";
    c.textBaseline = "top";
    const label = truncateLabel(node.title, 100, c);
    c.fillText(label, x, y + r + 4);
  }
}

/**
 * Rough character-based truncation to keep the label within ~100px.
 * Uses the canvas measureText to estimate width.
 */
function truncateLabel(
  text: string,
  maxWidth: number,
  c: OffscreenCanvasRenderingContext2D,
): string {
  if (c.measureText(text).width <= maxWidth) return text;
  const ellipsis = "…";
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    const candidate = text.slice(0, mid) + ellipsis;
    if (c.measureText(candidate).width <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return text.slice(0, lo) + ellipsis;
}

// -----------------------------------------------------------------------
// Edge drawing
// -----------------------------------------------------------------------

function drawEdge(
  c: OffscreenCanvasRenderingContext2D,
  link: SimLink,
  style: ForceStyle,
): void {
  const sx = link.source.x ?? 0;
  const sy = link.source.y ?? 0;
  const tx = link.target.x ?? 0;
  const ty = link.target.y ?? 0;
  const stateStyle = EDGE_STATE_STYLES[link.ui] ?? EDGE_STATE_STYLES.default;

  c.beginPath();
  c.strokeStyle = link.semanticColor ?? style.edgeColor;
  c.lineWidth = stateStyle.lineWidth;
  if (stateStyle.shadow) {
    c.shadowColor = stateStyle.shadow.color;
    c.shadowBlur = stateStyle.shadow.blur;
  } else {
    c.shadowBlur = 0;
  }

  // Shape: edgeType → path (bidirectional overrides to cubic).
  const isBidirectional = link.direction === "bidirectional";
  const useCubic = isBidirectional || link.edgeType === "interaction";
  const useQuadratic = !useCubic && link.edgeType === "flow";

  if (useCubic) {
    const cx1 = sx + (tx - sx) * 0.4;
    const cy1 = sy;
    const cx2 = tx - (tx - sx) * 0.4;
    const cy2 = ty;
    c.moveTo(sx, sy);
    c.bezierCurveTo(cx1, cy1, cx2, cy2, tx, ty);
  } else if (useQuadratic) {
    const mx = (sx + tx) / 2;
    const my = (sy + ty) / 2 - 40;
    c.moveTo(sx, sy);
    c.quadraticCurveTo(mx, my, tx, ty);
  } else {
    c.moveTo(sx, sy);
    c.lineTo(tx, ty);
  }

  // Dash for `association` (when not bidirectional).
  if (link.edgeType === "association" && !isBidirectional) {
    c.setLineDash([6, 4]);
  } else {
    c.setLineDash([]);
  }
  c.stroke();
  c.setLineDash([]);
  c.shadowBlur = 0;

  // Arrow markers.
  drawArrow(c, link, sx, sy, tx, ty);
}

function drawArrow(
  c: OffscreenCanvasRenderingContext2D,
  link: SimLink,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): void {
  const ARROW_SIZE = 8;
  const angle = Math.atan2(ty - sy, tx - sx);

  // Forward arrow at target.
  if (link.direction === "forward" || link.direction === "bidirectional") {
    drawArrowHead(c, tx, ty, angle, ARROW_SIZE);
  }
  // Reverse arrow at source.
  if (link.direction === "reverse" || link.direction === "bidirectional") {
    drawArrowHead(c, sx, sy, angle + Math.PI, ARROW_SIZE);
  }
}

function drawArrowHead(
  c: OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
): void {
  const half = size / 2;
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(-size, -half);
  c.lineTo(-size, half);
  c.closePath();
  c.fillStyle = c.strokeStyle as string;
  c.fill();
  c.restore();
}
