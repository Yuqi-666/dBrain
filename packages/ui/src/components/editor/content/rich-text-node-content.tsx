"use client";

import { cn } from "@workspace/ui/lib/utils";
import { NotionEditor } from "@workspace/editor/components/tiptap-templates/notion-like/notion-like-editor";
import { useGraphStore } from "@workspace/store";
import type { RichTextNodeData } from "@workspace/interfaces";

interface RichTextNodeContentProps {
  node: RichTextNodeData;
  className?: string;
}

export function RichTextNodeContent({ node, className }: RichTextNodeContentProps) {
  const updateNode = useGraphStore((state) => state.updateNode);
  const getNode = useGraphStore((state) => state.getNode);

  return (
    <NotionEditor
      room={node.id}
      placeholder="开始写作..."
      onContentChange={(content) => {
        updateNode(node.id, {
          content: {
            referencedNodes: node.content.referencedNodes,
            docs: content,
          },
        });
      }}
      getInitialContent={() => getNode(node.id)?.content}
    />
  );
}
