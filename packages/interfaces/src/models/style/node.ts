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

export type NodeShapeType =
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

export type LineCap = "round" | "square" | "butt";
export type LineJoin = "round" | "bevel" | "miter";

export type LabelPlacement =
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
  | "center"
  | "bottom";

// ============================================
// Node Style - Main shape styles
// ============================================

export interface NodeKeyStyle {
  // Basic appearance
  fill?: string;
  fillOpacity?: number | string;
  stroke?: string;
  strokeOpacity?: number | string;
  lineWidth?: number;
  lineDash?: number[];
  lineDashOffset?: number;
  lineCap?: LineCap;
  lineJoin?: LineJoin;

  // Size - number | [width, height] | [width, height, depth]
  size?: number | number[];

  // Opacity and visibility
  opacity?: number | string;
  visibility?: VisibilityStyle;
  z?: number;
  zIndex?: number;

  // Position
  x?: number;
  y?: number;

  // Shadow
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number | string;
  shadowOffsetY?: number | string;
  shadowType?: "inner" | "outer";

  // Transform
  transform?: string;
  transformOrigin?: string;

  // Interaction
  cursor?: CursorStyle;
  pointerEvents?: PointerEvents;
  collapsed?: boolean;
  increasedLineWidthForHitTesting?: number;
}

// ============================================
// Node Label Style
// ============================================

export interface NodeLabelStyle {
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

  // Label layout
  labelPlacement?: LabelPlacement;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelMaxWidth?: number | string;
  labelMaxLines?: number;
  labelWordWrap?: boolean;
  labelTextOverflow?: TextOverflow;

  // Label text alignment
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
// Node Label Background Style
// ============================================

export interface NodeLabelBackgroundStyle {
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
// Node Halo Style (glow effect around main shape)
// ============================================

export interface NodeHaloStyle {
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
// Node Icon Style
// ============================================

export interface NodeIconStyle {
  icon?: boolean;
  iconText?: string | ((datum: unknown) => string);
  iconSrc?: string | ((datum: unknown) => string);
  iconFill?: string;
  iconFontSize?: number;
  iconFontFamily?: string;
  iconFontStyle?: FontStyle;
  iconFontVariant?: FontVariant;
  iconFontWeight?: number | string;
  iconWidth?: number;
  iconHeight?: number;
  iconRadius?: number;

  // Icon text layout
  iconMaxLines?: number;
  iconWordWrap?: boolean;
  iconTextOverflow?: TextOverflow;
  iconTextAlign?: TextAlign;
  iconTextBaseline?: TextBaseline;
  iconLetterSpacing?: number | string;
  iconLineHeight?: number | string;

  // Icon text decoration
  iconTextDecorationColor?: string;
  iconTextDecorationLine?: TextDecorationLine;
  iconTextDecorationStyle?: TextDecorationStyle;
}

// ============================================
// Node Badge Style
// ============================================

export interface BadgeStyleProps {
  // Display
  background?: boolean;
  text?: string;

  // Position
  placement?:
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
    | "bottom-right";
  offsetX?: number;
  offsetY?: number;

  // Appearance
  fill?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: FontStyle;
  fontVariant?: FontVariant;
  fontWeight?: number | string;
  lineHeight?: string | number;
  maxLines?: number;
  padding?: number | number[];
  backgroundFill?: string;
  backgroundFillOpacity?: number;
  backgroundFilter?: string;
  backgroundHeight?: string | number;
  backgroundLineDash?: number | string | (number | string)[];
  backgroundLineDashOffset?: number;
  backgroundLineWidth?: number;
  backgroundRadius?: number | number[] | string;
  backgroundShadowBlur?: number;
  backgroundShadowColor?: string;
  backgroundShadowOffsetX?: number;
  backgroundShadowOffsetY?: number;
  backgroundStroke?: string;
  backgroundStrokeOpacity?: number | string;
  backgroundVisibility?: VisibilityStyle;
  backgroundZIndex?: number;
  backgroundCursor?: CursorStyle;
  wordWrap?: boolean;
  zIndex?: number;

  // Text alignment
  textAlign?: TextAlign;
  textBaseline?: TextBaseline;
  textDecorationColor?: string;
  textDecorationLine?: TextDecorationLine;
  textDecorationStyle?: TextDecorationStyle;
  textOverflow?: TextOverflow;
  visibility?: VisibilityStyle;
  lineWidth?: string | number;
}

export interface NodeBadgeStyle {
  badge?: boolean;
  badges?: BadgeStyleProps[];
  badgePalette?: string[];
  badgeFontSize?: number;
}

// ============================================
// Node Port Style (connection points)
// ============================================

export interface PortStyleProps {
  // Required
  placement:
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "center"
    | "left-top"
    | "left-bottom"
    | "right-top"
    | "right-bottom"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | [number, number];

  // Optional
  key?: string;
  r?: number;
  linkToCenter?: boolean;
  cursor?: CursorStyle;
  fill?: string;
  fillOpacity?: number;
  isBillboard?: boolean;
  isSizeAttenuation?: boolean;
  lineDash?: number | string | (number | string)[];
  lineDashOffset?: number;
  lineWidth?: number;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  stroke?: string;
  strokeOpacity?: number | string;
  visibility?: VisibilityStyle;
  zIndex?: number;
}

export interface NodePortStyle {
  port?: boolean;
  ports?: PortStyleProps[];
  portR?: number;
  portLineWidth?: number;
  portStroke?: string;
  portFill?: string;
}

// ============================================
// Complete Node Style (union of all parts)
// ============================================

export interface NodeStyle
  extends
    NodeKeyStyle,
    NodeLabelStyle,
    NodeLabelBackgroundStyle,
    NodeHaloStyle,
    NodeIconStyle,
    NodeBadgeStyle,
    NodePortStyle {}

// ============================================
// Node State Style
// ============================================

export interface NodeState {
  [state: string]: Partial<NodeStyle>;
}

// ============================================
// Node Animation
// ============================================

export interface NodeAnimationPhase {
  fields?: string[];
  duration?: number;
  easing?: string;
  [key: string]: unknown;
}

export interface NodeAnimationConfig {
  enter?: NodeAnimationPhase | "fade" | "translate" | "scale" | false;
  update?: NodeAnimationPhase | "fade" | "translate" | "scale" | false;
  exit?: NodeAnimationPhase | "fade" | "translate" | "scale" | false;
  show?: NodeAnimationPhase | "fade" | false;
  hide?: NodeAnimationPhase | "fade" | false;
  collapse?: NodeAnimationPhase | false;
  expand?: NodeAnimationPhase | false;
}

// ============================================
// Node Palette
// ============================================

export interface NodePalette {
  color?: string | string[];
  field?: string | ((datum: unknown) => string);
  invert?: boolean;
  type?: "group" | "value";
}

// ============================================
// Node Options (complete node config)
// ============================================

export interface NodeOptions {
  type?: NodeShapeType | string | ((datum: unknown) => string);
  style?: NodeStyle;
  state?: NodeState;
  animation?: NodeAnimationConfig | false;
  palette?: NodePalette | string;
}
