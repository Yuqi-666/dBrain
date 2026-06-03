"use client";
import { useDataStore, useUIStore } from "@workspace/store";
import { GraphCQRS } from "@workspace/api-client";
import type {
  NodeDataType,
} from "@workspace/interfaces";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { DataTypeList } from "../list/node/dataType-list";
import { SemanticList } from "../list/node/semantic-list";
import { Separator } from "@workspace/ui/components/ui/separator";
import { cn } from "@workspace/ui/lib/utils";
import {
  ChevronDownIcon,
  ChevronRight,
  ChevronUpIcon,
  CircleDot,
  Globe,
  LayoutGrid,
  Link2,
  MoreHorizontal,
  PanelLeftIcon,
  Pin,
  Plus,
  Search,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import LogoIcon from "../../img/icon/logo.svg";
import { useGraph } from "@workspace/hooks";

export function CognitiveSidebar() {
  const { sidebarMode, closeSidebar, toggleSidebar, convertTempToFixed } =
    useUIStore();
  const { views, nodes } = useDataStore();
  const setCurrentEditingNodeId = useUIStore(
    (state) => state.setCurrentEditingNodeId,
  );

  const pinnedViews = Array.from(views.values()).filter(
    (view) => view.isPinned,
  );
  const recentViews = Array.from(views.values()).slice(0, 5);
  const recentNodes = Array.from(nodes.values())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const handleToggleSidebar = () => {
    if (sidebarMode === "temp") {
      convertTempToFixed();
    } else if (sidebarMode === "fixed") {
      closeSidebar();
    } else {
      toggleSidebar();
    }
  };

  const { onAddNode } = useGraph()

  return (
    <aside
      className={cn(
        "flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground overflow-hidden select-none",
        "border-r border-sidebar-border",
        sidebarMode === "temp" && "rounded-lg",
      )}
    >
      <SidebarHeader onToggle={handleToggleSidebar} />

      <div className="h-px bg-sidebar-border" />

      <div className="flex flex-col gap-1 px-3 py-4">
        <SpaceSelector />
        <SearchButton />
      </div>

      <div className="h-px bg-sidebar-border" />

      <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
        <div className="flex flex-col gap-5 px-3 py-4">
          <ViewsList pinnedViews={pinnedViews} recentViews={recentViews} />
          <NodeSemanticList />
          <EdgeSemanticList />
          <NodesList nodes={recentNodes} onAddNode={onAddNode} />
        </div>
      </div>
    </aside>
  );
}

function SidebarHeader({ onToggle }: { onToggle: () => void }) {
  return (
    <header className="flex items-center justify-between px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary/10">
          <img src={LogoIcon.src} className="size-10" alt="dBrain" />
        </div>
        <span className="text-[18px] font-heading tracking-tight text-sidebar-foreground">
          dBrain
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="size-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-200 rounded-lg"
      >
        <PanelLeftIcon className="size-4" />
      </Button>
    </header>
  );
}

function SpaceSelector() {
  const [currentSpace, setCurrentSpace] = useState("Personal Space");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-2.5 h-10 rounded-lg hover:bg-sidebar-accent transition-colors duration-200 group"
        >
          <div className="flex items-center gap-2.5">
            <Globe className="size-4 text-sidebar-primary" />
            <span className="text-[13px] font-medium text-sidebar-foreground">
              {currentSpace}
            </span>
          </div>
          <div className="flex items-center text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60 transition-colors">
            <div className="flex flex-col items-center ml-1 leading-none">
              <ChevronUpIcon className="size-3" />
              <ChevronDownIcon className="size-3 -mt-1" />
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={12}
        className="w-52 rounded-xl border-sidebar-border bg-sidebar p-1.5 shadow-lg"
      >
        <DropdownMenuItem
          onClick={() => setCurrentSpace("Personal Space")}
          className="rounded-lg px-2.5 py-2 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
        >
          Personal Space
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setCurrentSpace("Work Space")}
          className="rounded-lg px-2.5 py-2 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
        >
          Work Space
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setCurrentSpace("Project Space")}
          className="rounded-lg px-2.5 py-2 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
        >
          Project Space
        </DropdownMenuItem>
        <Separator className="my-1.5 bg-sidebar-border" />
        <DropdownMenuItem className="rounded-lg px-2.5 py-2 text-[13px] text-sidebar-primary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer">
          <Plus className="mr-2 size-4" />
          Create new space
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SearchButton() {
  return (
    <button
      className={cn(
        "flex items-center justify-between px-2.5 h-9 rounded-lg",
        "text-[13px] text-sidebar-foreground/50",
        "bg-sidebar-accent/50 hover:bg-sidebar-accent",
        "border border-transparent hover:border-sidebar-border",
        "transition-all duration-200 cursor-pointer w-full",
      )}
    >
      <div className="flex items-center gap-2.5">
        <Search className="size-4" />
        <span>Search</span>
      </div>
      <kbd className="rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[11px] font-mono text-sidebar-foreground/40">
        ⌘K
      </kbd>
    </button>
  );
}

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
}

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  action,
}: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center justify-between mb-1">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 py-1 hover:opacity-70 transition-opacity duration-200 cursor-pointer">
            <span
              className={cn(
                "transition-transform duration-200",
                isOpen ? "rotate-90" : "rotate-0",
              )}
            >
              <ChevronRight className="size-3.5 text-sidebar-foreground/40" />
            </span>
            {icon}
            <span className="text-[13px] font-semibold text-sidebar-foreground tracking-wide">
              {title}
            </span>
          </button>
        </CollapsibleTrigger>
        {action}
      </div>
      <CollapsibleContent className="pt-1.5 pb-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
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
    <div className="group flex items-center justify-between rounded-lg px-2.5 py-2 hover:bg-sidebar-accent transition-colors duration-150">
      <div className="flex items-center gap-2.5 min-w-0">
        <LayoutGrid className="size-3.5 text-sidebar-foreground/30 shrink-0" />
        <span className="text-[13px] text-sidebar-foreground truncate">
          {view.name}
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-7 text-sidebar-foreground/30 hover:text-sidebar-primary hover:bg-sidebar-primary/10 transition-colors rounded-md",
            view.isPinned
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150",
          )}
          onClick={() => onTogglePin(view.id, !view.isPinned)}
        >
          <Pin
            className={cn(
              "size-3",
              view.isPinned && "fill-sidebar-primary text-sidebar-primary",
            )}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors rounded-md opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150"
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
  pinnedViews: Array<{
    id: string;
    name: string;
    isPinned?: boolean;
    updatedAt?: string;
  }>;
  recentViews: Array<{
    id: string;
    name: string;
    isPinned?: boolean;
    updatedAt?: string;
  }>;
}) {
  const handleTogglePin = async (id: string, isPinned: boolean) => {
    await GraphCQRS.upsertView(id, { isPinned });
  };

  const nonPinnedRecentViews = recentViews.filter(
    (rv) => !pinnedViews.some((pv) => pv.id === rv.id),
  );
  const sortedViews = [...pinnedViews, ...nonPinnedRecentViews];

  return (
    <Section
      title="Views"
      icon={<LayoutGrid className="size-3.5 text-sidebar-primary" />}
      action={
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors rounded-md"
        >
          <Plus className="size-3.5" />
        </Button>
      }
    >
      <div className="flex flex-col gap-0.5">
        {sortedViews.length > 0 ? (
          sortedViews.map((view) => (
            <ViewItem
              key={view.id}
              view={view}
              onTogglePin={handleTogglePin}
            />
          ))
        ) : (
          <p className="px-2.5 py-2.5 text-[12px] text-sidebar-foreground/40 italic">
            No views yet
          </p>
        )}
      </div>
    </Section>
  );
}

