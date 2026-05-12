import type { EdgeType } from "@workspace/interfaces/models/edge/types";

export interface NodeSemanticDTO {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface EdgeSemanticDTO {
  id: string;
  name: string;
  category: EdgeType;
  color?: string;
  description?: string;
}

export interface NodeTagDTO {
  id: string;
  name: string;
  color?: string;
}
