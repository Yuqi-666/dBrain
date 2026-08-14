import type { EdgeStateData } from "@workspace/interfaces/models/edge/types";

export interface EdgeDTO {
  id: string;
  from: string;
  to: string;
  direction: "forward" | "reverse" | "bidirectional" | "undirected";
  semanticId: string;
  stateData?: EdgeStateData;
  createdAt: string;
  updatedAt: string;
}

