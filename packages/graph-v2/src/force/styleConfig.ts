/**
 * Force mode PRIVATE theme + state palette.
 *
 * Single source of truth for the visual tokens consumed by both the
 * OffscreenCanvas renderer (`worker/canvas.ts`) and the main thread
 * `ForceGraph.tsx` (for fallback rendering during worker init failures).
 *
 * Color tables come straight from the main design (L156-168 for nodes,
 * L194-201 for edges, L222-225 for themes).
 *
 * Architectural note: the `Theme` enum ("light" | "dark") is defined
 * in the shared `../types` layer (it applies to both force and flow
 * modes). This module uses it but does NOT re-export it. Consumers
 * who need the `Theme` type should import from `../types` directly.
 */

import type { Theme } from "../types";
import type { UiState } from "./types";

// -----------------------------------------------------------------------
// Theme tokens
// -----------------------------------------------------------------------



export interface ThemeTokens {
  /** Canvas background fill color. */
  backgroundColor: string;
  /** Default node fill when no semantic color is provided. */
  nodeColor: string;
  /** Default edge stroke when no semantic color is provided. */
  edgeColor: string;
  /** Label text color. */
  labelColor: string;
  /** Foreground grid line color (optional, used for debugging). */
  gridColor?: string;
}

export const LIGHT_THEME: ThemeTokens = {
  backgroundColor: "#ffffff",
  nodeColor: "#165DFF",
  edgeColor: "#91caff",
  labelColor: "#1f2937",
  gridColor: "#e5e7eb",
};

export const DARK_THEME: ThemeTokens = {
  backgroundColor: "#0a0a0a",
  nodeColor: "#4080FF",
  edgeColor: "#69b1ff",
  labelColor: "#f3f4f6",
  gridColor: "#262626",
};

export function getThemeTokens(theme: Theme): ThemeTokens {
  return theme === "dark" ? DARK_THEME : LIGHT_THEME;
}

// -----------------------------------------------------------------------
// State color palette (UiState → colors + line width + shadow)
// -----------------------------------------------------------------------

export interface StateVisual {
  /** Stroke / outline color. */
  stroke: string;
  /** Fill color (overrides theme nodeColor when present). */
  fill?: string;
  /** Stroke width in pixels. */
  lineWidth: number;
  /** Optional CSS-style drop shadow. */
  shadow?: { color: string; blur: number };
}

/**
 * Node state → visual style (per main design L156-168).
 *
 * Order matches the `UiState` enum declaration in `types.ts`.
 */
export const NODE_STATE_STYLES: Record<UiState, StateVisual> = {
  default: { stroke: "currentColor", lineWidth: 2 },
  active: {
    stroke: "#FF7D00",
    lineWidth: 3,
    shadow: { color: "rgba(255,125,0,0.3)", blur: 5 },
  },
  selected: {
    stroke: "#FF7D00",
    lineWidth: 3,
    shadow: { color: "rgba(255,125,0,0.3)", blur: 5 },
  },
  hover: {
    stroke: "#4080FF",
    lineWidth: 2.5,
    shadow: { color: "rgba(22,93,255,0.2)", blur: 5 },
  },
  neighborActive: {
    stroke: "#FFB266",
    lineWidth: 2.5,
    shadow: { color: "rgba(255,178,102,0.15)", blur: 5 },
  },
  inactive: { stroke: "#9ca3af", lineWidth: 2 },
  disabled: { stroke: "#d1d5db", lineWidth: 1 },
};

/**
 * Edge state → visual style (per main design L194-201).
 */
export const EDGE_STATE_STYLES: Record<UiState, StateVisual> = {
  default: { stroke: "currentColor", lineWidth: 2 },
  active: {
    stroke: "#FF7D00",
    lineWidth: 3,
    shadow: { color: "rgba(255,125,0,0.3)", blur: 5 },
  },
  selected: {
    stroke: "#FF7D00",
    lineWidth: 3,
    shadow: { color: "rgba(255,125,0,0.3)", blur: 5 },
  },
  hover: {
    stroke: "#4080FF",
    lineWidth: 2.5,
    shadow: { color: "rgba(22,93,255,0.2)", blur: 5 },
  },
  neighborActive: {
    stroke: "#FFB266",
    lineWidth: 2.5,
    shadow: { color: "rgba(255,178,102,0.15)", blur: 5 },
  },
  inactive: { stroke: "#9ca3af", lineWidth: 2 },
  disabled: { stroke: "#d1d5db", lineWidth: 1 },
};

// -----------------------------------------------------------------------
// Combined ForceStyle (used to push to worker)
// -----------------------------------------------------------------------

export interface ForceStyleOptions {
  theme: Theme;
  /** Override the default node radius (used as `weight` too). */
  nodeRadius?: number;
  /** Override the default edge line width. */
  edgeLineWidth?: number;
}

/**
 * Build a full `ForceStyle` payload (sent to worker via `updateStyle`).
 */
export function buildForceStyle(opts: ForceStyleOptions): import("./types").ForceStyle {
  const tokens = getThemeTokens(opts.theme);
  return {
    theme: opts.theme,
    backgroundColor: tokens.backgroundColor,
    nodeColor: tokens.nodeColor,
    edgeColor: tokens.edgeColor,
    labelColor: tokens.labelColor,
    nodeRadius: opts.nodeRadius ?? 8,
    edgeLineWidth: opts.edgeLineWidth ?? 2,
    edgeDash: [6, 4],
  };
}

// -----------------------------------------------------------------------
// Default simulation parameters
// -----------------------------------------------------------------------

export interface DefaultForceConfig {
  strength: number;
  collisionRadius: number;
  linkDistance: number;
  alphaMin: number;
  alphaDecay: number;
  velocityDecay: number;
}

export const DEFAULT_FORCE_CONFIG: DefaultForceConfig = {
  strength: -300,
  collisionRadius: 12, // weight (8) + 4
  linkDistance: 80,
  alphaMin: 0.001,
  alphaDecay: 0.0228,
  velocityDecay: 0.4,
};
