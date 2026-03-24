export interface EdgeAnimationPhase {
  fields?: string[];
  duration?: number;
  easing?: string;
  [key: string]: unknown;
}

export interface EdgeAnimationConfig {
  enter?: EdgeAnimationPhase | "fade" | "path-in" | false;
  update?: EdgeAnimationPhase | "fade" | "path-in" | false;
  exit?: EdgeAnimationPhase | "fade" | false;
  show?: EdgeAnimationPhase | "fade" | false;
  hide?: EdgeAnimationPhase | "fade" | false;
  collapse?: EdgeAnimationPhase | false;
  expand?: EdgeAnimationPhase | false;
}

