import type { IEvent, NodeData, EdgeData } from "@antv/g6";
import type { FixShapeConfig } from "./types";

export interface FixElementSizeOptions {
  type?: "fix-element-size" | string;
  enable?: boolean | ((event: IEvent) => boolean);
  reset?: boolean;
  state?: string;
  node?: FixShapeConfig | FixShapeConfig[];
  nodeFilter?: (datum: NodeData) => boolean;
  edge?: FixShapeConfig | FixShapeConfig[];
  edgeFilter?: (datum: EdgeData) => boolean;
}
