"use client";

import type { RichTextNodeData } from "@workspace/interfaces";
import { FileEdit, Link2 } from "lucide-react";

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

export function RichTextPreview({ node }: { node: RichTextNodeData }) {
  const docsText = node.content?.docs
    ? extractTextContent(node.content.docs)
    : "";
  const previewText =
    docsText.slice(0, 150) + (docsText.length > 150 ? "..." : "");
  const referencedCount = node.content?.referencedNodes?.length || 0;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <FileEdit className="size-8 text-purple-500 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-foreground leading-relaxed">
            {previewText || "No content"}
          </p>
        </div>
      </div>
      {referencedCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link2 className="size-3.5" />
          <span>{referencedCount} referenced nodes</span>
        </div>
      )}
    </div>
  );
}
