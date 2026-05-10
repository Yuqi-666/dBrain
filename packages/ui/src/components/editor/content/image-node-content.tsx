"use client";

import { useState, useEffect } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { useGraphStore } from "@workspace/store";
import { FileDropZone } from "./file-drop-zone";
import { LoadingPlaceholder } from "@workspace/ui/components/loading-placeholder";
import { useUploadState } from "@workspace/ui/hooks/use-upload-state";
import type { ImageNodeData } from "@workspace/interfaces";

interface ImageNodeContentProps {
  node: ImageNodeData;
  className?: string;
}

export function ImageNodeContent({ node, className }: ImageNodeContentProps) {
  const updateNode = useGraphStore((state) => state.updateNode);

  const url = node.content?.url;
  const hasUrl = !!url;

  const { isLoading: uploadLoading, handlers } = useUploadState({
    nodeId: node.id,
    onUploadComplete: (attachment) => {
      updateNode(node.id, { content: { url: attachment.url } });
    },
  });

  const [mediaLoading, setMediaLoading] = useState(hasUrl);

  useEffect(() => {
    if (hasUrl) {
      setMediaLoading(true);
    }
  }, [hasUrl]);

  useEffect(() => {
    if (!hasUrl) return;
    const img = new Image();
    img.onload = () => setMediaLoading(false);
    img.onerror = () => setMediaLoading(false);
    img.src = url;
  }, [hasUrl, url]);

  const isLoading = uploadLoading || mediaLoading;

  if (!hasUrl) {
    return (
      <FileDropZone
        accept="image/*"
        variant="image"
        onUploadStart={handlers.onUploadStart}
        onUploadComplete={handlers.onUploadComplete}
        onUploadError={handlers.onUploadError}
        className={cn("w-full h-full", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center p-4 w-full h-full overflow-hidden",
        className,
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 z-10">
          <LoadingPlaceholder variant="image" />
        </div>
      )}
      <img
        src={url}
        alt={node.title || "图片"}
        className={cn(
          "aspect-auto rounded-sm object-contain transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
        )}
      />
    </div>
  );
}