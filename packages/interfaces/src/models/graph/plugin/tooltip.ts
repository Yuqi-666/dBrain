import type { BasePluginOptions, TriggerType } from "./common";

export type TooltipPosition =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface TooltipOptions extends BasePluginOptions {
  type: "tooltip";
  position?: TooltipPosition;
  enable?: boolean | ((event: unknown, items: unknown[]) => boolean);
  getContent?: (
    event: unknown,
    items: unknown[],
  ) => Promise<HTMLElement | string> | HTMLElement | string;
  onOpenChange?: (open: boolean) => void;
  trigger?: TriggerType | "hover" | "click";
  container?: string | HTMLElement;
  offset?: [number, number];
  enterable?: boolean;
  title?: string;
  style?: Record<string, unknown>;
}
