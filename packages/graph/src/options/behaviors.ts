export const DEFAULT_BEHAVIORS = [
  "drag-canvas",
  "zoom-canvas",
  "drag-element",
  "click-select",
  "hover-element",
] as const;

export const NODE_DRAGGING_BEHAVIORS = ["drag-node"];

export const EDGE_INTERACTION_BEHAVIORS = ["click-edge", "hover-edge"];

export function getBehaviorsConfig(
  enableNodeDragging = true,
  enableEdgeInteractions = true,
) {
  const behaviors: string[] = [...DEFAULT_BEHAVIORS];
  if (enableNodeDragging) behaviors.push(...NODE_DRAGGING_BEHAVIORS);
  if (enableEdgeInteractions) behaviors.push(...EDGE_INTERACTION_BEHAVIORS);
  return behaviors;
}
