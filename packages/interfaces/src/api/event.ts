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
import type { SyncData } from "./responses";

/**
 * Server -> Client Message Types
 */
export enum EventMessageType {
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
 * Event types for server push messages
 */
export interface NodeAddedEvent {
  node: NodeData;
  userId: string;
  timestamp: number;
}

export interface NodeUpdatedEvent {
  id: NodeId;
  updates: Partial<NodeData>;
  userId: string;
  timestamp: number;
}

export interface NodeDeletedEvent {
  id: NodeId;
  userId: string;
  timestamp: number;
}

export interface NodeSemanticAddedEvent {
  nodeSemantic: NodeSemantic;
  userId: string;
  timestamp: number;
}

export interface NodeSemanticUpdatedEvent {
  id: NodeSemanticId;
  updates: Partial<NodeSemantic>;
  userId: string;
  timestamp: number;
}

export interface NodeSemanticEventDeletedEvent {
  id: NodeSemanticId;
  userId: string;
  timestamp: number;
}

export interface EdgeAddedEvent {
  edge: EdgeData;
  userId: string;
  timestamp: number;
}

export interface EdgeUpdatedEvent {
  id: EdgeId;
  updates: Partial<EdgeData>;
  userId: string;
  timestamp: number;
}

export interface EdgeDeletedEvent {
  id: EdgeId;
  userId: string;
  timestamp: number;
}

export interface EdgeSemanticAddedEvent {
  edgeSemantic: EdgeSemantic;
  userId: string;
  timestamp: number;
}

export interface EdgeSemanticUpdatedEvent {
  id: EdgeSemanticId;
  updates: Partial<EdgeSemantic>;
  userId: string;
  timestamp: number;
}

export interface EdgeSemanticEventDeletedEvent {
  id: EdgeSemanticId;
  userId: string;
  timestamp: number;
}

export interface ViewAddedEvent {
  view: View;
  userId: string;
  timestamp: number;
}

export interface ViewUpdatedEvent {
  id: ViewId;
  updates: Partial<View>;
  userId: string;
  timestamp: number;
}

export interface ViewDeletedEvent {
  id: ViewId;
  userId: string;
  timestamp: number;
}


/**
 * Server -> Client Push Message Union (unsolicited events from server)
 */
export type ServerPushMessage =
  | {
    type: EventMessageType.REMOTE_NODE_SEMANTIC_ADDED;
    payload: NodeSemanticAddedEvent;
  }
  | {
    type: EventMessageType.REMOTE_NODE_SEMANTIC_UPDATED;
    payload: NodeSemanticUpdatedEvent;
  }
  | {
    type: EventMessageType.REMOTE_NODE_SEMANTIC_DELETED;
    payload: NodeSemanticEventDeletedEvent;
  }
  | {
    type: EventMessageType.REMOTE_EDGE_SEMANTIC_ADDED;
    payload: EdgeSemanticAddedEvent;
  }
  | {
    type: EventMessageType.REMOTE_EDGE_SEMANTIC_UPDATED;
    payload: EdgeSemanticUpdatedEvent;
  }
  | {
    type: EventMessageType.REMOTE_EDGE_SEMANTIC_DELETED;
    payload: EdgeSemanticEventDeletedEvent;
  }
  | {
    type: EventMessageType.REMOTE_NODE_ADDED;
    payload: NodeAddedEvent;
  }
  | {
    type: EventMessageType.REMOTE_NODE_UPDATED;
    payload: NodeUpdatedEvent;
  }
  | {
    type: EventMessageType.REMOTE_NODE_DELETED;
    payload: NodeDeletedEvent;
  }
  | {
    type: EventMessageType.REMOTE_EDGE_ADDED;
    payload: EdgeAddedEvent;
  }
  | {
    type: EventMessageType.REMOTE_EDGE_UPDATED;
    payload: EdgeUpdatedEvent;
  }
  | {
    type: EventMessageType.REMOTE_EDGE_DELETED;
    payload: EdgeDeletedEvent;
  }
  | {
    type: EventMessageType.REMOTE_VIEW_ADDED;
    payload: ViewAddedEvent;
  }
  | {
    type: EventMessageType.REMOTE_VIEW_UPDATED;
    payload: ViewUpdatedEvent;
  }
  | {
    type: EventMessageType.REMOTE_VIEW_DELETED;
    payload: ViewDeletedEvent;
  }
  | {
    type: EventMessageType.WS_CONNECTED;
    payload: { connectionId: string; timestamp: number };
  }
  | {
    type: EventMessageType.WS_DISCONNECTED;
    payload: { reason?: string; timestamp: number };
  };
