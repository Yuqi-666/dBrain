"use client";

import { useState, useEffect } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { FileDropZone } from "./file-drop-zone";
import { LoadingPlaceholder } from "@workspace/ui/components/dialog/editor/loading-placeholder";
import type { WebpageNodeData } from "@workspace/interfaces";
import { resolveFileUrl } from "@workspace/api-client";

interface WebpageNodeContentProps {
  node: WebpageNodeData;
  className?: string;
}

export function WebpageNodeContent({
  node,
  className,
}: WebpageNodeContentProps) {
  const [mediaLoading, setMediaLoading] = useState(false);

  const screenshotUrl = resolveFileUrl(node.content?.screenshotUrl);
  const hasScreenshot = !!screenshotUrl;

  useEffect(() => {
    if (hasScreenshot) {
      setMediaLoading(true);
    }
  }, [hasScreenshot]);

  useEffect(() => {
    if (!hasScreenshot) return;
    setMediaLoading(true);
    const img = new Image();
    img.onload = () => setMediaLoading(false);
    img.onerror = () => setMediaLoading(false);
    img.src = screenshotUrl;
  }, [hasScreenshot, screenshotUrl]);

  const isLoading = mediaLoading;

  if (!hasScreenshot) {
    return (
      <FileDropZone
        nodeId={node.id}
        accept="image/*"
        variant="webpage"
        className={cn("w-full h-full min-h-[300px]", className)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className={cn("flex flex-col p-6", className)}>
        <div className="flex-1 min-h-[300px] bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden">
          <LoadingPlaceholder variant="image" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col p-6", className)}>
      <div className="flex-1 min-h-[300px] bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden">
        <img
          src={screenshotUrl}
          alt={node.title || "网页截图"}
          className="w-full h-full object-cover"
          onLoad={() => setMediaLoading(false)}
          onError={() => setMediaLoading(false)}
        />
      </div>
    </div>
  );
}
