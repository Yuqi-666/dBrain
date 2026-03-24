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

export interface NodeKeyStyle {
  fill?: string;
  fillOpacity?: number | string;
  stroke?: string;
  strokeOpacity?: number | string;
  lineWidth?: number;
  lineDash?: number[];
  lineDashOffset?: number;
  lineCap?: LineCap;
  lineJoin?: LineJoin;
  size?: number | number[];
  opacity?: number | string;
  visibility?: VisibilityStyle;
  z?: number;
  zIndex?: number;
  x?: number;
  y?: number;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number | string;
  shadowOffsetY?: number | string;
  shadowType?: "inner" | "outer";
  transform?: string;
  transformOrigin?: string;
  cursor?: CursorStyle;
  pointerEvents?: PointerEvents;
  collapsed?: boolean;
  increasedLineWidthForHitTesting?: number;
}

export interface NodeLabelStyle {
  label?: boolean;
  labelText?: string | ((datum: unknown) => string);
  labelFill?: string;
  labelFontSize?: number;
  labelFontFamily?: string;
  labelFontStyle?: FontStyle;
  labelFontVariant?: FontVariant;
  labelFontWeight?: FontWeight;
  labelPlacement?: LabelPlacement;
  labelOffsetX?: number;
  labelOffsetY?: number;
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
  iconMaxLines?: number;
  iconWordWrap?: boolean;
  iconTextOverflow?: TextOverflow;
  iconTextAlign?: TextAlign;
  iconTextBaseline?: TextBaseline;
  iconLetterSpacing?: number | string;
  iconLineHeight?: number | string;
  iconTextDecorationColor?: string;
  iconTextDecorationLine?: TextDecorationLine;
  iconTextDecorationStyle?: TextDecorationStyle;
}

export interface BadgeStyleProps {
  background?: boolean;
  text?: string;
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

export interface PortStyleProps {
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

export interface NodeStyle
  extends
  NodeKeyStyle,
  NodeLabelStyle,
  NodeLabelBackgroundStyle,
  NodeHaloStyle,
  NodeIconStyle,
  NodeBadgeStyle,
  NodePortStyle { }


export interface NodePalette {
  color?: string | string[];
  field?: string | ((datum: unknown) => string);
  invert?: boolean;
  type?: "group" | "value";
}
