"use client";

import * as React from "react";
import { useState, useRef, useCallback, useEffect } from "react";
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
  onFilesSelected: (files: File[]) => void;
}

const MenuItemButton = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "group/menu-item relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none",
      "hover:bg-accent hover:text-accent-foreground",
      "data-disabled:pointer-events-none data-disabled:opacity-50"
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
  onFilesSelected,
}: UploadMenuProps) {
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMenu = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleLocalUpload = () => {
    closeMenu();
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

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
    try {
      const clipboardItems = await navigator.clipboard.read();
      let imageBlob: Blob | null = null;

      for (const item of clipboardItems) {
        if (item.types.includes("image/png")) {
          imageBlob = await item.getType("image/png");
          break;
        } else if (item.types.includes("image/jpeg")) {
          imageBlob = await item.getType("image/jpeg");
          break;
        }
      }

      if (!imageBlob) {
        console.error("No image found in clipboard");
        return;
      }

      const file = new File([imageBlob], `pasted-image-${Date.now()}.png`, {
        type: imageBlob.type,
      });

      onFilesSelected([file]);
    } catch (error) {
      console.error("Paste upload failed:", error);
    }
  };

  const handleUrlConfirm = async () => {
    if (!urlInput.trim()) return;

    try {
      const response = await fetch(urlInput.trim());
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }

      const blob = await response.blob();
      const filename = urlInput.split("/").pop() || "url-file";
      const file = new File([blob], filename, { type: blob.type });

      onFilesSelected([file]);
      setUrlInput("");
      setUrlDialogOpen(false);
    } catch (error) {
      console.error("URL upload failed:", error);
    }
  };

  const handleUrlCancel = () => {
    setUrlInput("");
    setUrlDialogOpen(false);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {open && mounted && createPortal(
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
              "animate-in fade-in-0 zoom-in-95"
            )}
            style={{
              left: position.x,
              top: position.y,
            }}
          >
            <MenuItemButton onClick={handleLocalUpload}>
              本地上传
            </MenuItemButton>
            <MenuItemButton onClick={handlePasteUpload}>
              粘贴图片
            </MenuItemButton>
            <MenuItemButton
              onClick={() => {
                closeMenu();
                setUrlDialogOpen(true);
              }}
            >
              输入URL
            </MenuItemButton>
          </div>
        </div>,
        document.body
      )}

      <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>输入文件URL</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="url"
              placeholder="https://example.com/file.pdf"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleUrlConfirm();
                } else if (e.key === "Escape") {
                  handleUrlCancel();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleUrlCancel}>
              取消
            </Button>
            <Button onClick={handleUrlConfirm}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}