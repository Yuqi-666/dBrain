import type { EdgeAnimationConfig } from "./animate";
import type { EdgeState } from "./state";
import type { EdgeStyle, EdgePalette } from "./style";
import type { EdgeShapeType } from "./type";

export interface EdgeOptions {
  type?: EdgeShapeType | string | ((datum: unknown) => string);
  style?: EdgeStyle;
  state?: EdgeState;
  animation?: EdgeAnimationConfig | false;
  palette?: EdgePalette | string;
}

