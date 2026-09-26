"use client";

import { useCallback } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { useDataStore, useUIStore } from "@workspace/store";
import { NodeSemanticService, EdgeSemanticService } from "@workspace/services";
import { useGraph } from "@workspace/hooks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import type {
  NodeSemantic,
  NodeSemanticId,
  EdgeSemantic,
  EdgeSemanticId,
  EdgeType,
} from "@workspace/interfaces";
import { Trash2Icon, PlusIcon } from "lucide-react";

export interface NodeSemanticFormData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

/**
 * 节点语义表单值 → 落库载荷：裁剪空白，空串统一收敛为 `undefined`。
 * 语义对话框与「Add Node」表单共用，保证两个入口创建出的语义完全一致。
 */
export function buildNodeSemanticPayload(formData: NodeSemanticFormData) {
  return {
    name: formData.name.trim(),
    description: formData.description?.trim() || undefined,
    color: formData.color || undefined,
    icon: formData.icon?.trim() || undefined,
  };
}

/** 以表单值新建一个节点语义（`tmp_` 占位 id 由 service 换成后端 id）。 */
export async function createNodeSemantic(
  formData: NodeSemanticFormData,
): Promise<NodeSemantic | void> {
  const id = "tmp_" as NodeSemanticId;
  return NodeSemanticService.upsert({
    id,
    ...buildNodeSemanticPayload(formData),
  });
}

export function NodeSemanticDialog() {
  const { open, editingSemantic, afterCreate } = useUIStore(
    (state) => state.nodeSemanticDialog,
  );
  const closeDialog = useUIStore((state) => state.closeNodeSemanticDialog);
  const { onChangeNodeSemantic, onAddNode } = useGraph();

  const handleSubmit = useCallback(
    async (formData: NodeSemanticFormData) => {
      if (!formData.name.trim()) return;

      try {
        if (editingSemantic) {
          await NodeSemanticService.upsert(
            editingSemantic.id,
            buildNodeSemanticPayload(formData),
          );
        } else {
          const created = await createNodeSemantic(formData);

          // 从节点右键菜单进来新建时把新语义选给那个节点；从画布/侧边栏
          // Add Node 进来新建时用新语义把节点补建出来。两条路径都省去用户
          // 「创建 → 重开菜单 → 再选一次」的往返。
          if (afterCreate && created) {
            if (afterCreate.kind === "assign") {
              await onChangeNodeSemantic(afterCreate.nodeId, created.id);
            } else {
              await onAddNode(
                afterCreate.nodeType,
                created.id,
                afterCreate.simX,
                afterCreate.simY,
                afterCreate.viewId,
              );
            }
          }
        }

        closeDialog();
      } catch (error) {
        console.error("Failed to save node semantic:", error);
      }
    },
    [
      editingSemantic,
      afterCreate,
      onChangeNodeSemantic,
      onAddNode,
      closeDialog,
    ],
  );

  return (
    <NodeSemanticDialogContent
      open={open}
      onOpenChange={(o) => !o && closeDialog()}
      editingSemantic={editingSemantic}
      onSubmit={handleSubmit}
      onDelete={editingSemantic ? () => NodeSemanticService.delete(editingSemantic.id) : undefined}
    />
  );
}

interface NodeSemanticDialogContentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSemantic: NodeSemantic | null;
  onSubmit: (data: NodeSemanticFormData) => void;
  onDelete?: () => void;
}

export function NodeSemanticDialogContent({
  open,
  onOpenChange,
  editingSemantic,
  onSubmit,
  onDelete,
}: NodeSemanticDialogContentProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {editingSemantic ? "Edit Node Semantic" : "Add Node Semantic"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = {
              name: (form.elements.namedItem("name") as HTMLInputElement).value,
              description: (form.elements.namedItem("description") as HTMLInputElement)
                .value,
              color: (form.elements.namedItem("color") as HTMLInputElement).value,
              icon: (form.elements.namedItem("icon") as HTMLInputElement).value,
            };
            onSubmit(data);
          }}
        >
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="node-name">Name</Label>
              <Input
                id="node-name"
                name="name"
                defaultValue={editingSemantic?.name ?? ""}
                placeholder="e.g., Concept, Person, Event"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="node-description">Description</Label>
              <Input
                id="node-description"
                name="description"
                defaultValue={editingSemantic?.description ?? ""}
                placeholder="Optional description"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="node-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="node-color"
                  name="color"
                  type="color"
                  defaultValue={editingSemantic?.color ?? "#6366f1"}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  name="color-text"
                  defaultValue={editingSemantic?.color ?? "#6366f1"}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="node-icon">Icon (Lucide icon name)</Label>
              <Input
                id="node-icon"
                name="icon"
                defaultValue={editingSemantic?.icon ?? ""}
                placeholder="e.g., Lightbulb, User, Calendar"
              />
            </div>
          </div>

          <DialogFooter>
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onDelete();
                  onOpenChange(false);
                }}
                className="mr-auto"
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingSemantic ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const EDGE_TYPE_OPTIONS: { value: EdgeType; label: string }[] = [
  { value: "hierarchy", label: "Hierarchy" },
  { value: "flow", label: "Flow" },
  { value: "association", label: "Association" },
  { value: "interaction", label: "Interaction" },
];

