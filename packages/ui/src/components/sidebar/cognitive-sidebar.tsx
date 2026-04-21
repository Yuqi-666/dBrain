"use client";
import { useState, useMemo } from "react";
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
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Pin,
  LayoutGrid,
  CircleDot,
  Link2,
  Globe,
  PanelLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import LogoIcon from "../../img/icon/logo.svg"

export function CognitiveSidebar() {
  const { sidebarMode, closeSidebar, toggleSidebar, convertTempToFixed } =
    useUIStore();
  const { views, nodes } = useGraphStore();

  const pinnedViews = Array.from(views.values()).filter(
    (view) => view.isPinned,
  );
  const recentViews = Array.from(views.values())
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, 5);
  const recentNodes = Array.from(nodes.values()).slice(0, 5);

  const handleToggleSidebar = () => {
    if (sidebarMode === "temp") {
      convertTempToFixed();
    } else if (sidebarMode === "fixed") {
      closeSidebar();
    } else {
      toggleSidebar();
    }
  };

  return (
    <div className="flex h-screen w-70 flex-col border-r bg-background text-foreground">
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
          <ViewsList pinnedViews={pinnedViews} recentViews={recentViews} />
          <NodeSemanticList />
          <EdgeSemanticList />
          <NodesList nodes={recentNodes} />
        </div>
      </div>
    </div>
  );
}

function SidebarHeader({ onToggle }: { onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-2">
      <div className="flex items-center gap-2">
        <div className="size-12 rounded-md flex items-center justify-center">
          <img src={LogoIcon.src} className="w-full h-full" />
        </div>
        <span className="text-xl font-semibold">dBrain</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="size-8"
      >
        <PanelLeftIcon className="size-4" />
      </Button>
    </div>
  );
}

