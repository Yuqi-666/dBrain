import type {
  BasePluginOptions,
  CardinalPlacement,
  ToolbarItem,
} from "./common";

export interface ToolbarOptions extends BasePluginOptions {
  type: "toolbar";
  className?: string;
  position?: CardinalPlacement;
  style?: Record<string, unknown>;
  getItems?: () => ToolbarItem[] | Promise<ToolbarItem[]>;
  onClick?: (value: string, target: Element) => void;
}
