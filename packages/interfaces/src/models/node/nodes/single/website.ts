import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";

export interface WebsiteNodeData extends NodeBase, NodeType<"website"> {
  content: WebsiteContent;
}

export interface WebsiteContent {
  url: string;
  faviconUrl?: string;
}
