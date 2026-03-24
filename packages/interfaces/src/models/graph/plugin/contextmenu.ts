import type { BasePluginOptions, ContextMenuItem, TriggerType } from "./common";

export interface ContextMenuOptions extends BasePluginOptions {
  type: "contextmenu";
  className?: string;
  trigger?: TriggerType | "contextmenu" | "click";
  offset?: [number, number];
  onClick?: (value: string, target: HTMLElement, current: unknown) => void;
  getItems?: (event: unknown) => ContextMenuItem[] | Promise<ContextMenuItem[]>;
  getContent?: (
    event: unknown,
  ) => HTMLElement | string | Promise<HTMLElement | string>;
  loadingContent?: HTMLElement | string;
  enable?: boolean | ((event: unknown) => boolean);
}
