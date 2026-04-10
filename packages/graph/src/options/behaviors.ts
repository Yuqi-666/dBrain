import type { LayoutType } from "@workspace/interfaces";

const BASE_BEHAVIORS = [
  "drag-canvas",
  "zoom-canvas",
  "scroll-canvas",
  "optimize-viewport-transform",
  "click-select",
  "hover-activate",
] as const;

export const NODE_DRAGGING_BEHAVIORS = [];

export const EDGE_INTERACTION_BEHAVIORS = [];

export function getBehaviorsConfig(
  enableNodeDragging = true,
  enableEdgeInteractions = true,
  layoutType?: LayoutType,
) {
  const behaviors: string[] = [...BASE_BEHAVIORS];
  if (layoutType === "D3force") {
    behaviors.push("drag-element-force");
  } else {
    behaviors.push("drag-element");
  }
  if (enableNodeDragging) behaviors.push(...NODE_DRAGGING_BEHAVIORS);
  if (enableEdgeInteractions) behaviors.push(...EDGE_INTERACTION_BEHAVIORS);
  return behaviors;
}
