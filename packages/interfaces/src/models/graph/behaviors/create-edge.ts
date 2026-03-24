import type { IEvent, EdgeData } from "@antv/g6";

export interface CreateEdgeOptions {
  type?: "create-edge" | string;
  trigger?: "click" | "drag";
  enable?: boolean | ((event: IEvent) => boolean);
  onCreate?: (edge: EdgeData) => EdgeData;
  onFinish?: (edge: EdgeData) => void;
  style?: Record<string, unknown>;
}
