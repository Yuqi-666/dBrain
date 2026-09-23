"use client";

import type { PdfNodeData } from "@workspace/interfaces";
import { FileType } from "lucide-react";
import { resolveFileUrl } from "@workspace/api-client";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PdfPreview({ node }: { node: PdfNodeData }) {
  const pageCount = node.pageCount ?? 0;
  return (
    <div className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
        {node.content?.coverUrl ? (
          <img
            src={resolveFileUrl(node.content.coverUrl)}
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
        {pageCount > 0 && <span>{pageCount} pages</span>}
        <span className="ml-auto">{formatSize(node.fileSize)}</span>
      </div>
    </div>
  );
}
