"use client";
import React, { useRef, useEffect } from "react";
import { Graph as G6Graph } from "@antv/g6";
import { useGraphStore } from "@workspace/store";
import type { View, ViewId } from "@workspace/interfaces";
import { GraphContextMenu } from "@workspace/ui/components/graph-context-menu";
import { PreviewBlock } from "@workspace/ui/components/preview-block";
import { transformToG6Data } from "./transform";
import { createLayoutOptions, createNodeOptions, createThemeOptions } from "./options";
import type { Mutation } from "./types";
import { useGraphStateManage } from "./hooks/useGraphStateManage";
import { useGraphInstance } from "./hooks/useGraphInstance";
import { useGraphEventHandlers } from "./hooks/useGraphEventHandlers";

// ----------------------------------------------------------------------
// DEBUG UTILITY
// ----------------------------------------------------------------------
const DEBUG_PREFIX = "[Graph]";

function debugLog(component: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : "";
  console.log(`${DEBUG_PREFIX}[${timestamp}][${component}] ${message}${dataStr}`);
}

// ----------------------------------------------------------------------
// 1. 定义组件 Props
// ----------------------------------------------------------------------
export interface GraphProps {
  viewId?: ViewId;
  view?: View;
  theme?: "light" | "dark";
  enableMinimap?: boolean;
  enableGrid?: boolean;
  enableFisheye?: boolean;
  enableNodeDragging?: boolean;
  enableEdgeInteractions?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (graph: any) => void;
}

