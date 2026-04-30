"use client";

import { useState, useEffect } from "react";
import { useNodeEditor } from "@workspace/hooks";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Button } from "@workspace/ui/components/ui/button";
import { cn } from "@workspace/ui/lib/utils";
import { GlobeIcon, ExternalLinkIcon, TagIcon } from "lucide-react";
import type { NodeData } from "@workspace/interfaces";

interface WebsiteNodeContentProps {
  node: NodeData;
  nodeId: string;
  className?: string;
}

/**
 * WebsiteNodeContent - Website node editor
 * Layout: Basic info + Website overview card
 */
export function WebsiteNodeContent({ node, nodeId, className }: WebsiteNodeContentProps) {
  const { updateTitle, updateField, updateTags } = useNodeEditor();

  const [title, setTitle] = useState(node.title || "");
  const [homepageUrl, setHomepageUrl] = useState((node as any).content?.homepageUrl || "");
  const [faviconUrl, setFaviconUrl] = useState((node as any).content?.faviconUrl || "");
  const [tags, setTags] = useState<string[]>(node.tags || []);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    setTitle(node.title || "");
    setHomepageUrl((node as any).content?.homepageUrl || "");
    setFaviconUrl((node as any).content?.faviconUrl || "");
    setTags(node.tags || []);
  }, [node.title, node.content, node.tags]);

  const handleTitleBlur = () => {
    if (title !== node.title) updateTitle(title);
  };

  const handleUrlBlur = () => {
    const currentUrl = (node as any).content?.homepageUrl || "";
    if (homepageUrl !== currentUrl) {
      updateField("content" as any, { homepageUrl });
    }
  };

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      const updated = [...tags, newTag];
      setTags(updated);
      updateTags(updated);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    const updated = tags.filter((t) => t !== tag);
    setTags(updated);
    updateTags(updated);
  };

  // Generate favicon URL from homepage if not set
  const displayFavicon = faviconUrl || (homepageUrl ? `https://www.google.com/s2/favicons?domain=${new URL(homepageUrl).hostname}&sz=64` : null);

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

      {/* Website URL */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">网站 URL</Label>
        <div className="flex gap-2">
          <Input
            value={homepageUrl}
            onChange={(e) => setHomepageUrl(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="https://example.com"
            className="text-sm flex-1"
          />
          {homepageUrl && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(homepageUrl, "_blank")}
            >
              <ExternalLinkIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Website Card */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">网站概览</Label>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-start gap-4">
            {displayFavicon ? (
              <img
                src={displayFavicon}
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
              <p className="font-medium">{title || "网站标题"}</p>
              <p className="text-xs text-muted-foreground truncate">{homepageUrl || "输入网站 URL"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">标签</Label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs"
            >
              <TagIcon className="size-3" />
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </span>
          ))}
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
            placeholder="添加标签..."
            className="h-6 w-24 text-xs"
          />
        </div>
      </div>
    </div>
  );
}