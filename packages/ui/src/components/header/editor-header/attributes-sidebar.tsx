"use client";

import { useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { useDataStore, useUIStore } from "@workspace/store";
import { useGraph } from "@workspace/hooks";
import { GraphCQRS } from "@workspace/api-client";
import { LinkIcon } from "lucide-react";
import type {
  EdgeData,
  NodeData,
  NodeTagId,
} from "@workspace/interfaces";
import { Input } from "@workspace/ui/components/ui/input";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Button } from "@workspace/ui/components/ui/button";
import { Popover, PopoverTrigger } from "@workspace/ui/components/ui/popover";
import { TagList, TagPill } from "@workspace/ui/components/list/node/tag-list";
import { SemanticList } from "@workspace/ui/components/list/node/semantic-list";
import { Plus } from "lucide-react";

interface AttributesSidebarProps {
  className?: string;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs rounded-lg transition-colors",
        active ? "bg-background shadow-sm" : "hover:bg-muted/50",
      )}
    >
      {children}
    </button>
  );
}

export function AttributesSidebar({ className }: AttributesSidebarProps) {
  const [activeTab, setActiveTab] = useState<"metadata" | "relationships">(
    "metadata",
  );

  const currentEditingNodeId = useUIStore(
    (state) => state.currentEditingNodeId,
  );
  const nodes = useDataStore((state) => state.nodes);
  const edges = useDataStore((state) => state.edges);

  const currentNode = currentEditingNodeId
    ? nodes.get(currentEditingNodeId)
    : null;

  if (!currentEditingNodeId || !currentNode) return null;

  const nodeEdges = Array.from(edges.values()).filter(
    (edge: EdgeData) =>
      edge.from === currentEditingNodeId || edge.to === currentEditingNodeId,
  );

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-popover border rounded-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex border rounded-lg bg-muted p-0.5">
          <TabButton
            active={activeTab === "metadata"}
            onClick={() => setActiveTab("metadata")}
          >
            元数据
          </TabButton>
          <TabButton
            active={activeTab === "relationships"}
            onClick={() => setActiveTab("relationships")}
          >
            关联
          </TabButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "metadata" ? (
          <MetadataTabContent
            node={currentNode}
            nodeId={currentEditingNodeId}
          />
        ) : (
          <RelationshipsTabContent
            edges={nodeEdges}
            currentNodeId={currentEditingNodeId}
          />
        )}
      </div>
    </div>
  );
}

