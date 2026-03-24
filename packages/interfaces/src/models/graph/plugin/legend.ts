import type {
  BasePluginOptions,
  CardinalPlacement,
  LegendLayout,
  Orientation,
  TriggerType,
} from "./common";

export interface LegendOptions extends BasePluginOptions {
  type: "legend";
  trigger?: TriggerType | "hover" | "click";
  position?: CardinalPlacement;
  container?: HTMLElement | string;
  className?: string;
  containerStyle?: Record<string, unknown>;
  nodeField?: string | ((item: Record<string, unknown>) => string);
  edgeField?: string | ((item: Record<string, unknown>) => string);
  comboField?: string | ((item: Record<string, unknown>) => string);
  orientation?: Orientation | "horizontal" | "vertical";
  layout?: LegendLayout | "flex" | "grid";
  showTitle?: boolean;
  titleText?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  itemSpacing?: number;
  rowPadding?: number;
  colPadding?: number;
  itemMarkerSize?: number;
  itemLabelFontSize?: number;
  gridCol?: number;
  gridRow?: number;
}
