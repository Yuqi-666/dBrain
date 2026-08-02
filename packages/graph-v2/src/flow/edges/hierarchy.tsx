"use client";

import { EdgeShell, type CustomEdgeProps } from "./EdgeShell";

/**
 * Hierarchy edge — straight line. Used for parent/child relations.
 */
export function HierarchyEdge(props: CustomEdgeProps) {
  return <EdgeShell {...props} pathTypeOverride="straight" />;
}
