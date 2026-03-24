export interface NodeData {
  id: string;
  data?: Record<string, unknown>;
}

export interface EdgeData {
  id?: string;
  source: string;
  target: string;
  data?: Record<string, unknown>;
}

export interface GraphData {
  nodes: NodeData[];
  edges: EdgeData[];
}
