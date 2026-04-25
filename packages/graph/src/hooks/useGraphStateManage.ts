import React, { useState, useCallback, useRef, useEffect } from "react";

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
    isNodeFocusRef.current = previewBlock.isFocus;
  }, [previewBlock.isFocus]);

  // 操作函数
  const handleNodeSelect = useCallback((nodeIds: string[]) => {
    setSelectedNodeIds(new Set(nodeIds));
  }, []);

  const handleEdgeSelect = useCallback((edgeIds: string[]) => {
    setSelectedEdgeIds(new Set(edgeIds));
  }, []);

  const setContextMenu = useCallback((menu: LocalGraphUIState["contextMenu"]) => {
    setContextMenuState(menu);
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenuState(prev => ({ ...prev, visible: false }));
  }, []);

  const setPreviewBlock = useCallback((block: LocalGraphUIState["previewBlock"]) => {
    setPreviewBlockState(block);
  }, []);

  const closePreviewBlock = useCallback(() => {
    setPreviewBlockState(prev => ({ ...prev, visible: false, isFocus: false }));
  }, []);

  const fixPreviewOnFocus = useCallback((nodeId: string) => {
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
