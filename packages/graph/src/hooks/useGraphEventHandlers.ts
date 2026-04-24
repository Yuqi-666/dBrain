import React, { useEffect, useRef } from "react";
import { Graph as G6Graph, NodeEvent, EdgeEvent, CanvasEvent, CommonEvent } from "@antv/g6";
import type { LocalGraphUIState } from "./useGraphStateManage";

const DEBUG_PREFIX = "[GraphEventHandlers]";

function debugLog(component: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : "";
  console.log(`${DEBUG_PREFIX}[${timestamp}][${component}] ${message}${dataStr}`);
}

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
    debugLog("useEffect", "Setting up event handlers");
    const graph = graphRef.current;
    if (!graph) {
      debugLog("useEffect", "No graph - skipping event handler setup");
      return;
    }

    // 节点右键菜单
    const handleNodeContextMenu = (e: any) => {
      debugLog("handleNodeContextMenu", "Node context menu triggered", { id: e.target?.id, clientX: e.client?.x, clientY: e.client?.y });
      e.preventDefault();
      const id: string = e.target.id;
      const { x: clientX, y: clientY } = e.client;
      if (!id) {
        debugLog("handleNodeContextMenu", "No node id - ignoring");
        return;
      }
      closePreviewBlock();
      setContextMenu({
        x: clientX,
        y: clientY,
        target: { type: "node", id: id },
        visible: true,
      });
      debugLog("handleNodeContextMenu", "Context menu set for node", { id });
    };

    // 边右键菜单
    const handleEdgeContextMenu = (e: any) => {
      debugLog("handleEdgeContextMenu", "Edge context menu triggered", { id: e.target?.id });
      e.preventDefault();
      if (!e.target.id) {
        debugLog("handleEdgeContextMenu", "No edge id - ignoring");
        return;
      }
      setContextMenu({
        x: e.client.x,
        y: e.client.y,
        target: { type: "edge", id: e.target.id },
        visible: true,
      });
      debugLog("handleEdgeContextMenu", "Context menu set for edge", { id: e.target.id });
    };

    // 画布右键菜单
    const handleCanvasContextMenu = (e: any) => {
      debugLog("handleCanvasContextMenu", "Canvas context menu triggered", { clientX: e.client?.x, clientY: e.client?.y });
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
      debugLog("handleCanvasClick", "Canvas clicked - closing menu and preview");
      closeContextMenu();
      closePreviewBlock();
    };

    // 键盘按下
    const handleKeyDown = (e: any) => {
      debugLog("handleKeyDown", "Key pressed", { key: e.key });
      if (e.key == "Control") {
        debugLog("handleKeyDown", "Control pressed - disabling drag and scroll");
        graph.updateBehavior({
          key: 'drag-canvas-1',
          enable: false,
        });
        graph.updateBehavior({
          key: 'scroll-canvas-1',
          enable: false,
        });
      }
    };

    // 键盘抬起
    const handleKeyUp = (e: any) => {
      debugLog("handleKeyUp", "Key released", { key: e.key });
      if (e.key == "Control") {
        debugLog("handleKeyUp", "Control released - restoring drag and scroll");
        graph.updateBehavior({
          key: 'drag-canvas-1',
          enable: (event: any) => {
            if ('targetType' in event) return event.targetType === 'canvas';
            return true;
          },
        });
        graph.updateBehavior({
          key: 'scroll-canvas-1',
          enable: true,
        });
      }
    };

    // 节点悬停进入
    const handleNodePointerEnter = (e: any) => {
      const HOVER_DELAY = 150;
      const nodeId = e.target?.id;
      debugLog("handleNodePointerEnter", "Node pointer enter", { nodeId, isDragging: isDraggingRef.current });
      if (!nodeId || isDraggingRef.current) return;
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (isNodeFocusRef.current) {
        debugLog("handleNodePointerEnter", "Node focus active - skipping preview");
        return;
      }
      debugLog("handleNodePointerEnter", "Setting hover timer for preview", { nodeId, delay: HOVER_DELAY });
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
      debugLog("handleNodePointerLeave", "Node pointer leave");
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      if (isNodeFocusRef.current) {
        debugLog("handleNodePointerLeave", "Node focus active - skipping close preview");
        return;
      }
      closePreviewBlock();
    };

    // 画布悬停进入
    const handleCanvasPointerEnter = () => {
      debugLog("handleCanvasPointerEnter", "Canvas pointer enter");
      if (isNodeFocusRef.current) {
        debugLog("handleCanvasPointerEnter", "Node focus active - skipping");
        return;
      }
      closePreviewBlock();
    };

    // 节点拖拽
    const handleNodeDrag = () => {
      debugLog("handleNodeDrag", "Node drag started", { isDragging: isDraggingRef.current });
      if (isDraggingRef.current) return;
      isDraggingRef.current = true;
      if (isNodeFocusRef.current) {
        debugLog("handleNodeDrag", "Node focus active - skipping preview close");
        return;
      }
      closePreviewBlock();
    };

    // 节点拖拽结束
    const handleNodeDragEnd = () => {
      debugLog("handleNodeDragEnd", "Node drag ended");
      isDraggingRef.current = false;
    };

    // 绑定事件
    debugLog("useEffect", "Binding event handlers");
    graph.on(NodeEvent.CONTEXT_MENU, handleNodeContextMenu);
    graph.on(EdgeEvent.CONTEXT_MENU, handleEdgeContextMenu);
    graph.on(CanvasEvent.CONTEXT_MENU, handleCanvasContextMenu);
    graph.on(CanvasEvent.CLICK, handleCanvasClick);
    graph.on(CommonEvent.KEY_DOWN, handleKeyDown);
    graph.on(CommonEvent.KEY_UP, handleKeyUp);
    graph.on(NodeEvent.POINTER_ENTER, handleNodePointerEnter);
    graph.on(NodeEvent.POINTER_LEAVE, handleNodePointerLeave);
    graph.on(CanvasEvent.POINTER_ENTER, handleCanvasPointerEnter);
    graph.on(NodeEvent.DRAG, handleNodeDrag);
    graph.on(NodeEvent.DRAG_END, handleNodeDragEnd);
    debugLog("useEffect", "All event handlers bound");

    // 窗口大小调整
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      debugLog("handleResize", "Resize detected");
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (graphRef.current && containerRef.current) {
          const width = containerRef.current.clientWidth || 0;
          const height = containerRef.current.clientHeight || 0;
          debugLog("handleResize", "Applying new size", { width, height });
          graph.setSize(width, height);
        }
      }, 20);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      debugLog("useEffect", "ResizeObserver attached to container");
    }

    return () => {
      debugLog("useEffect", "Cleaning up - unbinding all event handlers");
      // 解绑事件
      graph.off(NodeEvent.CONTEXT_MENU, handleNodeContextMenu);
      graph.off(EdgeEvent.CONTEXT_MENU, handleEdgeContextMenu);
      graph.off(CanvasEvent.CONTEXT_MENU, handleCanvasContextMenu);
      graph.off(CanvasEvent.CLICK, handleCanvasClick);
      graph.off(CommonEvent.KEY_DOWN, handleKeyDown);
      graph.off(CommonEvent.KEY_UP, handleKeyUp);
      graph.off(NodeEvent.POINTER_ENTER, handleNodePointerEnter);
      graph.off(NodeEvent.POINTER_LEAVE, handleNodePointerLeave);
      graph.off(CanvasEvent.POINTER_ENTER, handleCanvasPointerEnter);
      graph.off(NodeEvent.DRAG, handleNodeDrag);
      graph.off(NodeEvent.DRAG_END, handleNodeDragEnd);

      resizeObserver.disconnect();
      debugLog("useEffect", "Cleanup complete");
    };
  }, [graphRef, closeContextMenu, closePreviewBlock, setContextMenu, setPreviewBlock, isNodeFocusRef]);

  return { isDraggingRef };
}
