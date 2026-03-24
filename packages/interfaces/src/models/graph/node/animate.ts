export interface NodeAnimationPhase {
  fields?: string[];
  duration?: number;
  easing?: string;
  [key: string]: unknown;
}

export interface NodeAnimationConfig {
  enter?: NodeAnimationPhase | "fade" | "translate" | "scale" | false;
  update?: NodeAnimationPhase | "fade" | "translate" | "scale" | false;
  exit?: NodeAnimationPhase | "fade" | "translate" | "scale" | false;
  show?: NodeAnimationPhase | "fade" | false;
  hide?: NodeAnimationPhase | "fade" | false;
  collapse?: NodeAnimationPhase | false;
  expand?: NodeAnimationPhase | false;
}


