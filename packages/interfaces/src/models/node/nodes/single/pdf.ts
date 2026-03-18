import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";

export interface PdfNodeData extends NodeBase, NodeType<"pdf"> {
  pageCount: number;
  fileSize: number;
}
