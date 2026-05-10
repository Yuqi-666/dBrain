import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";

export interface WebpageNodeData extends NodeBase, NodeType<"webpage"> {
  content: WebpageContent;
}

export interface WebpageContent {
  html: string;
  url: string;
  screenshotUrl?: string;
}
