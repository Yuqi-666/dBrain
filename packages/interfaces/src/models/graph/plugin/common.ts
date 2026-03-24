/**
 * Base plugin options that all plugins can extend
 */
export interface BasePluginOptions {
  /** Plugin type */
  type: string;
  /** Unique identifier for the plugin, used for later updates */
  key?: string;
}

/**
 * Position placement options for plugins
 */
export type CardinalPlacement =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "left-top"
  | "left-bottom"
  | "right-top"
  | "right-bottom"
  | "center";

/**
 * Text align options
 */
export type TextAlign = "center" | "end" | "left" | "right" | "start";

/**
 * Text baseline options
 */
export type TextBaseline =
  | "alphabetic"
  | "bottom"
  | "hanging"
  | "ideographic"
  | "middle"
  | "top";

/**
 * Label placement options
 */
export type LabelPlacement = "left" | "right" | "top" | "bottom" | "center";

/**
 * Corner type options
 */
export type CornerType = "rounded" | "smooth" | "sharp";

/**
 * Trigger options for interactive plugins
 */
export type TriggerType =
  | "hover"
  | "click"
  | "contextmenu"
  | "pointermove"
  | "drag";

/**
 * Scale control options
 */
export type ScaleByType = "wheel" | "drag";

/**
 * Filter mode options
 */
export type FilterMode = "modify" | "visibility";

/**
 * Timebar type options
 */
export type TimebarType = "time" | "chart";

/**
 * Layout options for legend
 */
export type LegendLayout = "flex" | "grid";

/**
 * Orientation options
 */
export type Orientation = "horizontal" | "vertical";

/**
 * Element type for filtering
 */
export type ElementType = "node" | "edge" | "combo";

/**
 * Node type filter for edge filter lens
 */
export type EdgeFilterNodeType = "both" | "source" | "target" | "either";

/**
 * Graph data types
 */
export interface GraphData {
  nodes?: Record<string, unknown>[];
  edges?: Record<string, unknown>[];
  combos?: Record<string, unknown>[];
}

/**
 * Command data for history plugin
 */
export interface CommandData {
  add?: GraphData;
  update?: GraphData;
  remove?: GraphData;
}

/**
 * Command for history plugin
 */
export interface Command {
  current: CommandData;
  original: CommandData;
  animation?: boolean;
}

/**
 * History event types
 */
export enum HistoryEvent {
  UNDO = "undo",
  REDO = "redo",
  CANCEL = "cancel",
  ADD = "add",
  CLEAR = "clear",
  CHANGE = "change",
}

/**
 * Toolbar item interface
 */
export interface ToolbarItem {
  /** Icon ID */
  id: string;
  /** Value returned when clicked */
  value: string;
}

/**
 * Context menu item interface
 */
export interface ContextMenuItem {
  /** Display name */
  name: string;
  /** Associated value */
  value: string;
}

/**
 * Time data for timebar
 */
export interface TimeData {
  time: number;
  value?: number;
}
