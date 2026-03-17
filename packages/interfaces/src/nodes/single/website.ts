import type { NodeBase } from "../../models/node/base";
import type { NodeType } from "../../models/node/types";

export interface WebsiteNodeData extends NodeBase, NodeType<"website"> {
  targetUrl: string;
  favicon?: string;
  lastVisitedAt?: string;
}
