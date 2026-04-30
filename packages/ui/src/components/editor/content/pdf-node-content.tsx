"use client";

import { cn } from "@workspace/ui/lib/utils";
import { FileTextIcon } from "lucide-react";
import type { PdfNodeData } from "@workspace/interfaces";

interface PdfNodeContentProps {
  node: PdfNodeData;
  className?: string;
}

/**
 * PdfNodeContent - PDF node renderer
 * Simplified to only render PDF content - all metadata editing moved to attributes sidebar
 */
export function PdfNodeContent({ node, className }: PdfNodeContentProps) {
  return (
    <div className={cn("flex flex-col p-6 h-full", className)}>
      <div className="flex-1 rounded-lg overflow-hidden bg-muted/30">
        {node.content?.url ? (
          <iframe
            src={node.content?.url}
            className="w-full h-full min-h-[400px]"
            title={node.title || "PDF文档"}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <FileTextIcon className="size-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">暂无 PDF 文档</p>
          </div>
        )}
      </div>
    </div>
  );
}