function NodeItem({
  node,
  onTogglePin,
  isSelected,
  onSelect,
}: {
  node: { id: string; title: string; semanticId?: string; isPinned?: boolean };
  onTogglePin: (id: string, isPinned: boolean) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors duration-150 cursor-pointer",
        isSelected
          ? "bg-sidebar-accent/70"
          : "hover:bg-sidebar-accent",
      )}
      onClick={() => onSelect?.(node.id)}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <CircleDot className="size-3.5 text-sidebar-foreground/30 shrink-0" />
        <span className="text-[13px] text-sidebar-foreground truncate">
          {node.title}
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-7 text-sidebar-foreground/30 hover:text-sidebar-primary hover:bg-sidebar-primary/10 transition-colors rounded-md",
            node.isPinned
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150",
          )}
          onClick={() => onTogglePin(node.id, !node.isPinned)}
        >
          <Pin
            className={cn(
              "size-3",
              node.isPinned && "fill-sidebar-primary text-sidebar-primary",
            )}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors rounded-md opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150"
        >
          <MoreHorizontal className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function NodesList({
  nodes,
  onAddNode,
}: {
  nodes: Array<{
    id: string;
    title: string;
    semanticId?: string;
    isPinned?: boolean;
  }>;
  onAddNode?: (nodeType: NodeDataType, semanticId: string) => void;
}) {
  const currentEditingNodeId = useUIStore(
    (state) => state.currentEditingNodeId,
  );
  const setCurrentEditingNodeId = useUIStore(
    (state) => state.setCurrentEditingNodeId,
  );

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    await GraphCQRS.upsertNode(id, { isPinned });
  };

  const handleSelectNode = (id: string) => {
    setCurrentEditingNodeId(id);
  };

  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  return (
    <Section
      title="Nodes"
      icon={<CircleDot className="size-3.5 text-sidebar-primary" />}
      action={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors rounded-md"
            >
              <Plus className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={6} align="start">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md [&>svg]:hidden">
                <span className="text-[13px]">Add Node</span>
              </DropdownMenuSubTrigger>
              <DataTypeList>
                {(nodeType) => (
                  <DropdownMenuSubContent>
                    <SemanticList
                      onSelect={(semanticId) => {
                        onAddNode?.(nodeType, semanticId);
                      }}
                    />
                  </DropdownMenuSubContent>
                )}
              </DataTypeList>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <div className="flex flex-col gap-0.5">
        {sortedNodes.length > 0 ? (
          sortedNodes.map((node) => (
            <NodeItem
              key={node.id}
              node={node}
              onTogglePin={handleTogglePin}
              isSelected={currentEditingNodeId === node.id}
              onSelect={handleSelectNode}
            />
          ))
        ) : (
          <p className="px-2.5 py-2.5 text-[12px] text-sidebar-foreground/40 italic">
            No recent nodes
          </p>
        )}
      </div>
    </Section>
  );
}

