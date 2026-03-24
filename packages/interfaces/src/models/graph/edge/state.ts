import type { EdgeStyle } from "./style";

export interface EdgeState {
  [state: string]: Partial<EdgeStyle>;
}
