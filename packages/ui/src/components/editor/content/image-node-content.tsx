"use client";

import { useState, useEffect } from "react";
import { useNodeEditor } from "@workspace/hooks";
import { useGraphStore } from "@workspace/store";
import { Input } from "@workspace/ui/components/ui/input";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Label } from "@workspace/ui/components/ui/label";
import { cn } from "@workspace/ui/lib/utils";
import { ImageIcon, UploadIcon } from "lucide-react";
import type { NodeData } from "@workspace/interfaces";

interface ImageNodeContentProps {
  node: NodeData;
  nodeId: string;
  className?: string;
}

/**
 * ImageNodeContent - Image node editor
 * Layout: Basic info + Image preview/upload area
 */
export function ImageNodeContent({ node, nodeId, className }: ImageNodeContentProps) {
  const { updateTitle, updateAbstract, updateField } = useNodeEditor();

  const [title, setTitle] = useState(node.title || "");
  const [abstract, setAbstract] = useState(node.abstract || "");
  const [imageUrl, setImageUrl] = useState((node as any).content?.url || "");

  useEffect(() => {
    setTitle(node.title || "");
    setAbstract(node.abstract || "");
    setImageUrl((node as any).content?.url || "");
  }, [node.title, node.abstract, node.content]);

  const handleTitleBlur = () => {
    if (title !== node.title) updateTitle(title);
  };

  const handleAbstractBlur = () => {
    if (abstract !== node.abstract) updateAbstract(abstract);
  };

  const handleImageUrlBlur = () => {
    const currentUrl = (node as any).content?.url || "";
    if (imageUrl !== currentUrl) {
      updateField("content" as any, { url: imageUrl });
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

      {/* Image Preview/Upload */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">图片</Label>
        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
          {imageUrl ? (
            <div className="space-y-4">
              <img
                src={imageUrl}
                alt={title || "Image"}
                className="max-h-64 mx-auto rounded-lg object-contain"
              />
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onBlur={handleImageUrlBlur}
                placeholder="图片 URL..."
                className="text-sm"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="size-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">拖拽图片或输入 URL</p>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onBlur={handleImageUrlBlur}
                  placeholder="https://example.com/image.jpg"
                  className="text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">描述</Label>
        <Textarea
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          onBlur={handleAbstractBlur}
          placeholder="图片描述..."
          className="min-h-[100px]"
        />
      </div>
    </div>
  );
}