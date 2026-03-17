import type { NodeBase } from "../../models/node/base";
import type { NodeType } from "../../models/node/types";
import type { NodeId } from "../../common/metadata/system";

export type RichTextBlockType =
  | "heading"
  | "paragraph"
  | "bulletList"
  | "orderedList"
  | "table"
  | "codeBlock"
  | "formula"
  | "quote"
  | "reference";

export interface BaseTextBlock {
  id: string;
  type: Exclude<RichTextBlockType, "reference">;
  content: string;
  attributes?: Record<string, unknown>;
}

export interface ReferenceBlock {
  id: string;
  type: "reference";
  referencedNodeId: NodeId;
  referenceType: "inline" | "block";
}

export type RichTextBlock = BaseTextBlock | ReferenceBlock;

export interface RichTextNodeData extends NodeBase, NodeType<"rich-text"> {
  blocks: RichTextBlock[];
}
