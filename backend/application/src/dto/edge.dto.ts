export interface EdgeDTO {
  id: string;
  from: string;
  to: string;
  direction: "forward" | "reverse" | "bidirectional" | "undirected";
  semanticId: string;
  edgeType: "hierarchy" | "flow" | "association" | "interaction";
  weight: 1 | 2 | 3 | 4 | 5;
  stateData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

