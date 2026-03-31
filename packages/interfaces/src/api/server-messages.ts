import type {
  NodeSemantic,
  NodeSemanticId,
  EdgeSemantic,
  EdgeSemanticId,
  NodeData,
  NodeId,
  EdgeData,
  EdgeId,
  View,
  ViewId,
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
 * Server -> Client Message Types
 */
export enum ServerMessageType {
  // Push event types
  REMOTE_NODE_SEMANTIC_ADDED = "REMOTE_NODE_SEMANTIC_ADDED",
  REMOTE_NODE_SEMANTIC_UPDATED = "REMOTE_NODE_SEMANTIC_UPDATED",
  REMOTE_NODE_SEMANTIC_DELETED = "REMOTE_NODE_SEMANTIC_DELETED",

  REMOTE_EDGE_SEMANTIC_ADDED = "REMOTE_EDGE_SEMANTIC_ADDED",
  REMOTE_EDGE_SEMANTIC_UPDATED = "REMOTE_EDGE_SEMANTIC_UPDATED",
  REMOTE_EDGE_SEMANTIC_DELETED = "REMOTE_EDGE_SEMANTIC_DELETED",

  REMOTE_NODE_ADDED = "REMOTE_NODE_ADDED",
  REMOTE_NODE_UPDATED = "REMOTE_NODE_UPDATED",
  REMOTE_NODE_DELETED = "REMOTE_NODE_DELETED",

  REMOTE_EDGE_ADDED = "REMOTE_EDGE_ADDED",
  REMOTE_EDGE_UPDATED = "REMOTE_EDGE_UPDATED",
  REMOTE_EDGE_DELETED = "REMOTE_EDGE_DELETED",

  REMOTE_VIEW_ADDED = "REMOTE_VIEW_ADDED",
  REMOTE_VIEW_UPDATED = "REMOTE_VIEW_UPDATED",
  REMOTE_VIEW_DELETED = "REMOTE_VIEW_DELETED",

  // System types
  WS_SYNC = "WS_SYNC",
  WS_CONNECTED = "WS_CONNECTED",
  WS_DISCONNECTED = "WS_DISCONNECTED",
}

/**
 * Payload types for server push messages
 */
export interface NodeAddedPayload {
  node: NodeData;
  userId: string;
  timestamp: number;
}

export interface NodeUpdatedPayload {
  id: NodeId;
  updates: Partial<NodeData>;
  userId: string;
  timestamp: number;
}

export interface NodeDeletedPayload {
  id: NodeId;
  userId: string;
  timestamp: number;
}

export interface NodeSemanticAddedPayload {
  nodeSemantic: NodeSemantic;
  userId: string;
  timestamp: number;
}

export interface NodeSemanticUpdatedPayload {
  id: NodeSemanticId;
  updates: Partial<NodeSemantic>;
  userId: string;
  timestamp: number;
}

export interface NodeSemanticDeletedPayload {
  id: NodeSemanticId;
  userId: string;
  timestamp: number;
}

export interface EdgeAddedPayload {
  edge: EdgeData;
  userId: string;
  timestamp: number;
}

export interface EdgeUpdatedPayload {
  id: EdgeId;
  updates: Partial<EdgeData>;
  userId: string;
  timestamp: number;
}

export interface EdgeDeletedPayload {
  id: EdgeId;
  userId: string;
  timestamp: number;
}

export interface EdgeSemanticAddedPayload {
  edgeSemantic: EdgeSemantic;
  userId: string;
  timestamp: number;
}

export interface EdgeSemanticUpdatedPayload {
  id: EdgeSemanticId;
  updates: Partial<EdgeSemantic>;
  userId: string;
  timestamp: number;
}

export interface EdgeSemanticDeletedPayload {
  id: EdgeSemanticId;
  userId: string;
  timestamp: number;
}

export interface ViewAddedPayload {
  view: View;
  userId: string;
  timestamp: number;
}

export interface ViewUpdatedPayload {
  id: ViewId;
  updates: Partial<View>;
  userId: string;
  timestamp: number;
}

export interface ViewDeletedPayload {
  id: ViewId;
  userId: string;
  timestamp: number;
}

export interface FullSyncPayload extends SyncData {
  syncId: string;
  timestamp: number;
}

/**
 * Server -> Client Push Message Union (unsolicited events from server)
 */
export type ServerPushMessage =
  | {
      type: ServerMessageType.REMOTE_NODE_SEMANTIC_ADDED;
      payload: NodeSemanticAddedPayload;
    }
  | {
      type: ServerMessageType.REMOTE_NODE_SEMANTIC_UPDATED;
      payload: NodeSemanticUpdatedPayload;
    }
  | {
      type: ServerMessageType.REMOTE_NODE_SEMANTIC_DELETED;
      payload: NodeSemanticDeletedPayload;
    }
  | {
      type: ServerMessageType.REMOTE_EDGE_SEMANTIC_ADDED;
      payload: EdgeSemanticAddedPayload;
    }
  | {
      type: ServerMessageType.REMOTE_EDGE_SEMANTIC_UPDATED;
      payload: EdgeSemanticUpdatedPayload;
    }
  | {
      type: ServerMessageType.REMOTE_EDGE_SEMANTIC_DELETED;
      payload: EdgeSemanticDeletedPayload;
    }
  | {
      type: ServerMessageType.REMOTE_NODE_ADDED;
      payload: NodeAddedPayload;
    }
  | {
      type: ServerMessageType.REMOTE_NODE_UPDATED;
      payload: NodeUpdatedPayload;
    }
  | {
      type: ServerMessageType.REMOTE_NODE_DELETED;
      payload: NodeDeletedPayload;
    }
  | {
      type: ServerMessageType.REMOTE_EDGE_ADDED;
      payload: EdgeAddedPayload;
    }
  | {
      type: ServerMessageType.REMOTE_EDGE_UPDATED;
      payload: EdgeUpdatedPayload;
    }
  | {
      type: ServerMessageType.REMOTE_EDGE_DELETED;
      payload: EdgeDeletedPayload;
    }
  | {
      type: ServerMessageType.REMOTE_VIEW_ADDED;
      payload: ViewAddedPayload;
    }
  | {
      type: ServerMessageType.REMOTE_VIEW_UPDATED;
      payload: ViewUpdatedPayload;
    }
  | {
      type: ServerMessageType.REMOTE_VIEW_DELETED;
      payload: ViewDeletedPayload;
    }
  | {
      type: ServerMessageType.WS_SYNC;
      payload: FullSyncPayload;
    }
  | {
      type: ServerMessageType.WS_CONNECTED;
      payload: { connectionId: string; timestamp: number };
    }
  | {
      type: ServerMessageType.WS_DISCONNECTED;
      payload: { reason?: string; timestamp: number };
    };

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
 * Acknowledgment response types for request-response pattern
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

// Sync Ack
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
