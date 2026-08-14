"use client";

/**
 * Common shell for all 4 edge variants.
 *
 * Responsibilities:
 *   - Resolve the right path utility (`getStraightPath`, `getBezierPath`,
 *     `getSimpleBezierPath`) based on the semantic `category`, with a
 *     `bidirectional` override that forces cubic.
 *   - Resolve markerStart / markerEnd based on `direction`.
 *   - Apply the `edge--selected` / `edge--default` className (consumed
 *     by the host app's global stylesheet) plus ReactFlow's built-in
 *     `selected` styling via the underlying BaseEdge.
 *   - Render the semantic label via `<EdgeLabelRenderer>` when present.
 *
 * Flow mode does not express UI state — there is no 7-state palette
 * here. The 7-state `UiState` enum is force-mode private.
 */

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSimpleBezierPath,
  getStraightPath,
  type EdgeProps,
  type Position,
} from "@xyflow/react";
import type { EdgeDirection, EdgeType } from "@workspace/interfaces";
import { useDataStore } from "@workspace/store";
import type { RenderableEdge, RenderableEdgeData } from "../transform";

export type CustomEdgeProps = EdgeProps<RenderableEdge>;
export type CustomEdgeComponent = React.ComponentType<CustomEdgeProps>;

// -----------------------------------------------------------------------
// Path + marker resolution
// -----------------------------------------------------------------------

type PathType = "straight" | "bezier" | "simplebezier";

const EDGE_TYPE_TO_PATH: Record<EdgeType, PathType> = {
  hierarchy: "straight",
  flow: "bezier",
  interaction: "simplebezier",
  association: "straight",
};

/**
 * Resolve the actual `PathType` for an edge.
 *
 * Precedence (per EdgeShellProps JSDoc):
 *   1. `pathTypeOverride` (used by variants to force a shape)
 *   2. `direction === "bidirectional"` → always `simplebezier`
 *   3. `EDGE_TYPE_TO_PATH[edgeType]` lookup
 */
function resolvePathType(
  edgeType: EdgeType,
  direction: EdgeDirection,
  pathTypeOverride: PathType | undefined,
): PathType {
  if (pathTypeOverride) return pathTypeOverride;
  if (direction === "bidirectional") return "simplebezier";
  return EDGE_TYPE_TO_PATH[edgeType];
}

function computePath(
  pathType: PathType,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position,
): [string, number, number] {
  switch (pathType) {
    case "straight":
      return take3(
        getStraightPath({ sourceX, sourceY, targetX, targetY }),
      );
    case "bezier":
      return take3(
        getBezierPath({
          sourceX,
          sourceY,
          targetX,
          targetY,
          sourcePosition,
          targetPosition,
        }),
      );
    case "simplebezier":
      return take3(
        getSimpleBezierPath({
          sourceX,
          sourceY,
          targetX,
          targetY,
          sourcePosition,
          targetPosition,
        }),
      );
    default: {
      const _exhaustive: never = pathType;
      void _exhaustive;
      return ["", 0, 0];
    }
  }
}

/** ReactFlow v12 returns 5-tuple from path utilities; we only need the
 *  first three. */
function take3(
  t: readonly [string, number, number, number?, number?],
): [string, number, number] {
  return [t[0], t[1], t[2]];
}

function getMarkerProps(direction: EdgeDirection): {
  markerStart?: string;
  markerEnd?: string;
} {
  switch (direction) {
    case "forward":
      return { markerEnd: "url(#arrow-end)" };
    case "reverse":
      return { markerStart: "url(#arrow-start)" };
    case "undirected":
      return {};
    case "bidirectional":
      return {
        markerStart: "url(#arrow-start)",
        markerEnd: "url(#arrow-end)",
      };
    default: {
      const _exhaustive: never = direction;
      void _exhaustive;
      return {};
    }
  }
}

// -----------------------------------------------------------------------
// EdgeShell component
// -----------------------------------------------------------------------

export interface EdgeShellProps extends CustomEdgeProps {
  /** Override the path type (used by variants to enforce their shape). */
  pathTypeOverride?: PathType;
  /** Additional stroke dash pattern (e.g. `[6, 4]` for `association`). */
  strokeDasharray?: string;
}

/**
 * Shared shell — every edge variant renders through here. The variant
 * decides the path type and dash, but the rest (markers, label, stroke
 * width) is shared.
 */
export const EdgeShell = memo(function EdgeShell(props: EdgeShellProps) {
  const {
    id,
    data,
    selected,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    pathTypeOverride,
    strokeDasharray,
  } = props;

  const source = (data as RenderableEdgeData).source;
  const edgeSemantics = useDataStore((s) => s.edgeSemantics);
  const category: EdgeType = source.semanticId
    ? (edgeSemantics.get(source.semanticId)?.category ?? "association")
    : "association";

  const pathType = resolvePathType(
    category,
    source.direction,
    pathTypeOverride,
  );
  const [path, labelX, labelY] = computePath(
    pathType,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  );

  const markerProps = getMarkerProps(source.direction);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        className={selected ? "edge--selected" : "edge--default"}
        style={{
          ...(strokeDasharray ? { strokeDasharray } : {}),
        }}
        {...markerProps}
      />
      <EdgeLabelRenderer>
        {source.semanticId ? (
          <div
            className="edge-label nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%)`,
              left: labelX,
              top: labelY,
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "9999px",
              background: "rgba(0,0,0,0.5)",
              color: "#fff",
              pointerEvents: "all",
            }}
          >
            {source.semanticId}
          </div>
        ) : null}
      </EdgeLabelRenderer>
    </>
  );
});
