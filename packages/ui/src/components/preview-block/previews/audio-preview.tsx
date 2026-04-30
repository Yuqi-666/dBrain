"use client";

import type { AudioNodeData } from "@workspace/interfaces";
import { Volume, Play } from "lucide-react";

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

export function AudioPreview({ node }: { node: AudioNodeData }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Play className="size-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{node.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {node.duration && node.duration > 0 && <span>{formatDuration(node.duration)}</span>}
            {node.fileSize && <span>{formatSize(node.fileSize)}</span>}
          </div>
        </div>
        <Volume className="size-5 text-muted-foreground shrink-0" />
      </div>
    </div>
  );
}
