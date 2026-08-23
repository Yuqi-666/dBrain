/**
 * Label rendering: pooled `Text` objects with budget + LOD.
 *
 * Phase 3 performance tuning adds a priority-based label budget
 * (`LABEL_BUDGET` = 100) and a zoom-level LOD gate
 * (`TRANSFORM_THRESHOLD` = 1). Below the threshold scale all labels are
 * hidden regardless of budget.
 *
 * Text rasterization is expensive (canvas + GPU upload per change), so
 * `.text` / style are only reassigned when they actually differ — labels
 * only change on seed upsert, never per tick.
 *
 * See docs/force-pixijs-migration-plan.md §D5, §3.1.
 */

import { Text } from "pixi.js";
import type { SimLink, SimNode } from "../simulation";
import type { ForceStyle, ViewportState } from "../../types";
import {
  DEFAULT_LABEL_COLOR,
  LABEL_BUDGET,
  TRANSFORM_THRESHOLD,
  resolveDefaultLabelColor,
} from "../../styleConfig";
import {
  computeFrustum,
  getApp,
  getDevicePixelRatio,
  getLayers,
  isInFrustum,
} from "./app";

const labelPool = new Map<string, Text>();

/**
 * Priority score for label visibility. Higher = shown first. Mirrors
 * anytype's priority ordering: selected/hovered > root (no parent edges)
 * > high-degree > everything else.
 */
function labelPriority(node: SimNode, links: ReadonlyArray<SimLink>): number {
  if (node.renderState === "active") return 5;
  if (node.renderState === "selected") return 4;
  if (node.renderState === "hover") return 3;

  // Root: node is never a link target (no incoming edges).
  const isRoot = !links.some((l) => l.target.id === node.id);
  if (isRoot) return 2;

  // Degree: total edges where this node is source or target.
  let degree = 0;
  for (const l of links) {
    if (l.source.id === node.id || l.target.id === node.id) degree++;
  }
  return 1 + Math.min(degree, 999) / 1000; // fractional tie-break
}

/**
 * Update pooled labels for one frame. Labels are sorted by priority;
 * only the top `LABEL_BUDGET` are visible. When `viewport.scale` falls
 * below `TRANSFORM_THRESHOLD`, all labels are hidden (LOD gate).
 */
export function syncLabels(
  nodes: ReadonlyArray<SimNode>,
  links: ReadonlyArray<SimLink>,
  viewport: ViewportState,
  dims: { width: number; height: number },
  style?: ForceStyle,
): void {
  const app = getApp();
  const layers = getLayers();
  if (!app || !layers) return;

  const resolution = getDevicePixelRatio();
  const frustum = computeFrustum(viewport, dims);
  const visibleIds = new Set<string>();

  // LOD gate: hide all labels below the zoom threshold.
  const showAny = viewport.scale >= TRANSFORM_THRESHOLD;

  // Resolved once per frame — the background only changes on updateStyle,
  // so the dark/light judgment is independent of how many labels render.
  const bgLabelColor = style
    ? resolveDefaultLabelColor(style.backgroundColor ?? "#ffffff")
    : DEFAULT_LABEL_COLOR;

  // Sort visible label candidates by priority, cap at LABEL_BUDGET.
  const ranked = nodes
    .filter((n) => {
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      return (
        n.label &&
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        isInFrustum(x, y, frustum)
      );
    })
    .sort((a, b) => labelPriority(b, links) - labelPriority(a, links));
  const budgetSet = new Set(
    ranked.slice(0, Math.max(0, LABEL_BUDGET)).map((n) => n.id as string),
  );

  for (const node of ranked) {
    const id = node.id as string;
    visibleIds.add(id);

    const label = node.__label ?? node.label;
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    // Default-color labels adapt to the background; explicit per-node
    // overrides (business/client layers) pass through untouched.
    const fill =
      node.labelColor === DEFAULT_LABEL_COLOR ? bgLabelColor : node.labelColor;

    let t = labelPool.get(id);
    if (!t) {
      t = new Text({
        text: label,
        style: {
          fontFamily: "sans-serif",
          fontSize: node.labelSize,
          fill,
        },
        resolution,
      });
      t.anchor.set(0.5, 0);
      labelPool.set(id, t);
      layers.labels.addChild(t);
    } else {
      if (t.text !== label) t.text = label;
      if (t.style.fontSize !== node.labelSize)
        t.style.fontSize = node.labelSize;
      if (t.style.fill !== fill) t.style.fill = fill;
    }

    t.visible = showAny && budgetSet.has(id);
    t.position.set(Math.round(x), Math.round(y + node.radius + 4));
  }

  // Also track non-visible nodes for pool pruning.
  for (const node of nodes) {
    const id = node.id as string;
    if (!visibleIds.has(id)) {
      const t = labelPool.get(id);
      if (t) t.visible = false;
      visibleIds.add(id);
    }
  }

  // Prune labels for nodes that no longer exist.
  for (const [id, t] of labelPool) {
    if (!visibleIds.has(id)) {
      layers.labels.removeChild(t);
      t.destroy();
      labelPool.delete(id);
    }
  }
}
