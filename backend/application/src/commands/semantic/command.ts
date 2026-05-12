import type { EdgeType } from "@workspace/interfaces/models/edge/types";

export interface CreateNodeSemanticCommand {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateNodeSemanticCommand {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface DeleteNodeSemanticCommand {
  id: string;
}

export interface CreateEdgeSemanticCommand {
  id: string;
  name: string;
  category: EdgeType;
  description?: string;
  color?: string;
}

export interface UpdateEdgeSemanticCommand {
  id: string;
  name?: string;
  category?: EdgeType;
  description?: string;
  color?: string;
}

export interface DeleteEdgeSemanticCommand {
  id: string;
}

export interface CreateNodeTagCommand {
  id: string;
  name: string;
  color?: string;
}

export interface UpdateNodeTagCommand {
  id: string;
  name?: string;
  color?: string;
}

export interface DeleteNodeTagCommand {
  id: string;
}