function NodeSemanticItem({
  semantic,
  onEdit,
}: {
  semantic: { id: string; name: string; color?: string };
  onEdit?: (semantic: typeof semantic) => void;
}) {
  return (
    <div
      className="group flex items-center justify-between rounded-lg px-2.5 py-2 hover:bg-sidebar-accent transition-colors duration-150 cursor-pointer"
      onClick={() => onEdit?.(semantic)}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <CircleDot
          className="size-3.5 shrink-0"
          style={{ color: semantic.color || "var(--sidebar-primary)" }}
        />
        <span className="text-[13px] text-sidebar-foreground truncate">
          {semantic.name}
        </span>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(semantic);
          }}
        >
          <MoreHorizontal className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function NodeSemanticList() {
  const nodeSemanticsMap = useDataStore((state) => state.nodeSemantics);
  const nodeSemantics = useMemo(
    () => Array.from(nodeSemanticsMap.values()),
    [nodeSemanticsMap],
  );
  const openDialog = useUIStore((state) => state.openNodeSemanticDialog);

  return (
    <Section
      title="Node Types"
      icon={<CircleDot className="size-3.5 text-sidebar-primary" />}
      action={
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors rounded-md"
          onClick={() => openDialog()}
        >
          <Plus className="size-3.5" />
        </Button>
      }
    >
      <div className="flex flex-col gap-0.5">
        {nodeSemantics.length > 0 ? (
          nodeSemantics.map((semantic) => (
            <NodeSemanticItem key={semantic.id} semantic={semantic} onEdit={openDialog} />
          ))
        ) : (
          <p className="px-2.5 py-2.5 text-[12px] text-sidebar-foreground/40 italic">
            No node types
          </p>
        )}
      </div>
    </Section>
  );
}

function EdgeSemanticCategory({
  category,
  semantics,
  onEdit,
}: {
  category: string;
  semantics: Array<{ id: string; name: string; color?: string }>;
  onEdit?: (semantic: typeof semantics[0]) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full pl-2">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1.5 py-1 hover:opacity-70 transition-opacity duration-200 cursor-pointer">
            <span
              className={cn(
                "transition-transform duration-200",
                isOpen ? "rotate-90" : "rotate-0",
              )}
            >
              <ChevronRight className="size-3 text-sidebar-foreground/40" />
            </span>
            <span className="text-[11px] font-semibold text-sidebar-foreground/60 tracking-wide uppercase">
              {category}
            </span>
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="pt-0.5 pl-3">
        <div className="flex flex-col gap-0.5">
          {semantics.map((semantic) => (
            <div
              key={semantic.id}
              className="group flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-sidebar-accent transition-colors duration-150 cursor-pointer"
              onClick={() => onEdit?.(semantic)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="size-3 text-sidebar-foreground/30 shrink-0" />
                <span className="text-[12px] text-sidebar-foreground truncate">
                  {semantic.name}
                </span>
                {semantic.color && (
                  <span
                    className="size-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: semantic.color }}
                  />
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors rounded-md opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(semantic);
                }}
              >
                <MoreHorizontal className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function EdgeSemanticList() {
  const edgeSemanticsMap = useDataStore((state) => state.edgeSemantics);
  const edgeSemantics = useMemo(
    () => Array.from(edgeSemanticsMap.values()),
    [edgeSemanticsMap],
  );
  const openDialog = useUIStore((state) => state.openEdgeSemanticDialog);

  const categories = [
    { key: "hierarchy", label: "层次关系" },
    { key: "flow", label: "流向关系" },
    { key: "association", label: "关联关系" },
    { key: "interaction", label: "交互关系" },
  ] as const;

  const groupedSemantics = useMemo(
    () =>
      categories.reduce(
        (acc, cat) => {
          acc[cat.key] = edgeSemantics.filter((s) => s.category === cat.key);
          return acc;
        },
        {
          hierarchy: [] as typeof edgeSemantics,
          flow: [] as typeof edgeSemantics,
          association: [] as typeof edgeSemantics,
          interaction: [] as typeof edgeSemantics,
        },
      ),
    [edgeSemantics, categories],
  );

  return (
    <Section
      title="Edge Types"
      icon={<Link2 className="size-3.5 text-sidebar-primary" />}
      action={
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors rounded-md"
          onClick={() => openDialog()}
        >
          <Plus className="size-3.5" />
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        {categories.map((cat) => (
          <EdgeSemanticCategory
            key={cat.key}
            category={cat.label}
            semantics={groupedSemantics[cat.key] || []}
            onEdit={openDialog}
          />
        ))}
      </div>
    </Section>
  );
}
