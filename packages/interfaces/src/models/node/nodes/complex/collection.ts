import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";
import type { FilterConfig } from "@workspace/interfaces/models/filter";

export interface CollectionNodeData extends NodeBase, NodeType<"collection"> {
  content: CollectionContent;
}

export interface CollectionContent {
  filterConfig?: FilterConfig;
}
