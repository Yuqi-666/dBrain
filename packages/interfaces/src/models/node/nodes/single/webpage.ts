import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";

export interface WebpageNodeData extends NodeBase, NodeType<"webpage"> {
  originalUrl: string;
  capturedAt: string;
  lastUpdatedAt: string;

  content: WebpageContent;
}

export interface WebpageContent {
  html: string;
  screenshotUrl?: string;
}
