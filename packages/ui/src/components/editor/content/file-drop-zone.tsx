"use client";

import { useState } from "react";
import {
  MusicIcon,
  VideoIcon,
  ImageIcon,
  FileTextIcon,
  GlobeIcon,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { UploadMenu } from "@workspace/ui/components/upload-menu";
import { Progress } from "@workspace/ui/components/ui/progress";
import { X } from "lucide-react";
import { useFileUpload, uploadFile, GraphCQRS } from "@workspace/api-client";

interface FileDropZoneProps {
  nodeId: string;
  accept: string;
  variant: "audio" | "video" | "image" | "pdf" | "webpage";
  onUploadStart?: () => void;
  onUploadError?: (error: Error) => void;
  className?: string;
}

const VARIANT_CONFIG = {
  audio: {
    icon: MusicIcon,
    label: "音频",
    minHeight: "min-h-[100px]",
  },
  video: {
    icon: VideoIcon,
    label: "视频",
    minHeight: "min-h-[100px]",
  },
  image: {
    icon: ImageIcon,
    label: "图片",
    minHeight: "min-h-[100px]",
  },
  pdf: {
    icon: FileTextIcon,
    label: "PDF",
    minHeight: "min-h-[400px]",
  },
  webpage: {
    icon: GlobeIcon,
    label: "网页截图",
    minHeight: "min-h-[300px]",
  },
} as const;

async function generateCover(
  file: File | undefined,
  variant: "pdf" | "video"
): Promise<string> {
  if (!file) return "";

  if (variant === "video") {
    try {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      const url = URL.createObjectURL(file);
      video.src = url;

      const coverUrl = await new Promise<string>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.currentTime = 0.1;
        };
        video.onseeked = () => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            reject(new Error("Canvas context unavailable"));
            return;
          }
          ctx.drawImage(video, 0, 0);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              if (!blob) {
                reject(new Error("Blob creation failed"));
                return;
              }
              const coverFile = new File([blob], `cover-${Date.now()}.png`, {
                type: "image/png",
              });
              uploadFile(coverFile, () => { }, new AbortController().signal)
                .then((url) => resolve(url))
                .catch(() => reject(new Error("Cover upload failed")));
            },
            "image/png",
            0.9
          );
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Video load failed"));
        };
      });
      return coverUrl;
    } catch {
      return "";
    }
  }

  return "";
}

export function FileDropZone({
  nodeId,
  accept,
  variant,
  onUploadStart,
  onUploadError,
  className,
}: FileDropZoneProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  const { fileItems, uploadFiles, removeFileItem } =
    useFileUpload({
      maxSize: 100 * 1024 * 1024,
      limit: 1,
      accept: accept,
      upload: uploadFile,
      onSuccess: async (url: string) => {
        let coverUrl = "";
        if (variant === "pdf" || variant === "video") {
          coverUrl = await generateCover(fileItems[0]?.file, variant);
        }
        await GraphCQRS.updateNode(nodeId, {
          content: { url, cover_url: coverUrl },
        });
      },
      onError: (error) => {
        onUploadError?.(error);
      },
    });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  const handleFilesSelected = (files: File[]) => {
    onUploadStart?.();
    uploadFiles(files);
  };

  if (fileItems.length === 0) {
    return (
      <>
        <div
          onClick={handleClick}
          className={cn(
            "w-full h-full flex flex-col items-center justify-center gap-4 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
            config.minHeight,
            className
          )}
        >
          <Icon className="size-12 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            点击添加{config.label}
          </span>
        </div>

        <UploadMenu
          position={menuPosition}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          accept={accept}
          onFilesSelected={handleFilesSelected}
        />
      </>
    );
  }

  return (
    <div
      className={cn(
        "w-full h-full flex flex-col items-center justify-center gap-4",
        className
      )}
    >
      {fileItems.map((item) => (
        <div key={item.id} className="w-full max-w-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm truncate">{item.file.name}</span>
            <button
              onClick={() => removeFileItem(item.id)}
              disabled={item.status === "success"}
              className="p-1 hover:bg-muted rounded-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              <X className="size-4" />
            </button>
          </div>
          <Progress value={item.progress} />
          <span className="text-xs text-muted-foreground">
            {item.progress}%
          </span>
        </div>
      ))}
    </div>
  );
}
