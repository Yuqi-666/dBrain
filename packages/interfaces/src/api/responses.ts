import type {
  NodeSemantic,
  EdgeSemantic,
  NodeData,
  EdgeData,
  View,
} from "../models";

/**
 * Base API Response
 */
export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
}

/**
 * Node Semantic Responses
 */
export type AddNodeSemanticResponse = ApiResponse<NodeSemantic>;
export type UpdateNodeSemanticResponse = ApiResponse<NodeSemantic>;
export type DeleteNodeSemanticResponse = ApiResponse<void>;
export type GetNodeSemanticResponse = ApiResponse<NodeSemantic>;
export type ListNodeSemanticsResponse = ApiResponse<NodeSemantic[]>;

/**
 * Edge Semantic Responses
 */
export type AddEdgeSemanticResponse = ApiResponse<EdgeSemantic>;
export type UpdateEdgeSemanticResponse = ApiResponse<EdgeSemantic>;
export type DeleteEdgeSemanticResponse = ApiResponse<void>;
export type GetEdgeSemanticResponse = ApiResponse<EdgeSemantic>;
export type ListEdgeSemanticsResponse = ApiResponse<EdgeSemantic[]>;

/**
 * Node Responses
 */
export type AddNodeResponse = ApiResponse<NodeData>;
export type UpdateNodeResponse = ApiResponse<NodeData>;
export type DeleteNodeResponse = ApiResponse<void>;
export type GetNodeResponse = ApiResponse<NodeData>;
export type ListNodesResponse = ApiResponse<NodeData[]>;

/**
 * Edge Responses
 */
export type AddEdgeResponse = ApiResponse<EdgeData>;
export type UpdateEdgeResponse = ApiResponse<EdgeData>;
export type DeleteEdgeResponse = ApiResponse<void>;
export type GetEdgeResponse = ApiResponse<EdgeData>;
export type ListEdgesResponse = ApiResponse<EdgeData[]>;

/**
 * View Responses
 */
export type AddViewResponse = ApiResponse<View>;
export type UpdateViewResponse = ApiResponse<View>;
export type DeleteViewResponse = ApiResponse<void>;
export type GetViewResponse = ApiResponse<View>;
export type ListViewsResponse = ApiResponse<View[]>;

/**
 * Sync Response
 */
export type SyncFromServerResponse = ApiResponse<void>;
