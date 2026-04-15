"use client";

import type { TextNodeData } from "@workspace/interfaces";
import { FileText } from "lucide-react";

function extractTextContent(docs: Record<string, any>): string {
  if (!docs || !docs.content) return "";

  const extractText = (node: any): string => {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (node.text) return node.text;
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractText).join(" ");
    }
    return "";
  };

  return extractText(docs);
}

export function TextPreview({ node }: { node: TextNodeData }) {
  const content = node.content?.docs
    ? extractTextContent(node.content.docs)
    : "";
  const previewText =
    content.slice(0, 150) + (content.length > 150 ? "..." : "");

  return (
    <div className="flex items-start gap-2">
      <FileText className="size-8 text-blue-500 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-foreground leading-relaxed">
          {previewText || "No content"}
        </p>
      </div>
    </div>
  );
}
