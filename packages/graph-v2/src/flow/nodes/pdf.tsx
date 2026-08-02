"use client";

import { NodeShell, type CustomNodeProps } from "./NodeShell";
import { NodeErrorBoundary } from "./ErrorBoundary";
import type { PdfNodeData } from "@workspace/interfaces";

export function PdfNode(props: CustomNodeProps) {
  const source = props.data.source as PdfNodeData;
  const { pageCount, fileSize, content } = source;
  return (
    <NodeErrorBoundary>
      <NodeShell {...props}>
        <div className="min-w-[180px] max-w-[260px] overflow-hidden rounded-md border bg-background text-xs shadow-sm">
          {content?.coverUrl ? (
            <img
              src={content.coverUrl}
              alt={source.title}
              className="block max-h-40 w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-24 w-full items-center justify-center bg-muted text-muted-foreground">
              PDF
            </div>
          )}
          <div className="p-2">
            <div className="truncate font-medium">{source.title}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {pageCount} pages • {formatBytes(fileSize)}
            </div>
          </div>
        </div>
      </NodeShell>
    </NodeErrorBoundary>
  );
}

function formatBytes(n: number | undefined): string {
  if (!n || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
