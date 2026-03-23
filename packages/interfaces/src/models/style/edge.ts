import type {
  CursorStyle,
  PointerEvents,
  VisibilityStyle,
  FontStyle,
  FontVariant,
  FontWeight,
  TextAlign,
  TextBaseline,
  TextDecorationLine,
  TextDecorationStyle,
  TextOverflow,
  FillRule,
} from "./common";

export type {
  CursorStyle,
  PointerEvents,
  VisibilityStyle,
  FontStyle,
  FontVariant,
  FontWeight,
  TextAlign,
  TextBaseline,
  TextDecorationLine,
  TextDecorationStyle,
  TextOverflow,
  FillRule,
};

export type EdgeShapeType =
  | "line"
  | "polyline"
  | "cubic"
  | "cubic-horizontal"
  | "cubic-vertical"
  | "quadratic";

// ============================================
// Edge Key Style (main path)
// ============================================

export interface EdgeKeyStyle {
  // Basic appearance
  stroke?: string;
  strokeOpacity?: number | string;
  lineWidth?: number;
  lineDash?: number[];
  lineDashOffset?: number;

  // Opacity and visibility
  opacity?: number | string;
  visibility?: VisibilityStyle;
  zIndex?: number;

  // Shadow
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number | string;
  shadowOffsetY?: number | string;
  shadowType?: "inner" | "outer";

  // Transform
  transform?: string;
  transformOrigin?: string;

  // Connection ports
  sourcePort?: string;
  targetPort?: string;

  // Interaction
  cursor?: CursorStyle;
  pointerEvents?: PointerEvents;
  increasedLineWidthForHitTesting?: number;
}

// ============================================
// Edge Label Style
// ============================================

export interface EdgeLabelStyle {
  // Label display
  label?: boolean;
  labelText?: string | ((datum: unknown) => string);

  // Label appearance
  labelFill?: string;
  labelFontSize?: number;
  labelFontFamily?: string;
  labelFontStyle?: FontStyle;
  labelFontVariant?: FontVariant;
  labelFontWeight?: FontWeight;

  // Label position
  labelPlacement?: "start" | "center" | "end" | number;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelAutoRotate?: boolean;

  // Label text layout
  labelMaxWidth?: number | string;
  labelMaxLines?: number;
  labelWordWrap?: boolean;
  labelTextOverflow?: TextOverflow;
  labelTextAlign?: TextAlign;
  labelTextBaseline?: TextBaseline;
  labelLeading?: number;
  labelLetterSpacing?: number | string;
  labelLineHeight?: number | string;

  // Label decoration
  labelTextDecorationColor?: string;
  labelTextDecorationLine?: TextDecorationLine;
  labelTextDecorationStyle?: TextDecorationStyle;

  // Label path
  labelTextPath?: unknown;

  // Label cursor
  labelCursor?: CursorStyle;

  // Label z-index
  labelZIndex?: number;

  // Label padding (for background)
  labelPadding?: number | number[];
}

// ============================================
// Edge Label Background Style
// ============================================

export interface EdgeLabelBackgroundStyle {
  labelBackground?: boolean;
  labelBackgroundFill?: string;
  labelBackgroundFillOpacity?: number;
  labelBackgroundStroke?: string;
  labelBackgroundStrokeOpacity?: number | string;
  labelBackgroundLineWidth?: number;
  labelBackgroundLineDash?: number | string | (number | string)[];
  labelBackgroundLineDashOffset?: number;
  labelBackgroundRadius?: number | number[];
  labelBackgroundPadding?: number | number[];
  labelBackgroundShadowColor?: string;
  labelBackgroundShadowBlur?: number;
  labelBackgroundShadowOffsetX?: number;
  labelBackgroundShadowOffsetY?: number;
  labelBackgroundVisibility?: VisibilityStyle;
  labelBackgroundZIndex?: number;
  labelBackgroundCursor?: CursorStyle;
  labelBackgroundHeight?: string | number;
}

// ============================================
// Edge Halo Style
// ============================================

