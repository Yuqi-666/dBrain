"use client";

import { useState, useEffect } from "react";
import { useNodeEditor } from "@workspace/hooks";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { cn } from "@workspace/ui/lib/utils";
import { MusicIcon, PlayIcon, PauseIcon } from "lucide-react";
import type { NodeData } from "@workspace/interfaces";

interface AudioNodeContentProps {
  node: NodeData;
  nodeId: string;
  className?: string;
}

/**
 * AudioNodeContent - Audio node editor
 * Layout: Basic info + Audio player
 */
export function AudioNodeContent({ node, nodeId, className }: AudioNodeContentProps) {
  const { updateTitle, updateField } = useNodeEditor();

  const [title, setTitle] = useState(node.title || "");
  const [audioUrl, setAudioUrl] = useState((node as any).content?.url || "");
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setTitle(node.title || "");
    setAudioUrl((node as any).content?.url || "");
  }, [node.title, node.content]);

  const handleTitleBlur = () => {
    if (title !== node.title) updateTitle(title);
  };

  const handleUrlBlur = () => {
    const currentUrl = (node as any).content?.url || "";
    if (audioUrl !== currentUrl) {
      updateField("content" as any, { url: audioUrl });
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

      {/* Audio Source */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">音频源</Label>
        <Input
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="https://example.com/audio.mp3"
          className="text-sm"
        />
      </div>

      {/* Audio Player */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">播放器</Label>
        <div className="border rounded-lg p-6 bg-muted/30">
          {audioUrl ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {isPlaying ? (
                  <PauseIcon className="size-5" />
                ) : (
                  <PlayIcon className="size-5 ml-0.5" />
                )}
              </button>
              <div className="flex-1">
                <audio
                  src={audioUrl}
                  controls
                  className="w-full h-8"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                >
                  您的浏览器不支持音频播放
                </audio>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <MusicIcon className="size-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">输入音频 URL 播放</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}