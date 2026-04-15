"use client";

import type { WebsiteNodeData } from "@workspace/interfaces";
import { Globe, ExternalLink } from "lucide-react";

export function WebsitePreview({ node }: { node: WebsiteNodeData }) {
  const { content, targetUrl, favicon } = node;

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
        {content?.faviconUrl || favicon ? (
          <img
            src={content?.faviconUrl || favicon}
            alt=""
            className="size-8 rounded"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
            <Globe className="size-4 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{node.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {getDomain(targetUrl || content?.homepageUrl || "")}
          </p>
        </div>
      </div>
      {targetUrl && (
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-3" />
          <span>Visit site</span>
        </a>
      )}
    </div>
  );
}
