import type { NodeBase } from "../../models/node/base";
import type { NodeType } from "../../models/node/types";

export interface TextNodeData extends NodeBase, NodeType<"text"> {}
