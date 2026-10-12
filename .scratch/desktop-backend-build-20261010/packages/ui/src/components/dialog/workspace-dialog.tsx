"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { useAuthStore, useUIStore } from "@workspace/store";
import { WorkspaceService } from "@workspace/services";
import type { Workspace } from "@workspace/interfaces";

const WORKSPACE_NAME_MAX_LENGTH = 50;

/**
 * 创建 workspace 的 dialog。
 *
 * 与 `NodeSemanticDialog` 同模式：开合状态读自 `useUIStore`，service 调用内联在
 * 本组件里，页面级挂载，任何入口只要调用 `openWorkspaceCreateDialog()` 即可打开。
 */
export function CreateWorkspaceDialog() {
  const { open } = useUIStore((state) => state.workspaceCreateDialog);
  const closeDialog = useUIStore((state) => state.closeWorkspaceCreateDialog);

  /**
   * 创建 workspace 并立即打开它。
   * 服务端 `workspace.add` 需要客户端提供 id + ownerId，因此这里生成 `tmp_`
   * 前缀的 id（与其它 service 的创建约定一致），ownerId 取当前登录用户。
   * 失败时向上抛出，由弹窗展示错误。
   */
  const handleSubmit = useCallback(
    async (name: string) => {
      const ownerId = useAuthStore.getState().getUserId();
      if (!ownerId) {
        throw new Error("Cannot create workspace: no authenticated user");
      }

      const now = new Date().toISOString();
      const workspace: Workspace = {
        id: `tmp_${crypto.randomUUID()}`,
        name: name.trim(),
        ownerId,
        createdAt: now,
        updatedAt: now,
      };

      const created = await WorkspaceService.upsert(workspace);
      const createdWorkspace = (created ?? workspace) as Workspace;
      // upsert 只写入 store；open() 才会按 workspace 拉取 views/nodes，
      // 并激活第一个视图，让新 workspace 立即可用。
      await WorkspaceService.open(createdWorkspace.id);

      closeDialog();
    },
    [closeDialog],
  );

  return (
    <CreateWorkspaceDialogContent
      open={open}
      onOpenChange={(o) => !o && closeDialog()}
      onSubmit={handleSubmit}
    />
  );
}

export interface CreateWorkspaceDialogContentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void | Promise<void>;
}

export function CreateWorkspaceDialogContent({
  open,
  onOpenChange,
  onSubmit,
}: CreateWorkspaceDialogContentProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 每次打开都重置表单，避免上一次的输入/错误残留。
  useEffect(() => {
    if (open) {
      setName("");
      setIsSubmitting(false);
      setError(null);
    }
  }, [open]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) {
        setError("请输入工作区名称");
        return;
      }

      setIsSubmitting(true);
      setError(null);
      try {
        await onSubmit(trimmed);
        onOpenChange(false);
      } catch (err) {
        console.error("Failed to create workspace:", err);
        setError("创建失败，请稍后重试");
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, onSubmit, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>创建新工作区</DialogTitle>
          <DialogDescription>
            工作区用于隔离你的节点、视图与语义配置。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-2 py-2">
            <Label htmlFor="workspace-name">名称</Label>
            <Input
              id="workspace-name"
              name="name"
              autoFocus
              value={name}
              maxLength={WORKSPACE_NAME_MAX_LENGTH}
              placeholder="例如：我的知识库"
              disabled={isSubmitting}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "创建中…" : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
