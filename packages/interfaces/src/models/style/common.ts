export type CursorStyle =
  | "auto"
  | "default"
  | "none"
  | "context-menu"
  | "help"
  | "pointer"
  | "progress"
  | "wait"
  | "cell"
  | "crosshair"
  | "text"
  | "vertical-text"
  | "alias"
  | "copy"
  | "move"
  | "no-drop"
  | "not-allowed"
  | "grab"
  | "grabbing"
  | "all-scroll"
  | "col-resize"
  | "row-resize"
  | "n-resize"
  | "e-resize"
  | "s-resize"
  | "w-resize"
  | "ne-resize"
  | "nw-resize"
  | "se-resize"
  | "sw-resize"
  | "ew-resize"
  | "ns-resize"
  | "nesw-resize"
  | "nwse-resize"
  | "zoom-in"
  | "zoom-out";

export type PointerEvents =
  | "visible"
  | "visiblepainted"
  | "visiblestroke"
  | "non-transparent-pixel"
  | "visiblefill"
  | "visible"
  | "painted"
  | "fill"
  | "stroke"
  | "all"
  | "none"
  | "auto"
  | "inherit"
  | "initial"
  | "unset";

export type VisibilityStyle = "visible" | "hidden";

export type FontStyle = "normal" | "italic" | "oblique";
export type FontVariant = "normal" | "small-caps" | string;
export type FontWeight = "normal" | "bold" | "bolder" | "lighter" | number;

export type TextAlign =
  | "start"
  | "center"
  | "middle"
  | "end"
  | "left"
  | "right";

export type TextBaseline =
  | "top"
  | "hanging"
  | "middle"
  | "alphabetic"
  | "ideographic"
  | "bottom";

export type TextDecorationLine = string;
export type TextDecorationStyle =
  | "solid"
  | "double"
  | "dotted"
  | "dashed"
  | "wavy";

export type TextOverflow = "clip" | "ellipsis" | string;
export type FillRule = "nonzero" | "evenodd";
