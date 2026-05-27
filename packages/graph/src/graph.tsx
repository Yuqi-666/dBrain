"use client";
import React, { useRef, useEffect } from "react";
import { Graph as G6Graph } from "@antv/g6";
import { useGraphStore } from "@workspace/store";
import type { NodeData, View, ViewId } from "@workspace/interfaces";
import { GraphContextMenu } from "@workspace/ui/components/graph-context-menu/graph-context-menu";
import { PreviewBlock } from "@workspace/ui/components/preview-block";
import { transformToG6Data } from "./transform";
import {
  createLayoutOptions,
  createNodeOptions,
  createThemeOptions,
} from "./options";
import { useGraphStateManage } from "./hooks/useGraphStateManage";
import { useGraphInstance } from "./hooks/useGraphInstance";
import { useGraphEventHandlers } from "./hooks/useGraphEventHandlers";
import type { Mutation } from "@workspace/store/graphStore";

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
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const resolvedViewRef = useRef<View | undefined>(undefined);
  const isMountedRef = useRef(false);

  // 状态管理 Hook
  const {
    contextMenu,
    previewBlock,
    isNodeFocusRef,
    selectedNodeIds,
    selectedEdgeIds,
    handleNodeSelect,
    handleEdgeSelect,
    setContextMenu,
    closeContextMenu,
    setPreviewBlock,
    closePreviewBlock,
    fixPreviewOnFocus,
    handleNodeEdit,
  } = useGraphStateManage();

  // 图实例 Hook
  const graphRef = useGraphInstance({
    containerRef,
    theme,
    handleNodeSelect,
    handleEdgeSelect,
    fixPreviewOnFocus,
  });
  // 事件处理 Hook
  useGraphEventHandlers({
    graphRef,
    containerRef,
    closeContextMenu,
    closePreviewBlock,
    setContextMenu,
    setPreviewBlock,
    isNodeFocusRef,
    handleNodeEdit,
  });

  // ----------------------------------------------------------------------
  // 数据同步逻辑
  // ----------------------------------------------------------------------

  // 全量同步
  const performFullSync = (graph: G6Graph) => {
    const state = useGraphStore.getState();
    const { nodes, edges, views } = state;
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

    // 转换数据并同步
    const g6Data = transformToG6Data(
      nodes,
      edges,
      currentView,
      currentView?.layout,
    );
    graph.setData(g6Data);
    graph.setLayout(createLayoutOptions({ layoutType: currentView?.layout }));
    graph.setOptions({
      node: createNodeOptions({ layoutType: currentView?.layout }),
    });
    if (currentView?.layout === "D3force") {
      graph.updateBehavior({
        key: "drag-element-force",
        enable: true,
      });
      graph.updateBehavior({
        key: "drag-element",
        enable: false,
      });
    } else {
      graph.updateBehavior({
        key: "drag-element-force",
        enable: false,
      });
      graph.updateBehavior({
        key: "drag-element",
        enable: true,
      });
    }

    if (isMountedRef.current) {
      graph.render().then(() => {
        if (currentView?.layout != "D3force") {
          graph.fitCenter();
        }
      });
    }
  };

  // 增量同步
  const processMutations = (graph: G6Graph, mutations: Mutation[]) => {
    const currentView = resolvedViewRef.current;

    mutations.forEach((mutation) => {
      switch (mutation.type) {
        case "upsertNode": {
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
            const existingNode = graph.hasNode(newNode.id);
            if (existingNode) {
              graph.updateNodeData([newNode]);
              graph.draw();
            } else {
              graph.stopLayout();
              graph.addNodeData([newNode]);
              graph.render();
            }

          }
          break;
        }
        case "deleteNode": {
          graph.stopLayout();
          graph.removeNodeData([mutation.payload.id]);
          graph.render();
          break;
        }
        case "upsertEdge": {
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
            const existingEdge = graph.hasEdge(newEdge.id);
            if (existingEdge) {
              graph.updateEdgeData([newEdge]);
              graph.draw();
            } else {
              graph.stopLayout();
              graph.addEdgeData([newEdge]);
              graph.render();
            }
          }
          break;
        }
        case "deleteEdge": {
          graph.stopLayout();
          graph.removeEdgeData([mutation.payload.id]);
          graph.render();
          break;
        }
        case "upsertView": {
          const updatedView = mutation.payload;
          const currentViewId = resolvedViewRef.current?.id;
          if (currentViewId && updatedView.id === currentViewId) {
            performFullSync(graph);
          }
          break;
        }
        case "deleteView": {
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
    const unsubscribe = useGraphStore.subscribe((state) => {
      if (!graphRef.current || state.latestMutations.length === 0) return;
      processMutations(graphRef.current, state.latestMutations);
      useGraphStore.getState().clearMutations();
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // 2. View 变化触发全量重绘
  useEffect(() => {
    if (!graphRef.current) return;
    if (!isMountedRef.current) {
      graphRef.current.render().then(() => {
        isMountedRef.current = true;
        performFullSync(graphRef.current!);
      });
    } else {
      performFullSync(graphRef.current);
    }
  }, [view, viewId, graphRef]);

  // 3. Theme 变化更新样式
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.setOptions({
      background: createThemeOptions({ theme: theme }).background,
    });
    graphRef.current?.render();
  }, [theme, graphRef]);

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
          selectedNodeIds={selectedNodeIds}
          selectedEdgeIds={selectedEdgeIds}
          onClose={closeContextMenu}
        />
      )}
      {previewBlock.visible && previewBlock.nodeId && (
        <PreviewBlock
          nodeId={previewBlock.nodeId}
          containerRef={containerRef}
          onClose={closePreviewBlock}
          visible={previewBlock.visible}
          isFocus={previewBlock.isFocus}
        />
      )}
    </div>
  );
}
