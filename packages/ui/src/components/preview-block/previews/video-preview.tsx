"use client";

import type { VideoNodeData } from "@workspace/interfaces";
import { Video } from "lucide-react";
import { useState } from "react";

// 格式化时长：秒 → mm:ss
function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// 格式化文件大小
function formatSize(bytes: number) {
  if (!bytes || isNaN(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoPreview({ node }: { node: VideoNodeData }) {
  // 状态：控制是否播放视频
  const [isPlaying, setIsPlaying] = useState(false);

  // 安全取值
  const { content, duration = 0, source, fileSize = 0, title = "Video" } = node ?? {};

  return (
    <div className="space-y-2">
      {/* 鼠标移入/移出 控制播放 */}
      <div
        className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted"
        onMouseEnter={() => setIsPlaying(true)}  // 鼠标进来 → 播放
        onMouseLeave={() => setIsPlaying(false)} // 鼠标离开 → 停止
      >
        {/* 1. 默认显示：封面图 */}
        {!isPlaying && (
          <>
            {content?.cover_url ? (
              <img
                src={content.cover_url}
                alt={title}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Video className="size-8 text-muted-foreground" />
              </div>
            )}

            {/* 时长 */}
            {duration > 0 && (
              <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                {formatDuration(duration)}
              </div>
            )}
          </>
        )}

        {/* 2. 鼠标移入后显示：视频自动播放 */}
        {isPlaying && content.url && (
          <video
            src={content.url}
            autoPlay
            muted          // 必须静音才能自动播放（浏览器规则）
            loop           // 循环播放（更像预览效果）
            className="size-full object-cover"
            playsInline
          />
        )}

        {/* 播放按钮已完全删除 */}
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="capitalize">{source || "Unknown"}</span>
        {fileSize > 0 && <span>{formatSize(fileSize)}</span>}
      </div>
    </div>
  );
};
