import type { NodeBase } from "../../models/node/base";
import type { NodeType } from "../../models/node/types";

export interface PdfNodeData extends NodeBase, NodeType<"pdf"> {
  pageCount: number;
  fileSize: number;
}
