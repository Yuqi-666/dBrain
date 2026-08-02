"use client";

import { EdgeShell, type CustomEdgeProps } from "./EdgeShell";

/**
 * Interaction edge — cubic Bezier. Used for cause/effect relations.
 */
export function InteractionEdge(props: CustomEdgeProps) {
  return <EdgeShell {...props} pathTypeOverride="simplebezier" />;
}
