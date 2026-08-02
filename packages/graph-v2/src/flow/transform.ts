/**
 * Flow mode: source ↔ ReactFlow transformation.
 *
 * This module is the data bridge between `@workspace/interfaces`
 * (`NodeData` / `EdgeData`) and the ReactFlow v12 types (`Node` / `Edge`).
 *
 * Key contracts (per docs/07-agent/graph-v2/src/flow/design.md §4):
 *
 *   - `RenderableNodeData` carries `{ source: NodeData, position }`.
 *   - `RenderableNode = Node<RenderableNodeData, NodeDataType>` so ReactFlow
 *     can route to the correct node component via `nodeTypes[type]`.
 *   - `RenderableEdge = Edge<RenderableEdgeData, string>` (same idea for
 *     edges).
 *   - Position persistence lives in `NodeData.stateData.position[viewId]`
 *     (main design L417-428).
 *   - Flow mode does NOT express UI state. The only selection visual is
 *     ReactFlow's built-in `selected` prop (the `rf-selected` class on
 *     the host container). The 7-state `UiState` is force-mode private.
 */

import type {
  EdgeData,
  NodeData,
  NodeDataType,
  NodeId,
  ViewId,
} from "@workspace/interfaces";
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  XYPosition,
} from "@xyflow/react";

// -----------------------------------------------------------------------
// Position persistence helpers
// -----------------------------------------------------------------------

export interface PositionEntry {
  viewId: ViewId;
  x: number;
  y: number;
}

export type PositionMap = PositionEntry[];

/**
 * Read the position entry for a given view from `NodeData.stateData.position`.
 * Returns `null` when no entry exists.
 */
export function getPositionForView(
  node: NodeData,
  viewId: ViewId,
): { x: number; y: number } | null {
  const positionMap = node.stateData?.position;
  if (!Array.isArray(positionMap)) return null;
  const entry = positionMap.find((p) => p.viewId === viewId);
  if (!entry) return null;
  if (typeof entry.x !== "number" || typeof entry.y !== "number") {
    return null;
  }
  return { x: entry.x, y: entry.y };
}

/**
 * Immutable write: returns a new `NodeData` with the position entry for
 * `viewId` set to `{x, y}`. Preserves all other fields and any existing
 * entries for other views.
 */
export function setPositionForView(
  node: NodeData,
  viewId: ViewId,
  x: number,
  y: number,
): NodeData {
  const positionMap = Array.isArray(node.stateData?.position)
    ? (node.stateData!.position as PositionMap)
    : [];
  const existingIndex = positionMap.findIndex((p) => p.viewId === viewId);
  const newEntry: PositionEntry = { viewId, x, y };
  const newPositionMap: PositionMap =
    existingIndex >= 0
      ? positionMap.map((p, i) => (i === existingIndex ? newEntry : p))
      : [...positionMap, newEntry];

  return {
    ...node,
    stateData: {
      ...(node.stateData ?? {}),
      position: newPositionMap,
    },
  };
}

// -----------------------------------------------------------------------
// Renderable data types
// -----------------------------------------------------------------------

export interface RenderableNodeData extends Record<string, unknown> {
  /** Original `NodeData` from `@workspace/interfaces`. */
  source: NodeData;
  /** Position derived from `stateData.position[viewId]`. */
  position: { x: number; y: number };
}

export type RenderableNode = Node<RenderableNodeData, NodeDataType>;

export interface RenderableEdgeData extends Record<string, unknown> {
  source: EdgeData;
}

export type RenderableEdge = Edge<RenderableEdgeData, string>;

// -----------------------------------------------------------------------
// Source → ReactFlow (forward)
// -----------------------------------------------------------------------

/**
 * Convert a list of `NodeData` to ReactFlow `RenderableNode[]`.
 *
 * Position resolution priority (per flow/design.md §3.3):
 *   1. `stateData.position[viewId]` — persisted flow-mode coord.
 *   2. First entry of `stateData.position` — cross-view backfill (avoid
 *      node stacking when switching views).
 *   3. `{ x: 0, y: 0 }` — dagre fallback (stub: caller may replace).
 */
export function sourceToRenderableNodes(
  nodes: ReadonlyArray<NodeData>,
  viewId: ViewId,
): RenderableNode[] {
  return nodes.map((node) => {
    const persisted = getPositionForView(node, viewId);
    let position: XYPosition;
    if (persisted) {
      position = { x: persisted.x, y: persisted.y };
    } else {
      const allPositions = node.stateData?.position;
      if (Array.isArray(allPositions) && allPositions.length > 0) {
        const fallback = allPositions[0];
        position = { x: fallback.x, y: fallback.y };
      } else {
        position = { x: 0, y: 0 };
      }
    }

    return {
      id: node.id,
      type: node.nodeType,
      position,
      data: {
        source: node,
        position,
      },
    };
  });
}

/**
 * Convert a list of `EdgeData` to ReactFlow `RenderableEdge[]`.
 */
export function sourceToRenderableEdges(
  edges: ReadonlyArray<EdgeData>,
): RenderableEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    type: edge.edgeType,
    source: edge.from,
    target: edge.to,
    data: {
      source: edge,
    },
  }));
}

// -----------------------------------------------------------------------
// ReactFlow → Source (reverse)
// -----------------------------------------------------------------------

export interface PositionDelta {
  id: NodeId;
  x: number;
  y: number;
  viewId: ViewId;
}

/**
 * Build a `NodeService.upsert` patch from a position change. Returns
 * `null` when the node has been deleted concurrently (gracefully
 * no-ops).
 */
export function positionDeltaToSource(
  delta: PositionDelta,
  getNode: (id: NodeId) => NodeData | undefined,
): { id: NodeId; patch: { stateData: Record<string, unknown> } } | null {
  const node = getNode(delta.id);
  if (!node) return null;
  const updated = setPositionForView(node, delta.viewId, delta.x, delta.y);
  return { id: delta.id, patch: { stateData: updated.stateData ?? {} } };
}

export interface EdgeAdd {
  source: NodeId;
  target: NodeId;
  sourceHandle?: string;
  targetHandle?: string;
}

export function connectionToEdgeAdd(c: Connection): EdgeAdd {
  return {
    source: c.source as NodeId,
    target: c.target as NodeId,
    sourceHandle: c.sourceHandle ?? undefined,
    targetHandle: c.targetHandle ?? undefined,
  };
}

// -----------------------------------------------------------------------
// ReactFlow change-list filters
// -----------------------------------------------------------------------

export function isPositionChange(
  c: NodeChange,
): c is NodeChange & { type: "position"; id: string; position: XYPosition } {
  return (
    c.type === "position" &&
    "position" in c &&
    (c as { dragging?: boolean }).dragging === false
  );
}

export function isSelectChange(
  c: EdgeChange,
): c is EdgeChange & { id: string; selected: boolean } {
  return c.type === "select";
}
