"use client";

/**
 * A node's own preview, reduced to a **cover** — the piece a card wall needs.
 *
 * `PreviewBlock` is a hover panel: a header (title, semantic, abstract) plus the
 * type-specific body. A gallery card has its own title/badges/meta, so what it
 * borrows from the preview layer is only the *media* — the image, the video
 * poster, the PDF cover, the icon — drawn to fill a fixed box.
 *
 * That keeps the gallery from re-implementing `resolveFileUrl` (or any other
 * node-type knowledge), without importing the hover panel's chrome or the
 * video player behind it. Keep this a leaf: no store, no `PreviewHeader`.
 */
import type { LucideIcon } from "lucide-react";
import {
  FileEdit,
  FileText,
  FileType,
  Folder,
  Globe,
  Image as ImageIcon,
  Table,
  Video,
  Volume,
} from "lucide-react";
import type { NodeData, NodeDataType } from "@workspace/interfaces";
import { resolveFileUrl } from "@workspace/api-client";
import { cn } from "@workspace/ui/lib/utils";

/** The glyph a node type falls back to when it has no picture of its own. */
const NODE_TYPE_ICONS: Record<NodeDataType, LucideIcon> = {
  text: FileText,
  image: ImageIcon,
  video: Video,
  pdf: FileType,
  audio: Volume,
  webpage: Globe,
  website: Globe,
  collection: Folder,
  "rich-text": FileEdit,
  database: Table,
};

/** How much extracted text a text-like cover shows. */
const COVER_TEXT_LIMIT = 180;

/** Flattens a Tiptap/ProseMirror doc to plain text (text + rich-text nodes). */
function extractDocText(docs: Record<string, unknown> | undefined): string {
  if (!docs || !("content" in docs)) return "";

  const walk = (node: unknown): string => {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (typeof node !== "object") return "";
    const record = node as { text?: unknown; content?: unknown };
    if (typeof record.text === "string") return record.text;
    if (Array.isArray(record.content)) {
      return record.content.map(walk).join(" ");
    }
    return "";
  };

  return walk(docs).replace(/\s+/g, " ").trim();
}

/** The image a node can draw itself with, resolved to a servable URL. */
function nodeCoverUrl(node: NodeData): string | null {
  switch (node.nodeType) {
    case "image":
      return node.content?.url ? resolveFileUrl(node.content.url) : null;
    case "video":
      return node.content?.coverUrl
        ? resolveFileUrl(node.content.coverUrl)
        : null;
    case "pdf":
      return node.content?.coverUrl
        ? resolveFileUrl(node.content.coverUrl)
        : null;
    case "website":
      return node.content?.faviconUrl
        ? resolveFileUrl(node.content.faviconUrl)
        : null;
    default:
      return null;
  }
}

/** A textual stand-in for a node whose content is text. */
function nodeCoverText(node: NodeData): string {
  switch (node.nodeType) {
    case "text":
      return extractDocText(node.content?.docs);
    case "rich-text":
      return extractDocText(node.content?.docs);
    case "webpage":
      return (
        node.content?.code
          ?.replace(/\s+/g, " ")
          .trim()
          .slice(0, COVER_TEXT_LIMIT) ?? ""
      );
    default:
      return "";
  }
}

export interface NodePreviewCoverProps {
  node: NodeData;
  /** Applied to the cover box; the caller sizes it. */
  className?: string;
}

/**
 * Fills its box with the node's cover: its picture when it has one, its text
 * when that is all it holds, and its type glyph otherwise.
 *
 * The caller provides the box (aspect ratio, rounding, `overflow-hidden`); this
 * component never measures or scrolls.
 */
export function NodePreviewCover({ node, className }: NodePreviewCoverProps) {
  const url = nodeCoverUrl(node);
  const text = url ? "" : nodeCoverText(node);
  const Icon = NODE_TYPE_ICONS[node.nodeType] ?? FileText;

  if (url) {
    return (
      <div className={cn("size-full overflow-hidden bg-muted", className)}>
        <img
          src={url}
          alt={node.title}
          loading="lazy"
          draggable={false}
          className="size-full object-cover"
        />
      </div>
    );
  }

  if (text) {
    return (
      <div
        className={cn(
          "size-full overflow-hidden bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground",
          className,
        )}
      >
        <p className="line-clamp-6">{text}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex size-full items-center justify-center bg-muted/60 text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-6 opacity-60" />
    </div>
  );
}
