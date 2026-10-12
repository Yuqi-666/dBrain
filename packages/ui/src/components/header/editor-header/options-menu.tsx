"use client";
import { useI18n } from "@workspace/ui/lib/i18n";

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
  const { t } = useI18n();

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
          aria-label={t("更多选项")}
        >
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{t("操作")}</DropdownMenuLabel>
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
              ? t("从 Dashboard 备选移除")
              : t("添加到 Dashboard 备选")}
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleCopy}>
          <CopyIcon className="size-4 mr-2" />
          <span>{t("复制节点")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <DownloadIcon className="size-4 mr-2" />
          <span>{t("导出节点")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <ShareIcon className="size-4 mr-2" />
          <span>{t("分享节点")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <ExternalLinkIcon className="size-4 mr-2" />
          <span>{t("在新窗口打开")}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleDelete} variant="destructive">
          <TrashIcon className="size-4 mr-2" />
          <span>{t("删除节点")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
