"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Button } from "@workspace/ui/components/ui/button";
import { useDataStore, useUIStore } from "@workspace/store";
import { NodeService, DashboardService } from "@workspace/services";
import {
  CopyIcon,
  TrashIcon,
  DownloadIcon,
  ShareIcon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  LayoutDashboard,
} from "lucide-react";

import { useDashboard } from "@workspace/ui/hooks/use-dashboard";

interface OptionsMenuProps {
  nodeId?: string | null;
  className?: string;
}

/**
 * 选项菜单 - 节点操作菜单（删除、复制、导出等）
 */
export function OptionsMenu({ nodeId, className }: OptionsMenuProps) {
  const currentEditingNodeId = useUIStore(
    (state) => state.currentEditingNodeId,
  );
  const nodes = useDataStore((state) => state.nodes);
  const setCurrentEditingNodeId = useUIStore(
    (state) => state.setCurrentEditingNodeId,
  );

  const { scope, workspace, ready, syncState } = useDashboard();

  const targetNodeId = nodeId || currentEditingNodeId;
  const currentNode = targetNodeId ? nodes.get(targetNodeId) : null;

  const handleDelete = async () => {
    if (targetNodeId) {
      await NodeService.delete(targetNodeId);
      setCurrentEditingNodeId(null);
    }
  };

  const handleCopy = () => {
    if (currentNode) {
      navigator.clipboard.writeText(JSON.stringify(currentNode, null, 2));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label="更多选项"
        >
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>操作</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={!ready || syncState?.loading || !targetNodeId}
          onSelect={() => {
            if (scope && targetNodeId)
              DashboardService.toggleCandidate(scope, targetNodeId);
          }}
        >
          <LayoutDashboard className="size-4 mr-2" />
          <span>
            {targetNodeId && workspace?.candidates.includes(targetNodeId)
              ? "从 Dashboard 备选移除"
              : "添加到 Dashboard 备选"}
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleCopy}>
          <CopyIcon className="size-4 mr-2" />
          <span>复制节点</span>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <DownloadIcon className="size-4 mr-2" />
          <span>导出节点</span>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <ShareIcon className="size-4 mr-2" />
          <span>分享节点</span>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <ExternalLinkIcon className="size-4 mr-2" />
          <span>在新窗口打开</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleDelete} variant="destructive">
          <TrashIcon className="size-4 mr-2" />
          <span>删除节点</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
