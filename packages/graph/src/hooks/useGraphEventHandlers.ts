import React, { useEffect, useRef } from "react";
import {
  Graph as G6Graph,
  NodeEvent,
  EdgeEvent,
  CanvasEvent,
} from "@antv/g6";
import { useGraphUIStore } from "@workspace/store";

interface UseGraphEventHandlersProps {
  graphRef: React.RefObject<G6Graph | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useGraphEventHandlers({
  graphRef,
  containerRef,
}: UseGraphEventHandlersProps) {
  const isDraggingRef = useRef(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNodeFocusRef = useRef(false);

  useEffect(() => {
    isNodeFocusRef.current = useGraphUIStore.getState().isNodeFocus;
  });

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    const openContextMenu = (e: any) => {
      e.preventDefault();
      const { client: { x, y } } = e;
      const targetId = e.target?.id;

      useGraphUIStore.getState().closePreviewBlock();

      const { selectedNodeIds, selectedEdgeIds } = useGraphUIStore.getState();
      const isMultipleSelected = selectedNodeIds.size + selectedEdgeIds.size > 1;

      if (isMultipleSelected) {
        useGraphUIStore.getState().setContextMenu({
          x,
          y,
          type: "groupSelect",
          context: { nodeIds: Array.from(selectedNodeIds), edgeIds: Array.from(selectedEdgeIds) },
          visible: true,
        });
      } else if (e.targetType === "node" && targetId) {
        useGraphUIStore.getState().setContextMenu({ x, y, type: "node", context: { nodeId: targetId }, visible: true });
      } else if (e.targetType === "edge" && targetId) {
        useGraphUIStore.getState().setContextMenu({ x, y, type: "edge", context: { edgeId: targetId }, visible: true });
      } else {
        useGraphUIStore.getState().setContextMenu({ x, y, type: "canvas", context: {}, visible: true });
      }
    };
    // 画布点击关闭菜单和预览
    const handleCanvasClick = () => {
      useGraphUIStore.getState().setSelectedNodeIds(new Set())
      useGraphUIStore.getState().setSelectedEdgeIds(new Set())
      useGraphUIStore.getState().closeContextMenu();
      useGraphUIStore.getState().closePreviewBlock();
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
        useGraphUIStore.getState().setPreviewBlock({
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
      useGraphUIStore.getState().closePreviewBlock();
    };

    // 画布悬停进入
    const handleCanvasPointerEnter = () => {
      if (isNodeFocusRef.current) {
        return;
      }
      useGraphUIStore.getState().closePreviewBlock();
    };

    // 节点拖拽
    const handleNodeDrag = () => {
      if (isDraggingRef.current) return;
      isDraggingRef.current = true;
      if (isNodeFocusRef.current) {
        return;
      }
      useGraphUIStore.getState().closePreviewBlock();
    };

    // 节点拖拽结束
    const handleNodeDragEnd = () => {
      isDraggingRef.current = false;
    };

    const handleNodeDBClick = (e: any) => {
      const nodeId = e.target?.id;
      useGraphUIStore.getState().handleNodeEdit(nodeId);
      useGraphUIStore.getState().closePreviewBlock();
    };

    // 绑定事件
    graph.on(NodeEvent.CONTEXT_MENU, openContextMenu);
    graph.on(EdgeEvent.CONTEXT_MENU, openContextMenu);
    graph.on(CanvasEvent.CONTEXT_MENU, openContextMenu);
    graph.on(CanvasEvent.CLICK, handleCanvasClick);
    graph.on(NodeEvent.POINTER_ENTER, handleNodePointerEnter);
    graph.on(NodeEvent.POINTER_LEAVE, handleNodePointerLeave);
    graph.on(NodeEvent.DBLCLICK, handleNodeDBClick);
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
      graph.off(NodeEvent.CONTEXT_MENU, openContextMenu);
      graph.off(EdgeEvent.CONTEXT_MENU, openContextMenu);
      graph.off(CanvasEvent.CONTEXT_MENU, openContextMenu);
      graph.off(CanvasEvent.CLICK, handleCanvasClick);
      graph.off(NodeEvent.POINTER_ENTER, handleNodePointerEnter);
      graph.off(NodeEvent.POINTER_LEAVE, handleNodePointerLeave);
      graph.off(CanvasEvent.POINTER_ENTER, handleCanvasPointerEnter);
      graph.off(NodeEvent.DRAG, handleNodeDrag);
      graph.off(NodeEvent.DRAG_END, handleNodeDragEnd);

      resizeObserver.disconnect();
    };
  }, [graphRef, containerRef]);

  return { isDraggingRef };
}
