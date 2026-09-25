"use client";

import { useState, useEffect } from "react";
import type { ReactEventHandler } from "react";
import { VideoOff } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { FileDropZone } from "./file-drop-zone";
import { LoadingPlaceholder } from "@workspace/ui/components/dialog/editor/loading-placeholder";
import { VideoPlayer } from "@workspace/ui/components/video-player/video-player";
import type { VideoNodeData } from "@workspace/interfaces";
import { resolveFileUrl } from "@workspace/api-client";

interface VideoNodeContentProps {
  node: VideoNodeData;
  className?: string;
}

export function VideoNodeContent({ node, className }: VideoNodeContentProps) {
  const [mediaLoading, setMediaLoading] = useState(false);
  const [undecodable, setUndecodable] = useState(false);

  const url = resolveFileUrl(node.content?.url);
  const hlsUrl = resolveFileUrl(node.content?.hlsUrl);
  // Either representation makes the node playable: the HLS playlist the backend
  // packaged, or the original upload it was packaged from.
  const hasSource = !!url || !!hlsUrl;

  useEffect(() => {
    if (hasSource) {
      setMediaLoading(true);
    }
  }, [hasSource]);

  const isLoading = mediaLoading;

  if (!hasSource) {
    return (
      <FileDropZone
        nodeId={node.id}
        accept=".mp4,.webm,.mov,video/*"
        variant="video"
        className={cn("w-full h-full min-h-[200px]", className)}
      />
    );
  }

  const handleLoadedData: ReactEventHandler<HTMLVideoElement> = (event) => {
    const video = event.currentTarget;
    // An element that decoded audio but no video reports 0×0: it renders a bare
    // control bar, which is what an unplayable codec looks like.
    setUndecodable(video.videoWidth === 0 && video.videoHeight === 0);
    setMediaLoading(false);
  };

  if (undecodable) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 p-6 text-center",
          className,
        )}
      >
        <VideoOff className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          当前浏览器无法解码该视频的编码，只有音轨可以播放。
        </p>
        {url && (
          <a
            href={url}
            download
            className="text-sm text-primary underline underline-offset-4 hover:no-underline"
          >
            下载原文件
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center p-4 w-full h-full", className)}>
      {isLoading && <LoadingPlaceholder variant="video" />}
      <VideoPlayer
        src={url}
        hlsSrc={hlsUrl}
        poster={node.content?.coverUrl}
        controls
        className={cn("w-full object-contain", isLoading ? "hidden" : "block")}
        onLoadedData={handleLoadedData}
        onError={() => setMediaLoading(false)}
      />
    </div>
  );
}
