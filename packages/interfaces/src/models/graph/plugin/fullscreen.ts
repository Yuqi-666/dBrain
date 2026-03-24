import type { BasePluginOptions } from "./common";

export interface FullscreenOptions extends BasePluginOptions {
  type: "fullscreen";
  autoFit?: boolean;
  trigger?: {
    request?: string;
    exit?: string;
  };
  onEnter?: () => void;
  onExit?: () => void;
}
