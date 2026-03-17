import type { NodeBase } from "../../models/node/base";
import type { NodeType } from "../../models/node/types";

export interface WebpageNodeData extends NodeBase, NodeType<"webpage"> {
  originalUrl: string;
  capturedAt: string;
  lastUpdatedAt: string;
}
