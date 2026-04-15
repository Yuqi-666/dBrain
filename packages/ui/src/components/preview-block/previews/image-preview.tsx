"use client";

import type { ImageNodeData } from "@workspace/interfaces";
import { Image } from "lucide-react";

export function ImagePreview({ node }: { node: ImageNodeData }) {
  const { content, width, height, fileSize } = node;
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
        {content?.url ? (
          <img
            src={content.url}
            alt={node.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Image className="size-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {width} × {height}
        </span>
        <span>{formatSize(fileSize)}</span>
      </div>
    </div>
  );
}
