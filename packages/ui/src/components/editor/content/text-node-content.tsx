"use client";

import { Textarea } from "@workspace/ui/components/ui/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { useGraphStore, useNodeEditorStore } from "@workspace/store";
import type { TextNodeData } from "@workspace/interfaces";

interface TextNodeContentProps {
  node: TextNodeData;
  className?: string;
}

export function TextNodeContent({ node, className }: TextNodeContentProps) {
  const updateNode = useGraphStore((state) => state.updateNode);
  const currentEditingNodeId = useNodeEditorStore((state) => state.currentEditingNodeId);

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      <div className="space-y-2 flex-1">
        <Textarea
          value={(node.content?.docs as any) || ""}
          onChange={(e) => {
            if (!currentEditingNodeId) return;
            updateNode(currentEditingNodeId, { content: { docs: e.target.value } as any });
          }}
          placeholder="输入正文内容..."
          className="min-h-[200px] resize-none font-mono text-sm"
        />
      </div>
    </div>
  );
}