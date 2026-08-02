"use client";

import { NodeShell, type CustomNodeProps } from "./NodeShell";
import { NodeErrorBoundary } from "./ErrorBoundary";
import type { AudioNodeData } from "@workspace/interfaces";

export function AudioNode(props: CustomNodeProps) {
  const source = props.data.source as AudioNodeData;
  const { duration, fileSize } = source;
  return (
    <NodeErrorBoundary>
      <NodeShell {...props}>
        <div className="flex min-w-[200px] max-w-[280px] items-center gap-2 rounded-md border bg-background p-2 text-xs shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
            ♪
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{source.title}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {formatDuration(duration)} • {formatBytes(fileSize)}
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
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatBytes(n: number | undefined): string {
  if (!n || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
