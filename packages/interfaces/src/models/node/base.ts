// ============== 基础元数据 ==============

/**
 * 访问权限类型
 */
export type Permission = "private" | "public" | "restricted";

/**
 * 基础元数据
 * 节点的身份标识，用户侧可见可编辑
 */
export interface BaseMetadata {
  /** 标题 - 节点核心内容的极简概括，节点的核心身份标识 */
  title: string;
  /** 摘要 - 节点内容的简要概括，用于预览、检索、语义识别 */
  abstract?: string;
  /** 访问权限 - 节点的可见范围与操作权限 */
  permission: Permission;
}

// ============== 语义元数据 ==============

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

export interface SemanticMetadata {
  type: NodeSemanticId;
  tags?: string[];
  customProperties?: Record<string, CustomProperty>;
}


// ============== 系统元数据 ==============

export type NodeId = string;

export interface SystemMetadata {
  id: NodeId;
  createdAt: string;
  updatedAt: string;
}


// ============== 合并元数据 ==============

export interface NodeMetadata
  extends BaseMetadata, SemanticMetadata, SystemMetadata { }

export interface NodeBase {
  metadata: NodeMetadata;
}
