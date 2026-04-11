"use client";
import React, { useState } from "react";
import { useUIStore, useGraphStore } from "@workspace/store";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Separator } from "@workspace/ui/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/ui/tooltip";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Pin,
  PanelLeftClose,
  LayoutGrid,
  CircleDot,
  Link2,
  Globe,
} from "lucide-react";

export function CognitiveSidebar() {
  const { sidebarMode, closeSidebar, toggleSidebar } = useUIStore();
  const { views, nodes } = useGraphStore();

  const pinnedViews = Array.from(views.values()).filter(
    (view) => view.isPinned,
  );
  const recentNodes = Array.from(nodes.values()).slice(0, 5);

  const handleToggleSidebar = () => {
    if (sidebarMode === "temp") {
      toggleSidebar();
      closeSidebar();
    } else {
      closeSidebar();
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen w-64 flex-col border-r bg-background text-foreground">
        <SidebarHeader onToggle={handleToggleSidebar} />

        <Separator />

        <div className="flex flex-col gap-1 p-3">
          <SpaceSelector />

          <Button
            variant="ghost"
            className="justify-between px-3 text-muted-foreground hover:text-foreground"
          >
            <div className="flex items-center gap-2">
              <Search className="size-4" />
              <span>Search</span>
            </div>
            <kbd className="rounded-md border bg-muted px-2 py-0.5 text-xs">
              Ctrl+K
            </kbd>
          </Button>
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-4">
            <ViewsList views={pinnedViews} />
            <NodesList nodes={recentNodes} />
            <RelationshipsList />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
function SidebarHeader({ onToggle }: { onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-3">
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-md bg-orange-500 flex items-center justify-center">
          <span className="text-white font-bold text-sm">dB</span>
        </div>
        <span className="text-xl font-semibold">dBrain</span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="size-8"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Close sidebar</TooltipContent>
      </Tooltip>
    </div>
  );
}

function SpaceSelector() {
  const [currentSpace, setCurrentSpace] = useState("Personal Space");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-3">
          <div className="flex items-center gap-2">
            <Globe className="size-4" />
            <span className="font-medium">{currentSpace}</span>
          </div>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => setCurrentSpace("Personal Space")}>
          Personal Space
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setCurrentSpace("Work Space")}>
          Work Space
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setCurrentSpace("Project Space")}>
          Project Space
        </DropdownMenuItem>
        <Separator />
        <DropdownMenuItem className="text-primary">
          <Plus className="mr-2 size-4" />
          Create new space
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ViewItem({
  view,
}: {
  view: { id: string; name: string; isPinned?: boolean };
}) {
  return (
    <div className="group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
      <div className="flex items-center gap-2">
        <LayoutGrid className="size-4 text-muted-foreground" />
        <span className="text-sm">{view.name}</span>
      </div>
      <div className="hidden items-center gap-1 group-hover:flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
            >
              <Pin className="size-3 fill-current" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Unpin view</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">View options</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function ViewsList({
  views,
}: {
  views: Array<{ id: string; name: string; isPinned?: boolean }>;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <div className="flex items-center gap-1.5">
              {isOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              <span className="text-sm font-medium">Views</span>
            </div>
          </Button>
        </CollapsibleTrigger>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-6">
              <Plus className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Create new view</TooltipContent>
        </Tooltip>
      </div>
      <CollapsibleContent className="pt-1.5">
        <div className="flex flex-col gap-0.5">
          {views.length > 0 ? (
            views.map((view) => <ViewItem key={view.id} view={view} />)
          ) : (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No pinned views
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function NodeItem({
  node,
}: {
  node: { id: string; title: string; semanticId?: string };
}) {
  return (
    <div className="group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
      <div className="flex items-center gap-2">
        <CircleDot className="size-4 text-muted-foreground" />
        <span className="text-sm">{node.title}</span>
        {node.semanticId && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {node.semanticId}
          </span>
        )}
      </div>
      <div className="hidden items-center gap-1 group-hover:flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
            >
              <Pin className="size-3 fill-current" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Unpin node</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Node options</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function NodesList({
  nodes,
}: {
  nodes: Array<{ id: string; title: string; semanticId?: string }>;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <div className="flex items-center gap-1.5">
              {isOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              <span className="text-sm font-medium">Nodes</span>
            </div>
          </Button>
        </CollapsibleTrigger>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-6">
              <Plus className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Create new node</TooltipContent>
        </Tooltip>
      </div>
      <CollapsibleContent className="pt-1.5">
        <div className="flex flex-col gap-0.5">
          {nodes.length > 0 ? (
            nodes.map((node) => <NodeItem key={node.id} node={node} />)
          ) : (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No recent nodes
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function RelationshipItem({
  name,
  count = 0,
}: {
  name: string;
  count?: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
      <div className="flex items-center gap-2">
        <Link2 className="size-4 text-muted-foreground" />
        <span className="text-sm">{name}</span>
      </div>
      <span className="text-xs text-muted-foreground">{count}</span>
    </div>
  );
}

function RelationshipsList() {
  const [isOpen, setIsOpen] = useState(true);

  const relationshipCategories = [
    { name: "层次关系", count: 0 },
    { name: "流向关系", count: 0 },
    { name: "关联关系", count: 0 },
    { name: "交互关系", count: 0 },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <div className="flex items-center gap-1.5">
              {isOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              <span className="text-sm font-medium">Relationships</span>
            </div>
          </Button>
        </CollapsibleTrigger>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-6">
              <Plus className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Create new relationship type
          </TooltipContent>
        </Tooltip>
      </div>
      <CollapsibleContent className="pt-1.5">
        <div className="flex flex-col gap-0.5">
          {relationshipCategories.map((rel) => (
            <RelationshipItem
              key={rel.name}
              name={rel.name}
              count={rel.count}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
