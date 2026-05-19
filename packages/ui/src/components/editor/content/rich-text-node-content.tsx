"use client";

import { cn } from "@workspace/ui/lib/utils";
import { NotionEditor } from "@workspace/editor/components/tiptap-templates/notion-like/notion-like-editor";
import { useGraphStore } from "@workspace/store";
import { GraphCQRS } from "@workspace/api-client";
import type { RichTextNodeData } from "@workspace/interfaces";

interface RichTextNodeContentProps {
  node: RichTextNodeData;
  className?: string;
}

export function RichTextNodeContent({ node, className }: RichTextNodeContentProps) {
  const getNode = useGraphStore((state) => state.getNode);

  return (
    <NotionEditor
      room={node.id}
      placeholder="开始写作..."
      onContentChange={async (content) => {
        await GraphCQRS.upsertNode(node.id, {
          content: {
            referencedNodes: node.content.referencedNodes,
            docs: content,
          },
        });
      }}
      getInitialContent={() => getNode(node.id)?.content ?? {}}
    />
  );
}
