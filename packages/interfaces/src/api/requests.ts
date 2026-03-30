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
export interface AddNodeSemanticRequest extends NodeSemantic {}

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
export interface AddEdgeSemanticRequest extends EdgeSemantic {}

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
export interface AddNodeRequest extends NodeData {}

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
export interface AddEdgeRequest extends EdgeData {}

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
export interface AddViewRequest extends View {}

export interface UpdateViewRequest {
  id: ViewId;
  updates: Partial<View>;
}

export interface DeleteViewRequest {
  id: ViewId;
}

/**
 * Sync Request (full state sync from server)
 */
export interface SyncFromServerRequest {
  nodeSemantics?: NodeSemantic[];
  edgeSemantics?: EdgeSemantic[];
  nodes?: NodeData[];
  edges?: EdgeData[];
  views?: View[];
}
