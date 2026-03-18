import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";

export interface AudioNodeData extends NodeBase, NodeType<"audio"> {
  duration: number;
  fileSize: number;
}
