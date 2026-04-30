"use client";

import { useState, useEffect } from "react";
import { useNodeEditor } from "@workspace/hooks";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Button } from "@workspace/ui/components/ui/button";
import { cn } from "@workspace/ui/lib/utils";
import { VideoIcon, PlayIcon } from "lucide-react";
import type { NodeData } from "@workspace/interfaces";

interface VideoNodeContentProps {
  node: NodeData;
  nodeId: string;
  className?: string;
}

/**
 * VideoNodeContent - Video node editor
 * Layout: Basic info + Video player
 */
export function VideoNodeContent({ node, nodeId, className }: VideoNodeContentProps) {
  const { updateTitle, updateField } = useNodeEditor();

  const [title, setTitle] = useState(node.title || "");
  const [videoUrl, setVideoUrl] = useState((node as any).content?.url || "");

  useEffect(() => {
    setTitle(node.title || "");
    setVideoUrl((node as any).content?.url || "");
  }, [node.title, node.content]);

  const handleTitleBlur = () => {
    if (title !== node.title) updateTitle(title);
  };

  const handleUrlBlur = () => {
    const currentUrl = (node as any).content?.url || "";
    if (videoUrl !== currentUrl) {
      updateField("content" as any, { url: videoUrl });
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

      {/* Video Source */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">视频源</Label>
        <Input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="https://example.com/video.mp4"
          className="text-sm"
        />
      </div>

      {/* Video Player */}
      <div className="flex-1 space-y-2">
        <Label className="text-xs text-muted-foreground">预览</Label>
        <div className="border rounded-lg overflow-hidden bg-black flex items-center justify-center min-h-[300px]">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              className="w-full max-h-[400px]"
              preload="metadata"
            >
              您的浏览器不支持视频播放
            </video>
          ) : (
            <div className="text-center space-y-4 p-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <VideoIcon className="size-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">输入视频 URL 预览</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}