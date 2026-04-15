"use client";

import type { WebpageNodeData } from "@workspace/interfaces";
import { Globe, ExternalLink } from "lucide-react";

export function WebpagePreview({ node }: { node: WebpageNodeData }) {
  const { content, originalUrl, capturedAt } = node;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
        {content?.screenshotUrl ? (
          <img
            src={content.screenshotUrl}
            alt={node.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Globe className="size-10 text-blue-500" />
            <span className="text-xs text-muted-foreground">No screenshot</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <a
          href={originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground truncate"
        >
          <ExternalLink className="size-3 shrink-0" />
          <span className="truncate">{originalUrl}</span>
        </a>
        {capturedAt && (
          <p className="text-xs text-muted-foreground">
            Captured: {formatDate(capturedAt)}
          </p>
        )}
      </div>
    </div>
  );
}
