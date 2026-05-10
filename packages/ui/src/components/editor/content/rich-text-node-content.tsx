"use client";

import { cn } from "@workspace/ui/lib/utils";
import { NotionEditor } from "@workspace/editor/components/tiptap-templates/notion-like/notion-like-editor";
import type { RichTextNodeData } from "@workspace/interfaces";

/**
 * Props for the RichTextNodeContent component
 */
interface RichTextNodeContentProps {
  node: RichTextNodeData;
  className?: string;
}

/**
 * RichTextNodeContent - Rich text node editor
 * Layout: NotionEditor (Tiptap) only - metadata handled by attributes sidebar
 *
 * Note: NotionEditor handles collaboration and AI internally.
 * The room ID is set to the node ID for per-node collaboration.
 */
export function RichTextNodeContent({ node, className }: RichTextNodeContentProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Tiptap Editor Section - Fills entire space */}
      <div className="flex-1 overflow-hidden">
        <NotionEditor room={node.id} placeholder="开始写作..." />
      </div>
    </div>
  );
}
