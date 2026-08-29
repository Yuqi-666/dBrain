"use client";

import { useState, useEffect } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { FileDropZone } from "./file-drop-zone";
import { LoadingPlaceholder } from "@workspace/ui/components/dialog/editor/loading-placeholder";
import type { ImageNodeData } from "@workspace/interfaces";

interface ImageNodeContentProps {
  node: ImageNodeData;
  className?: string;
}

export function ImageNodeContent({ node, className }: ImageNodeContentProps) {
  const url = node.content?.url;
  const hasUrl = !!url;

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

  if (!hasUrl) {
    return (
      <FileDropZone
        nodeId={node.id}
        accept="image/*"
        variant="image"
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
      {mediaLoading && (
        <div className="absolute inset-0 z-10">
          <LoadingPlaceholder variant="image" />
        </div>
      )}
      <img
        src={url}
        alt={node.title || "图片"}
        className={cn(
          "aspect-auto rounded-sm object-contain transition-opacity duration-300",
          mediaLoading ? "opacity-0" : "opacity-100",
        )}
      />
    </div>
  );
}
