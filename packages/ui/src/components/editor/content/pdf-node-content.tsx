"use client";

import { useState, useEffect } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { useGraphStore } from "@workspace/store";
import { FileDropZone } from "./file-drop-zone";
import { LoadingPlaceholder } from "@workspace/ui/components/loading-placeholder";
import { useUploadState } from "@workspace/ui/hooks/use-upload-state";
import type { PdfNodeData } from "@workspace/interfaces";

interface PdfNodeContentProps {
  node: PdfNodeData;
  className?: string;
}

export function PdfNodeContent({ node, className }: PdfNodeContentProps) {
  const [mediaLoading, setMediaLoading] = useState(false);
  const updateNode = useGraphStore((state) => state.updateNode);

  const url = node.content?.url;
  const hasUrl = !!url;

  const { isLoading: uploadLoading, handlers } = useUploadState({
    nodeId: node.id,
    onUploadComplete: (attachment) => {
      updateNode(node.id, {
        content: { url: attachment.url, cover_url: "" },
      });
    },
  });

  useEffect(() => {
    if (hasUrl) {
      setMediaLoading(true);
    }
  }, [hasUrl]);

  const isLoading = uploadLoading || mediaLoading;

  if (!hasUrl) {
    return (
      <FileDropZone
        accept=".pdf,application/pdf"
        variant="pdf"
        onUploadStart={handlers.onUploadStart}
        onUploadComplete={handlers.onUploadComplete}
        onUploadError={handlers.onUploadError}
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
