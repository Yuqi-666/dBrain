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
