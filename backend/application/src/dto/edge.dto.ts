import type { Edge } from "@workspace/domain";

export interface EdgeDTO {
  id: string;
  from: string;
  to: string;
  direction: "forward" | "reverse" | "bidirectional";
  semanticId: string;
  edgeType: "hierarchy" | "flow" | "association" | "interaction";
  weight: 1 | 2 | 3 | 4 | 5;
  stateData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export function toEdgeDTO(edge: Edge): EdgeDTO {
  return {
    id: edge.id.toString(),
    from: edge.from.toString(),
    to: edge.to.toString(),
    direction: edge.direction.getValue(),
    semanticId: edge.semanticId,
    edgeType: edge.edgeType.getValue(),
    weight: edge.weight.getValue() as 1 | 2 | 3 | 4 | 5,
    stateData: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
