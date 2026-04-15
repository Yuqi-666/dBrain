"use client";

import type { VideoNodeData } from "@workspace/interfaces";
import { Video, Play } from "lucide-react";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoPreview({ node }: { node: VideoNodeData }) {
  const { content, duration, source, fileSize } = node;

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
            <Video className="size-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/50 p-2">
            <Play className="size-6 text-white fill-white" />
          </div>
        </div>
        {duration > 0 && (
          <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
            {formatDuration(duration)}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="capitalize">{source}</span>
        {fileSize && <span>{formatSize(fileSize)}</span>}
      </div>
    </div>
  );
}
