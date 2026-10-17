"use client";
import { translate } from "@workspace/ui/lib/i18n/runtime";

import { useI18n } from "@workspace/ui/lib/i18n";

import * as React from "react";
import { useState, useRef, useCallback, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { cn } from "@workspace/ui/lib/utils";

interface UploadMenuProps {
  position: { x: number; y: number };
  open: boolean;
  onClose: () => void;
  accept?: string;
  /**
   * Whether the host node is an image, i.e. whether a pasted image is a valid
   * upload for it. The paste entry is an image-only source, so the caller
   * states this explicitly instead of `accept` being sniffed for `image/*`.
   */
  allowPasteImage?: boolean;
  /**
   * Copy for the URL entry, so a host can say what kind of file it expects
   * (a media file, an `.html` source file, ...).
   */
  urlDialogTitle?: string;
  urlDialogPlaceholder?: string;
  onFilesSelected: (files: File[]) => void;
  /**
   * Called when a menu-initiated action fails (clipboard denied, CORS-blocked
   * URL fetch, ...) so the host can surface it too.
   */
  onError?: (error: Error) => void;
}

/**
 * The 「本地上传」 entry is a `<label>`, not a button with a scripted
 * `input.click()`: Safari (WebKit) ignores a programmatic click on a file input
 * that is not rendered, so the dialog never opened there. A label gets native
 * activation instead, which every engine routes to the associated input.
 */
const MenuItemLabel = ({
  htmlFor,
  onActivate,
  children,
}: {
  htmlFor: string;
  /** Opens the picker from the keyboard; a focused label has no native action. */
  onActivate: () => void;
  children: React.ReactNode;
}) => (
  <label
    htmlFor={htmlFor}
    role="menuitem"
    tabIndex={0}
    onKeyDown={(event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onActivate();
    }}
    className={cn(
      "group/menu-item relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none",
      "hover:bg-accent hover:text-accent-foreground",
    )}
  >
    {children}
  </label>
);

const MenuItemButton = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "group/menu-item relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none",
      "hover:bg-accent hover:text-accent-foreground",
      "data-disabled:pointer-events-none data-disabled:opacity-50",
    )}
  >
    {children}
  </button>
);

export function UploadMenu({
  position,
  open,
  onClose,
  accept,
  allowPasteImage = false,
  urlDialogTitle = translate("输入文件URL"),
  urlDialogPlaceholder = "https://example.com/file.pdf",
  onFilesSelected,
  onError,
}: UploadMenuProps) {
  const { t } = useI18n();

  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-dismiss the inline error banner.
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const reportError = useCallback(
    (message: string, cause?: unknown) => {
      if (cause) console.error(message, cause);
      setError(message);
      onError?.(cause instanceof Error ? cause : new Error(message));
    },
    [onError],
  );

  const closeMenu = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onFilesSelected([file]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePasteUpload = async () => {
    closeMenu();
    setError(null);

    if (typeof navigator === "undefined" || !navigator.clipboard?.read) {
      reportError(t("当前浏览器不支持读取剪贴板，请改用「本地上传」"));
      return;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      let imageBlob: Blob | null = null;

      for (const item of clipboardItems) {
        const type = item.types.find(
          (candidate) =>
            candidate === "image/png" || candidate === "image/jpeg",
        );
        if (type) {
          imageBlob = await item.getType(type);
          break;
        }
      }

      if (!imageBlob) {
        reportError(t("剪贴板中没有图片"));
        return;
      }

      const extension = imageBlob.type === "image/jpeg" ? "jpg" : "png";
      const file = new File(
        [imageBlob],
        `pasted-image-${Date.now()}.${extension}`,
        { type: imageBlob.type },
      );

      onFilesSelected([file]);
    } catch (cause) {
      reportError(t("粘贴图片失败（剪贴板权限被拒绝？）"), cause);
    }
  };

  const handleUrlConfirm = async () => {
    const url = urlInput.trim();
    if (!url) return;

    setError(null);
    setUrlLoading(true);

    try {
      let response: Response;
      try {
        response = await fetch(url, { mode: "cors" });
      } catch (cause) {
        reportError(t("无法访问该 URL（可能是跨域限制或网络问题）"), cause);
        return;
      }

      if (!response.ok) {
        reportError(
          translate("下载失败：{value1} {value2}", {
            value1: response.status,
            value2: response.statusText,
          }),
        );
        return;
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        reportError(t("下载到的文件为空"));
        return;
      }

      const rawName = url.split("/").pop()?.split("?")[0] ?? "";
      let filename = "url-file";
      try {
        filename = decodeURIComponent(rawName) || filename;
      } catch {
        filename = rawName || filename;
      }

      const file = new File([blob], filename, { type: blob.type });

      onFilesSelected([file]);
      setUrlInput("");
      setUrlDialogOpen(false);
    } catch (cause) {
      reportError(t("URL 上传失败"), cause);
    } finally {
      setUrlLoading(false);
    }
  };

  const handleUrlCancel = () => {
    setUrlInput("");
    setError(null);
    setUrlDialogOpen(false);
  };

  return (
    <>
      <Input
        ref={fileInputRef}
        id={fileInputId}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        onClick={(event) => {
          // The label's native activation dispatches this click; the picker's
          // default action runs after the event, so dismissing the menu here
          // still opens it (and also covers a cancelled picker).
          event.stopPropagation();
          closeMenu();
        }}
        // Not `display: none` (class `hidden`): WebKit refuses to open the
        // picker for an unrendered file input. The input must stay rendered and
        // only be made invisible, hence the off-screen 1px box.
        className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
      />

      {open &&
        mounted &&
        createPortal(
          <div
            className="relative z-[9999] pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* 透明遮罩，用于点击外部关闭菜单 */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={closeMenu}
              onContextMenu={(e) => {
                e.preventDefault();
                closeMenu();
              }}
            />
            <div
              ref={menuRef}
              className={cn(
                "fixed z-[9999] min-w-[160px] origin-top-left rounded-md bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
                "animate-in fade-in-0 zoom-in-95",
              )}
              style={{
                left: position.x,
                top: position.y,
              }}
            >
              <MenuItemLabel
                htmlFor={fileInputId}
                onActivate={() => fileInputRef.current?.click()}
              >
                {t("本地上传")}{" "}
              </MenuItemLabel>
              {allowPasteImage && (
                <MenuItemButton onClick={handlePasteUpload}>
                  {t("粘贴图片")}{" "}
                </MenuItemButton>
              )}
              <MenuItemButton
                onClick={() => {
                  closeMenu();
                  setUrlDialogOpen(true);
                }}
              >
                {t("输入URL")}{" "}
              </MenuItemButton>
            </div>
          </div>,
          document.body,
        )}

      <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{urlDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="url"
              placeholder={urlDialogPlaceholder}
              value={urlInput}
              disabled={urlLoading}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleUrlConfirm();
                } else if (e.key === "Escape") {
                  handleUrlCancel();
                }
              }}
            />
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleUrlCancel}
              disabled={urlLoading}
            >
              {t("取消")}{" "}
            </Button>
            <Button onClick={handleUrlConfirm} disabled={urlLoading}>
              {urlLoading ? t("下载中…") : t("确认")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error &&
        !urlDialogOpen &&
        mounted &&
        createPortal(
          <div className="fixed left-1/2 top-4 z-[10000] w-[min(24rem,90vw)] -translate-x-1/2 rounded-md border border-destructive/40 bg-popover px-3 py-2 text-xs text-destructive shadow-lg">
            {error}
          </div>,
          document.body,
        )}
    </>
  );
}
