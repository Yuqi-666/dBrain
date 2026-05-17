import type { EdgeType } from "@workspace/interfaces/models/edge/types";

export interface CreateNodeSemanticCommand {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  userId: string;
}

export interface UpdateNodeSemanticCommand {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  userId: string;
}

export interface DeleteNodeSemanticCommand {
  id: string;
  userId: string;
}

export interface CreateEdgeSemanticCommand {
  id: string;
  name: string;
  category: EdgeType;
  description?: string;
  color?: string;
  userId: string;
}

export interface UpdateEdgeSemanticCommand {
  id: string;
  name?: string;
  category?: EdgeType;
  description?: string;
  color?: string;
  userId: string;
}

export interface DeleteEdgeSemanticCommand {
  id: string;
  userId: string;
}

export interface CreateNodeTagCommand {
  id: string;
  name: string;
  color?: string;
  userId: string;
}

export interface UpdateNodeTagCommand {
  id: string;
  name?: string;
  color?: string;
  userId: string;
}

export interface DeleteNodeTagCommand {
  id: string;
  userId: string;
}