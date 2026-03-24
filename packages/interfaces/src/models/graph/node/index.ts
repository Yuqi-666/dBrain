import type { NodeAnimationConfig } from "./animate";
import type { NodeState } from "./state";
import type { NodeStyle, NodePalette } from "./style";
import type { NodeShapeType } from "./type";

export interface NodeOptions {
  type?: NodeShapeType | string | ((datum: unknown) => string);
  style?: NodeStyle;
  state?: NodeState;
  animation?: NodeAnimationConfig | false;
  palette?: NodePalette | string;
}

