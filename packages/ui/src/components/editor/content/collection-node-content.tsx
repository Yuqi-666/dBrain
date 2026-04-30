"use client";

import { useState, useEffect } from "react";
import { useNodeEditor } from "@workspace/hooks";
import { useGraphStore } from "@workspace/store";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Button } from "@workspace/ui/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/ui/select";
import { cn } from "@workspace/ui/lib/utils";
import { FolderIcon, PlusIcon, XIcon, ListIcon, ListOrderedIcon, LayoutGridIcon } from "lucide-react";
import type { NodeData } from "@workspace/interfaces";

interface CollectionNodeContentProps {
  node: NodeData;
  nodeId: string;
  className?: string;
}

type CollectionViewType = "ordered" | "unordered" | "cards";

/**
 * CollectionNodeContent - Collection node editor
 * Layout: Basic info + Collection configuration + Node list
 */
export function CollectionNodeContent({ node, nodeId, className }: CollectionNodeContentProps) {
  const { updateTitle, updateField } = useNodeEditor();
  const nodes = useGraphStore((state) => state.nodes);

  const [title, setTitle] = useState(node.title || "");
  const [collectionType, setCollectionType] = useState<CollectionViewType>("unordered");
  const [nodeIds, setNodeIds] = useState<string[]>([]);

  useEffect(() => {
    setTitle(node.title || "");
    const content = (node as any).content || {};
    setCollectionType(content.collectionType || "unordered");
    setNodeIds(content.nodeIds || []);
  }, [node.title, node.content]);

  const handleTitleBlur = () => {
    if (title !== node.title) updateTitle(title);
  };

  const handleCollectionTypeChange = (value: string) => {
    setCollectionType(value as CollectionViewType);
    updateField("content" as any, {
      collectionType: value,
      nodeIds
    });
  };

  const handleRemoveNode = (idToRemove: string) => {
    const updated = nodeIds.filter((id) => id !== idToRemove);
    setNodeIds(updated);
    updateField("content" as any, {
      collectionType,
      nodeIds: updated
    });
  };

  // Get collection nodes data
  const collectionNodes = nodeIds
    .map((id) => nodes.get(id))
    .filter(Boolean);

  const getCollectionIcon = () => {
    switch (collectionType) {
      case "ordered":
        return <ListOrderedIcon className="size-4" />;
      case "cards":
        return <LayoutGridIcon className="size-4" />;
      default:
        return <ListIcon className="size-4" />;
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
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

      {/* Collection Type */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">集合类型</Label>
        <Select value={collectionType} onValueChange={handleCollectionTypeChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ordered">
              <div className="flex items-center gap-2">
                <ListOrderedIcon className="size-4" />
                <span>有序列表</span>
              </div>
            </SelectItem>
            <SelectItem value="unordered">
              <div className="flex items-center gap-2">
                <ListIcon className="size-4" />
                <span>无序列表</span>
              </div>
            </SelectItem>
            <SelectItem value="cards">
              <div className="flex items-center gap-2">
                <LayoutGridIcon className="size-4" />
                <span>卡片视图</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Node List */}
      <div className="space-y-2 flex-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            节点列表 ({nodeIds.length})
          </Label>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <PlusIcon className="size-3" />
            添加节点
          </Button>
        </div>

        <div className="border rounded-lg min-h-[200px] p-4 bg-muted/30">
          {collectionNodes.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <FolderIcon className="size-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">点击"添加节点"将节点加入集合</p>
              </div>
            </div>
          ) : (
            <div className={cn(
              "space-y-2",
              collectionType === "cards" && "grid grid-cols-2 gap-3"
            )}>
              {collectionNodes.map((collectionNode) => (
                <div
                  key={collectionNode!.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg bg-background border",
                    collectionType === "cards" && "flex-col items-start"
                  )}
                >
                  {collectionType === "cards" ? (
                    <>
                      <div className="w-full flex items-start justify-between">
                        <span className="font-medium">{collectionNode!.title || "未命名"}</span>
                        <button
                          onClick={() => handleRemoveNode(collectionNode!.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <XIcon className="size-4" />
                        </button>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {collectionNode!.nodeType}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">
                        {collectionType === "ordered" ? `${nodeIds.indexOf(collectionNode!.id) + 1}.` : "•"}
                      </span>
                      <span className="flex-1 font-medium truncate">
                        {collectionNode!.title || "未命名"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {collectionNode!.nodeType}
                      </span>
                      <button
                        onClick={() => handleRemoveNode(collectionNode!.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <XIcon className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}