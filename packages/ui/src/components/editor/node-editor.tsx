"use client";

import { cn } from "@workspace/ui/lib/utils";
import { useUIStore, useNodeEditorStore } from "@workspace/store";
import { useNodeEditor } from "@workspace/hooks";
import { Dialog, DialogContent } from "@workspace/ui/components/ui/dialog";
import { NodeContentEditor } from "./content/node-content-editor";
import { RelationshipQuickBar } from "./quick-bar";
import { EditorHeader } from "../header/editor-header/editor-header";
import { AttributesSidebar } from "../header/editor-header/attributes-sidebar";

interface NodeEditorProps {
  className?: string;
}

/**
 * NodeEditor Container
 * - Window mode (mainViewType === "graph"): Dialog弹窗, 显示QuickBar
 * - Fullscreen mode (mainViewType === "editor"): 全屏独占, 隐藏QuickBar
 */
export function NodeEditor({ className }: NodeEditorProps) {
  const { node, nodeId, isEditing } = useNodeEditor();
  const mainViewType = useUIStore((state) => state.mainViewType);
  const setCurrentEditingNodeId = useNodeEditorStore((state) => state.setCurrentEditingNodeId);

  // Window mode: Dialog弹窗
  const isWindowMode = mainViewType === "graph" && isEditing;
  // Fullscreen mode: 全屏独占
  const isFullscreenMode = mainViewType === "editor" && isEditing;

  // Not editing - don't render
  if (!isEditing || !node || !nodeId) {
    return null;
  }

  // Handle close (window mode only)
  const handleClose = () => {
    setCurrentEditingNodeId(null);
  };

  return (
    <>
      {/* Window Mode: Dialog */}
      {isWindowMode && (
        <Dialog
          open={isWindowMode}
          onOpenChange={(open) => {
            if (!open) handleClose();
          }}
        >
          <DialogContent
            showCloseButton={false}
            className={cn(
              "!max-w-[1200px] w-full max-h-[85vh] flex flex-col p-2 pt-0",
              "rounded-2xl bg-popover/95 backdrop-blur-xl",
              "ring-1 ring-foreground/5 shadow-2xl shadow-foreground/5",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
              className
            )}
          >
            <NodeEditorContent
              node={node}
              nodeId={nodeId}
              showQuickBar={true}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Fullscreen Mode */}
      {isFullscreenMode && (
        <div className={cn("absolute inset-0 z-50 bg-background flex flex-col", className)}>
          <NodeEditorContent
            node={node}
            nodeId={nodeId}
            showQuickBar={false}
          />
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
  node: any;
  nodeId: string;
  showQuickBar: boolean;
  className?: string;
}

function NodeEditorContent({ node, nodeId, showQuickBar, className }: NodeEditorContentProps) {
  const attributesSidebarOpen = useNodeEditorStore((state) => state.attributesSidebarOpen);

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      <EditorHeader />

      <div className="flex-1  flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <NodeContentEditor node={node} nodeId={nodeId} />
        </div>
        {attributesSidebarOpen && (
          <AttributesSidebar className="w-80 flex-shrink-0" />
        )}
      </div>

      {showQuickBar && (
        <RelationshipQuickBar nodeId={nodeId} />
      )}
    </div>
  );
}
