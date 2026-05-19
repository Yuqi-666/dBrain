"use client";

import { Textarea } from "@workspace/ui/components/ui/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { useNodeEditorStore } from "@workspace/store";
import { GraphCQRS } from "@workspace/api-client";
import type { TextNodeData } from "@workspace/interfaces";

interface TextNodeContentProps {
  node: TextNodeData;
  className?: string;
}

export function TextNodeContent({ node, className }: TextNodeContentProps) {
  const currentEditingNodeId = useNodeEditorStore(
    (state) => state.currentEditingNodeId,
  );

  // Get the first content string if docs is stored as object record
  const getValue = (): string => {
    if (!node.content?.docs) return "";
    if (typeof node.content.docs === "string") return node.content.docs;
    const firstKey = Object.keys(node.content.docs)[0];
    return firstKey ? String(node.content.docs[firstKey]) : "";
  };

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      <div className="space-y-2 flex-1">
        <Textarea
          value={getValue()}
          onChange={async (e) => {
            if (!currentEditingNodeId) return;
            await GraphCQRS.upsertNode(currentEditingNodeId, {
              content: { docs: { content: e.target.value } },
            });
          }}
          placeholder="输入正文内容..."
          className="min-h-[200px] resize-none font-mono text-sm"
        />
      </div>
    </div>
  );
}
