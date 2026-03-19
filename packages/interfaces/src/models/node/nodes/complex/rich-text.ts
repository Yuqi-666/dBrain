import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";
import type { NodeId } from "../../base";

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
