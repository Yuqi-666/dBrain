import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";

export interface ImageNodeData extends NodeBase, NodeType<"image"> {
  width: number;
  height: number;
  fileSize: number;
  location?: string;
  shootingTime?: string;
}
