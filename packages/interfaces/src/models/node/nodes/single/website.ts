import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";

export interface WebsiteNodeData extends NodeBase, NodeType<"website"> {
  targetUrl: string;
  favicon?: string;
  lastVisitedAt?: string;
}
