"use client";

import { useEffect, useMemo, useState } from "react";
import GridLayout, {
  useContainerWidth,
  verticalCompactor,
} from "react-grid-layout";
import type { DashboardPage, NodeData } from "@workspace/interfaces";
import { useDataStore, useUIStore } from "@workspace/store";
import { DashboardService } from "@workspace/services";
import { DashboardLibrary } from "./dashboard-library";
import { DashboardWorkspaceSelector } from "./workspace-selector";
import { useDashboard } from "@workspace/ui/hooks/use-dashboard";
import { NodeContentEditor } from "@workspace/ui/components/node-content/node-content-editor";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import {
  Check,
  CloudCheck,
  LoaderCircle,
  Maximize2,
  GripVertical,
  WandSparkles,
  LayoutDashboard,
  Library,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import "react-grid-layout/css/styles.css";
import "./dashboard.css";

export function Dashboard() {
  const { scope, workspace, ready, syncState, reload } = useDashboard();
  const canEdit = ready && !syncState?.loading;
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"create" | "rename" | "delete" | null>(
    null,
  );
  const [name, setName] = useState("");
  const nodes = useDataStore((state) => state.nodes);
  const pages = workspace?.pages ?? [];
  const page =
    pages.find((item) => item.id === workspace?.activePageId) ?? pages[0];
  const candidates = (workspace?.candidates ?? [])
    .map((id) => nodes.get(id))
    .filter(
      (node): node is NodeData =>
        node !== undefined &&
        node.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    );
  const store = DashboardService;
  useEffect(() => {
    setEditing(false);
    setLibraryOpen(false);
    setDragNodeId(null);
    setSearch("");
    setDialog(null);
  }, [scope]);
  const openLibrary = () => {
    setEditing(true);
    setLibraryOpen(true);
  };
  const addNode = (nodeId: string, position?: { x: number; y: number }) => {
    if (!scope || !page || !nodes.has(nodeId)) return;
    store.addWidget(scope, page.id, nodeId, position);
  };
  const openDialog = (kind: "create" | "rename" | "delete") => {
    setName(kind === "create" ? "" : (page?.name ?? ""));
    setDialog(kind);
  };
  const submit = () => {
    if (!scope) return;
    if (dialog === "create") store.createPage(scope, name);
    if (dialog === "rename" && page) store.renamePage(scope, page.id, name);
    if (dialog === "delete" && page) store.deletePage(scope, page.id);
    setDialog(null);
  };

  return (
    <section className="flex h-dvh min-w-0 flex-col bg-background">
      <header className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b px-4 py-3 sm:px-6">
        <div className="flex shrink-0 items-center gap-3">
          <LayoutDashboard className="size-5 text-muted-foreground" />
          <span className="text-sm font-semibold">Dashboard</span>
          <span className="h-4 border-l" aria-hidden="true" />
          <DashboardWorkspaceSelector />
        </div>
        <nav
          className="order-3 flex min-w-0 basis-full items-center gap-1 overflow-x-auto sm:order-none sm:flex-1 sm:basis-auto"
          aria-label="Dashboard 页面"
        >
          {pages.map((item) => (
            <Button
              key={item.id}
              aria-current={page?.id === item.id ? "page" : undefined}
              disabled={!canEdit}
              variant="ghost"
              className={cn(
                "max-w-48 shrink-0",
                page?.id === item.id &&
                  "bg-secondary font-semibold text-foreground",
              )}
              onClick={() => scope && store.selectPage(scope, item.id)}
            >
              <span className="truncate">{item.name}</span>
            </Button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="新建页面"
            title="新建页面"
            disabled={!canEdit}
            onClick={() => openDialog("create")}
          >
            <Plus className="size-4" />
          </Button>
        </nav>
        <span
          className={cn(
            "ml-auto flex shrink-0 items-center gap-2 text-xs text-muted-foreground",
            syncState?.error && "text-destructive",
          )}
          role="status"
          aria-live="polite"
        >
          {syncState?.loading || syncState?.pending ? (
            <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
          ) : ready && !syncState?.error ? (
            <CloudCheck className="size-3.5" />
          ) : null}
          {syncState?.error
            ? "未同步"
            : syncState?.loading
              ? "正在同步…"
              : syncState?.pending
                ? "保存中…"
                : ready
                  ? "已保存"
                  : ""}
        </span>
      </header>
      {syncState?.error && (
        <div
          className="flex items-center gap-3 border-b px-4 py-2 text-sm text-destructive"
          role="alert"
        >
          <span>{syncState.error}</span>
          <Button variant="outline" size="sm" onClick={reload}>
            重新加载
          </Button>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div
          className="order-2 min-h-0 min-w-0 flex-1 overflow-y-auto bg-muted/30 pb-[calc(var(--dynamic-island-height,48px)+32px)] lg:order-1"
          role="region"
          aria-label={page?.name ?? "Dashboard 内容"}
        >
          <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">
            {page && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1
                      className="max-w-[min(60vw,40rem)] truncate text-2xl font-semibold tracking-tight"
                      title={page.name}
                    >
                      {page.name}
                    </h1>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!canEdit}
                          aria-label="页面操作"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onSelect={() => openDialog("rename")}>
                          <Pencil />
                          重命名页面
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => openDialog("delete")}
                        >
                          <Trash2 />
                          删除页面
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {editing
                      ? "布局修改会自动保存。"
                      : `${page.widgets.length} 个节点组件`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {editing && (
                    <Button
                      variant="ghost"
                      disabled={!canEdit || !page.widgets.length}
                      onClick={() => scope && store.arrangePage(scope, page.id)}
                    >
                      <WandSparkles className="size-4" />
                      自动布局
                    </Button>
                  )}
                  <Button
                    variant={editing ? "secondary" : "outline"}
                    disabled={!canEdit}
                    onClick={() => {
                      setEditing(!editing);
                      if (editing) setLibraryOpen(false);
                    }}
                    aria-pressed={editing}
                  >
                    {editing ? (
                      <Check className="size-4" />
                    ) : (
                      <Pencil className="size-4" />
                    )}
                    {editing ? "完成布局" : "编辑布局"}
                  </Button>
                  <Button
                    disabled={!canEdit}
                    onClick={() =>
                      libraryOpen ? setLibraryOpen(false) : openLibrary()
                    }
                    aria-expanded={libraryOpen}
                    aria-controls="dashboard-library"
                  >
                    <Plus className="size-4" />
                    添加组件
                  </Button>
                </div>
              </div>
            )}
            {!ready ? (
              <div className="flex min-h-80 items-center justify-center gap-3 text-sm text-muted-foreground">
                {scope && (
                  <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" />
                )}
                {syncState?.error
                  ? "暂时无法加载 Dashboard，请重新加载。"
                  : scope
                    ? "加载 Dashboard…"
                    : "请选择工作空间"}
              </div>
            ) : !page ? (
              <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
                <div className="mb-6 flex size-16 items-center justify-center rounded-2xl border bg-background">
                  <LayoutDashboard className="size-7 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  为你的工作创建一个页面
                </h1>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  将笔记、任务和数据视图放在一起。每个页面，都可以有自己的用途。
                </p>
                <Button
                  className="mt-6"
                  disabled={!canEdit}
                  onClick={() => openDialog("create")}
                >
                  <Plus className="size-4" />
                  新建页面
                </Button>
              </div>
            ) : (
              <DashboardGrid
                key={`${scope}:${page.id}`}
                scope={scope!}
                page={page}
                editing={canEdit && editing}
                dragNodeId={dragNodeId}
                onOpenLibrary={openLibrary}
                onDropNode={(nodeId, position) => {
                  addNode(nodeId, position);
                  setDragNodeId(null);
                }}
              />
            )}
          </div>
        </div>
        {libraryOpen && (
          <DashboardLibrary
            candidates={candidates}
            page={page}
            enabled={canEdit && editing}
            search={search}
            onSearch={setSearch}
            onClose={() => setLibraryOpen(false)}
            onAdd={addNode}
            onDragNode={setDragNodeId}
          />
        )}
      </div>
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {dialog === "create"
                  ? "新建页面"
                  : dialog === "rename"
                    ? "重命名页面"
                    : "删除页面"}
              </DialogTitle>
              <DialogDescription>
                {dialog === "delete"
                  ? `删除“${page?.name}”及其布局？节点内容和组件库会保留。`
                  : "为这个工作页面取一个名称。"}
              </DialogDescription>
            </DialogHeader>
            {dialog !== "delete" && (
              <Input
                autoFocus
                aria-label="页面名称"
                maxLength={80}
                className="mt-4"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：项目进度"
              />
            )}
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialog(null)}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant={dialog === "delete" ? "destructive" : "default"}
                disabled={!canEdit || (dialog !== "delete" && !name.trim())}
              >
                {dialog === "delete" ? "删除" : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function DashboardGrid({
  scope,
  page,
  editing,
  dragNodeId,
  onDropNode,
  onOpenLibrary,
}: {
  scope: string;
  page: DashboardPage;
  editing: boolean;
  dragNodeId: string | null;
  onOpenLibrary: () => void;
  onDropNode: (nodeId: string, position: { x: number; y: number }) => void;
}) {
  const { width, containerRef, mounted } = useContainerWidth();
  const nodes = useDataStore((state) => state.nodes);
  const narrow = width < 640;
  const layout = useMemo(
    () =>
      page.widgets.map((widget, index) => ({
        i: widget.id,
        x: narrow ? 0 : widget.x,
        y: narrow
          ? page.widgets
              .slice(0, index)
              .reduce((total, item) => total + item.h, 0)
          : widget.y,
        w: narrow ? 12 : widget.w,
        h: widget.h,
        minW: 2,
        minH: 4,
      })),
    [page.widgets, narrow],
  );
  return (
    <div
      ref={containerRef}
      className={cn(
        "dashboard-grid relative min-h-80",
        editing && !narrow && "dashboard-grid-editing",
      )}
    >
      {editing && (
        <p className="mb-4 text-xs text-muted-foreground">
          {narrow
            ? "当前宽度下组件自动纵向排列。可在更宽的窗口中拖动和缩放。"
            : "拖动标题移动组件，拖动右下角调整大小。"}
        </p>
      )}
      {page.widgets.length === 0 && (
        <div className="absolute inset-x-0 flex min-h-96 flex-col items-center justify-center rounded-2xl border border-dashed bg-background/60 px-6 text-center">
          <Library className="mb-4 size-8 text-muted-foreground" />
          <h2 className="text-lg font-medium">从一个节点开始</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            把常用节点添加到这个页面，再按你的工作方式安排它们。
          </p>
          <Button className="mt-6" onClick={onOpenLibrary}>
            <Plus className="size-4" />
            添加组件
          </Button>
        </div>
      )}
      {mounted && (
        <GridLayout
          width={width}
          layout={layout}
          gridConfig={{
            cols: 12,
            rowHeight: 40,
            margin: [16, 16],
            containerPadding: [0, 0],
          }}
          dragConfig={{
            enabled: editing && !narrow,
            handle: ".dashboard-drag-handle",
            cancel: "button",
          }}
          resizeConfig={{ enabled: editing && !narrow, handles: ["se"] }}
          dropConfig={{ enabled: editing && !narrow }}
          droppingItem={{ i: "__dashboard_drop__", x: 0, y: 0, w: 6, h: 8 }}
          compactor={verticalCompactor}
          style={{
            minHeight: page.widgets.length ? 320 : 384,
            pointerEvents:
              page.widgets.length || dragNodeId ? undefined : "none",
          }}
          onLayoutChange={(next) => {
            if (editing && !narrow)
              DashboardService.updateLayout(scope, page.id, next);
          }}
          onDropDragOver={() => (dragNodeId ? { w: 6, h: 8 } : false)}
          onDrop={(_layout, item) => {
            if (item && dragNodeId)
              onDropNode(dragNodeId, { x: item.x, y: item.y });
          }}
        >
          {page.widgets.map((widget) => {
            const node = nodes.get(widget.nodeId);
            return (
              <div
                key={widget.id}
                className={cn(
                  "@container flex min-h-0 flex-col overflow-hidden rounded-xl border bg-background",
                  editing && "ring-1 ring-border",
                )}
              >
                <div
                  className={cn(
                    "dashboard-drag-handle flex h-12 shrink-0 items-center gap-1 border-b border-border/60 px-2 @min-[200px]:gap-2 @min-[200px]:px-4",
                    editing && !narrow && "cursor-grab active:cursor-grabbing",
                  )}
                >
                  {editing && (
                    <GripVertical className="hidden size-4 shrink-0 text-muted-foreground @min-[200px]:block" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {node?.title || "节点已删除或不可用"}
                  </span>
                  {node && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`打开节点 ${node.title}`}
                      title="打开节点"
                      onClick={() =>
                        useUIStore.getState().handleNodeEdit(node.id)
                      }
                    >
                      <Maximize2 className="size-3.5" />
                    </Button>
                  )}
                  {editing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`移除组件 ${node?.title ?? ""}`}
                      onClick={() =>
                        DashboardService.removeWidget(scope, page.id, widget.id)
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  {node ? (
                    <NodeContentEditor node={node} className="h-full min-h-0" />
                  ) : (
                    <p className="p-4 text-sm text-muted-foreground">
                      原节点不可用，可以从页面移除此组件。
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </GridLayout>
      )}
    </div>
  );
}
