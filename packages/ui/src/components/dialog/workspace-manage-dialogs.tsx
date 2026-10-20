"use client";
import { useI18n } from "@workspace/ui/lib/i18n";

import { useEffect, useState } from "react";
import type { NodeIcon, Workspace } from "@workspace/interfaces";
import { WORKSPACE_NAME_MAX_LENGTH } from "@workspace/utils/workspace";
import { WorkspaceService } from "@workspace/services";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { toast } from "@workspace/ui/components/ui/toast";
import { IconSelectorPopover } from "@workspace/ui/components/selector/icon-selector-popover";
import { WorkspaceIcon } from "@workspace/ui/components/icon/workspace-icon";

/** Stable comparison key for "did the icon change?" — `null` means no icon. */
function iconKey(icon: NodeIcon | null | undefined): string | null {
  if (!icon) return null;
  return `${icon.kind}:${icon.value}:${icon.color ?? ""}`;
}

/**
 * Edit one workspace: its name and its picker icon.
 *
 * The service updates the store optimistically, so the selector label and icon
 * change before this dialog closes. Closing without confirming leaves the
 * workspace untouched. The input limit comes from the shared constant, the same
 * one the domain entity validates, so a name the dialog accepts is never
 * rejected later.
 *
 * The icon picker only offers the emoji and the named-icon tabs: a workspace has
 * no uploaded file of its own, so the `image` kind and the upload tab are hidden.
 */
export function EditWorkspaceDialog({
  workspace,
  onClose,
}: {
  /** The workspace being edited; `null` keeps the dialog closed. */
  workspace: Workspace | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<NodeIcon | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refill from the target each time the dialog opens, so a previous edit never
  // leaks into the next workspace.
  useEffect(() => {
    if (!workspace) return;
    setName(workspace.name);
    setIcon(workspace.icon ?? null);
    setSaving(false);
    setError(null);
  }, [workspace]);

  const trimmed = name.trim();
  const unchanged =
    workspace !== null &&
    trimmed === workspace.name.trim() &&
    iconKey(icon) === iconKey(workspace.icon);
  const canSubmit =
    workspace !== null && trimmed !== "" && !unchanged && !saving;

  const submit = async () => {
    if (!workspace || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await WorkspaceService.upsert(workspace.id, { name: trimmed, icon });
      toast({ title: t("已更新工作区"), description: trimmed });
      onClose();
    } catch (err) {
      console.error("[EditWorkspaceDialog] Could not edit workspace:", err);
      setError(t("更新工作区失败，请稍后重试。"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={workspace !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("编辑工作区")}</DialogTitle>
            <DialogDescription>
              {t("修改工作区的名称和图标。")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex items-start gap-3">
            <div className="grid gap-2">
              <Label>{t("图标")}</Label>
              <IconSelectorPopover
                allowedKinds={["emoji", "icon"]}
                showColorPicker={false}
                value={icon ?? undefined}
                onChange={(next) => setIcon(next ?? null)}
                disabledReason={saving ? t("保存中…") : undefined}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10 rounded-lg"
                  aria-label={icon ? t("更换图标") : t("设置图标")}
                  disabled={saving}
                >
                  <WorkspaceIcon
                    icon={icon}
                    className="size-5"
                    glyphClassName="size-5"
                  />
                </Button>
              </IconSelectorPopover>
            </div>
            <div className="grid min-w-0 flex-1 gap-2">
              <Label htmlFor="workspace-edit-name">{t("名称")}</Label>
              <Input
                id="workspace-edit-name"
                name="name"
                autoFocus
                value={name}
                maxLength={WORKSPACE_NAME_MAX_LENGTH}
                disabled={saving}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError(null);
                }}
              />
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onClose}
            >
              {t("取消")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saving ? t("保存中…") : t("保存")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Delete one non-default workspace after an explicit confirmation.
 *
 * The dialog names the workspace and lists what the cascade removes, so nobody
 * removes a workspace by accident. Uploaded resource-library files are not part
 * of the workspace cascade and stay in the library; the copy says so. The
 * selector hides this entry for the default workspace, and the service refuses
 * that case too. After the server confirms the delete, the service switches to
 * another workspace when the deleted one was open.
 */
export function DeleteWorkspaceDialog({
  workspace,
  onClose,
}: {
  /** The workspace being deleted; `null` keeps the dialog closed. */
  workspace: Workspace | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [deleting, setDeleting] = useState(false);

  // A new target restarts the dialog: a failed delete must not keep the spinner
  // or the error from the previous attempt.
  useEffect(() => {
    if (!workspace) return;
    setDeleting(false);
  }, [workspace]);

  const confirm = async () => {
    if (!workspace || deleting) return;
    setDeleting(true);
    try {
      await WorkspaceService.delete(workspace.id);
      toast({ title: t("已删除工作区"), description: workspace.name });
      onClose();
    } catch (err) {
      console.error("[DeleteWorkspaceDialog] Could not delete workspace:", err);
      toast({
        title: t("删除工作区失败，请稍后重试。"),
        variant: "destructive",
      });
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={workspace !== null}
      onOpenChange={(open) => {
        if (!open && !deleting) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("删除工作区")}</DialogTitle>
          <DialogDescription>
            {t(
              "确定删除“{value1}”？工作区中的节点、关系、视图、语义和 Dashboard 页面会一并删除，且无法撤销。",
              { value1: workspace?.name ?? "" },
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid gap-3 text-sm">
          <p className="text-muted-foreground">
            {t("资源库中已上传的文件不会被删除。")}
          </p>
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={onClose}
          >
            {t("取消")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => void confirm()}
          >
            {deleting ? t("删除中…") : t("删除")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
