import React, { useEffect, useRef } from "react";
import { Graph as G6Graph, NodeEvent, EdgeEvent, CanvasEvent, CommonEvent } from "@antv/g6";
import type { LocalGraphUIState } from "./useGraphStateManage";

interface UseGraphEventHandlersProps {
  graphRef: React.RefObject<G6Graph | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  closeContextMenu: () => void;
  closePreviewBlock: () => void;
  setContextMenu: (menu: LocalGraphUIState["contextMenu"]) => void;
  setPreviewBlock: (block: LocalGraphUIState["previewBlock"]) => void;
  isNodeFocusRef: React.MutableRefObject<boolean>;
}

export function useGraphEventHandlers({
  graphRef,
  containerRef,
  closeContextMenu,
  closePreviewBlock,
  setContextMenu,
  setPreviewBlock,
  isNodeFocusRef,
}: UseGraphEventHandlersProps) {
  const isDraggingRef = useRef(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    // 节点右键菜单
    const handleNodeContextMenu = (e: any) => {
      e.preventDefault();
      const id: string = e.target.id;
      const { x: clientX, y: clientY } = e.client;
      if (!id) {
        return;
      }
      closePreviewBlock();
      setContextMenu({
        x: clientX,
        y: clientY,
        target: { type: "node", id: id },
        visible: true,
      });
    };

    // 边右键菜单
    const handleEdgeContextMenu = (e: any) => {
      e.preventDefault();
      if (!e.target.id) {
        return;
      }
      setContextMenu({
        x: e.client.x,
        y: e.client.y,
        target: { type: "edge", id: e.target.id },
        visible: true,
      });
    };

    // 画布右键菜单
    const handleCanvasContextMenu = (e: any) => {
      e.preventDefault();
      setContextMenu({
        x: e.client.x,
        y: e.client.y,
        target: { type: "canvas" },
        visible: true,
      });
    };

    // 画布点击关闭菜单和预览
    const handleCanvasClick = () => {
      closeContextMenu();
      closePreviewBlock();
    };


    // 节点悬停进入
    const handleNodePointerEnter = (e: any) => {
      const HOVER_DELAY = 150;
      const nodeId = e.target?.id;
      if (!nodeId || isDraggingRef.current) return;
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (isNodeFocusRef.current) {
        return;
      }
      hoverTimerRef.current = setTimeout(() => {
        setPreviewBlock({
          nodeId,
          visible: true,
          isFocus: false,
        });
      }, HOVER_DELAY);
    };

    // 节点悬停离开
    const handleNodePointerLeave = () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      if (isNodeFocusRef.current) {
        return;
      }
      closePreviewBlock();
    };

    // 画布悬停进入
    const handleCanvasPointerEnter = () => {
      if (isNodeFocusRef.current) {
        return;
      }
      closePreviewBlock();
    };

    // 节点拖拽
    const handleNodeDrag = () => {
      if (isDraggingRef.current) return;
      isDraggingRef.current = true;
      if (isNodeFocusRef.current) {
        return;
      }
      closePreviewBlock();
    };

    // 节点拖拽结束
    const handleNodeDragEnd = () => {
      isDraggingRef.current = false;
    };

    // 绑定事件
    graph.on(NodeEvent.CONTEXT_MENU, handleNodeContextMenu);
    graph.on(EdgeEvent.CONTEXT_MENU, handleEdgeContextMenu);
    graph.on(CanvasEvent.CONTEXT_MENU, handleCanvasContextMenu);
    graph.on(CanvasEvent.CLICK, handleCanvasClick);
    graph.on(NodeEvent.POINTER_ENTER, handleNodePointerEnter);
    graph.on(NodeEvent.POINTER_LEAVE, handleNodePointerLeave);
    graph.on(CanvasEvent.POINTER_ENTER, handleCanvasPointerEnter);
    graph.on(NodeEvent.DRAG, handleNodeDrag);
    graph.on(NodeEvent.DRAG_END, handleNodeDragEnd);

    // 窗口大小调整
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (graphRef.current && containerRef.current) {
          const width = containerRef.current.clientWidth || 0;
          const height = containerRef.current.clientHeight || 0;
          graph.setSize(width, height);
        }
      }, 20);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      // 解绑事件
      graph.off(NodeEvent.CONTEXT_MENU, handleNodeContextMenu);
      graph.off(EdgeEvent.CONTEXT_MENU, handleEdgeContextMenu);
      graph.off(CanvasEvent.CONTEXT_MENU, handleCanvasContextMenu);
      graph.off(CanvasEvent.CLICK, handleCanvasClick);
      graph.off(NodeEvent.POINTER_ENTER, handleNodePointerEnter);
      graph.off(NodeEvent.POINTER_LEAVE, handleNodePointerLeave);
      graph.off(CanvasEvent.POINTER_ENTER, handleCanvasPointerEnter);
      graph.off(NodeEvent.DRAG, handleNodeDrag);
      graph.off(NodeEvent.DRAG_END, handleNodeDragEnd);

      resizeObserver.disconnect();
    };
  }, [graphRef, closeContextMenu, closePreviewBlock, setContextMenu, setPreviewBlock, isNodeFocusRef]);

  return { isDraggingRef };
}
