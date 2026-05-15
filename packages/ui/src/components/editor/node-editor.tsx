"use client";

import { cn } from "@workspace/ui/lib/utils";
import {
  useUIStore,
  useNodeEditorStore,
  useGraphStore,
} from "@workspace/store";
import { GraphCQRS } from "@workspace/api-client";
import { Dialog, DialogContent } from "@workspace/ui/components/ui/dialog";
import { NodeContentEditor } from "./content/node-content-editor";
import { RelationshipQuickBar } from "./quick-bar";
import { EditorHeader } from "../header/editor-header/editor-header";
import { AttributesSidebar } from "../header/editor-header/attributes-sidebar";
import type { NodeData } from "@workspace/interfaces";
import { useEffect } from "react";

interface NodeEditorProps {
  className?: string;
}

/**
 * NodeEditor Container
 * - Window mode (mainViewType === "graph"): Dialog弹窗, 显示QuickBar
 * - Fullscreen mode (mainViewType === "editor"): 全屏独占, 隐藏QuickBar
 */
export function NodeEditor({ className }: NodeEditorProps) {
  const mainViewType = useUIStore((state) => state.mainViewType);
  const currentEditingNodeId = useNodeEditorStore(
    (state) => state.currentEditingNodeId,
  );
  const setCurrentEditingNodeId = useNodeEditorStore(
    (state) => state.setCurrentEditingNodeId,
  );
  const node = useGraphStore((state) =>
    currentEditingNodeId ? state.nodes.get(currentEditingNodeId) : undefined,
  );

  if (!node) {
    return null;
  }

  // Handle close (window mode only)
  const handleClose = () => {
    setCurrentEditingNodeId(null);
  };

  return (
    <>
      {/* Window Mode: Dialog */}
      {mainViewType === "graph" && (
        <Dialog
          open={true}
          onOpenChange={(open) => {
            if (!open) handleClose();
          }}
        >
          <DialogContent
            showCloseButton={false}
            autoFocus={false}
            className={cn(
              "sm:max-w-[80%] w-[1200px] h-[80vh] flex flex-col p-2 pt-0",
              "rounded-2xl bg-popover/95 backdrop-blur-xl",
              "ring-1 ring-foreground/5 shadow-2xl shadow-foreground/5",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
              className,
            )}
          >
            <NodeEditorContent node={node} showQuickBar={true} />
          </DialogContent>
        </Dialog>
      )}

      {/* Fullscreen Mode */}
      {mainViewType === "editor" && (
        <div
          className={cn(
            "absolute inset-0 z-50 bg-background flex flex-col",
            className,
          )}
        >
          <NodeEditorContent node={node} showQuickBar={false} />
        </div>
      )}
    </>
  );
}

/**
 * NodeEditorContent - 内部通用内容组件
 * 被 Window Mode 和 Fullscreen Mode 共用
 */
interface NodeEditorContentProps {
  node: NodeData;
  showQuickBar: boolean;
  className?: string;
}

function NodeEditorContent({
  node,
  showQuickBar,
  className,
}: NodeEditorContentProps) {
  const attributesSidebarOpen = useNodeEditorStore(
    (state) => state.attributesSidebarOpen,
  );

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      <EditorHeader />

      <div className="flex-1  flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <NodeContentEditor node={node} />
        </div>
        {attributesSidebarOpen && (
          <AttributesSidebar className="w-80 flex-shrink-0" />
        )}
      </div>

      {showQuickBar && <RelationshipQuickBar node={node} />}
    </div>
  );
}
