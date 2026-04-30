"use client";

import { useState, useEffect } from "react";
import { useNodeEditor } from "@workspace/hooks";
import { useGraphStore } from "@workspace/store";
import { Input } from "@workspace/ui/components/ui/input";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Label } from "@workspace/ui/components/ui/label";
import { cn } from "@workspace/ui/lib/utils";
import type { NodeData } from "@workspace/interfaces";

interface TextNodeContentProps {
  node: NodeData;
  nodeId: string;
  className?: string;
}

/**
 * TextNodeContent - Text node editor
 * Layout: Basic info (title, semantic, abstract) + content area
 */
export function TextNodeContent({ node, nodeId, className }: TextNodeContentProps) {
  const { updateTitle, updateAbstract, updateField } = useNodeEditor();
  const nodeSemantics = useGraphStore((state) => state.nodeSemantics);

  const [title, setTitle] = useState(node.title || "");
  const [abstract, setAbstract] = useState(node.abstract || "");

  // Sync with node changes
  useEffect(() => {
    setTitle(node.title || "");
    setAbstract(node.abstract || "");
  }, [node.title, node.abstract]);

  const handleTitleBlur = () => {
    if (title !== node.title) {
      updateTitle(title);
    }
  };

  const handleAbstractBlur = () => {
    if (abstract !== node.abstract) {
      updateAbstract(abstract);
    }
  };

  // Get semantic options
  const semanticOptions = Array.from(nodeSemantics.values());

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-xs text-muted-foreground">标题</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="输入标题..."
          className="text-lg font-semibold border-0 p-0 h-auto focus-visible:ring-0"
        />
      </div>

      {/* Semantic Type */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">语义类</Label>
        <select
          value={node.semanticId || ""}
          onChange={(e) => updateField("semanticId", e.target.value as any)}
          className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">选择语义类</option>
          {semanticOptions.map((semantic) => (
            <option key={semantic.id} value={semantic.id}>
              {semantic.name}
            </option>
          ))}
        </select>
      </div>

      {/* Abstract */}
      <div className="space-y-2">
        <Label htmlFor="abstract" className="text-xs text-muted-foreground">摘要</Label>
        <Textarea
          id="abstract"
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          onBlur={handleAbstractBlur}
          placeholder="输入摘要..."
          className="min-h-[100px] resize-none"
        />
      </div>

      {/* Content - Textarea for plain text */}
      <div className="space-y-2 flex-1">
        <Label className="text-xs text-muted-foreground">正文内容</Label>
        <Textarea
          value={(node as any).content?.docs || ""}
          onChange={(e) => updateField("content" as any, { docs: e.target.value })}
          placeholder="输入正文内容..."
          className="min-h-[200px] resize-none font-mono text-sm"
        />
      </div>
    </div>
  );
}