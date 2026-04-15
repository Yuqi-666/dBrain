import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";

export type VideoSource = "local" | "online";

export interface VideoNodeData extends NodeBase, NodeType<"video"> {
  duration: number;
  source: VideoSource;
  sourceUrl?: string;
  fileSize?: number;
  location?: string;
  shootingTime?: string;

  content: VideoContent;
}

export interface VideoContent {
  url: string;
}
