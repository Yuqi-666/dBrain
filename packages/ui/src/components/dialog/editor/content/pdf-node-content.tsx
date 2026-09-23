"use client";

import { useState, useEffect } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { FileDropZone } from "./file-drop-zone";
import { LoadingPlaceholder } from "@workspace/ui/components/dialog/editor/loading-placeholder";
import type { PdfNodeData } from "@workspace/interfaces";
import { resolveFileUrl } from "@workspace/api-client";

interface PdfNodeContentProps {
  node: PdfNodeData;
  className?: string;
}

export function PdfNodeContent({ node, className }: PdfNodeContentProps) {
  const [mediaLoading, setMediaLoading] = useState(false);

  const url = resolveFileUrl(node.content?.url);
  const hasUrl = !!url;

  useEffect(() => {
    if (hasUrl) {
      setMediaLoading(true);
    }
  }, [hasUrl]);

  const isLoading = mediaLoading;

  if (!hasUrl) {
    return (
      <FileDropZone
        nodeId={node.id}
        accept=".pdf,application/pdf"
        variant="pdf"
        className={cn("w-full h-full min-h-[400px]", className)}
      />
    );
  }

  return (
    <div className={cn("flex p-4 w-full h-full", className)}>
      <div className="flex-1 rounded-lg overflow-hidden bg-muted/30">
        {isLoading && <LoadingPlaceholder variant="pdf" />}
        <iframe
          src={url}
          className={cn(
            "w-full h-full",
            isLoading ? "hidden" : "block"
          )}
          title={node.title || "PDF文档"}
          onLoad={() => setMediaLoading(false)}
          onError={() => setMediaLoading(false)}
        />
      </div>
    </div>
  );
}
