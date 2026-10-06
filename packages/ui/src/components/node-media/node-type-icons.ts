"use client";

/**
 * The node-type → glyph table, as a **single source of truth**.
 *
 * It used to exist twice — `preview-header.tsx`'s local `nodeTypeIcons` and
 * `node-preview-cover.tsx`'s `NODE_TYPE_ICONS` — which is exactly how a local
 * copy grows back after one of them is touched (docs/plan/node-content-ui.md
 * §M2.2-3). Both now import this, and the icon selector uses it as
 * `NodeIconView`'s `fallback`.
 *
 * Frozen shape (main agent, `docs/plan/node-content-ui.md` §0-2); W1-A owns the
 * file but the export name and type must not change.
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
import type { NodeDataType } from "@workspace/interfaces";

export const NODE_TYPE_ICONS: Record<NodeDataType, LucideIcon> = {
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
