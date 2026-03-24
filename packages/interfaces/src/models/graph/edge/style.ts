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
} from "../common";


export interface EdgeKeyStyle {
  stroke?: string;
  strokeOpacity?: number | string;
  lineWidth?: number;
  lineDash?: number[];
  lineDashOffset?: number;
  opacity?: number | string;
  visibility?: VisibilityStyle;
  zIndex?: number;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number | string;
  shadowOffsetY?: number | string;
  shadowType?: "inner" | "outer";
  transform?: string;
  transformOrigin?: string;
  sourcePort?: string;
  targetPort?: string;
  cursor?: CursorStyle;
  pointerEvents?: PointerEvents;
  increasedLineWidthForHitTesting?: number;
}

export interface EdgeLabelStyle {
  label?: boolean;
  labelText?: string | ((datum: unknown) => string);
  labelFill?: string;
  labelFontSize?: number;
  labelFontFamily?: string;
  labelFontStyle?: FontStyle;
  labelFontVariant?: FontVariant;
  labelFontWeight?: FontWeight;
  labelPlacement?: "start" | "center" | "end" | number;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelAutoRotate?: boolean;
  labelMaxWidth?: number | string;
  labelMaxLines?: number;
  labelWordWrap?: boolean;
  labelTextOverflow?: TextOverflow;
  labelTextAlign?: TextAlign;
  labelTextBaseline?: TextBaseline;
  labelLeading?: number;
  labelLetterSpacing?: number | string;
  labelLineHeight?: number | string;
  labelTextDecorationColor?: string;
  labelTextDecorationLine?: TextDecorationLine;
  labelTextDecorationStyle?: TextDecorationStyle;
  labelTextPath?: unknown;
  labelCursor?: CursorStyle;
  labelZIndex?: number;
  labelPadding?: number | number[];
}

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

export type ArrowType =
  | "triangle"
  | "circle"
  | "diamond"
  | "vee"
  | "rect"
  | "triangleRect"
  | "simple";

export interface ArrowStyleProps {
  arrow?: boolean;
  arrowType?: ArrowType;
  arrowSize?: number | [number, number];
  arrowFill?: string;
  arrowFillOpacity?: number;
  arrowStroke?: string;
  arrowStrokeOpacity?: number;
  arrowCursor?: CursorStyle;
  arrowOffset?: number;
}

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

export interface EdgeStyle
  extends
  EdgeKeyStyle,
  EdgeLabelStyle,
  EdgeLabelBackgroundStyle,
  EdgeHaloStyle,
  EdgeStartArrowStyle,
  EdgeEndArrowStyle,
  EdgeLoopStyle { }

export interface EdgePalette {
  color?: string | string[];
  field?: string | ((datum: unknown) => string);
  invert?: boolean;
  type?: "group" | "value";
}
