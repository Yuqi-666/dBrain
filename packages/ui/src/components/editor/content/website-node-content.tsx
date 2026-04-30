"use client";

import { cn } from "@workspace/ui/lib/utils";
import { GlobeIcon } from "lucide-react";
import type { WebsiteNodeData } from "@workspace/interfaces";

interface WebsiteNodeContentProps {
  node: WebsiteNodeData;
  className?: string;
}

/**
 * WebsiteNodeContent - Simplified website card display
 * All metadata (title, url, favicon, tags) is now handled by the attributes sidebar.
 * This component only renders the website card using node data directly.
 */
export function WebsiteNodeContent({ node, className }: WebsiteNodeContentProps) {

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      {/* Website Card */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">网站概览</p>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-start gap-4">
            {node.content.faviconUrl ? (
              <img
                src={node.content.faviconUrl}
                alt=""
                className="w-12 h-12 rounded-lg object-contain bg-white border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <GlobeIcon className="size-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 space-y-1">
              <p className="font-medium">{node.title || "网站标题"}</p>
              <p className="text-xs text-muted-foreground truncate">{node.content.url || "输入网站 URL"}</p>
            </div>
          </div>
          {(node.tags?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
              {node.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
