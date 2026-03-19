import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";
import type { NodeId } from "../../base";
import type {
  FilterRule,
  FilterLogic,
} from "../../../filter";

export type CollectionType = "static" | "dynamic";

export interface CollectionNodeData extends NodeBase, NodeType<"collection"> {
  collectionType: CollectionType;
  memberIds: NodeId[];
  rules?: FilterRule[];
  ruleLogic?: FilterLogic;
}
