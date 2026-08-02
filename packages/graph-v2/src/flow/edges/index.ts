/**
 * edgeTypes registry. Defined at module top-level so ReactFlow sees a
 * stable reference across renders (per flow/edges/design.md §1.3).
 */

import type { EdgeTypes } from "@xyflow/react";
import { HierarchyEdge } from "./hierarchy";
import { FlowEdge } from "./flow";
import { AssociationEdge } from "./association";
import { InteractionEdge } from "./interaction";

export { HierarchyEdge } from "./hierarchy";
export { FlowEdge } from "./flow";
export { AssociationEdge } from "./association";
export { InteractionEdge } from "./interaction";
export { EdgeShell } from "./EdgeShell";
export { EdgeMarkers } from "./markers";

export type { CustomEdgeProps, CustomEdgeComponent } from "./EdgeShell";

export const edgeTypes: EdgeTypes = {
  hierarchy: HierarchyEdge,
  flow: FlowEdge,
  association: AssociationEdge,
  interaction: InteractionEdge,
};
