export interface CreateEdgeCommand {
  id: string;
  from: string;
  to: string;
  direction: "forward" | "reverse" | "bidirectional";
  semanticId: string;
  edgeType: string;
  weight?: { value: number };
}

export interface UpdateEdgeCommand {
  id: string;
  direction?: "forward" | "reverse" | "bidirectional";
  semanticId?: string;
  edgeType?: string;
  weight?: { value: number };
}

export interface DeleteEdgeCommand {
  id: string;
}