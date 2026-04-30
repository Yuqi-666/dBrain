"use client";

import { useState, useEffect } from "react";
import { useNodeEditor } from "@workspace/hooks";
import { useGraphStore } from "@workspace/store";
import { Input } from "@workspace/ui/components/ui/input";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Label } from "@workspace/ui/components/ui/label";
import { cn } from "@workspace/ui/lib/utils";
import { NotionEditor } from "@workspace/editor/components/tiptap-templates/notion-like/notion-like-editor";
import type { NodeData } from "@workspace/interfaces";

interface RichTextNodeContentProps {
  node: NodeData;
  nodeId: string;
  className?: string;
}

/**
 * RichTextNodeContent - Rich text node editor
 * Layout: Basic info section + NotionEditor (Tiptap)
 *
 * Note: NotionEditor handles collaboration and AI internally.
 * The room ID is set to the node ID for per-node collaboration.
 */
export function RichTextNodeContent({ node, nodeId, className }: RichTextNodeContentProps) {
  const { updateTitle, updateAbstract } = useNodeEditor();
  const nodeSemantics = useGraphStore((state) => state.nodeSemantics);

  const [title, setTitle] = useState(node.title || "");
  const [abstract, setAbstract] = useState(node.abstract || "");

  useEffect(() => {
    setTitle(node.title || "");
    setAbstract(node.abstract || "");
  }, [node.title, node.abstract]);

  const handleTitleBlur = () => {
    if (title !== node.title) updateTitle(title);
  };

  const handleAbstractBlur = () => {
    if (abstract !== node.abstract) updateAbstract(abstract);
  };

  // Get semantic options
  const semanticOptions = Array.from(nodeSemantics.values());

  // Get referenced nodes
  const referencedNodes = (node as any).content?.referencedNodes || [];

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Basic Info Section - Fixed height, not scrollable */}
      <div className="space-y-4 p-6 border-b">
        {/* Title */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">标题</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="输入标题..."
            className="text-lg font-semibold"
          />
        </div>

        {/* Semantic Type */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">语义类</Label>
          <select
            value={node.semanticId || ""}
            onChange={(e) => {/* TODO: implement semantic update */}}
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
          <Label className="text-xs text-muted-foreground">摘要</Label>
          <Textarea
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            onBlur={handleAbstractBlur}
            placeholder="输入摘要..."
            className="min-h-[80px] resize-none"
          />
        </div>
      </div>

      {/* Tiptap Editor Section - Fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <NotionEditor
          room={nodeId}
          placeholder="开始写作..."
        />
      </div>
    </div>
  );
}