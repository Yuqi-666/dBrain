"use client";

import { useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { useGraphStore, useNodeEditorStore } from "@workspace/store";
import { GraphCQRS } from "@workspace/api-client";
import { LinkIcon, Plus, X } from "lucide-react";
import type {
  EdgeData,
  NodeData,
  NodeSemantic,
  NodeTag,
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
import { Button } from "@workspace/ui/components/ui/button";

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

  const currentEditingNodeId = useNodeEditorStore(
    (state) => state.currentEditingNodeId,
  );
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);

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
  const getAllNodeSemantics = useGraphStore(
    (state) => state.getAllNodeSemantics,
  );
  const allSemantics = getAllNodeSemantics();

  const handleAbstractChange = async (value: string) => {
    await GraphCQRS.upsertNode(nodeId, { abstract: value });
  };

  const handleSemanticIdChange = async (value: string) => {
    await GraphCQRS.upsertNode(nodeId, { semanticId: value });
  };

  const getAllNodeTags = useGraphStore((state) => state.getAllNodeTags);
  const allTags = getAllNodeTags();

  const [newTagName, setNewTagName] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const handleToggleTag = async (tagId: NodeTagId) => {
    const currentTags = node.tags || [];
    if (currentTags.includes(tagId)) {
      await GraphCQRS.upsertNode(nodeId, { tags: currentTags.filter((t) => t !== tagId) });
    } else {
      await GraphCQRS.upsertNode(nodeId, { tags: [...currentTags, tagId] });
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const tagId = newTagName.trim().toLowerCase().replace(/\s+/g, "-");
    const colors = [
      "#3B82F6",
      "#10B981",
      "#8B5CF6",
      "#F59E0B",
      "#EF4444",
      "#EC4899",
      "#6366F1",
      "#14B8A6",
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newTag: NodeTag = {
      id: tagId,
      name: newTagName.trim(),
      color: randomColor,
    };
    await GraphCQRS.upsertNodeTag(newTag);
    const currentTags = node.tags || [];
    await GraphCQRS.upsertNode(nodeId, { tags: [...currentTags, tagId] });
    setNewTagName("");
    setIsCreatingTag(false);
  };

  const handleDeleteTag = async (tagId: NodeTagId) => {
    const currentTags = node.tags || [];
    await GraphCQRS.upsertNode(nodeId, { tags: currentTags.filter((t) => t !== tagId) });
  };

  const handleContentUrlChange = async (field: string, value: string) => {
    if (!node.content) return;
    await GraphCQRS.upsertNode(nodeId, {
      content: { ...node.content, [field]: value },
    } as Partial<Omit<NodeData, "id" | "nodeType">>);
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

      {/* Read-only: Type */}
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">类型</span>
        <p className="font-medium">{node.nodeType}</p>
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

      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">语义ID</span>
        <Select
          value={node.semanticId || ""}
          onValueChange={handleSemanticIdChange}
        >
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="选择语义标签" />
          </SelectTrigger>
          <SelectContent>
            {allSemantics.map((semantic: NodeSemantic) => (
              <SelectItem key={semantic.id} value={semantic.id}>
                <div className="flex items-center gap-2">
                  {semantic.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: semantic.color }}
                    />
                  )}
                  <span>{semantic.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">标签</span>
        <div className="flex flex-wrap gap-1 mb-2">
          {node.tags?.map((tagId) => {
            const tag = allTags.find((t) => t.id === tagId);
            return (
              <span
                key={tagId}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs"
              >
                {tag?.color && (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                )}
                {tag?.name || tagId}
                <button
                  onClick={() => handleDeleteTag(tagId)}
                  className="hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
        {isCreatingTag ? (
          <div className="flex gap-1">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateTag();
                if (e.key === "Escape") {
                  setIsCreatingTag(false);
                  setNewTagName("");
                }
              }}
              placeholder="输入标签名称"
              className="text-xs"
              autoFocus
            />
            <Button type="button" size="sm" onClick={handleCreateTag}>
              <Plus className="size-3" />
            </Button>
          </div>
        ) : (
          <Select
            value=""
            onValueChange={(value) => {
              if (value === "__create_new__") {
                setIsCreatingTag(true);
              } else {
                handleToggleTag(value as NodeTagId);
              }
            }}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="选择或创建标签" />
            </SelectTrigger>
            <SelectContent>
              {allTags
                .filter((tag) => !node.tags?.includes(tag.id))
                .map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      {tag.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      <span>{tag.name}</span>
                    </div>
                  </SelectItem>
                ))}
              <SelectItem value="__create_new__">
                <div className="flex items-center gap-2">
                  <Plus className="size-3" />
                  <span>创建新标签</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Editable: Content URL (for relevant node types) */}
      {showContentUrl && (
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">内容URL</span>
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
