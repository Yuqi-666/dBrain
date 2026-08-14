/**
 * Public API surface of `@workspace/graph-v2`.
 *
 * Consumers should import from this entry point rather than reaching
 * into subpaths directly.
 *
 * Module ownership rules:
 *   - `src/types.ts`              — shared types (canonical home)
 *   - `src/force/*`               — private force-mode types
 *   - `src/flow/*`                — private flow-mode types
 *   - `src/eventHandler.ts`       — bridge layer (allowed to import
 *     force-specific WorkerEvent because `handleWorkerEvent` is
 *     force-specific by design)
 *
 * Re-exports follow ownership: a type is re-exported from the module
 * that DEFINES it, never from a module that merely uses it.
 */

// Main components.
export { Graph, type GraphProps } from "./graph";
export { ForceGraph } from "./force/ForceGraph";
export { FlowGraph } from "./flow/FlowGraph";

// Shared types — canonical home is src/types.ts.
export type {
  Modifiers,
  Theme,
  GraphSnapshot,
  SourceDiff,
  DiffCallback,
} from "./types";
export { collectEdgeEndpointIds } from "./types";

// Force-mode types (defined in force/*, re-exported from their own module).
export type {
  ForceNodeSeed,
  ForceLinkSeed,
  ForceConfig,
  ForceStyle,
  ForceDiffPayload,
  WorkerEvent,
  WorkerInbound,
  ProxiedDomEvent,
  ViewportState,
  Dimensions,
} from "./force/types";

// Flow-mode types (defined in flow/*, re-exported from their own module).
export type {
  PositionEntry,
  PositionMap,
  RenderableNode,
  RenderableNodeData,
  RenderableEdge,
  RenderableEdgeData,
  PositionDelta,
  EdgeAdd,
} from "./flow/transform";

// Flow nodes.
export {
  TextNode,
  ImageNode,
  PdfNode,
  VideoNode,
  AudioNode,
  WebpageNode,
  WebsiteNode,
  CollectionNode,
  RichTextNode,
} from "./flow/nodes";
export { nodeTypes } from "./flow/nodes";

// Flow edges.
export {
  HierarchyEdge,
  FlowEdge,
  AssociationEdge,
  InteractionEdge,
} from "./flow/edges";
export { edgeTypes } from "./flow/edges";

// Force transforms.
export {
  nodeDataToForceSeeds,
  edgeDataToForceSeeds,
  singleNodeToForceSeed,
  singleEdgeToForceSeed,
  diffToForcePayload,
  getPosition as getPositionForForce,
  setPosition as setPositionForForce,
} from "./force/transform";

// Flow transforms.
export {
  sourceToRenderableNodes,
  sourceToRenderableEdges,
  positionDeltaToSource,
  connectionToEdgeAdd,
  setPosition,
  getPosition,
} from "./flow/transform";

// Force sim defaults.
export {
  DEFAULT_FORCE_CONFIG,
} from "./force/styleConfig";
export type { DefaultForceConfig } from "./force/styleConfig";

// Shared event handler (the single callback surface injected into
// ForceGraph / FlowGraph).
export { useGraphEventHandler } from "./eventHandler";
export type {
  GraphEventHandler,
  ContextMenuArgs,
  ContextMenuKind,
  NodeContextMenuArgs,
  EdgeContextMenuArgs,
  CanvasContextMenuArgs,
} from "./eventHandler";
