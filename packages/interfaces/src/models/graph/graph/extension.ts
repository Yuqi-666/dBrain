export enum ExtensionCategory {
  ANIMATION = "animation",
  BEHAVIOR = "behavior",
  NODE = "node",
  EDGE = "edge",
  LAYOUT = "layout",
  PALETTE = "palette",
  PLUGIN = "plugin",
  THEME = "theme",
  TRANSFORM = "transform",
}

export type BuiltInAnimation =
  | "node-collapse"
  | "node-expand"
  | "path-in"
  | "path-out"
  | "fade"
  | "translate";

export type BuiltInBehavior =
  | "brush-select"
  | "click-select"
  | "collapse-expand"
  | "create-edge"
  | "drag-canvas"
  | "drag-element-force"
  | "drag-element"
  | "fix-element-size"
  | "focus-element"
  | "hover-activate"
  | "lasso-select"
  | "optimize-viewport-transform"
  | "scroll-canvas"
  | "zoom-canvas";

export type BuiltInNodeType =
  | "circle"
  | "diamond"
  | "donut"
  | "ellipse"
  | "hexagon"
  | "html"
  | "image"
  | "rect"
  | "star"
  | "triangle";

export type BuiltInEdgeType =
  | "cubic"
  | "cubic-horizontal"
  | "cubic-vertical"
  | "cubic-radial"
  | "line"
  | "polyline"
  | "quadratic";


export type BuiltInLayoutType =
  | "antv-dagre"
  | "compact-box"
  | "force-atlas2"
  | "circular"
  | "concentric"
  | "d3-force"
  | "dagre"
  | "dendrogram"
  | "force"
  | "fruchterman"
  | "grid"
  | "indented"
  | "mds"
  | "mindmap"
  | "radial"
  | "random";

export type BuiltInPalette = string;

export type BuiltInPlugin =
  | "bubble-sets"
  | "edge-filter-lens"
  | "grid-line"
  | "background"
  | "contextmenu"
  | "fisheye"
  | "fullscreen"
  | "history"
  | "hull"
  | "legend"
  | "minimap"
  | "snapline"
  | "timebar"
  | "toolbar"
  | "tooltip"
  | "watermark";

export type BuiltInTransform = "process-parallel-edges" | "place-radial-labels";

export type BuiltInTheme = "light" | "dark";

export type BuiltInGraphic =
  | "circle"
  | "ellipse"
  | "group"
  | "html"
  | "image"
  | "line"
  | "path"
  | "polygon"
  | "polyline"
  | "rect"
  | "text"
  | "label"
  | "badge";
