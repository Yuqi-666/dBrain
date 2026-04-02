import type {
  NodeId,
  EdgeId,
  NodeData,
  EdgeData,
  NodeSemantic,
  EdgeSemantic,
  View,
} from "@workspace/interfaces";

export interface G6Node {
  id: string;
  data: {
    originalId: NodeId;
    nodeType: string;
    title: string;
    abstract?: string;
    semanticType?: string;
    tags?: string[];
  };
  style?: Record<string, any>;
}

export interface G6Edge {
  id: string;
  source: string;
  target: string;
  data: {
    originalId: EdgeId;
    edgeType: string;
    direction: "forward" | "reverse" | "bidirectional";
    name?: string;
    weight?: number;
  };
  style?: Record<string, any>;
}

export interface G6GraphData {
  nodes: G6Node[];
  edges: G6Edge[];
}

export type Mutation =
  | { type: "addNodeSemantic"; payload: any }
  | { type: "updateNodeSemantic"; payload: any }
  | { type: "deleteNodeSemantic"; payload: any }
  | { type: "addEdgeSemantic"; payload: any }
  | { type: "updateEdgeSemantic"; payload: any }
  | { type: "deleteEdgeSemantic"; payload: any }
  | { type: "addNode"; payload: any }
  | { type: "updateNode"; payload: any }
  | { type: "deleteNode"; payload: any }
  | { type: "addEdge"; payload: any }
  | { type: "updateEdge"; payload: any }
  | { type: "deleteEdge"; payload: any }
  | { type: "addView"; payload: any }
  | { type: "updateView"; payload: any }
  | { type: "deleteView"; payload: any };

export type MutationProcessor = (graph: any, mutations: Mutation[]) => void;
