"use client";

import * as React from "react";
import { X } from "lucide-react";
import type { NodeData } from "@workspace/interfaces";
import { useDataStore } from "@workspace/store";
import { PREVIEW_WIDTH, PREVIEW_MAX_HEIGHT, PREVIEW_MARGIN } from "./types";
import { PreviewHeader } from "./preview-header";
import { TextPreview } from "./previews/text-preview";
import { ImagePreview } from "./previews/image-preview";
import { VideoPreview } from "./previews/video-preview";
import { PdfPreview } from "./previews/pdf-preview";
import { AudioPreview } from "./previews/audio-preview";
import { WebpagePreview } from "./previews/webpage-preview";
import { WebsitePreview } from "./previews/website-preview";
import { CollectionPreview } from "./previews/collection-preview";
import { RichTextPreview } from "./previews/rich-text-preview";

let latestMousePosition = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  window.addEventListener("mousemove", (e: MouseEvent) => {
    latestMousePosition = { x: e.clientX, y: e.clientY };
  });
}

export interface PreviewBlockProps {
  nodeId: string;
  containerRef: React.RefObject<HTMLElement | null>;
  onClose?: () => void;
  visible: boolean;
  isFocus?: boolean;
}

// 边界计算函数（使用实际尺寸）
function calculatePosition(
  mouseX: number,
  mouseY: number,
  containerRef: React.RefObject<HTMLElement | null>,
  previewWidth: number,
  previewHeight: number,
): { left: number; top: number } {
  let left = mouseX + PREVIEW_MARGIN;
  let top = mouseY + PREVIEW_MARGIN;

  if (!containerRef.current) return { left, top };

  const rect = containerRef.current.getBoundingClientRect();
  const exceedsRight = left + previewWidth > rect.right;
  const exceedsBottom = top + previewHeight > rect.bottom;

  if (exceedsRight) left = mouseX - previewWidth - PREVIEW_MARGIN;
  if (exceedsBottom) top = mouseY - previewHeight - PREVIEW_MARGIN;

  left = Math.max(
    rect.left + PREVIEW_MARGIN,
    Math.min(left, rect.right - previewWidth - PREVIEW_MARGIN),
  );
  top = Math.max(
    rect.top + PREVIEW_MARGIN,
    Math.min(top, rect.bottom - previewHeight - PREVIEW_MARGIN),
  );

  return { left, top };
}

// 渲染预览（不变）
function renderNodePreview(node: NodeData): React.ReactNode {
  switch (node.nodeType) {
    case "text":
      return <TextPreview node={node} />;
    case "image":
      return <ImagePreview node={node} />;
    case "video":
      return <VideoPreview node={node} />;
    case "pdf":
      return <PdfPreview node={node} />;
    case "audio":
      return <AudioPreview node={node} />;
    case "webpage":
      return <WebpagePreview node={node} />;
    case "website":
      return <WebsitePreview node={node} />;
    case "collection":
      return <CollectionPreview node={node} />;
    case "rich-text":
      return <RichTextPreview node={node} />;
    default:
      return <TextPreview node={node} />;
  }
}

export function PreviewBlock({
  nodeId,
  containerRef,
  onClose,
  visible,
  isFocus,
}: PreviewBlockProps) {
  const node = useDataStore((state) => state.nodes.get(nodeId));
  const previewRef = React.useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = React.useState({
    width: PREVIEW_WIDTH,
    height: PREVIEW_MAX_HEIGHT,
  });
  const [, setTick] = React.useState(0);
  const [frozenPosition, setFrozenPosition] = React.useState<{
    x: number;
    y: number;
  } | null>(null);

  React.useEffect(() => {
    if (!visible) return;
    const handleMouseMove = () => setTick((prev) => prev + 1);
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [visible]);

  React.useEffect(() => {
    if (isFocus && !frozenPosition) {
      setFrozenPosition({ x: latestMousePosition.x, y: latestMousePosition.y });
    } else if (!isFocus) {
      setFrozenPosition(null);
    }
  }, [isFocus, frozenPosition]);

  React.useEffect(() => {
    if (!previewRef.current) return;
    const updateSize = () => {
      const el = previewRef.current;
      if (el) {
        setPreviewSize({ width: el.offsetWidth, height: el.offsetHeight });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, [visible, node]);

  const pos = calculatePosition(
    isFocus && frozenPosition ? frozenPosition.x : latestMousePosition.x,
    isFocus && frozenPosition ? frozenPosition.y : latestMousePosition.y,
    containerRef,
    previewSize.width,
    previewSize.height,
  );

  // ESC 关闭
  const handleClose = React.useCallback(() => onClose?.(), [onClose]);
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) =>
      e.key === "Escape" && handleClose();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  if (!visible || !node) return null;

  return (
    <div
      ref={previewRef}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: previewSize.width || PREVIEW_WIDTH,
        maxHeight: previewSize.height || PREVIEW_MAX_HEIGHT,
        zIndex: 9999,
      }}
      data-preview-block
      className="overflow-hidden rounded-xl border bg-background shadow-xl "
    >
      <PreviewHeader node={node} />
      {onClose && (
        <button
          onClick={handleClose}
          aria-label="关闭预览"
          className="absolute right-2 top-2 rounded-full p-1 hover:bg-accent/80 transition-colors"
        >
          <X className="size-3.5 text-muted-foreground" />
        </button>
      )}
      <div className="p-3 pt-2 overflow-y-auto">{renderNodePreview(node)}</div>
    </div>
  );
}
