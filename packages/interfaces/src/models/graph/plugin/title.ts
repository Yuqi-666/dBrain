import type { BasePluginOptions } from "./common";

export type TitleAlign = "left" | "center" | "right";

export interface TitleOptions extends BasePluginOptions {
  type: "title";
  title?: string;
  subtitle?: string;
  spacing?: number;
  className?: string;
  align?: TitleAlign;
  size?: number;
  padding?: number | number[];
}
