"use client";

import type { WebsiteNodeData } from "@workspace/interfaces";
import { Globe, ExternalLink } from "lucide-react";

export function WebsitePreview({ node }: { node: WebsiteNodeData }) {

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
        {node.content?.faviconUrl ? (
          <img
            src={node.content?.faviconUrl}
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
            {getDomain(node.content.url || "")}
          </p>
        </div>
      </div>
      {node.content.url && (
        <a
          href={node.content.url}
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
