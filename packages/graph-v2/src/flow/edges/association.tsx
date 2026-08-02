"use client";

import { EdgeShell, type CustomEdgeProps } from "./EdgeShell";

/**
 * Association edge — straight line with dashed stroke. Used for
 * "related but not directly connected" relations.
 */
export function AssociationEdge(props: CustomEdgeProps) {
  return (
    <EdgeShell
      {...props}
      pathTypeOverride="straight"
      strokeDasharray="6 4"
    />
  );
}
