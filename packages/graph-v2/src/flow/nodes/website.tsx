"use client";

import { NodeShell, type CustomNodeProps } from "./NodeShell";
import { NodeErrorBoundary } from "./ErrorBoundary";
import type { WebsiteNodeData } from "@workspace/interfaces";

export function WebsiteNode(props: CustomNodeProps) {
  const source = props.data.source as WebsiteNodeData;
  const { content } = source;
  const domain = safeHostname(content?.url);
  return (
    <NodeErrorBoundary>
      <NodeShell {...props}>
        <div className="flex min-w-[200px] max-w-[280px] items-center gap-2 rounded-md border bg-background p-2 text-xs shadow-sm">
          {content?.faviconUrl ? (
            <img
              src={content.faviconUrl}
              alt=""
              className="h-6 w-6 rounded"
              draggable={false}
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
              🌐
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{source.title || domain}</div>
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {domain || content?.url}
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
