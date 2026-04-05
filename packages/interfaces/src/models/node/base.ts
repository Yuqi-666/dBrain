export type Permission = "private" | "public" | "restricted";

export type NodeSemanticId = string;
export interface NodeSemantic {
  id: NodeSemanticId;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export type CustomPropertyFieldType =
  | "text"
  | "number"
  | "date"
  | "singleSelect"
  | "multiSelect";

export interface CustomProperty {
  key: string;
  value: string | number | boolean | string[];
  fieldType: CustomPropertyFieldType;
}

export type NodeId = string;

export interface NodeBase {
  id: NodeId;
  title: string;
  abstract?: string;
  permission: Permission;
  semanticId: NodeSemanticId;
  tags?: string[];
  customProperties?: Record<string, CustomProperty>;
  createdAt: string;
  updatedAt: string;
}
