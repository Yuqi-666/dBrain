"use client";

/**
 * SVG marker `<defs>` block for the 4 edge types + bidirectional override.
 *
 * Must be rendered once at the top of the ReactFlow tree — the
 * `markers.tsx` consumer (FlowGraph) mounts it in a single `<svg>` so
 * every edge can reference these markers by `url(#arrow-end)` etc.
 *
 * Per flow/edges/design.md §2.3, markers are **not** inlined into each
 * edge component.
 */

import { memo } from "react";

export const EdgeMarkers = memo(function EdgeMarkers() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden>
      <defs>
        <marker
          id="arrow-end"
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path
            d="M 2 2 L 10 6 L 2 10"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1.5"
          />
        </marker>
        <marker
          id="arrow-start"
          viewBox="0 0 12 12"
          refX="-2"
          refY="6"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path
            d="M 10 2 L 2 6 L 10 10"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1.5"
          />
        </marker>
      </defs>
    </svg>
  );
});
