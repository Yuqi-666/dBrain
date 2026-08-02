"use client";

import { NodeShell, type CustomNodeProps } from "./NodeShell";
import { NodeErrorBoundary } from "./ErrorBoundary";
import type { VideoNodeData } from "@workspace/interfaces";

export function VideoNode(props: CustomNodeProps) {
  const source = props.data.source as VideoNodeData;
  const { duration, source: sourceKind, fileSize, content } = source;
  return (
    <NodeErrorBoundary>
      <NodeShell {...props}>
        <div className="min-w-[200px] max-w-[280px] overflow-hidden rounded-md border bg-background text-xs shadow-sm">
          {content?.coverUrl ? (
            <div
              className="relative flex h-24 w-full items-center justify-center bg-black/40"
              style={{
                backgroundImage: `url(${content.coverUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <span className="rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">
                ▶
              </span>
            </div>
          ) : (
            <div className="flex h-24 w-full items-center justify-center bg-muted text-muted-foreground">
              Video
            </div>
          )}
          <div className="p-2">
            <div className="truncate font-medium">{source.title}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {formatDuration(duration)} • {sourceKind}
              {fileSize ? ` • ${formatBytes(fileSize)}` : ""}
            </div>
          </div>
        </div>
      </NodeShell>
    </NodeErrorBoundary>
  );
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return "0:00";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatBytes(n: number | undefined): string {
  if (!n || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
