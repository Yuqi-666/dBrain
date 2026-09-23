"use client";

import { useState } from "react";
import {
  MusicIcon,
  VideoIcon,
  ImageIcon,
  FileTextIcon,
  GlobeIcon,
  X,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { UploadMenu } from "@workspace/ui/components/menu/upload-menu";
import { Progress } from "@workspace/ui/components/ui/progress";
import { useFileUpload, uploadFile, analyzePdf } from "@workspace/api-client";
import { NodeService } from "@workspace/services";
import type { NodeData } from "@workspace/interfaces";

type Variant = "audio" | "video" | "image" | "pdf" | "webpage";

/**
 * Variants whose metadata is read in the browser. PDFs are excluded: their
 * parameters and their cover are produced by the backend (`file.analyzePdf`),
 * which is the only side that can parse and rasterize a PDF.
 */
type LocalVariant = Exclude<Variant, "pdf">;

interface FileDropZoneProps {
  nodeId: string;
  accept: string;
  variant: Variant;
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

/** Metadata read off the picked file, plus an optional generated cover blob. */
interface FilePreview {
  coverFile?: File;
  duration?: number;
  width?: number;
  height?: number;
}

/** Creates an object URL for `file`, runs `use`, and always revokes it again. */
async function withObjectUrl<T>(
  file: File,
  use: (url: string) => Promise<T>,
): Promise<T> {
  const url = URL.createObjectURL(file);
  try {
    return await use(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Grabs a frame ~0.1s in (frame 0 is often black) and returns it as a PNG. */
function createVideoPreview(file: File): Promise<FilePreview> {
  return withObjectUrl(
    file,
    (url) =>
      new Promise<FilePreview>((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.src = url;

        const fail = () => reject(new Error("Video load failed"));

        video.onloadedmetadata = () => {
          const duration = video.duration;
          video.currentTime =
            Number.isFinite(duration) && duration > 0
              ? Math.min(0.1, duration / 2)
              : 0;
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Canvas context unavailable"));
              return;
            }
            ctx.drawImage(video, 0, 0);
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error("Blob creation failed"));
                  return;
                }
                resolve({
                  coverFile: new File([blob], `cover-${Date.now()}.png`, {
                    type: "image/png",
                  }),
                  duration: Number.isFinite(video.duration) ? video.duration : 0,
                  width: video.videoWidth,
                  height: video.videoHeight,
                });
              },
              "image/png",
              0.9,
            );
          } catch (error) {
            reject(error);
          }
        };

        video.onerror = fail;
      }),
  );
}

function readImageSize(file: File): Promise<FilePreview> {
  return withObjectUrl(
    file,
    (url) =>
      new Promise<FilePreview>((resolve, reject) => {
        const img = new Image();
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = url;
      }),
  );
}

function readAudioDuration(file: File): Promise<FilePreview> {
  return withObjectUrl(
    file,
    (url) =>
      new Promise<FilePreview>((resolve, reject) => {
        const audio = document.createElement("audio");
        audio.preload = "metadata";
        audio.src = url;
        audio.onloadedmetadata = () =>
          resolve({
            duration: Number.isFinite(audio.duration) ? audio.duration : 0,
          });
        audio.onerror = () => reject(new Error("Audio load failed"));
      }),
  );
}

/**
 * Best-effort metadata extraction. Never rejects: a missing preview only means
 * the node falls back to its placeholder rendering.
 */
async function generatePreview(
  file: File,
  variant: LocalVariant,
): Promise<FilePreview> {
  try {
    switch (variant) {
      case "video":
        return await createVideoPreview(file);
      case "audio":
        return await readAudioDuration(file);
      case "image":
      case "webpage":
        return await readImageSize(file);
    }
  } catch (error) {
    console.warn(`[FileDropZone] preview generation failed (${variant})`, error);
    return {};
  }
}

/** Maps the stored file onto the node fields the matching node type expects. */
function buildNodeUpdates(
  variant: LocalVariant,
  url: string,
  file: File,
  preview: FilePreview,
  coverUrl = "",
): Partial<NodeData> {
  switch (variant) {
    case "image":
      return {
        content: { url },
        fileSize: file.size,
        width: preview.width ?? 0,
        height: preview.height ?? 0,
      };
    case "video":
      return {
        content: { url, coverUrl },
        fileSize: file.size,
        duration: preview.duration ?? 0,
        source: "local",
      };
    case "audio":
      return {
        content: { url },
        fileSize: file.size,
        duration: preview.duration ?? 0,
      };
    case "webpage":
      // `screenshotUrl` is what WebpageNodeContent renders; `url` keeps the
      // stored file address for symmetry with the other variants.
      return { content: { html: "", url, screenshotUrl: url } };
  }
}

/**
 * Patches a freshly uploaded PDF onto its node using the parameters the backend
 * parsed out of it.
 *
 * Best-effort on purpose: the blob is already stored, so a document the backend
 * cannot parse (password protected, corrupt) must still leave the node pointing
 * at its file — it just keeps `pageCount: 0` and no cover, which is what the
 * node renders before any metadata arrives.
 */
async function applyPdfAnalysis(
  nodeId: string,
  url: string,
  file: File,
): Promise<void> {
  let coverUrl = "";
  let pageCount = 0;
  let fileSize = file.size;

  try {
    const analysis = await analyzePdf(url);
    coverUrl = analysis.coverUrl;
    pageCount = analysis.pageCount;
    fileSize = analysis.fileSize;
  } catch (error) {
    console.warn("[FileDropZone] PDF analysis failed", error);
  }

  await NodeService.upsert(nodeId, {
    content: { url, coverUrl },
    fileSize,
    pageCount,
  });
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

  const { fileItems, uploadFiles, removeFileItem } = useFileUpload({
    maxSize: 100 * 1024 * 1024,
    limit: 1,
    accept: accept,
    upload: uploadFile,
    // `file` comes straight from the uploader — reading `fileItems[0]` here
    // would see the pre-upload state and silently skip cover generation.
    onSuccess: async (url: string, file: File) => {
      try {
        if (variant === "pdf") {
          // Parsing happens on the server: it takes a PDF parser and a
          // rasterizer, neither of which belongs in the client bundle. The
          // blob is already stored, so only its address is sent over.
          await applyPdfAnalysis(nodeId, url, file);
          return;
        }

        const preview = await generatePreview(file, variant);

        let coverUrl = "";
        if (preview.coverFile) {
          try {
            coverUrl = await uploadFile(
              preview.coverFile,
              () => {},
              new AbortController().signal,
            );
          } catch (error) {
            console.warn("[FileDropZone] cover upload failed", error);
          }
        }

        await NodeService.upsert(
          nodeId,
          buildNodeUpdates(variant, url, file, preview, coverUrl),
        );
      } catch (error) {
        onUploadError?.(
          error instanceof Error ? error : new Error("Upload failed"),
        );
      }
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
          onError={onUploadError}
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
            {item.status === "error" ? "上传失败" : `${item.progress}%`}
          </span>
        </div>
      ))}
    </div>
  );
}
