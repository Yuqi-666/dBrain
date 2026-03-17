import type { NodeBase } from "../../models/node/base";
import type { NodeType } from "../../models/node/types";

export type VideoSource = "local" | "online";

export interface VideoNodeData extends NodeBase, NodeType<"video"> {
  duration: number;
  source: VideoSource;
  sourceUrl?: string;
  fileSize?: number;
  location?: string;
  shootingTime?: string;
}