export interface EdgeHaloStyle {
  halo?: boolean;
  haloStroke?: string;
  haloStrokeOpacity?: number;
  haloLineWidth?: number;
  haloFillRule?: FillRule;
  haloFilter?: string;
  haloPointerEvents?: PointerEvents;
  haloDraggable?: boolean;
  haloDroppable?: boolean;
  haloVisibility?: VisibilityStyle;
  haloZIndex?: number;
  haloCursor?: CursorStyle;
}

// ============================================
// Arrow Types
// ============================================

export type ArrowType =
  | "triangle"
  | "circle"
  | "diamond"
  | "vee"
  | "rect"
  | "triangleRect"
  | "simple";

// ============================================
// Edge Arrow Style
// ============================================

export interface ArrowStyleProps {
  // Arrow display
  arrow?: boolean;

  // Arrow type
  arrowType?: ArrowType;

  // Arrow size - number | [width, height]
  arrowSize?: number | [number, number];

  // Arrow fill
  arrowFill?: string;
  arrowFillOpacity?: number;

  // Arrow stroke
  arrowStroke?: string;
  arrowStrokeOpacity?: number;

  // Arrow cursor
  arrowCursor?: CursorStyle;

  // Arrow offset
  arrowOffset?: number;
}

// ============================================
// Edge Start/End Arrow (separate configs)
// ============================================

export interface EdgeStartArrowStyle extends ArrowStyleProps {
  startArrow?: boolean;
  startArrowType?: ArrowType;
  startArrowSize?: number | [number, number];
  startArrowFill?: string;
  startArrowFillOpacity?: number;
  startArrowStroke?: string;
  startArrowStrokeOpacity?: number;
  startArrowCursor?: CursorStyle;
  startArrowOffset?: number;
}

export interface EdgeEndArrowStyle extends ArrowStyleProps {
  endArrow?: boolean;
  endArrowType?: ArrowType;
  endArrowSize?: number | [number, number];
  endArrowFill?: string;
  endArrowFillOpacity?: number;
  endArrowStroke?: string;
  endArrowStrokeOpacity?: number;
  endArrowCursor?: CursorStyle;
  endArrowOffset?: number;
}

// ============================================
// Edge Loop Style (self-loop)
// ============================================

export interface EdgeLoopStyle {
  loop?: boolean;
  loopPlacement?:
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "left-top"
    | "left-bottom"
    | "right-top"
    | "right-bottom"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | ((datum: unknown) => string);
  loopDist?: number;
  loopClockwise?: boolean;
}

// ============================================
// Complete Edge Style
// ============================================

export interface EdgeStyle
  extends
    EdgeKeyStyle,
    EdgeLabelStyle,
    EdgeLabelBackgroundStyle,
    EdgeHaloStyle,
    EdgeStartArrowStyle,
    EdgeEndArrowStyle,
    EdgeLoopStyle {}

// ============================================
// Edge State Style
// ============================================

export interface EdgeState {
  [state: string]: Partial<EdgeStyle>;
}

// ============================================
// Edge Animation
// ============================================

export interface EdgeAnimationPhase {
  fields?: string[];
  duration?: number;
  easing?: string;
  [key: string]: unknown;
}

export interface EdgeAnimationConfig {
  enter?: EdgeAnimationPhase | "fade" | "path-in" | false;
  update?: EdgeAnimationPhase | "fade" | "path-in" | false;
  exit?: EdgeAnimationPhase | "fade" | false;
  show?: EdgeAnimationPhase | "fade" | false;
  hide?: EdgeAnimationPhase | "fade" | false;
  collapse?: EdgeAnimationPhase | false;
  expand?: EdgeAnimationPhase | false;
}

// ============================================
// Edge Palette
// ============================================

export interface EdgePalette {
  color?: string | string[];
  field?: string | ((datum: unknown) => string);
  invert?: boolean;
  type?: "group" | "value";
}

// ============================================
// Edge Options (complete edge config)
// ============================================

export interface EdgeOptions {
  type?: EdgeShapeType | string | ((datum: unknown) => string);
  style?: EdgeStyle;
  state?: EdgeState;
  animation?: EdgeAnimationConfig | false;
  palette?: EdgePalette | string;
}
