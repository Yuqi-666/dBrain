import type {
  BasePluginOptions,
  EdgeFilterNodeType,
  ScaleByType,
  TriggerType,
} from "./common";

export interface EdgeFilterLensOptions extends BasePluginOptions {
  type: "edge-filter-lens";
  trigger?: TriggerType | "pointermove" | "click" | "drag";
  r?: number;
  maxR?: number;
  minR?: number;
  scaleRBy?: ScaleByType | "wheel";
  nodeType?: EdgeFilterNodeType;
  filter?: (id: string, elementType: "node" | "edge" | "combo") => boolean;
  style?: Record<string, unknown>;
  nodeStyle?:
    | Record<string, unknown>
    | ((datum: Record<string, unknown>) => Record<string, unknown>);
  edgeStyle?:
    | Record<string, unknown>
    | ((datum: Record<string, unknown>) => Record<string, unknown>);
  preventDefault?: boolean;
}
