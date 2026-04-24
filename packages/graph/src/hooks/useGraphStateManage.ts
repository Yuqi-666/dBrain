import React, { useState, useCallback, useRef, useEffect } from "react";

const DEBUG_PREFIX = "[GraphStateManage]";

function debugLog(component: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : "";
  console.log(`${DEBUG_PREFIX}[${timestamp}][${component}] ${message}${dataStr}`);
}

// 定义局部状态类型
export interface LocalGraphUIState {
  selectedNodeIds: Set<string>;
  selectedEdgeIds: Set<string>;
  contextMenu: {
    x: number;
    y: number;
    target: { type: "node" | "edge" | "canvas"; id?: string } | null;
    visible: boolean;
  };
  previewBlock: {
    nodeId: string | null;
    visible: boolean;
    isFocus: boolean;
  };
}

export function useGraphStateManage() {
  // 状态
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenuState] = useState<LocalGraphUIState["contextMenu"]>({
    x: 0,
    y: 0,
    target: null,
    visible: false,
  });
  const [previewBlock, setPreviewBlockState] = useState<LocalGraphUIState["previewBlock"]>({
    nodeId: null,
    visible: false,
    isFocus: false,
  });

  // Ref 用于避免闭包问题
  const isNodeFocusRef = useRef(false);

  // 同步 isNodeFocusRef
  useEffect(() => {
    debugLog("useEffect", "Syncing isNodeFocusRef", { isFocus: previewBlock.isFocus });
    isNodeFocusRef.current = previewBlock.isFocus;
  }, [previewBlock.isFocus]);

  // 操作函数
  const handleNodeSelect = useCallback((nodeIds: string[]) => {
    debugLog("handleNodeSelect", "Node selection changed", { nodeIds, count: nodeIds.length });
    setSelectedNodeIds(new Set(nodeIds));
  }, []);

  const handleEdgeSelect = useCallback((edgeIds: string[]) => {
    debugLog("handleEdgeSelect", "Edge selection changed", { edgeIds, count: edgeIds.length });
    setSelectedEdgeIds(new Set(edgeIds));
  }, []);

  const setContextMenu = useCallback((menu: LocalGraphUIState["contextMenu"]) => {
    debugLog("setContextMenu", "Setting context menu", { visible: menu.visible, target: menu.target });
    setContextMenuState(menu);
  }, []);

  const closeContextMenu = useCallback(() => {
    debugLog("closeContextMenu", "Closing context menu");
    setContextMenuState(prev => ({ ...prev, visible: false }));
  }, []);

  const setPreviewBlock = useCallback((block: LocalGraphUIState["previewBlock"]) => {
    debugLog("setPreviewBlock", "Setting preview block", { nodeId: block.nodeId, visible: block.visible, isFocus: block.isFocus });
    setPreviewBlockState(block);
  }, []);

  const closePreviewBlock = useCallback(() => {
    debugLog("closePreviewBlock", "Closing preview block");
    setPreviewBlockState(prev => ({ ...prev, visible: false, isFocus: false }));
  }, []);

  const fixPreviewOnFocus = useCallback((nodeId: string) => {
    debugLog("fixPreviewOnFocus", "Fixing preview on focus", { nodeId });
    setPreviewBlock({
      nodeId,
      visible: true,
      isFocus: true,
    });
  }, [setPreviewBlock]);

  return {
    selectedNodeIds,
    selectedEdgeIds,
    contextMenu,
    previewBlock,
    isNodeFocusRef,
    handleNodeSelect,
    handleEdgeSelect,
    setContextMenu,
    closeContextMenu,
    setPreviewBlock,
    closePreviewBlock,
    fixPreviewOnFocus,
  };
}
