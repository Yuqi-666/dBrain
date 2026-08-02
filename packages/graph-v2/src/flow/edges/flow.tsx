"use client";

import { EdgeShell, type CustomEdgeProps } from "./EdgeShell";

/**
 * Flow edge — quadratic Bezier. Used for step-by-step workflow relations.
 */
export function FlowEdge(props: CustomEdgeProps) {
  return <EdgeShell {...props} pathTypeOverride="bezier" />;
}
