"use client";

import { useState, useEffect } from "react";
import { useNodeEditor } from "@workspace/hooks";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Button } from "@workspace/ui/components/ui/button";
import { cn } from "@workspace/ui/lib/utils";
import { GlobeIcon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import type { NodeData } from "@workspace/interfaces";

interface WebpageNodeContentProps {
  node: NodeData;
  nodeId: string;
  className?: string;
}

/**
 * WebpageNodeContent - Webpage node editor
 * Layout: Basic info + URL input + Preview
 */
export function WebpageNodeContent({ node, nodeId, className }: WebpageNodeContentProps) {
  const { updateTitle, updateField } = useNodeEditor();

  const [title, setTitle] = useState(node.title || "");
  const [url, setUrl] = useState((node as any).content?.html || "");
  const [screenshotUrl, setScreenshotUrl] = useState((node as any).content?.screenshotUrl || "");

  useEffect(() => {
    setTitle(node.title || "");
    setUrl((node as any).content?.html || "");
    setScreenshotUrl((node as any).content?.screenshotUrl || "");
  }, [node.title, node.content]);

  const handleTitleBlur = () => {
    if (title !== node.title) updateTitle(title);
  };

  const handleUrlBlur = () => {
    const currentUrl = (node as any).content?.html || "";
    if (url !== currentUrl) {
      updateField("content" as any, { html: url });
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      {/* Title */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">标题</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="输入标题..."
          className="text-lg font-semibold"
        />
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">网页 URL</Label>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="https://example.com/page"
            className="text-sm flex-1"
          />
          {url && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(url, "_blank")}
            >
              <ExternalLinkIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">预览</Label>
          {screenshotUrl && (
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
              <RefreshCwIcon className="size-3" />
              刷新
            </Button>
          )}
        </div>
        <div className="border rounded-lg min-h-[300px] bg-muted/30 flex items-center justify-center overflow-hidden">
          {screenshotUrl ? (
            <img
              src={screenshotUrl}
              alt={title || "网页预览"}
              className="max-w-full max-h-[400px] object-contain"
            />
          ) : (
            <div className="text-center space-y-4 p-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <GlobeIcon className="size-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">输入 URL 获取预览</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}