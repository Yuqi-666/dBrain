import type { IEvent } from "@antv/g6";
import type { ElementState } from "./types";

export interface ClickSelectOptions {
  type?: "click-select" | string;
  animation?: boolean;
  degree?: number | ((event: IEvent) => number);
  enable?: boolean | ((event: IEvent) => boolean);
  multiple?: boolean;
  state?: string | ElementState;
  neighborState?: string | ElementState;
  unselectedState?: string | ElementState;
  onClick?: (event: IEvent) => void;
  trigger?: string[];
}
