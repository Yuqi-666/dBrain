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

interface FileDropZoneProps {
  accept: string;
  variant: "audio" | "video" | "image" | "pdf" | "webpage";
  onUploadStart: () => void;
  onUploadComplete: (attachment: { url: string }) => void;
  onUploadError: (error: Error) => void;
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

export function FileDropZone({
  accept,
  variant,
  onUploadStart,
  onUploadComplete,
  onUploadError,
  className,
}: FileDropZoneProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

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
        onUploadStart={onUploadStart}
        onUploadComplete={onUploadComplete}
        onUploadError={onUploadError}
      />
    </>
  );
}