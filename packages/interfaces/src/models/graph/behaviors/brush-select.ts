import type { IEvent } from "@antv/g6";
import type {
  ElementState,
  BrushSelectMode,
  BrushSelectStyleOptions,
} from "./types";

export interface BrushSelectOptions {
  type?: "brush-select" | string;
  animation?: boolean;
  enable?: boolean | ((event: IEvent) => boolean);
  enableElements?: ("node" | "edge")[];
  immediately?: boolean;
  mode?: BrushSelectMode;
  onSelect?: (
    states: Record<string, string | string[]>,
  ) => Record<string, string | string[]>;
  state?: string | ElementState;
  style?: BrushSelectStyleOptions;
  trigger?: string[];
}
