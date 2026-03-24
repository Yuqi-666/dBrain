import type { NodeStyle } from "./style";

export interface NodeState {
  [state: string]: Partial<NodeStyle>;
}
