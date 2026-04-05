import type { NodeSemantic, EdgeSemantic } from "@workspace/interfaces";

// 全局扩展G6原生类型
declare module "@antv/g6" {
  export interface NodeData {
    nodeType?: string;
    title?: string;
    abstract?: string;
    semanticId?: string;
    tags?: string[];
    [key: string]: any;
  }

  export interface EdgeData {
    semanticId?: string;
    direction?: "forward" | "backward" | "bidirectional";
    name?: string;
    weight?: number;
    [key: string]: any;
  }
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
