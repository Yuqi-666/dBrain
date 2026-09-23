"use client";

import { useState, useEffect } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { FileDropZone } from "./file-drop-zone";
import { LoadingPlaceholder } from "@workspace/ui/components/dialog/editor/loading-placeholder";
import type { VideoNodeData } from "@workspace/interfaces";
import { resolveFileUrl } from "@workspace/api-client";

interface VideoNodeContentProps {
  node: VideoNodeData;
  className?: string;
}

export function VideoNodeContent({ node, className }: VideoNodeContentProps) {
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
        accept=".mp4,.webm,.mov,video/*"
        variant="video"
        className={cn("w-full h-full min-h-[200px]", className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center p-4 w-full h-full", className)}>
      {isLoading && <LoadingPlaceholder variant="video" />}
      <video
        src={url}
        controls
        className={cn(
          "w-full object-contain",
          isLoading ? "hidden" : "block"
        )}
        playsInline
        onLoadedData={() => setMediaLoading(false)}
        onError={() => setMediaLoading(false)}
      >
        您的浏览器不支持视频播放
      </video>
    </div>
  );
}
