/**
 * Grid rendering: a single world-anchored `Graphics` (simulation space,
 * under the world transform) rebuilt only when the viewport or dims
 * change. Hairline via `lineWidth = 0.5 / scale` (local units, so the
 * world transform cancels it to a constant 0.5 device px). Visible only
 * when `scale > 0.5` and a grid color is set — matching the Canvas 2D
 * renderer.
 *
 * See docs/force-pixijs-migration-plan.md §D5.
 */

import type { ForceStyle, ViewportState } from "../../types";
import { getLayers } from "./app";

const GRID_STEP = 50;

/** Cache key of the last rebuilt grid (viewport + dims + color). */
let lastKey = "";

export function syncGrid(
  viewport: ViewportState,
  dims: { width: number; height: number },
  style: ForceStyle,
): void {
  const layers = getLayers();
  if (!layers) return;

  const visible = viewport.scale > 0.5 && !!style.gridColor;
  layers.grid.visible = visible;
  if (!visible) return;

  const key = `${viewport.x},${viewport.y},${viewport.scale},${dims.width},${dims.height},${style.gridColor}`;
  if (key === lastKey) return;
  lastKey = key;

  const g = layers.grid;
  g.clear();

  const invScale = 1 / viewport.scale;
  const startX = Math.floor((-viewport.x * invScale) / GRID_STEP) * GRID_STEP;
  const startY = Math.floor((-viewport.y * invScale) / GRID_STEP) * GRID_STEP;
  const endX = startX + dims.width * invScale + GRID_STEP;
  const endY = startY + dims.height * invScale + GRID_STEP;

  for (let gx = startX; gx <= endX; gx += GRID_STEP) {
    g.moveTo(gx, startY);
    g.lineTo(gx, endY);
  }
  for (let gy = startY; gy <= endY; gy += GRID_STEP) {
    g.moveTo(startX, gy);
    g.lineTo(endX, gy);
  }

  g.stroke({ width: 0.5 / viewport.scale, color: style.gridColor });
}
