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
 * Node Semantic Commands
 */
export interface AddNodeSemanticCommand extends NodeSemantic { }

export interface UpdateNodeSemanticCommand {
  id: NodeSemanticId;
  updates: Partial<NodeSemantic>;
}

export interface DeleteNodeSemanticCommand {
  id: NodeSemanticId;
}

/**
 * Edge Semantic Commands
 */
export interface AddEdgeSemanticCommand extends EdgeSemantic { }

export interface UpdateEdgeSemanticCommand {
  id: EdgeSemanticId;
  updates: Partial<EdgeSemantic>;
}

export interface DeleteEdgeSemanticCommand {
  id: EdgeSemanticId;
}

/**
 * Node Commands
 */
export interface AddNodeCommand extends Record<string, any> {
  id: NodeId;
  nodeType: string;
}

export interface UpdateNodeCommand {
  id: NodeId;
  updates: Partial<Omit<NodeData, "id" | "nodeType">>;
}

export interface DeleteNodeCommand {
  id: NodeId;
}

/**
 * Edge Commands
 */
export interface AddEdgeCommand extends Record<string, any> {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
}

export interface UpdateEdgeCommand {
  id: EdgeId;
  updates: Partial<EdgeData>;
}

export interface DeleteEdgeCommand {
  id: EdgeId;
}

/**
 * View Commands
 */
export interface AddViewCommand extends Record<string, any> {
  id: ViewId;
}

export interface UpdateViewCommand {
  id: ViewId;
  updates: Partial<View>;
}

export interface DeleteViewCommand {
  id: ViewId;
}

/**
 * Client -> Server Message Types
 */
export enum CommandMessageType {
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
 * Client -> Server Command Message Union (discriminated union)
 * Commands return acknowledgment without payload (see responses.ts)
 */
export type CommandMessage =
  | {
    type: CommandMessageType.ADD_NODE_SEMANTIC;
    requestId: string; // ULID for temp tracking
    payload: AddNodeSemanticCommand;
  }
  | {
    type: CommandMessageType.UPDATE_NODE_SEMANTIC;
    requestId: string;
    payload: UpdateNodeSemanticCommand;
  }
  | {
    type: CommandMessageType.DELETE_NODE_SEMANTIC;
    requestId: string;
    payload: DeleteNodeSemanticCommand;
  }
  | {
    type: CommandMessageType.ADD_EDGE_SEMANTIC;
    requestId: string;
    payload: AddEdgeSemanticCommand;
  }
  | {
    type: CommandMessageType.UPDATE_EDGE_SEMANTIC;
    requestId: string;
    payload: UpdateEdgeSemanticCommand;
  }
  | {
    type: CommandMessageType.DELETE_EDGE_SEMANTIC;
    requestId: string;
    payload: DeleteEdgeSemanticCommand;
  }
  | {
    type: CommandMessageType.ADD_NODE;
    requestId: string;
    payload: AddNodeCommand;
  }
  | {
    type: CommandMessageType.UPDATE_NODE;
    requestId: string;
    payload: UpdateNodeCommand;
  }
  | {
    type: CommandMessageType.DELETE_NODE;
    requestId: string;
    payload: DeleteNodeCommand;
  }
  | {
    type: CommandMessageType.ADD_EDGE;
    requestId: string;
    payload: AddEdgeCommand;
  }
  | {
    type: CommandMessageType.UPDATE_EDGE;
    requestId: string;
    payload: UpdateEdgeCommand;
  }
  | {
    type: CommandMessageType.DELETE_EDGE;
    requestId: string;
    payload: DeleteEdgeCommand;
  }
  | {
    type: CommandMessageType.ADD_VIEW;
    requestId: string;
    payload: AddViewCommand;
  }
  | {
    type: CommandMessageType.UPDATE_VIEW;
    requestId: string;
    payload: UpdateViewCommand;
  }
  | {
    type: CommandMessageType.DELETE_VIEW;
    requestId: string;
    payload: DeleteViewCommand;
  };
