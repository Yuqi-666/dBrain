"use client";

import type { AudioNodeData } from "@workspace/interfaces";
import { resolveFileUrl } from "@workspace/api-client";

function formatDuration(seconds: number): string {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = (total % 60).toString().padStart(2, "0");
  return hours > 0
    ? `${hours}:${mins.toString().padStart(2, "0")}:${secs}`
    : `${mins}:${secs}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AudioPreview({ node }: { node: AudioNodeData }) {
  const url = resolveFileUrl(node.content?.url);
  const hasDuration = Number.isFinite(node.duration) && node.duration > 0;
  const hasSize = Number.isFinite(node.fileSize) && node.fileSize > 0;
  return (
    <div className="space-y-2">
      {url ? (
        <audio
          key={`${node.id}:${url}`}
          src={url}
          controls
          preload="metadata"
          aria-label={`${node.title || "音频"}预览`}
          className="block w-full"
        />
      ) : (
        <div className="rounded-lg bg-muted p-3 text-center text-xs text-muted-foreground">
          暂无音频
        </div>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-baseline gap-2">
          <span>时长</span>
          <span className="font-medium tabular-nums text-foreground/80">
            {hasDuration ? formatDuration(node.duration) : "未知"}
          </span>
        </div>
        {hasSize && (
          <span className="tabular-nums">{formatSize(node.fileSize)}</span>
        )}
      </div>
    </div>
  );
}
