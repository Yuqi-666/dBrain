"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { NodeInfoButton } from "./node-info-button";
import { useGraphStore, useUIStore } from "@workspace/store";
import { CalendarIcon, TagIcon, LinkIcon } from "lucide-react";

interface NodeInfoPanelProps {
  className?: string;
}

/**
 * 节点信息面板 - 显示当前编辑节点的详细信息
 */
export function NodeInfoPanel({ className }: NodeInfoPanelProps) {
  const currentEditingNodeId = useUIStore(
    (state) => state.currentEditingNodeId,
  );
  const nodes = useGraphStore((state) => state.nodes);

  const currentNode = currentEditingNodeId
    ? nodes.get(currentEditingNodeId)
    : null;

  if (!currentNode) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NodeInfoButton />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>节点信息</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem disabled className="flex flex-col items-start gap-1">
          <span className="text-muted-foreground text-xs">标题</span>
          <span className="font-medium">{currentNode.title || "未命名"}</span>
        </DropdownMenuItem>

        <DropdownMenuItem disabled className="flex flex-col items-start gap-1">
          <span className="text-muted-foreground text-xs">类型</span>
          <span className="font-medium">{currentNode.nodeType}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled className="flex items-center gap-2">
          <CalendarIcon className="size-4" />
          <span className="text-xs">
            创建时间: {currentNode.createdAt || "未知"}
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem disabled className="flex items-center gap-2">
          <CalendarIcon className="size-4" />
          <span className="text-xs">
            更新时间: {currentNode.updatedAt || "未知"}
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled className="flex items-center gap-2">
          <TagIcon className="size-4" />
          <span className="text-xs">
            标签: {currentNode.tags?.join(", ") || "无"}
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem disabled className="flex items-center gap-2">
          <LinkIcon className="size-4" />
          <span className="text-xs">
            语义ID: {currentNode.semanticId || "无"}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