function SpaceSelector() {
  const [currentSpace, setCurrentSpace] = useState("Personal Space");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-3 h-12">
          <div className="flex items-center gap-2">
            <Globe className="size-4" />
            <span className="font-medium">{currentSpace}</span>
          </div>
          <div className="flex flex-col items-center ml-1 leading-none">
            <ChevronUpIcon className="size-3" />
            <ChevronDownIcon className="size-3 -mt-1" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" sideOffset={16} className="w-56">
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
  onTogglePin,
}: {
  view: { id: string; name: string; isPinned?: boolean };
  onTogglePin: (id: string, isPinned: boolean) => void;
}) {
  return (
    <div className="group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
      <div className="flex items-center gap-2">
        <LayoutGrid className="size-4 text-muted-foreground" />
        <span className="text-sm">{view.name}</span>
      </div>
      <div className="hidden items-center gap-1 group-hover:flex">
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
          onClick={() => onTogglePin(view.id, !view.isPinned)}
        >
          <Pin className={cn("size-3", view.isPinned && "fill-current")} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
        >
          <MoreHorizontal className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function ViewsList({
  pinnedViews,
  recentViews,
}: {
  pinnedViews: Array<{ id: string; name: string; isPinned?: boolean; updatedAt?: string }>;
  recentViews: Array<{ id: string; name: string; isPinned?: boolean; updatedAt?: string }>;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const updateView = useGraphStore((state) => state.updateView);

  const handleTogglePin = (id: string, isPinned: boolean) => {
    updateView(id, { isPinned });
  };

  const nonPinnedRecentViews = recentViews.filter(
    (rv) => !pinnedViews.some((pv) => pv.id === rv.id),
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex-1 justify-start p-0 h-auto hover:bg-transparent"
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
        <Button variant="ghost" size="icon" className="size-6">
          <Plus className="size-3.5" />
        </Button>
      </div>
      <CollapsibleContent className="pt-1.5 max-h-60 overflow-y-auto">
        <div className="flex flex-col gap-2">
          {pinnedViews.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <p className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                Pinned
              </p>
              {pinnedViews.map((view) => (
                <ViewItem
                  key={view.id}
                  view={view}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          )}
          {nonPinnedRecentViews.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <p className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                Recent
              </p>
              {nonPinnedRecentViews.map((view) => (
                <ViewItem
                  key={view.id}
                  view={view}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          )}
          {pinnedViews.length === 0 && nonPinnedRecentViews.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No views</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function NodeItem({
  node,
  onTogglePin,
}: {
  node: { id: string; title: string; semanticId?: string; isPinned?: boolean };
  onTogglePin: (id: string, isPinned: boolean) => void;
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
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
          onClick={() => onTogglePin(node.id, !node.isPinned)}
        >
          <Pin className={cn("size-3", node.isPinned && "fill-current")} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
        >
          <MoreHorizontal className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function NodesList({
  nodes,
}: {
  nodes: Array<{ id: string; title: string; semanticId?: string; isPinned?: boolean }>;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const updateNode = useGraphStore((state) => state.updateNode);

  const handleTogglePin = (id: string, isPinned: boolean) => {
    updateNode(id, { isPinned });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex-1 justify-start p-0 h-auto hover:bg-transparent"
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
        <Button variant="ghost" size="icon" className="size-6">
          <Plus className="size-3.5" />
        </Button>
      </div>
      <CollapsibleContent className="pt-1.5 max-h-40 overflow-y-auto">
        <div className="flex flex-col gap-0.5">
          {nodes.length > 0 ? (
            nodes.map((node) => (
              <NodeItem key={node.id} node={node} onTogglePin={handleTogglePin} />
            ))
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

function NodeSemanticItem({
  semantic,
}: {
  semantic: { id: string; name: string; color?: string };
}) {
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
      <div className="flex items-center gap-2">
        <CircleDot className="size-4 text-muted-foreground" />
        <span className="text-sm">{semantic.name}</span>
        {semantic.color && (
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: semantic.color }}
          />
        )}
      </div>
      <div className="hidden items-center gap-1 group-hover:flex">
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
        >
          <Pin className="size-3 fill-current" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
        >
          <MoreHorizontal className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function NodeSemanticList() {
  const [isOpen, setIsOpen] = useState(true);
  const nodeSemanticsMap = useGraphStore((state) => state.nodeSemantics);
  const nodeSemantics = useMemo(() =>
    Array.from(nodeSemanticsMap.values()),
    [nodeSemanticsMap]
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex-1 justify-start p-0 h-auto hover:bg-transparent"
          >
            <div className="flex items-center gap-1.5">
              {isOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              <span className="text-sm font-medium">Node Semantics</span>
            </div>
          </Button>
        </CollapsibleTrigger>
        <Button variant="ghost" size="icon" className="size-6">
          <Plus className="size-3.5" />
        </Button>
      </div>
      <CollapsibleContent className="pt-1.5 max-h-40 overflow-y-auto">
        <div className="flex flex-col gap-0.5">
          {nodeSemantics.length > 0 ? (
            nodeSemantics.map((semantic) => (
              <NodeSemanticItem key={semantic.id} semantic={semantic} />
            ))
          ) : (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No node semantics
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function EdgeSemanticCategory({
  category,
  semantics,
}: {
  category: string;
  semantics: Array<{ id: string; name: string; color?: string }>;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full pl-2">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex-1 justify-start p-0 h-auto hover:bg-transparent"
          >
            <div className="flex items-center gap-1.5">
              {isOpen ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              <span className="text-xs font-medium">{category}</span>
            </div>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="pt-1 pl-4 max-h-32 overflow-y-auto">
        <div className="flex flex-col gap-0.5">
          {semantics.map((semantic) => (
            <div
              key={semantic.id}
              className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted transition-colors"
            >
              <Link2 className="size-3 text-muted-foreground" />
              <span className="text-xs">{semantic.name}</span>
              {semantic.color && (
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: semantic.color }}
                />
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function EdgeSemanticList() {
  const [isOpen, setIsOpen] = useState(true);
  const edgeSemanticsMap = useGraphStore((state) => state.edgeSemantics);
  const edgeSemantics = useMemo(() =>
    Array.from(edgeSemanticsMap.values()),
    [edgeSemanticsMap]
  );

  const categories = [
    { key: "hierarchy", label: "层次关系" },
    { key: "flow", label: "流向关系" },
    { key: "association", label: "关联关系" },
    { key: "interaction", label: "交互关系" },
  ] as const;

  const groupedSemantics = useMemo(() =>
    categories.reduce(
      (acc, cat) => {
        acc[cat.key] = edgeSemantics.filter((s) => s.category === cat.key);
        return acc;
      },
      { hierarchy: [] as typeof edgeSemantics, flow: [] as typeof edgeSemantics, association: [] as typeof edgeSemantics, interaction: [] as typeof edgeSemantics }
    ),
    [edgeSemantics, categories]
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex-1 justify-start p-0 h-auto hover:bg-transparent"
          >
            <div className="flex items-center gap-1.5">
              {isOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              <span className="text-sm font-medium">Edge Semantics</span>
            </div>
          </Button>
        </CollapsibleTrigger>
        <Button variant="ghost" size="icon" className="size-6">
          <Plus className="size-3.5" />
        </Button>
      </div>
      <CollapsibleContent className="pt-1.5 max-h-48 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {categories.map((cat) => (
            <EdgeSemanticCategory
              key={cat.key}
              category={cat.label}
              semantics={groupedSemantics[cat.key] || []}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