export function EdgeSemanticDialog() {
  const { open, editingSemantic, assignToEdgeId } = useUIStore(
    (state) => state.edgeSemanticDialog,
  );
  const closeDialog = useUIStore((state) => state.closeEdgeSemanticDialog);
  const { onChangeEdgeSemantic } = useGraph();

  const handleSubmit = useCallback(
    async (formData: {
      name: string;
      category: EdgeType;
      description?: string;
      color?: string;
    }) => {
      if (!formData.name.trim()) return;

      try {
        const semanticData = {
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          category: formData.category,
          color: formData.color || undefined,
        };

        if (editingSemantic) {
          await EdgeSemanticService.upsert(editingSemantic.id, semanticData);
        } else {
          const id = "tmp_" as EdgeSemanticId;
          const created = await EdgeSemanticService.upsert({
            id,
            ...semanticData,
          });

          // 从边的右键菜单进来新建时，直接把新语义选给那条边，
          // 省去用户「创建 → 重开菜单 → 再选一次」的往返。
          if (assignToEdgeId && created) {
            await onChangeEdgeSemantic(assignToEdgeId, created.id);
          }
        }

        closeDialog();
      } catch (error) {
        console.error("Failed to save edge semantic:", error);
      }
    },
    [editingSemantic, assignToEdgeId, onChangeEdgeSemantic, closeDialog],
  );

  return (
    <EdgeSemanticDialogContent
      open={open}
      onOpenChange={(o) => !o && closeDialog()}
      editingSemantic={editingSemantic}
      onSubmit={handleSubmit}
      onDelete={
        editingSemantic
          ? () => EdgeSemanticService.delete(editingSemantic.id)
          : undefined
      }
    />
  );
}

interface EdgeSemanticDialogContentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSemantic: EdgeSemantic | null;
  onSubmit: (data: {
    name: string;
    category: EdgeType;
    description?: string;
    color?: string;
  }) => void;
  onDelete?: () => void;
}

export function EdgeSemanticDialogContent({
  open,
  onOpenChange,
  editingSemantic,
  onSubmit,
  onDelete,
}: EdgeSemanticDialogContentProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {editingSemantic ? "Edit Edge Semantic" : "Add Edge Semantic"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = {
              name: (form.elements.namedItem("name") as HTMLInputElement).value,
              category: (form.elements.namedItem("category") as HTMLSelectElement)
                .value as EdgeType,
              description: (form.elements.namedItem(
                "description",
              ) as HTMLInputElement).value,
              color: (form.elements.namedItem("color") as HTMLInputElement).value,
            };
            onSubmit(data);
          }}
        >
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edge-name">Name</Label>
              <Input
                id="edge-name"
                name="name"
                defaultValue={editingSemantic?.name ?? ""}
                placeholder="e.g., Causes, Part Of, References"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edge-category">Category</Label>
              <select
                id="edge-category"
                name="category"
                defaultValue={editingSemantic?.category ?? "association"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {EDGE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edge-description">Description</Label>
              <Input
                id="edge-description"
                name="description"
                defaultValue={editingSemantic?.description ?? ""}
                placeholder="Optional description"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edge-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="edge-color"
                  name="color"
                  type="color"
                  defaultValue={editingSemantic?.color ?? "#6366f1"}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  name="color-text"
                  defaultValue={editingSemantic?.color ?? "#6366f1"}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onDelete();
                  onOpenChange(false);
                }}
                className="mr-auto"
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingSemantic ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NodeSemanticManager({ className }: { className?: string }) {
  const nodeSemantics = useDataStore((state) =>
    state.getAllNodeSemantics(),
  );
  const openDialog = useUIStore((state) => state.openNodeSemanticDialog);

  const handleDelete = async (id: NodeSemanticId) => {
    try {
      await NodeSemanticService.delete(id);
    } catch (error) {
      console.error("Failed to delete node semantic:", error);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Node Semantics</h4>
        <Button size="sm" variant="ghost" onClick={() => openDialog()}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {nodeSemantics.length === 0 ? (
        <p className="text-sm text-muted-foreground">No node semantics yet.</p>
      ) : (
        <div className="space-y-2">
          {nodeSemantics.map((semantic) => (
            <div
              key={semantic.id}
              className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                {semantic.color && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: semantic.color }}
                  />
                )}
                <span className="text-sm truncate">{semantic.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openDialog(semantic)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(semantic.id)}
                >
                  <Trash2Icon className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EdgeSemanticManager({ className }: { className?: string }) {
  const edgeSemantics = useDataStore((state) =>
    state.getAllEdgeSemantics(),
  );
  const openDialog = useUIStore((state) => state.openEdgeSemanticDialog);

  const handleDelete = async (id: EdgeSemanticId) => {
    try {
      await EdgeSemanticService.delete(id);
    } catch (error) {
      console.error("Failed to delete edge semantic:", error);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Edge Semantics</h4>
        <Button size="sm" variant="ghost" onClick={() => openDialog()}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {edgeSemantics.length === 0 ? (
        <p className="text-sm text-muted-foreground">No edge semantics yet.</p>
      ) : (
        <div className="space-y-2">
          {edgeSemantics.map((semantic) => (
            <div
              key={semantic.id}
              className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                {semantic.color && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: semantic.color }}
                  />
                )}
                <span className="text-sm truncate">{semantic.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({semantic.category})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openDialog(semantic)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(semantic.id)}
                >
                  <Trash2Icon className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
