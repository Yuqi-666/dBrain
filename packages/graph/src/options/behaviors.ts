export const DEFAULT_BEHAVIORS = [
  "drag-canvas",
  "zoom-canvas",
  "drag-element",
  "click-select",
  "hover-activate",
] as const;

// drag-node is deprecated in G6 5.x, drag-element already handles node dragging
export const NODE_DRAGGING_BEHAVIORS = [];

// click-edge and hover-edge are deprecated in G6 5.x, covered by click-select and hover-activate
export const EDGE_INTERACTION_BEHAVIORS = [];

export function getBehaviorsConfig(
  enableNodeDragging = true,
  enableEdgeInteractions = true,
) {
  const behaviors: string[] = [...DEFAULT_BEHAVIORS];
  if (enableNodeDragging) behaviors.push(...NODE_DRAGGING_BEHAVIORS);
  if (enableEdgeInteractions) behaviors.push(...EDGE_INTERACTION_BEHAVIORS);
  return behaviors;
}
