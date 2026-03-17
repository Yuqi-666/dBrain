import type { NodeBase } from "../../models/node/base";
import type { NodeType } from "../../models/node/types";

export interface ImageNodeData extends NodeBase, NodeType<"image"> {
  width: number;
  height: number;
  fileSize: number;
  location?: string;
  shootingTime?: string;
}