function MetadataTabContent({
  node,
  nodeId,
}: {
  node: NodeData;
  nodeId: string;
}) {
  const nodeSemanticsMap = useDataStore((state) => state.nodeSemantics);
  const allSemantics = Array.from(nodeSemanticsMap.values());

  const handleAbstractChange = async (value: string) => {
    await GraphCQRS.upsertNode(nodeId, { abstract: value });
  };

  const handleSemanticIdChange = async (value: string) => {
    await GraphCQRS.upsertNode(nodeId, { semanticId: value });
  };

  const nodeTagsMap = useDataStore((state) => state.nodeTags);
  const allTags = Array.from(nodeTagsMap.values());

  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const { onCreateTag, onDeleteTag } = useGraph();

  const handleToggleTag = async (tagId: NodeTagId) => {
    const currentTags = node.tags || [];
    if (currentTags.includes(tagId)) {
      await GraphCQRS.upsertNode(nodeId, { tags: currentTags.filter((t) => t !== tagId) });
    } else {
      await GraphCQRS.upsertNode(nodeId, { tags: [...currentTags, tagId] });
    }
  };

  const handleDeleteTag = async (tagId: NodeTagId) => {
    const currentTags = node.tags || [];
    await GraphCQRS.upsertNode(nodeId, { tags: currentTags.filter((t) => t !== tagId) });
  };

  const handleContentUrlChange = async (field: string, value: string) => {
    if (!node.content) return;
    await GraphCQRS.upsertNode(nodeId, {
      content: { ...node.content, [field]: value },
    });
  };

  const handleCollectionTypeChange = async (value: string) => {
    if (node.nodeType !== "collection") return;
    const newCollectionType = value as "ordered" | "unordered" | "cards";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await GraphCQRS.upsertNode(nodeId, {
      content: {
        ...node.content,
        filterConfig: {
          ...(node.content as any)?.filterConfig,
          collectionType: newCollectionType,
        },
      },
    } as any);
  };

  // Helper to get content url based on node type
  const getContentUrl = () => {
    if (!node.content) return "";
    switch (node.nodeType) {
      case "video":
      case "audio":
      case "image":
      case "pdf":
        return (node.content as { url?: string }).url || "";
      case "webpage":
        return (node.content as { screenshotUrl?: string }).screenshotUrl || "";
      case "website":
        return (node.content as { url?: string }).url || "";
      default:
        return "";
    }
  };

  const getContentUrlField = () => {
    switch (node.nodeType) {
      case "video":
      case "audio":
      case "image":
      case "pdf":
        return "url";
      case "webpage":
        return "screenshotUrl";
      case "website":
        return "url";
      default:
        return "";
    }
  };

  const showContentUrl =
    node.nodeType === "video" ||
    node.nodeType === "audio" ||
    node.nodeType === "image" ||
    node.nodeType === "pdf" ||
    node.nodeType === "webpage" ||
    node.nodeType === "website";

  const showFaviconUrl = node.nodeType === "website";

  const showCollectionType = node.nodeType === "collection";

  return (
    <div className="space-y-4 text-sm">
      {/* Read-only: Title */}
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">标题</span>
        <p className="font-medium">{node.title || "未命名"}</p>
      </div>


      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">类型</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs h-8 font-normal"
            >
              {node.semanticId ? (
                (() => {
                  const selected = allSemantics.find(s => s.id === node.semanticId);
                  return selected ? (
                    <div className="flex items-center gap-2">
                      {selected.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: selected.color }}
                        />
                      )}
                      <span>{selected.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">选择语义标签</span>
                  );
                })()
              ) : (
                <span className="text-muted-foreground">选择语义标签</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <SemanticList
              onSelect={handleSemanticIdChange}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">标签</span>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {node.tags?.map((tagId) => {
            const tag = allTags.find((t) => t.id === tagId);
            return (
              <TagPill
                key={tagId}
                tag={tag}
                tagId={tagId}
                onRemove={() => handleDeleteTag(tagId)}
              />
            );
          })}
        </div>
        <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs h-8"
            >
              <Plus className="size-3 mr-1" />
              添加标签
            </Button>
          </PopoverTrigger>
          <TagList
            appliedTagIds={node.tags || []}
            onToggleTag={handleToggleTag}
            onDeleteTag={onDeleteTag}
            onCreateTag={onCreateTag}
          />
        </Popover>
      </div>

      {/* Editable: Abstract */}
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">摘要</span>
        <Textarea
          value={node.abstract || ""}
          onChange={(e) => handleAbstractChange(e.target.value)}
          placeholder="输入摘要..."
          className="min-h-20 text-xs"
        />
      </div>

      {/* Editable: Content URL (for relevant node types) */}
      {showContentUrl && (
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">url</span>
          <Input
            value={getContentUrl()}
            onChange={(e) =>
              handleContentUrlChange(getContentUrlField(), e.target.value)
            }
            placeholder="输入内容URL..."
            className="text-xs"
          />
        </div>
      )}

      {/* Editable: Favicon URL (website only) */}
      {showFaviconUrl && (
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">网站图标</span>
          <Input
            value={(node.content as { faviconUrl?: string })?.faviconUrl || ""}
            onChange={(e) =>
              handleContentUrlChange("faviconUrl", e.target.value)
            }
            placeholder="输入网站图标URL..."
            className="text-xs"
          />
        </div>
      )}

      {/* Editable: Collection Type (collection only) */}
      {showCollectionType && (
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">集合类型</span>
          <Select
            value={
              (node as { collectionType?: string }).collectionType ||
              "unordered"
            }
            onValueChange={handleCollectionTypeChange}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="选择集合类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ordered">有序</SelectItem>
              <SelectItem value="unordered">无序</SelectItem>
              <SelectItem value="cards">卡片</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Read-only: Type */}
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">数据类型</span>
        <p className="font-medium">{node.nodeType}</p>
      </div>

      {/* Read-only: Created At */}
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">创建时间</span>
        <p className="text-xs">{node.createdAt || "未知"}</p>
      </div>

      {/* Read-only: Updated At */}
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">更新时间</span>
        <p className="text-xs">{node.updatedAt || "未知"}</p>
      </div>
    </div>
  );
}

function RelationshipsTabContent({
  edges,
  currentNodeId,
}: {
  edges: any[];
  currentNodeId: string;
}) {
  if (edges.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        暂无关联关系
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {edges.map((edge) => {
        const isSource = edge.from === currentNodeId;
        const otherNodeId = isSource ? edge.to : edge.from;
        return (
          <div
            key={edge.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm"
          >
            <LinkIcon className="size-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {isSource ? "→" : "←"}
            </span>
            <span className="font-medium truncate flex-1">
              {otherNodeId.slice(0, 8)}...
            </span>
            <span className="text-xs text-muted-foreground">
              {edge.edgeType || "关联"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
