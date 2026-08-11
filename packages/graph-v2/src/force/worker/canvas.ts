/**
 * OffscreenCanvas renderer (runs inside the WebWorker).
 *
 * Owns:
 *   - The `OffscreenCanvas` (created internally via `createCanvas`).
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
  EDGE_RENDER_RULES,
  NODE_RENDER_RULES,
  getRenderAdjustment,
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

// Avoid per-node per-frame string allocation for font.
const fontCache = { labelSize: -1, font: "" };

// -----------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------

/**
 * Create a detached OffscreenCanvas and select a 2D context. Per
 * worker/design.md §5.1, this must be called exactly once.
 */
export function createCanvas(
  width: number,
  height: number,
): void {
  offscreen = new OffscreenCanvas(width, height);

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

export function getContext(): OffscreenCanvasRenderingContext2D | null {
  return ctx;
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

  // 2. Grid (only when zoomed in enough)
  if (viewport.scale > 0.5 && currentStyle.gridColor) {
    c.save();
    c.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.x, viewport.y);
    c.strokeStyle = currentStyle.gridColor;
    c.lineWidth = 0.5 / viewport.scale;
    c.beginPath();
    const step = 50;
    // Draw grid within visible area
    const invScale = 1 / viewport.scale;
    const startX = Math.floor(-viewport.x * invScale / step) * step;
    const startY = Math.floor(-viewport.y * invScale / step) * step;
    const endX = startX + (width * invScale) + step;
    const endY = startY + (height * invScale) + step;
    for (let gx = startX; gx <= endX; gx += step) {
      c.moveTo(gx, startY);
      c.lineTo(gx, endY);
    }
    for (let gy = startY; gy <= endY; gy += step) {
      c.moveTo(startX, gy);
      c.lineTo(endX, gy);
    }
    c.stroke();
    c.restore();
  }

  // 3. Apply viewport transform
  c.save();
  c.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.x, viewport.y);

  // 4. Draw edges first (under nodes).
  // Frustum culling: compute visible bounds in simulation coords with
  // a generous padding margin (50px) to account for node radii + labels.
  const invScale = 1 / viewport.scale;
  const PAD = 50;
  const vpLeft = -viewport.x * invScale - PAD;
  const vpRight = (-viewport.x + width) * invScale + PAD;
  const vpTop = -viewport.y * invScale - PAD;
  const vpBottom = (-viewport.y + height) * invScale + PAD;

  // Helper: check if a node is visible (center point within padded viewport).
  const isNodeVisible = (nx: number | undefined, ny: number | undefined): boolean => {
    if (nx === undefined || ny === undefined) return false;
    return nx >= vpLeft && nx <= vpRight && ny >= vpTop && ny <= vpBottom;
  };

  const state = readSimulationState();
  const { links, nodes: simNodes } = state;

  for (const link of links) {
    const srcVisible = isNodeVisible(link.source.x, link.source.y);
    const tgtVisible = isNodeVisible(link.target.x, link.target.y);
    // Skip edge only when BOTH endpoints are outside the viewport.
    if (!srcVisible && !tgtVisible) continue;
    drawEdge(c, link, currentStyle);
  }

  // 5. Draw nodes.
  for (const node of simNodes) {
    if (!isNodeVisible(node.x, node.y)) continue;
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
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const r = node.radius;
  const adj = getRenderAdjustment(node.renderState, NODE_RENDER_RULES);

  // 1. Fill.
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = node.fillColor;
  c.fill();

  // 2. Stroke + shadow.
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.strokeStyle = adj?.strokeColorOverride ?? node.strokeColor;
  c.lineWidth = adj?.strokeWidthMultiplier
    ? node.strokeWidth * adj.strokeWidthMultiplier
    : node.strokeWidth;
  if (adj?.shadow) {
    c.shadowColor = adj.shadow.color;
    c.shadowBlur = adj.shadow.blur;
  } else {
    c.shadowBlur = 0;
  }
  c.stroke();
  c.shadowBlur = 0;

  // 3. Label.
  if (node.label) {
    if (fontCache.labelSize !== node.labelSize) {
      fontCache.labelSize = node.labelSize;
      fontCache.font = `${node.labelSize}px sans-serif`;
    }
    c.font = fontCache.font;
    c.fillStyle = node.labelColor;
    c.textAlign = "center";
    c.textBaseline = "top";
    const label = node.__label ?? truncateLabel(node.label, 100, c);
    c.fillText(label, x, y + r + 4);
  }
}

/**
 * Rough character-based truncation to keep the label within ~100px.
 * Uses the canvas measureText to estimate width. Exported for label
 * pre-computation during data ingestion (see api.ts initData).
 */
export function truncateLabel(
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
  _style: ForceStyle,
): void {
  const sx = link.source.x ?? 0;
  const sy = link.source.y ?? 0;
  const tx = link.target.x ?? 0;
  const ty = link.target.y ?? 0;
  if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(tx) || !Number.isFinite(ty)) return;
  const adj = getRenderAdjustment(link.renderState, EDGE_RENDER_RULES);

  if (link.source === link.target) {
    drawSelfLoop(c, link, sx, sy, link.source.radius);
    return;
  }

  c.beginPath();
  c.strokeStyle = adj?.strokeColorOverride ?? link.strokeColor;
  c.lineWidth = adj?.strokeWidthMultiplier
    ? link.strokeWidth * adj.strokeWidthMultiplier
    : link.strokeWidth;
  if (adj?.shadow) {
    c.shadowColor = adj.shadow.color;
    c.shadowBlur = adj.shadow.blur;
  } else {
    c.shadowBlur = 0;
  }

  const isBidirectional = link.direction === "bidirectional";
  const useCubic = isBidirectional || link.shape === "s-curve";
  const useQuadratic = !useCubic && link.shape === "curve";

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

  if (link.strokeType === "dashed") {
    c.setLineDash([6, 4]);
  } else if (link.strokeType === "dotted") {
    c.setLineDash([2, 4]);
  } else {
    c.setLineDash([]);
  }
  c.stroke();
  c.setLineDash([]);
  c.shadowBlur = 0;

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
  const DEFAULT_RADIUS = 8;
  const targetR = (link.target.radius ?? DEFAULT_RADIUS) + ARROW_SIZE;
  const sourceR = (link.source.radius ?? DEFAULT_RADIUS) + ARROW_SIZE;
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) return; // self-loop handled separately
  const ux = dx / dist;
  const uy = dy / dist;
  const angle = Math.atan2(dy, dx);

  if (link.direction === "forward" || link.direction === "bidirectional") {
    drawArrowHead(c, tx - ux * targetR, ty - uy * targetR, angle, ARROW_SIZE);
  }
  if (link.direction === "reverse" || link.direction === "bidirectional") {
    drawArrowHead(c, sx + ux * sourceR, sy + uy * sourceR, angle + Math.PI, ARROW_SIZE);
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

function drawSelfLoop(
  c: OffscreenCanvasRenderingContext2D,
  _link: SimLink,
  x: number,
  y: number,
  r: number,
): void {
  const loopR = r + 12;
  c.beginPath();
  c.arc(x, y - loopR, 8, -Math.PI * 0.8, Math.PI * 0.8);
  c.stroke();
  // arrow at arc top
  drawArrowHead(c, x + 8, y - loopR - 8, -Math.PI / 2, 6);
}
