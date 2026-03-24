import type { IEvent } from "@antv/g6";
import type {
  ElementState,
  LassoSelectMode,
  BrushSelectStyleOptions,
} from "./types";

export interface LassoSelectOptions {
  type?: "lasso-select" | string;
  animation?: boolean;
  enable?: boolean | ((event: IEvent) => boolean);
  enableElements?: ("node" | "edge")[];
  immediately?: boolean;
  mode?: LassoSelectMode;
  onSelect?: (
    states: Record<string, string | string[]>,
  ) => Record<string, string | string[]>;
  state?: string | ElementState;
  style?: BrushSelectStyleOptions;
  trigger?: string[];
}
