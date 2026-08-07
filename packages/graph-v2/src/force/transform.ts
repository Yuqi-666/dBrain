/**
 * Force mode: source data → d3-force seed conversion.
 *
 * Responsibilities:
 *   - Convert `NodeData[]` → `ForceNodeSeed[]` (with first-load position
 *     backfill from `stateData.position[currentViewId]`, per main design
 *     L432).
 *   - Convert `EdgeData[]` → `ForceLinkSeed[]` (pass-through with
 *     `ui: "default"`).
 *   - Build `ForceNodeSeed` from a single `NodeData` (used by diff handlers).
 *
 * Cross-document contract: force/design.md §2.4, worker/design.md §4.5.
 */

import type {
  EdgeData,
  NodeData,
  ViewId,
} from "@workspace/interfaces";
import type { SourceDiff } from "../types";
import type { UiState } from "./types";
import type {
  ForceLinkSeed,
  ForceNodeSeed,
} from "./types";

// -----------------------------------------------------------------------
// Position persistence helpers (shared with flow mode conceptually, but
// force has its own copy because the flow transform.ts is a separate file
// and force never imports from flow).
// -----------------------------------------------------------------------

export interface PositionEntry {
  viewId: ViewId;
  x: number;
  y: number;
}

/**
 * Read the position entry for a given view from `NodeData.stateData.position`.
 * Returns `null` when no entry exists.
 *
 * Matches the schema in main design L417-428:
 *   stateData.position = [{ viewId, x, y }, ...]
 */
export function getPositionForView(
  node: NodeData,
  viewId: ViewId,
): { x: number; y: number } | null {
  const positionMap = node.stateData?.position;
  if (!Array.isArray(positionMap)) return null;
  const entry = positionMap.find((p) => p.viewId === viewId);
  if (!entry) return null;
  if (!Number.isFinite(entry.x) || !Number.isFinite(entry.y)) {
    return null;
  }
  if (typeof entry.x !== "number" || typeof entry.y !== "number") {
    return null;
  }
  return { x: entry.x, y: entry.y };
}

// -----------------------------------------------------------------------
// Source → Seed conversion
// -----------------------------------------------------------------------

export interface TransformOptions {
  /** Current view id (used to look up `stateData.position[viewId]`). */
  viewId: ViewId;
  /** Default state to assign to every seed (default: "default"). */
  defaultState?: UiState;
}

/**
 * Convert a list of `NodeData` to `ForceNodeSeed[]`.
 *
 * For each node:
 *   1. Read the persisted position from `stateData.position[viewId]` if
 *      present, and use it as `x` / `y` (no `fx`/`fy` — force mode does
 *      not persist pins, only initial coords).
 *   2. Otherwise leave `x` / `y` undefined so d3-force falls back to its
 *      phyllotaxis initializer.
 *   3. Use `node.title` as the canvas label.
 *   4. Use the `weight` from the node's `stateData.weight`, or default
 *      to 8 (matches styleConfig default radius).
 */
export function nodeDataToForceSeeds(
  nodes: ReadonlyArray<NodeData>,
  options: TransformOptions,
): ForceNodeSeed[] {
  const defaultState = options.defaultState ?? "default";
  return nodes.map((node) => {
    const seed: ForceNodeSeed = {
      id: node.id,
      title: node.title,
      ui: defaultState,
      viewId: options.viewId,
      nodeType: node.nodeType,
    };
    const persisted = getPositionForView(node, options.viewId);
    if (persisted) {
      seed.x = persisted.x;
      seed.y = persisted.y;
    }
    // Pin coordinates are intentionally left undefined. They are only
    // set when the user actively drags a node (force/eventListener.ts).
    return seed;
  });
}

/**
 * Convert `EdgeData[]` to `ForceLinkSeed[]`. Pass-through with
 * `ui: "default"`.
 */
export function edgeDataToForceSeeds(
  edges: ReadonlyArray<EdgeData>,
  options?: { defaultState?: UiState },
): ForceLinkSeed[] {
  const defaultState = options?.defaultState ?? "default";
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    edgeType: edge.edgeType,
    direction: edge.direction,
    ui: defaultState,
    weight: edge.weight,
  }));
}

/**
 * Build a single `ForceNodeSeed` from a `NodeData` (used by diff handlers
 * to emit an `nodeUpsert` entry). Honors the same position backfill logic
 * as `nodeDataToForceSeeds`.
 */
export function singleNodeToForceSeed(
  node: NodeData,
  options: TransformOptions,
): ForceNodeSeed {
  return nodeDataToForceSeeds([node], options)[0] as ForceNodeSeed;
}

/**
 * Build a single `ForceLinkSeed` from an `EdgeData`.
 */
export function singleEdgeToForceSeed(
  edge: EdgeData,
  options?: { defaultState?: UiState },
): ForceLinkSeed {
  return edgeDataToForceSeeds([edge], options)[0] as ForceLinkSeed;
}

// -----------------------------------------------------------------------
// Diff extraction
// -----------------------------------------------------------------------

/**
 * Convert a store-level `Diff` (added/updated/removed) into a Comlink-
 * friendly `ForceDiffPayload` for the worker.
 *
 * The `viewId` filter is applied here so the worker only sees entries that
 * belong to the current view. Edges that reference filtered-out nodes are
 * dropped too (to avoid dangling references).
 */

export function diffToForcePayload(
  diff: SourceDiff,
  options: TransformOptions,
): import("./types").ForceDiffPayload {
  const upsertedNodes = [...diff.nodes.added, ...diff.nodes.updated];
  const nodeUpserts = nodeDataToForceSeeds(upsertedNodes, options);
  const nodeRemovals = diff.nodes.removed;

  const upsertedEdges = [...diff.edges.added, ...diff.edges.updated];
  const linkUpserts = edgeDataToForceSeeds(upsertedEdges, options);
  const linkRemovals = diff.edges.removed;

  return {
    nodeUpserts,
    nodeRemovals,
    linkUpserts,
    linkRemovals,
  };
}
