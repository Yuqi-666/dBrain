import type {
  NodeSemantic,
  NodeSemanticId,
  NodeData,
  NodeId,
  EdgeSemantic,
  EdgeSemanticId,
  EdgeData,
  EdgeId,
  View,
  ViewId,
} from "../models";

/**
 * Node Semantic Requests
 */
export interface AddNodeSemanticRequest extends NodeSemantic { }

export interface UpdateNodeSemanticRequest {
  id: NodeSemanticId;
  updates: Partial<NodeSemantic>;
}

export interface DeleteNodeSemanticRequest {
  id: NodeSemanticId;
}

/**
 * Edge Semantic Requests
 */
export interface AddEdgeSemanticRequest extends EdgeSemantic { }

export interface UpdateEdgeSemanticRequest {
  id: EdgeSemanticId;
  updates: Partial<EdgeSemantic>;
}

export interface DeleteEdgeSemanticRequest {
  id: EdgeSemanticId;
}

/**
 * Node Requests
 */
export interface AddNodeRequest extends Record<string, any> {
  id: NodeId;
  nodeType: string;
}

export interface UpdateNodeRequest {
  id: NodeId;
  updates: Partial<Omit<NodeData, "id" | "nodeType">>;
}

export interface DeleteNodeRequest {
  id: NodeId;
}

/**
 * Edge Requests
 */
export interface AddEdgeRequest extends Record<string, any> {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
}

export interface UpdateEdgeRequest {
  id: EdgeId;
  updates: Partial<EdgeData>;
}

export interface DeleteEdgeRequest {
  id: EdgeId;
}

/**
 * View Requests
 */
export interface AddViewRequest extends Record<string, any> {
  id: ViewId;
}

export interface UpdateViewRequest {
  id: ViewId;
  updates: Partial<View>;
}

export interface DeleteViewRequest {
  id: ViewId;
}


/**
 * Client -> Server Message Types
 */
export enum ClientMessageType {
  ADD_NODE_SEMANTIC = "ADD_NODE_SEMANTIC",
  UPDATE_NODE_SEMANTIC = "UPDATE_NODE_SEMANTIC",
  DELETE_NODE_SEMANTIC = "DELETE_NODE_SEMANTIC",

  ADD_EDGE_SEMANTIC = "ADD_EDGE_SEMANTIC",
  UPDATE_EDGE_SEMANTIC = "UPDATE_EDGE_SEMANTIC",
  DELETE_EDGE_SEMANTIC = "DELETE_EDGE_SEMANTIC",

  ADD_NODE = "ADD_NODE",
  UPDATE_NODE = "UPDATE_NODE",
  DELETE_NODE = "DELETE_NODE",

  ADD_EDGE = "ADD_EDGE",
  UPDATE_EDGE = "UPDATE_EDGE",
  DELETE_EDGE = "DELETE_EDGE",

  ADD_VIEW = "ADD_VIEW",
  UPDATE_VIEW = "UPDATE_VIEW",
  DELETE_VIEW = "DELETE_VIEW",
}

/**
 * Client -> Server Message Union (discriminated union)
 */
export type ClientMessage =
  | {
    type: ClientMessageType.ADD_NODE_SEMANTIC;
    requestId: string; // ULID for temp tracking
    payload: AddNodeSemanticRequest;
  }
  | {
    type: ClientMessageType.UPDATE_NODE_SEMANTIC;
    requestId: string;
    payload: UpdateNodeSemanticRequest;
  }
  | {
    type: ClientMessageType.DELETE_NODE_SEMANTIC;
    requestId: string;
    payload: DeleteNodeSemanticRequest;
  }
  | {
    type: ClientMessageType.ADD_EDGE_SEMANTIC;
    requestId: string;
    payload: AddEdgeSemanticRequest;
  }
  | {
    type: ClientMessageType.UPDATE_EDGE_SEMANTIC;
    requestId: string;
    payload: UpdateEdgeSemanticRequest;
  }
  | {
    type: ClientMessageType.DELETE_EDGE_SEMANTIC;
    requestId: string;
    payload: DeleteEdgeSemanticRequest;
  }
  | {
    type: ClientMessageType.ADD_NODE;
    requestId: string;
    payload: AddNodeRequest;
  }
  | {
    type: ClientMessageType.UPDATE_NODE;
    requestId: string;
    payload: UpdateNodeRequest;
  }
  | {
    type: ClientMessageType.DELETE_NODE;
    requestId: string;
    payload: DeleteNodeRequest;
  }
  | {
    type: ClientMessageType.ADD_EDGE;
    requestId: string;
    payload: AddEdgeRequest;
  }
  | {
    type: ClientMessageType.UPDATE_EDGE;
    requestId: string;
    payload: UpdateEdgeRequest;
  }
  | {
    type: ClientMessageType.DELETE_EDGE;
    requestId: string;
    payload: DeleteEdgeRequest;
  }
  | {
    type: ClientMessageType.ADD_VIEW;
    requestId: string;
    payload: AddViewRequest;
  }
  | {
    type: ClientMessageType.UPDATE_VIEW;
    requestId: string;
    payload: UpdateViewRequest;
  }
  | {
    type: ClientMessageType.DELETE_VIEW;
    requestId: string;
    payload: DeleteViewRequest;
  };
