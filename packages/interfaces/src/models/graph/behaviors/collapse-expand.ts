import type { IEvent } from "@antv/g6";

export interface CollapseExpandOptions {
  type?: "collapse-expand" | string;
  animation?: boolean;
  enable?: boolean | ((event: IEvent) => boolean);
  trigger?: "click" | "dblclick";
  onCollapse?: (id: string) => void;
  onExpand?: (id: string) => void;
  align?: boolean;
}
