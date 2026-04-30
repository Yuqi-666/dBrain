"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { ImageNodeData } from "@workspace/interfaces";

interface ImageNodeContentProps {
  node: ImageNodeData;
  className?: string;
}

export function ImageNodeContent({ node, className }: ImageNodeContentProps) {
  return (
    <div className={cn("w-full h-full", className)}>
      <img
        src={node.content.url}
        alt={node.title || "图片"}
        className="w-full h-full object-contain"
      />
    </div>
  );
}