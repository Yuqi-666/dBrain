"use client";

import { useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { GlobeIcon } from "lucide-react";
import { GraphCQRS } from "@workspace/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/ui/dialog";
import { Input } from "@workspace/ui/components/ui/input";
import { Button } from "@workspace/ui/components/ui/button";
import type { WebsiteNodeData } from "@workspace/interfaces";

/**
 * Props for the WebsiteNodeContent component
 * Renders a website preview card with editable URL
 */
interface WebsiteNodeContentProps {
  node: WebsiteNodeData;
  className?: string;
}

/**
 * WebsiteNodeContent - Simplified website card display with URL editing
 * Allows inline editing of URL and automatically fetches favicon using Google Favicon API
 */
export function WebsiteNodeContent({
  node,
  className,
}: WebsiteNodeContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [urlInput, setUrlInput] = useState(node.content.url || "");

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;

    let processedUrl = urlInput.trim();
    // Add protocol if missing
    if (
      !processedUrl.startsWith("http://") &&
      !processedUrl.startsWith("https://")
    ) {
      processedUrl = `https://${processedUrl}`;
    }

    // Extract hostname from URL
    let hostname: string;
    try {
      hostname = new URL(processedUrl).hostname;
    } catch {
      // Invalid URL, still save it but don't generate favicon
      await GraphCQRS.updateNode(node.id, {
        content: {
          ...node.content,
          url: processedUrl,
        },
      });
      setIsEditing(false);
      return;
    }

    // Generate favicon URL using Google Favicon API
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;

    await GraphCQRS.updateNode(node.id, {
      content: {
        ...node.content,
        url: processedUrl,
        faviconUrl,
      },
    });

    setIsEditing(false);
  };

  const handleOpenEdit = () => {
    setUrlInput(node.content.url || "");
    setIsEditing(true);
  };

  return (
    <div className={cn("flex items-start p-4 w-full h-full", className)}>
      {/* Website Card */}
      <div className="w-full space-y-2">
        <p className="text-xs text-muted-foreground">网站概览</p>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-start gap-4">
            {node.content.faviconUrl ? (
              <img
                src={node.content.faviconUrl}
                alt=""
                className="w-12 h-12 rounded-lg object-contain bg-white border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <GlobeIcon className="size-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 space-y-1">
              <p className="font-medium">{node.title || "网站标题"}</p>
              <div
                className="cursor-pointer hover:bg-muted/50 transition-colors rounded p-2 -m-2"
                onClick={handleOpenEdit}
              >
                <p className="text-xs text-muted-foreground truncate">
                  {node.content.url || "点击输入网站地址"}
                </p>
              </div>
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

      {/* Edit URL Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>输入网站地址</DialogTitle>
          </DialogHeader>
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com"
            autoFocus
          />
          <DialogFooter>
            <Button onClick={handleUrlSubmit}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
