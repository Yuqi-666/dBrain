"use client";

import { useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { useGraphStore, useNodeEditorStore } from "@workspace/store";
import { InfoIcon, LinkIcon, X } from "lucide-react";
import type { EdgeData } from "@workspace/interfaces";

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

  const currentEditingNodeId = useNodeEditorStore((state) => state.currentEditingNodeId);
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const setAttributesSidebarOpen = useNodeEditorStore((state) => state.setAttributesSidebarOpen);

  const currentNode = currentEditingNodeId
    ? nodes.get(currentEditingNodeId)
    : null;

  if (!currentEditingNodeId || !currentNode) return null;

  const nodeEdges = Array.from(edges.values()).filter(
    (edge: EdgeData) =>
      edge.from === currentEditingNodeId ||
      edge.to === currentEditingNodeId,
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
          <MetadataTabContent node={currentNode} />
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

function MetadataTabContent({ node }: { node: any }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">标题</span>
        <p className="font-medium">{node.title || "未命名"}</p>
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">类型</span>
        <p className="font-medium">{node.nodeType}</p>
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">创建时间</span>
        <p className="text-xs">{node.createdAt || "未知"}</p>
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">更新时间</span>
        <p className="text-xs">{node.updatedAt || "未知"}</p>
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">标签</span>
        <p className="text-xs">{node.tags?.join(", ") || "无"}</p>
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">语义ID</span>
        <p className="text-xs font-mono">{node.semanticId || "无"}</p>
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
