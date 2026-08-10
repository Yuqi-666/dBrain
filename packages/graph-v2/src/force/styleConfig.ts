/**
 * Force mode PRIVATE style configuration.
 *
 * Four-layer style pipeline (lower → higher priority):
 *   1. Defaults — baseline visual properties.
 *   2. Business layer — stateData.server (runtime business state) + semantic.color (external joined data).
 *   3. Client layer — stateData.client (explicit display overrides from user).
 *   4. Render layer — worker interaction state (hover/select/active) applied at paint time.
 *
 * Merge order: defaults → business → client → worker
 *
 * All visual properties (layers 1–3) are resolved on the main thread during
 * seed construction. The worker only applies render rules at canvas paint time.
 */

import type { ForceConfig, RenderState } from "./types";

// -----------------------------------------------------------------------
// 1. Defaults
// -----------------------------------------------------------------------

export const NODE_DEFAULTS = {
  fillColor: "#165DFF",
  strokeColor: "#165DFF",
  strokeWidth: 2,
  labelColor: "#1f2937",
  labelSize: 14,
  radius: 8,
} as const;

export const EDGE_DEFAULTS = {
  strokeColor: "#91caff",
  strokeWidth: 2,
  labelColor: "#9ca3af",
  labelSize: 12,
  shape: "straight" as const,
  strokeType: "solid" as const,
} as const;

// -----------------------------------------------------------------------
// 2. Business layer (stateData.server + external joined data)
// -----------------------------------------------------------------------

export interface BusinessStyleRule {
  field: string;
  mapping: Record<string, Partial<{
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    labelColor: string;
    labelSize: number;
    radius: number;
  }>>;
}

export const NODE_BUSINESS_RULES: BusinessStyleRule[] = [];

export interface EdgeBusinessStyleRule {
  field: string;
  mapping: Record<string, Partial<{
    strokeColor: string;
    strokeWidth: number;
    labelColor: string;
    labelSize: number;
    shape: "straight" | "curve" | "s-curve";
    strokeType: "solid" | "dotted" | "dashed";
  }>>;
}

export const EDGE_BUSINESS_RULES: EdgeBusinessStyleRule[] = [];

export function resolveBusinessStyle<T extends Record<string, unknown>>(
  stateData: Record<string, unknown> | undefined,
  rules: ReadonlyArray<{ field: string; mapping: Record<string, Partial<T>> }>,
  defaults: T,
): T {
  if (!stateData) return defaults;
  let result = { ...defaults };
  for (const rule of rules) {
    const value = stateData[rule.field];
    if (value === undefined || value === null) continue;
    const key = String(value);
    const overrides = rule.mapping[key];
    if (overrides) result = { ...result, ...overrides };
  }
  return result;
}

// -----------------------------------------------------------------------
// 3. Render rules (worker interaction state → canvas paint-time adjustments)
// -----------------------------------------------------------------------

export interface WorkerRenderRule {
  condition: "selected" | "hover" | "active" | "neighbor" | "inactive";
  adjust: {
    strokeWidthMultiplier?: number;
    strokeColorOverride?: string;
    shadow?: { color: string; blur: number };
  };
}

export const NODE_RENDER_RULES: WorkerRenderRule[] = [
  {
    condition: "active",
    adjust: {
      strokeWidthMultiplier: 2.0,
      strokeColorOverride: "#FF9500",
      shadow: { color: "rgba(255,149,0,0.5)", blur: 8 },
    },
  },
  {
    condition: "selected",
    adjust: {
      strokeWidthMultiplier: 1.5,
      strokeColorOverride: "#FF7D00",
      shadow: { color: "rgba(255,125,0,0.3)", blur: 5 },
    },
  },
  {
    condition: "hover",
    adjust: {
      strokeWidthMultiplier: 1.25,
      strokeColorOverride: "#4080FF",
      shadow: { color: "rgba(22,93,255,0.2)", blur: 5 },
    },
  },
  {
    condition: "neighbor",
    adjust: { strokeColorOverride: "#FFB266", shadow: { color: "rgba(255,178,102,0.15)", blur: 5 } },
  },
  {
    condition: "inactive",
    adjust: { strokeColorOverride: "#9ca3af" },
  },
];

export const EDGE_RENDER_RULES: WorkerRenderRule[] = [
  {
    condition: "active",
    adjust: {
      strokeWidthMultiplier: 2.0,
      strokeColorOverride: "#FF9500",
      shadow: { color: "rgba(255,149,0,0.5)", blur: 8 },
    },
  },
  {
    condition: "selected",
    adjust: {
      strokeWidthMultiplier: 1.5,
      strokeColorOverride: "#FF7D00",
      shadow: { color: "rgba(255,125,0,0.3)", blur: 5 },
    },
  },
  {
    condition: "hover",
    adjust: {
      strokeWidthMultiplier: 1.25,
      strokeColorOverride: "#4080FF",
      shadow: { color: "rgba(22,93,255,0.2)", blur: 5 },
    },
  },
  {
    condition: "neighbor",
    adjust: { strokeColorOverride: "#FFB266", shadow: { color: "rgba(255,178,102,0.15)", blur: 5 } },
  },
  {
    condition: "inactive",
    adjust: { strokeColorOverride: "#9ca3af" },
  },
];

export function getRenderAdjustment(
  renderState: RenderState | undefined,
  rules: ReadonlyArray<WorkerRenderRule>,
): WorkerRenderRule["adjust"] | undefined {
  if (!renderState || renderState === "default") return undefined;
  return rules.find((r) => r.condition === renderState)?.adjust;
}

// -----------------------------------------------------------------------
// Default simulation parameters
// -----------------------------------------------------------------------

export interface DefaultForceConfig {
  strength: number;
  collisionRadius: number;
  linkDistance: number;
  centerX: number;
  centerY: number;
  alphaMin: number;
  alphaDecay: number;
  velocityDecay: number;
}

export const DEFAULT_FORCE_CONFIG = {
  strength: -300,
  collisionRadius: 12,
  linkDistance: 80,
  centerX: 0,
  centerY: 0,
  alphaMin: 0.001,
  alphaDecay: 0.0228,
  velocityDecay: 0.4,
} as const satisfies Partial<ForceConfig>;
