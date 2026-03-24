import type { BasePluginOptions } from "./common";

export interface BackgroundOptions extends BasePluginOptions {
  type: "background";
  width?: string;
  height?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  opacity?: string;
  transition?: string;
  zIndex?: string;
}
