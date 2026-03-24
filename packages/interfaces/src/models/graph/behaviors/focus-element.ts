import type { IEvent } from "@antv/g6";
import type { FocusElementAnimation } from "./types";

export interface FocusElementOptions {
  type?: "focus-element" | string;
  animation?: FocusElementAnimation;
  enable?: boolean | ((event: IEvent) => boolean);
  trigger?: string[];
}
