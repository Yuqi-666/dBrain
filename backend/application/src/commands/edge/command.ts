export interface CreateEdgeCommand {
  id: string;
  from: string;
  to: string;
  direction: "forward" | "reverse" | "bidirectional" | "undirected";
  semanticId: string;
  edgeType: string;
  weight?: { value: number };
  userId: string;
  sourceId?: string;
}

export interface UpdateEdgeCommand {
  id: string;
  direction?: "forward" | "reverse" | "bidirectional" | "undirected";
  semanticId?: string;
  edgeType?: string;
  weight?: { value: number };
  userId: string;
  sourceId?: string;
}

export interface DeleteEdgeCommand {
  id: string;
  userId: string;
  sourceId?: string;
}
