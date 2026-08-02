"use client";

import { NodeShell, type CustomNodeProps } from "./NodeShell";
import { NodeErrorBoundary } from "./ErrorBoundary";
import type { WebpageNodeData } from "@workspace/interfaces";

export function WebpageNode(props: CustomNodeProps) {
  const source = props.data.source as WebpageNodeData;
  const { content } = source;
  const domain = safeHostname(content?.url);
  return (
    <NodeErrorBoundary>
      <NodeShell {...props}>
        <div className="min-w-[200px] max-w-[280px] overflow-hidden rounded-md border bg-background text-xs shadow-sm">
          {content?.screenshotUrl ? (
            <img
              src={content.screenshotUrl}
              alt={source.title}
              className="block max-h-32 w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-16 w-full items-center justify-center bg-muted text-muted-foreground">
              Webpage
            </div>
          )}
          <div className="p-2">
            <div className="truncate font-medium">{source.title}</div>
            <div className="mt-1 truncate text-[11px] text-muted-foreground">
              {domain || content?.url || "—"}
            </div>
          </div>
        </div>
      </NodeShell>
    </NodeErrorBoundary>
  );
}

function safeHostname(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
