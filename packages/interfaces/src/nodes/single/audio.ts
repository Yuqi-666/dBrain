import type { NodeBase } from "../../models/node/base";
import type { NodeType } from "../../models/node/types";

export interface AudioNodeData extends NodeBase, NodeType<"audio"> {
  duration: number;
  fileSize: number;
}
