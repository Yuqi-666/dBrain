import type { CursorStyle } from "../common";

/**
 * Graph instance properties
 */
export interface GraphProperties {
  /** Whether the graph instance has been destroyed */
  destroyed: boolean;
  /** Whether the graph instance has completed rendering */
  rendered: boolean;
}

/**
 * Viewport configuration
 */
export interface ViewportConfig {
  /** Viewport x coordinate */
  x?: number;
  /** Viewport y coordinate */
  y?: number;
  /** Zoom ratio */
  zoom?: number;
  /** Zoom range limit [min, max] */
  zoomRange?: [number, number];
  /** Rotation angle in radians */
  rotation?: number;
}

/**
 * Canvas configuration
 */
export interface CanvasConfig {
  /** Canvas container - DOM ID, HTMLElement, or Canvas instance */
  container?: string | HTMLElement | unknown;
  /** Device pixel ratio */
  devicePixelRatio?: number;
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
  /** Cursor style */
  cursor?: CursorStyle;
  /** Background color */
  background?: string;
  /** Renderer function for each layer */
  renderer?: (layer: "background" | "main" | "label" | "transient") => unknown;
  /** Enable multi-layer rendering */
  enableMultiLayer?: boolean;
}

/**
 * Auto-fit configuration
 */
export interface AutoFitConfig {
  /** Auto-fit type */
  type: "view" | "center";
  /** Fit view options */
  options?: FitViewOptions;
  /** Animation configuration */
  animation?: ViewportAnimationEffectTiming;
}

/**
 * Fit view options
 */
export interface FitViewOptions {
  /** When to fit: 'overflow' - only when content overflows, 'always' - always fit */
  when?: "overflow" | "always";
  /** Fit direction: 'x', 'y', or 'both' */
  direction?: "x" | "y" | "both";
}

/**
 * Viewport animation effect timing
 */
export type ViewportAnimationEffectTiming =
  | boolean
  | {
    /** Animation easing function */
    easing?: string;
    /** Animation duration in milliseconds */
    duration?: number;
  };

/**
 * Fit view type - can be string or object
 */
export type FitViewType = "view" | "center" | AutoFitConfig;
