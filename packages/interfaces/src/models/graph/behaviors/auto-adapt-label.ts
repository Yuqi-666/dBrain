import type { IEvent, NodeData, EdgeData } from "@antv/g6";
import type { NodeCentralityOptions } from "./types";

export interface AutoAdaptLabelOptions {
  type?: "auto-adapt-label" | string;
  enable?: boolean | ((event: IEvent) => boolean);
  throttle?: number;
  padding?: number | number[];
  sort?: (a: unknown, b: unknown) => -1 | 0 | 1;
  sortNode?:
  | NodeCentralityOptions
  | ((nodeA: NodeData, nodeB: NodeData) => -1 | 0 | 1);
  sortEdge?: (edgeA: EdgeData, edgeB: EdgeData) => -1 | 0 | 1;
}
