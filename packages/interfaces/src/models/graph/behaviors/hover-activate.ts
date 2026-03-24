import type { IEvent } from "@antv/g6";

export interface HoverActivateOptions {
  type?: "hover-activate" | string;
  animation?: boolean;
  enable?: boolean | ((event: IEvent) => boolean);
  degree?: number | ((event: IEvent) => number);
  direction?: "both" | "in" | "out";
  state?: string;
  inactiveState?: string;
  onHover?: (event: IEvent) => void;
  onHoverEnd?: (event: IEvent) => void;
}
