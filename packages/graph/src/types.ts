import type {
  EdgeType,
  EdgeDirection,
  EdgeSemanticId,
  EdgeWeight,
  NodeDataType,
  NodeSemanticId,
} from "@workspace/interfaces";

// 全局扩展G6原生类型
declare module "@antv/g6" {
  export interface NodeData {
    nodeType?: NodeDataType;
    title?: string;
    semanticId?: NodeSemanticId;
    tags?: string[];
    isPinned?: boolean;
    stateData?: Record<string, any>;
    [key: string]: any;
  }

  export interface EdgeData {
    semanticId?: EdgeSemanticId;
    direction?: EdgeDirection;
    edgeType: EdgeType;
    weight?: EdgeWeight;
    stateData?: Record<string, any>;
    [key: string]: any;
  }
}