// ----------------------------------------------------------------------
// 2. 主组件
// ----------------------------------------------------------------------
export function Graph({
  viewId,
  view,
  theme = "light",
  className,
  style,
  onLoad,
}: GraphProps) {
  debugLog("Graph", "Component mounting", { viewId, theme });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const resolvedViewRef = useRef<View | undefined>(undefined);
  const isMountedRef = useRef(false);

  // 状态管理 Hook
  const {
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
  } = useGraphStateManage();

  // 图实例 Hook
  debugLog("Graph", "Initializing useGraphInstance hook");
  const graphRef = useGraphInstance({
    containerRef,
    theme,
    handleNodeSelect,
    handleEdgeSelect,
    fixPreviewOnFocus,
  });
  debugLog("Graph", "useGraphInstance hook initialized", { hasGraphRef: !!graphRef.current });

  // 事件处理 Hook
  debugLog("Graph", "Setting up useGraphEventHandlers");
  useGraphEventHandlers({
    graphRef,
    containerRef,
    closeContextMenu,
    closePreviewBlock,
    setContextMenu,
    setPreviewBlock,
    isNodeFocusRef,
  });

  const nodes = useGraphStore((state) => state.nodes);

  // ----------------------------------------------------------------------
  // 数据同步逻辑
  // ----------------------------------------------------------------------

  // 全量同步
  const performFullSync = (graph: G6Graph) => {
    debugLog("performFullSync", "Starting full sync", { isMounted: isMountedRef.current });
    const state = useGraphStore.getState();
    const { nodes, edges, views } = state;
    debugLog("performFullSync", "Store state", { nodeCount: nodes.size, edgeCount: edges.size });
    // Stop any running layout before making changes
    if (isMountedRef.current) {
      graph.stopLayout();
    }

    // 解析当前 View
    let currentView: View | undefined;
    if (view) {
      currentView = view;
    } else if (viewId) {
      currentView = views.get(viewId);
    }
    resolvedViewRef.current = currentView;
    debugLog("performFullSync", "Resolved view", { viewId: currentView?.id, layout: currentView?.layout });

    // 转换数据并同步
    const g6Data = transformToG6Data(
      nodes,
      edges,
      currentView,
      currentView?.layout,
    );
    debugLog("performFullSync", "Transformed G6 data", { nodes: g6Data.nodes?.length, edges: g6Data.edges?.length });
    graph.setData(g6Data);
    graph.setLayout(createLayoutOptions({ layoutType: currentView?.layout }));
    graph.setOptions({ node: createNodeOptions({ layoutType: currentView?.layout }) });
    debugLog("performFullSync", "Layout configured", { layoutType: currentView?.layout });
    if (currentView?.layout === "D3force") {
      graph.updateBehavior({
        key: 'drag-element-force',
        enable: true,
      });
      graph.updateBehavior({
        key: 'drag-element',
        enable: false,
      });
    } else {
      graph.updateBehavior({
        key: 'drag-element-force',
        enable: false,
      });
      graph.updateBehavior({
        key: 'drag-element',
        enable: true,
      });
    }

    if (isMountedRef.current) {
      debugLog("performFullSync", "Rendering graph (mounted state)");
      graph.render().then(() => {
        graph.fitCenter();
        debugLog("performFullSync", "Render complete and fitCenter applied");
      });
    } else {
      debugLog("performFullSync", "Skipping render - not yet mounted");
    }
  };

  // 增量同步
  const processMutations = (graph: G6Graph, mutations: Mutation[]) => {
    debugLog("processMutations", "Processing mutations", { count: mutations.length });
    const state = useGraphStore.getState();
    const { nodes, edges } = state;
    const currentView = resolvedViewRef.current;

    mutations.forEach((mutation, index) => {
      debugLog("processMutations", `Mutation[${index}]`, { type: mutation.type, payload: mutation.payload });
      switch (mutation.type) {
        case "addNode": {
          const node = mutation.payload;
          const adapted = transformToG6Data(
            new Map([[node.id, node]]),
            new Map(),
            currentView,
            currentView?.layout,
          );
          const newNodes = adapted.nodes ?? [];
          const newNode = newNodes[0];
          if (newNode?.id) {
            const existingNode = graph.getNodeData(newNode.id);
            debugLog("processMutations", "addNode", { nodeId: newNode.id, existing: !!existingNode });
            existingNode
              ? graph.updateNodeData([newNode])
              : graph.addNodeData([newNode]);
          }
          break;
        }
        case "updateNode": {
          const { id, updates } = mutation.payload;
          const existing = nodes.get(id);
          if (existing) {
            const adapted = transformToG6Data(
              new Map([[id, { ...existing, ...updates }]]),
              new Map(),
              currentView,
              currentView?.layout,
            );
            const updatedNodes = adapted.nodes ?? [];
            const updatedNode = updatedNodes[0];
            if (updatedNode) {
              debugLog("processMutations", "updateNode", { nodeId: id, updates });
              graph.updateNodeData([updatedNode]);
            }
          }
          break;
        }
        case "deleteNode": {
          debugLog("processMutations", "deleteNode", { nodeId: mutation.payload.id });
          graph.removeNodeData([mutation.payload.id]);
          break;
        }
        case "addEdge": {
          const edge = mutation.payload;
          const adapted = transformToG6Data(
            new Map(),
            new Map([[edge.id, edge]]),
            currentView,
            currentView?.layout,
          );
          const newEdges = adapted.edges ?? [];
          const newEdge = newEdges[0];
          if (newEdge?.id) {
            const existingEdge = graph.getEdgeData(newEdge.id);
            debugLog("processMutations", "addEdge", { edgeId: newEdge.id, existing: !!existingEdge });
            existingEdge
              ? graph.updateEdgeData([newEdge])
              : graph.addEdgeData([newEdge]);
          }
          break;
        }
        case "updateEdge": {
          const { id, updates } = mutation.payload;
          const existing = edges.get(id);
          if (existing) {
            const adapted = transformToG6Data(
              new Map(),
              new Map([[id, { ...existing, ...updates }]]),
              currentView,
              currentView?.layout,
            );
            const updatedEdges = adapted.edges ?? [];
            const updatedEdge = updatedEdges[0];
            if (updatedEdge) {
              debugLog("processMutations", "updateEdge", { edgeId: id, updates });
              graph.updateEdgeData([updatedEdge]);
            }
          }
          break;
        }
        case "deleteEdge": {
          debugLog("processMutations", "deleteEdge", { edgeId: mutation.payload.id });
          graph.removeEdgeData([mutation.payload.id]);
          break;
        }
        case "addView":
          debugLog("processMutations", "addView - no-op");
          break;
        case "updateView": {
          const updatedView = mutation.payload;
          const currentViewId = resolvedViewRef.current?.id;
          if (currentViewId && updatedView.id === currentViewId) {
            debugLog("processMutations", "updateView triggering fullSync", { viewId: updatedView.id });
            performFullSync(graph);
          }
          break;
        }
        case "deleteView": {
          debugLog("processMutations", "deleteView - no-op");
          break;
        }
      }
    });
  };

  // ----------------------------------------------------------------------
  // Effects
  // ----------------------------------------------------------------------

  // 1. 订阅全局 Store 的增量更新
  useEffect(() => {
    debugLog("useEffect[1]", "Subscribing to store mutations");
    const unsubscribe = useGraphStore.subscribe((state) => {
      if (!graphRef.current || state.latestMutations.length === 0) return;
      debugLog("useEffect[1]", "Store mutation detected", { count: state.latestMutations.length });
      processMutations(graphRef.current, state.latestMutations);
      useGraphStore.getState().clearMutations();
    });
    return () => {
      debugLog("useEffect[1]", "Unsubscribing from store mutations");
      unsubscribe();
    };
  }, [graphRef]);

  // 2. View 变化触发全量重绘
  useEffect(() => {
    debugLog("useEffect[2]", "View change effect", { viewId, viewId2: view?.id, view: !!view });
    if (!graphRef.current) return;
    if (!isMountedRef.current) {
      debugLog("useEffect[2]", "First mount - initial render then fullSync");
      graphRef.current.render().then(() => {
        isMountedRef.current = true;
        debugLog("useEffect[2]", "Initial render complete, calling performFullSync");
        performFullSync(graphRef.current!);
      });
    } else {
      debugLog("useEffect[2]", "Subsequent change - calling performFullSync");
      performFullSync(graphRef.current);
    }
  }, [view, viewId, graphRef]);

  // 3. Theme 变化更新样式
  useEffect(() => {
    debugLog("useEffect[3]", "Theme change effect", { theme });
    if (!graphRef.current) return;
    graphRef.current.setOptions({
      background: createThemeOptions({ theme: theme }).background,
    });
    debugLog("useEffect[3]", "Theme options set, re-rendering");
    graphRef.current?.render();
  }, [theme, graphRef]);

  debugLog("Graph", "Component render complete", { viewId, theme });

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", width: "100%", height: "100%", ...style }}
    >
      {contextMenu.visible && (
        <GraphContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          visible={contextMenu.visible}
          target={contextMenu.target}
          onClose={closeContextMenu}
          onEdit={closeContextMenu}
          onDelete={closeContextMenu}
          onAddChild={closeContextMenu}
          onConnect={closeContextMenu}
          onDuplicate={closeContextMenu}
        />
      )}
      {previewBlock.visible && previewBlock.nodeId && (
        <PreviewBlock
          node={nodes.get(previewBlock.nodeId)!}
          containerRef={containerRef}
          onClose={closePreviewBlock}
          visible={previewBlock.visible}
          isFocus={previewBlock.isFocus}
        />
      )}
    </div>
  );
}
