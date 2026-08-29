"use client";

import { cn } from "@workspace/ui/lib/utils";
import { NotionEditor } from "@workspace/editor/components/tiptap-templates/notion-like/notion-like-editor";
import { useDataStore } from "@workspace/store";
import { NodeService } from "@workspace/services";
import type { RichTextNodeData } from "@workspace/interfaces";

interface RichTextNodeContentProps {
  node: RichTextNodeData;
  className?: string;
}

export function RichTextNodeContent({ node, className }: RichTextNodeContentProps) {
  const getNode = useDataStore((state) => state.getNode);

  return (
    <NotionEditor
      room={node.id}
      placeholder="开始写作..."
      onContentChange={(content) => {
        void NodeService.upsert(
          node.id,
          {
            content: {
              referencedNodes: node.content.referencedNodes,
              docs: content,
            },
          },
          { debounce: true },
        );
      }}
      getInitialContent={() => getNode(node.id)?.content ?? {}}
    />
  );
}
