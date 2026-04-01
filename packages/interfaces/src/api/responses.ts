import type {
  NodeSemantic,
  EdgeSemantic,
  NodeData,
  EdgeData,
  View,
} from "../models";

/**
 * Sync Data (full state sync from server)
 */
export interface SyncData {
  nodeSemantics?: NodeSemantic[];
  edgeSemantics?: EdgeSemantic[];
  nodes?: NodeData[];
  edges?: EdgeData[];
  views?: View[];
}

/**
 * Standard API response wrapper for all server responses
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Acknowledgment response types for command operations (no payload)
 */

// Node Semantic Acks
export type AddNodeSemanticAck = ApiResponse<void>;
export type UpdateNodeSemanticAck = ApiResponse<void>;
export type DeleteNodeSemanticAck = ApiResponse<void>;

// Edge Semantic Acks
export type AddEdgeSemanticAck = ApiResponse<void>;
export type UpdateEdgeSemanticAck = ApiResponse<void>;
export type DeleteEdgeSemanticAck = ApiResponse<void>;

// Node Acks
export type AddNodeAck = ApiResponse<void>;
export type UpdateNodeAck = ApiResponse<void>;
export type DeleteNodeAck = ApiResponse<void>;

// Edge Acks
export type AddEdgeAck = ApiResponse<void>;
export type UpdateEdgeAck = ApiResponse<void>;
export type DeleteEdgeAck = ApiResponse<void>;

// View Acks
export type AddViewAck = ApiResponse<void>;
export type UpdateViewAck = ApiResponse<void>;
export type DeleteViewAck = ApiResponse<void>;

// Sync Ack (has payload)
export type SyncAck = ApiResponse<SyncData>;

/**
 * Union of all possible acknowledgment types
 */
export type ApiAck =
  | AddNodeSemanticAck
  | UpdateNodeSemanticAck
  | DeleteNodeSemanticAck
  | AddEdgeSemanticAck
  | UpdateEdgeSemanticAck
  | DeleteEdgeSemanticAck
  | AddNodeAck
  | UpdateNodeAck
  | DeleteNodeAck
  | AddEdgeAck
  | UpdateEdgeAck
  | DeleteEdgeAck
  | AddViewAck
  | UpdateViewAck
  | DeleteViewAck
  | SyncAck;
