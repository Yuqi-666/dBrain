"use client";

import { useState, useEffect } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { useGraphStore } from "@workspace/store";
import { FileDropZone } from "./file-drop-zone";
import { LoadingPlaceholder } from "@workspace/ui/components/loading-placeholder";
import { useUploadState } from "@workspace/ui/hooks/use-upload-state";
import type { VideoNodeData } from "@workspace/interfaces";

interface VideoNodeContentProps {
  node: VideoNodeData;
  className?: string;
}

export function VideoNodeContent({ node, className }: VideoNodeContentProps) {
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
        accept="video/*"
        variant="video"
        onUploadStart={handlers.onUploadStart}
        onUploadComplete={handlers.onUploadComplete}
        onUploadError={handlers.onUploadError}
        className={cn("w-full h-full", className)}
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
