import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";
import type { NodeId } from "../../metadata/system";

export type CollectionType = "static" | "dynamic";

export type CollectionRuleField =
  | "type"
  | "tags"
  | "createdAt"
  | "updatedAt"
  | "customProperty";

export type CollectionRuleOperator =
  | "equals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "lt"
  | "between";

export interface CollectionRule {
  field: CollectionRuleField;
  operator: CollectionRuleOperator;
  value: string | number | string[];
}

export type CollectionRuleLogic = "and" | "or";

export interface CollectionNodeData extends NodeBase, NodeType<"collection"> {
  collectionType: CollectionType;
  memberIds: NodeId[];
  rules?: CollectionRule[];
  ruleLogic?: CollectionRuleLogic;
}
