"use client";
import { useI18n } from "@workspace/ui/lib/i18n";

import { useEffect, useState } from "react";
import { deleteResource, type ResourceRecord } from "@workspace/api-client";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { toast } from "@workspace/ui/components/ui/toast";

/**
 * Deletes one stored file.
 *
 * This is the only place that frees storage: removing a node that references
 * the file leaves the blob in place, and the dialog says so. The confirmation
 * also warns that the nodes which keep the old URL will stop loading it.
 */
export function DeleteResourceDialog({
  resource,
  onClose,
  onDeleted,
}: {
  /** The resource being deleted; `null` keeps the dialog closed. */
  resource: ResourceRecord | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { t } = useI18n();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (resource) setDeleting(false);
  }, [resource]);

  const confirm = async () => {
    if (!resource || deleting) return;
    setDeleting(true);
    try {
      await deleteResource(resource.id);
      toast({ title: t("已删除"), description: resource.name });
      onDeleted();
      onClose();
    } catch {
      setDeleting(false);
      toast({
        title: t("删除失败，请稍后重试。"),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={resource !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("删除资源")}</DialogTitle>
          <DialogDescription>
            {resource
              ? t("确定删除“{value1}”？此操作无法撤销。", {
                  value1: resource.name,
                })
              : null}
          </DialogDescription>
        </DialogHeader>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t(
            "引用这个文件的节点将无法再加载它。删除节点不会释放存储；只有在这里删除才会释放。",
          )}
        </p>
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
            disabled={resource === null || deleting}
            onClick={() => void confirm()}
          >
            {deleting ? t("删除中…") : t("删除")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
