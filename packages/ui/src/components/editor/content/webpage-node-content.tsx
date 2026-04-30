"use client";

import { cn } from "@workspace/ui/lib/utils";
import { GlobeIcon } from "lucide-react";
import type { WebpageNodeData } from "@workspace/interfaces";

interface WebpageNodeContentProps {
  node: WebpageNodeData;
  className?: string;
}

/**
 * WebpageNodeContent - Webpage node display
 * Simplified to only render the screenshot image
 */
export function WebpageNodeContent({ node, className }: WebpageNodeContentProps) {
  return (
    <div className={cn("flex flex-col p-6", className)}>
      <div className="flex-1 min-h-[300px] bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden">
        {node.content?.screenshotUrl ? (
          <img
            src={node.content?.screenshotUrl}
            alt={node.title || "网页截图"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center space-y-4 p-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <GlobeIcon className="size-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">无截图</p>
          </div>
        )}
      </div>
    </div>
  );
}
