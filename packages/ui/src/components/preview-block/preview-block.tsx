"use client";

import * as React from "react";
import { X } from "lucide-react";
import type { NodeData } from "@workspace/interfaces";
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

export interface PreviewBlockProps {
  node: NodeData;
  position: { x: number; y: number };
  containerRef: React.RefObject<HTMLElement | null>;
  onClose?: () => void;
}

function calculatePosition(
  cursorX: number,
  cursorY: number,
  containerRef: React.RefObject<HTMLElement | null>,
): { left: number; top: number } {
  let left = cursorX + PREVIEW_MARGIN;
  let top = cursorY + PREVIEW_MARGIN;

  if (containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    const exceedsRight = left + PREVIEW_WIDTH > rect.right;
    const exceedsBottom = top + PREVIEW_MAX_HEIGHT > rect.bottom;

    if (exceedsRight) {
      left = cursorX - PREVIEW_WIDTH - PREVIEW_MARGIN;
    }
    if (exceedsBottom) {
      top = cursorY - PREVIEW_MAX_HEIGHT - PREVIEW_MARGIN;
    }

    left = Math.max(
      rect.left + PREVIEW_MARGIN,
      Math.min(left, rect.right - PREVIEW_WIDTH - PREVIEW_MARGIN),
    );
    top = Math.max(
      rect.top + PREVIEW_MARGIN,
      Math.min(top, rect.bottom - PREVIEW_MAX_HEIGHT - PREVIEW_MARGIN),
    );
  }

  return { left, top };
}

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
  node,
  position,
  containerRef,
  onClose,
}: PreviewBlockProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const pos = calculatePosition(position.x, position.y, containerRef);

  return (
    <div
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: PREVIEW_WIDTH,
        maxHeight: PREVIEW_MAX_HEIGHT,
        zIndex: 9999,
      }}
      className="overflow-hidden rounded-xl border bg-background shadow-xl animate-in fade-in zoom-in-95 duration-150"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <PreviewHeader node={node} />
      {isHovered && onClose && (
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full p-1 hover:bg-accent/80 transition-colors"
        >
          <X className="size-3.5 text-muted-foreground" />
        </button>
      )}
      <div className="p-3 pt-2">{renderNodePreview(node)}</div>
    </div>
  );
}
