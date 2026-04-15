"use client";

import type { PdfNodeData } from "@workspace/interfaces";
import { FileType } from "lucide-react";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PdfPreview({ node }: { node: PdfNodeData }) {
  const { content, pageCount, fileSize } = node;

  return (
    <div className="space-y-2">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
        {content?.cover_url ? (
          <img
            src={content.cover_url}
            alt={node.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <FileType className="size-10 text-red-500" />
            <span className="text-xs text-muted-foreground">PDF Document</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{pageCount} pages</span>
        <span>{formatSize(fileSize)}</span>
      </div>
    </div>
  );
}
