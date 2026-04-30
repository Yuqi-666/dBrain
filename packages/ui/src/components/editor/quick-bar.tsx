"use client";

import { useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { useGraphStore } from "@workspace/store";
import { Button } from "@workspace/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { LinkIcon, PlusIcon, ArrowRightIcon, ArrowLeftIcon } from "lucide-react";
import type { NodeData } from "@workspace/interfaces";

interface RelationshipQuickBarProps {
  node: NodeData;
  className?: string;
}

/**
 * RelationshipQuickBar - Quick actions for managing node relationships
 * Positioned at bottom of NodeEditor in window mode
 */
export function RelationshipQuickBar({ node, className }: RelationshipQuickBarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const edges = useGraphStore((state) => state.edges);
  const nodes = useGraphStore((state) => state.nodes);

  // Get connected nodes
  const connectedEdges = Array.from(edges.values()).filter(
    (edge) => edge.from === node.id || edge.to === node.id);

  // Separate inbound and outbound
  const inboundEdges = connectedEdges.filter((edge) => edge.to === node.id);
  const outboundEdges = connectedEdges.filter((edge) => edge.from === node.id);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 flex-shrink-0 border-t bg-muted/30 transition-opacity",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
        className
      )}
    >
      {/* Label */}
      <span className="text-xs text-muted-foreground font-medium">快速添加关联</span>

      {/* Inbound dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <ArrowLeftIcon className="size-3" />
            inbound
            {inboundEdges.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px]">
                {inboundEdges.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <div className="px-2 py-1.5 text-xs text-muted-foreground">入边节点</div>
          {inboundEdges.length === 0 ? (
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              暂无入边
            </DropdownMenuItem>
          ) : (
            inboundEdges.map((edge) => {
              const sourceNode = nodes.get(edge.from);
              return (
                <DropdownMenuItem key={edge.id} className="text-xs">
                  <span className="truncate">{sourceNode?.title || edge.from}</span>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Outbound dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <ArrowRightIcon className="size-3" />
            outbound
            {outboundEdges.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px]">
                {outboundEdges.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <div className="px-2 py-1.5 text-xs text-muted-foreground">出边节点</div>
          {outboundEdges.length === 0 ? (
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              暂无出边
            </DropdownMenuItem>
          ) : (
            outboundEdges.map((edge) => {
              const targetNode = nodes.get(edge.to);
              return (
                <DropdownMenuItem key={edge.id} className="text-xs">
                  <span className="truncate">{targetNode?.title || edge.to}</span>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* New node button */}
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 ml-auto">
        <PlusIcon className="size-3" />
        新建节点
      </Button>

      {/* Toggle visibility */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => setIsVisible(!isVisible)}
      >
        <LinkIcon className={cn("size-3", !isVisible && "text-muted-foreground")} />
      </Button>
    </div>
  );
}
