import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";

export interface TextNodeData extends NodeBase, NodeType<"text"> { }
