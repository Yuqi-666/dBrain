"use client";

import { cn } from "@workspace/ui/lib/utils";
import { VideoIcon } from "lucide-react";
import type { VideoNodeData } from "@workspace/interfaces";

interface VideoNodeContentProps {
  node: VideoNodeData;
  className?: string;
}

/**
 * VideoNodeContent - Video node renderer (read-only)
 * All metadata (title, url, etc.) is handled by the attributes sidebar.
 */
export function VideoNodeContent({ node, className }: VideoNodeContentProps) {
  return (
    <div className={cn("flex items-center justify-center h-full bg-black", className)}>
      {node.content?.url ? (
        <video
          src={node.content?.url}
          controls
          className="w-full h-full object-contain"
          playsInline
        >
          您的浏览器不支持视频播放
        </video>
      ) : (
        <div className="text-center space-y-4 p-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <VideoIcon className="size-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">无视频内容</p>
        </div>
      )}
    </div>
  );
}
