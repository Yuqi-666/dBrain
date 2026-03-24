import type { BasePluginOptions, TextAlign, TextBaseline } from "./common";

export interface WatermarkOptions extends BasePluginOptions {
  type: "watermark";
  width?: number;
  height?: number;
  opacity?: number;
  rotate?: number;
  imageURL?: string;
  text?: string;
  textFill?: string;
  textFontSize?: number;
  textFontFamily?: string;
  textFontWeight?: string;
  textFontVariant?: string;
  textAlign?: TextAlign;
  textBaseline?: TextBaseline;
  backgroundRepeat?: string;
  backgroundAttachment?: string;
  backgroundBlendMode?: string;
  backgroundClip?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOrigin?: string;
  backgroundPosition?: string;
  backgroundPositionX?: string;
  backgroundPositionY?: string;
  backgroundSize?: string;
}
