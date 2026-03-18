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

/**
 * 创建默认基础元数据
 */
export function createDefaultBaseMetadata(
  partial?: Partial<BaseMetadata>,
): BaseMetadata {
  return {
    title: "",
    abstract: undefined,
    permission: "private",
    ...partial,
  };
}
