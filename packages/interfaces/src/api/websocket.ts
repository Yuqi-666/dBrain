import type {
  AddNodeSemanticRequest,
  UpdateNodeSemanticRequest,
  DeleteNodeSemanticRequest,
  AddEdgeSemanticRequest,
  UpdateEdgeSemanticRequest,
  DeleteEdgeSemanticRequest,
  AddNodeRequest,
  UpdateNodeRequest,
  DeleteNodeRequest,
  AddEdgeRequest,
  UpdateEdgeRequest,
  DeleteEdgeRequest,
  AddViewRequest,
  UpdateViewRequest,
  DeleteViewRequest,
  SyncFromServerRequest,
} from "./requests";

/**
 * WebSocket Message Types (Client -> Server)
 */
export enum WsClientMessageType {
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
 * WebSocket Message Types (Server -> Client)
 */
export enum WsServerMessageType {
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

  SYNC_FROM_SERVER = "SYNC_FROM_SERVER",
  WS_CONNECTED = "WS_CONNECTED",
  WS_DISCONNECTED = "WS_DISCONNECTED",
}

/**
 * Client to Server WebSocket Message
 */
export type WsClientMessage =
  | {
    type: WsClientMessageType.ADD_NODE_SEMANTIC;
    payload: AddNodeSemanticRequest;
  }
  | {
    type: WsClientMessageType.UPDATE_NODE_SEMANTIC;
    payload: UpdateNodeSemanticRequest;
  }
  | {
    type: WsClientMessageType.DELETE_NODE_SEMANTIC;
    payload: DeleteNodeSemanticRequest;
  }
  | {
    type: WsClientMessageType.ADD_EDGE_SEMANTIC;
    payload: AddEdgeSemanticRequest;
  }
  | {
    type: WsClientMessageType.UPDATE_EDGE_SEMANTIC;
    payload: UpdateEdgeSemanticRequest;
  }
  | {
    type: WsClientMessageType.DELETE_EDGE_SEMANTIC;
    payload: DeleteEdgeSemanticRequest;
  }
  | { type: WsClientMessageType.ADD_NODE; payload: AddNodeRequest }
  | { type: WsClientMessageType.UPDATE_NODE; payload: UpdateNodeRequest }
  | { type: WsClientMessageType.DELETE_NODE; payload: DeleteNodeRequest }
  | { type: WsClientMessageType.ADD_EDGE; payload: AddEdgeRequest }
  | { type: WsClientMessageType.UPDATE_EDGE; payload: UpdateEdgeRequest }
  | { type: WsClientMessageType.DELETE_EDGE; payload: DeleteEdgeRequest }
  | { type: WsClientMessageType.ADD_VIEW; payload: AddViewRequest }
  | { type: WsClientMessageType.UPDATE_VIEW; payload: UpdateViewRequest }
  | { type: WsClientMessageType.DELETE_VIEW; payload: DeleteViewRequest };

/**
 * Server to Client WebSocket Message
 */
export type WsServerMessage =
  | {
    type: WsServerMessageType.REMOTE_NODE_SEMANTIC_ADDED;
    payload: AddNodeSemanticRequest;
  }
  | {
    type: WsServerMessageType.REMOTE_NODE_SEMANTIC_UPDATED;
    payload: UpdateNodeSemanticRequest;
  }
  | {
    type: WsServerMessageType.REMOTE_NODE_SEMANTIC_DELETED;
    payload: DeleteNodeSemanticRequest;
  }
  | {
    type: WsServerMessageType.REMOTE_EDGE_SEMANTIC_ADDED;
    payload: AddEdgeSemanticRequest;
  }
  | {
    type: WsServerMessageType.REMOTE_EDGE_SEMANTIC_UPDATED;
    payload: UpdateEdgeSemanticRequest;
  }
  | {
    type: WsServerMessageType.REMOTE_EDGE_SEMANTIC_DELETED;
    payload: DeleteEdgeSemanticRequest;
  }
  | { type: WsServerMessageType.REMOTE_NODE_ADDED; payload: AddNodeRequest }
  | {
    type: WsServerMessageType.REMOTE_NODE_UPDATED;
    payload: UpdateNodeRequest;
  }
  | {
    type: WsServerMessageType.REMOTE_NODE_DELETED;
    payload: DeleteNodeRequest;
  }
  | { type: WsServerMessageType.REMOTE_EDGE_ADDED; payload: AddEdgeRequest }
  | {
    type: WsServerMessageType.REMOTE_EDGE_UPDATED;
    payload: UpdateEdgeRequest;
  }
  | {
    type: WsServerMessageType.REMOTE_EDGE_DELETED;
    payload: DeleteEdgeRequest;
  }
  | { type: WsServerMessageType.REMOTE_VIEW_ADDED; payload: AddViewRequest }
  | {
    type: WsServerMessageType.REMOTE_VIEW_UPDATED;
    payload: UpdateViewRequest;
  }
  | {
    type: WsServerMessageType.REMOTE_VIEW_DELETED;
    payload: DeleteViewRequest;
  }
  | {
    type: WsServerMessageType.SYNC_FROM_SERVER;
    payload: SyncFromServerRequest;
  }
  | { type: WsServerMessageType.WS_CONNECTED }
  | { type: WsServerMessageType.WS_DISCONNECTED };

