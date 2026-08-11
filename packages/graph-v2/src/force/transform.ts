/**
 * Force mode: source data → d3-force seed conversion.
 *
 * Merge order (lower → higher priority):
 *   defaults → business(stateData.server + semantic) → client(stateData.client) → worker(render)
 *
 * Layers 1–3 are resolved here. Layer 4 (render rules) is applied at paint
 * time in canvas.ts — it never changes the seed data.
 */

import type {
  EdgeData,
  EdgeSemanticId,
  EdgeType,
  NodeData,
  NodeSemanticId,
  ViewId,
} from "@workspace/interfaces";
import type { SourceDiff } from "../types";
import type { ForceLinkSeed, ForceNodeSeed } from "./types";
import {
  NODE_DEFAULTS,
  EDGE_DEFAULTS,
  NODE_BUSINESS_RULES,
  EDGE_BUSINESS_RULES,
  resolveBusinessStyle,
} from "./styleConfig";

// -----------------------------------------------------------------------
// Position persistence helpers
// -----------------------------------------------------------------------

export interface PositionEntry {
  viewId: ViewId;
  x: number;
  y: number;
}

export function getPositionForView(
  node: NodeData,
  viewId: ViewId,
): { x: number; y: number } | null {
  const positionMap = node.stateData?.position;
  if (!Array.isArray(positionMap)) return null;
  const entry = positionMap.find((p) => p.viewId === viewId);
  if (!entry) return null;
  if (!Number.isFinite(entry.x) || !Number.isFinite(entry.y)) return null;
  if (typeof entry.x !== "number" || typeof entry.y !== "number") return null;
  return { x: entry.x, y: entry.y };
}

// -----------------------------------------------------------------------
// EdgeType → shape / strokeType mappings
// -----------------------------------------------------------------------

const EDGE_TYPE_TO_SHAPE: Record<EdgeType, ForceLinkSeed["shape"]> = {
  hierarchy: "straight",
  association: "straight",
  flow: "curve",
  interaction: "s-curve",
};

const EDGE_TYPE_TO_STROKE_TYPE: Record<EdgeType, ForceLinkSeed["strokeType"]> = {
  association: "dashed",
  hierarchy: "solid",
  flow: "solid",
  interaction: "solid",
};

// -----------------------------------------------------------------------
// Transform options
// -----------------------------------------------------------------------

export interface TransformOptions {
  viewId: ViewId;
  /** External joined data: NodeSemantic.id → color. Applied at business layer. */
  semanticColorMap?: Map<NodeSemanticId, string>;
  /** External joined data: EdgeSemantic.id → color. Applied at business layer. */
  edgeSemanticColorMap?: Map<EdgeSemanticId, string>;
}

// -----------------------------------------------------------------------
// Node conversion
// -----------------------------------------------------------------------

/**
 * Convert `NodeData[]` → `ForceNodeSeed[]`.
 *
 * Per-node merge pipeline (later wins):
 *   1. NODE_DEFAULTS
 *   2. stateData.server → resolveBusinessStyle() via NODE_BUSINESS_RULES
 *   3. semanticColorMap[semanticId] → fillColor (external joined data)
 *   4. stateData.client → spread overrides (explicit display)
 */
export function nodeDataToForceSeeds(
  nodes: ReadonlyArray<NodeData>,
  options: TransformOptions,
): ForceNodeSeed[] {
  return nodes.map((node) => {
    // Layer 1: defaults
    let resolved: Record<string, unknown> = { ...NODE_DEFAULTS };

    // Layer 2: business — stateData.server rules + semantic color
    const server = node.stateData?.server as Record<string, unknown> | undefined;
    resolved = resolveBusinessStyle(server, NODE_BUSINESS_RULES, resolved);
    if (node.semanticId && options.semanticColorMap) {
      const semanticColor = options.semanticColorMap.get(node.semanticId);
      if (semanticColor) resolved = { ...resolved, fillColor: semanticColor };
    }

    // Layer 3: client — explicit display overrides (highest priority before worker)
    const client = node.stateData?.client as Record<string, unknown> | undefined;
    if (client) resolved = { ...resolved, ...client };

    const seed: ForceNodeSeed = {
      id: node.id,
      fillColor: resolved.fillColor as string,
      strokeColor: resolved.strokeColor as string,
      strokeWidth: resolved.strokeWidth as number,
      label: node.title,
      labelColor: resolved.labelColor as string,
      labelSize: resolved.labelSize as number,
      radius: (node.stateData?.weight as number) ?? (resolved.radius as number),
      nodeType: node.nodeType,
      viewId: options.viewId,
    };

    const persisted = getPositionForView(node, options.viewId);
    if (persisted) {
      seed.x = persisted.x;
      seed.y = persisted.y;
    }

    return seed;
  });
}

// -----------------------------------------------------------------------
// Edge conversion
// -----------------------------------------------------------------------

/**
 * Convert `EdgeData[]` → `ForceLinkSeed[]`.
 *
 * Per-edge merge pipeline (later wins):
 *   1. EDGE_DEFAULTS + edgeType → shape/strokeType
 *   2. stateData.server → resolveBusinessStyle() via EDGE_BUSINESS_RULES
 *   3. edgeSemanticColorMap[semanticId] → strokeColor (external joined data)
 *   4. stateData.client → spread overrides (explicit display)
 */
export function edgeDataToForceSeeds(
  edges: ReadonlyArray<EdgeData>,
  options?: TransformOptions,
): ForceLinkSeed[] {
  return edges.map((edge) => {
    // Layer 1: defaults + edgeType-driven shape/strokeType
    let resolved: Record<string, unknown> = {
      ...EDGE_DEFAULTS,
      shape: EDGE_TYPE_TO_SHAPE[edge.edgeType],
      strokeType: EDGE_TYPE_TO_STROKE_TYPE[edge.edgeType],
    };

    // Layer 2: business — stateData.server rules + semantic color
    const server = edge.stateData?.server as Record<string, unknown> | undefined;
    resolved = resolveBusinessStyle(server, EDGE_BUSINESS_RULES, resolved);
    if (edge.semanticId && options?.edgeSemanticColorMap) {
      const semanticColor = options.edgeSemanticColorMap.get(edge.semanticId);
      if (semanticColor) resolved = { ...resolved, strokeColor: semanticColor };
    }

    // Layer 3: client — explicit display overrides
    const client = edge.stateData?.client as Record<string, unknown> | undefined;
    if (client) resolved = { ...resolved, ...client };

    return {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      label: (edge.stateData?.label as string) ?? "",
      labelColor: resolved.labelColor as string,
      labelSize: resolved.labelSize as number,
      shape: resolved.shape as ForceLinkSeed["shape"],
      strokeType: resolved.strokeType as ForceLinkSeed["strokeType"],
      strokeColor: resolved.strokeColor as string,
      strokeWidth: resolved.strokeWidth as number,
      direction: edge.direction,
      weight: edge.weight,
    };
  });
}

// -----------------------------------------------------------------------
// Single-seed helpers (diff)
// -----------------------------------------------------------------------

export function singleNodeToForceSeed(
  node: NodeData,
  options: TransformOptions,
): ForceNodeSeed {
  return nodeDataToForceSeeds([node], options)[0]!;
}

export function singleEdgeToForceSeed(
  edge: EdgeData,
): ForceLinkSeed {
  return edgeDataToForceSeeds([edge])[0]!;
}

// -----------------------------------------------------------------------
// Diff extraction
// -----------------------------------------------------------------------

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

  return { nodeUpserts, nodeRemovals, linkUpserts, linkRemovals };
}
