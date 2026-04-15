import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";
import type { NodeId } from "../../base";

export type BaseBlockType =
  | "heading"
  | "paragraph"
  | "bulletList"
  | "orderedList"
  | "table"
  | "codeBlock"
  | "formula"
  | "quote"
  | "reference";

export interface BaseBlock {
  id: string;
  type: Exclude<BaseBlockType, "reference">;
  content?: BaseBlock[];
  attributes?: Record<string, unknown>;
}

export interface ReferenceBlock {
  id: string;
  type: "reference";
  referencedNodeId: NodeId;
  referenceType: "inline" | "block";
}

export type RichTextBlock = BaseBlock | ReferenceBlock;

export interface RichTextNodeData extends NodeBase, NodeType<"rich-text"> {
  content: RichTextContent;
}

export interface RichTextContent {
  blocks: RichTextBlock[];

}
