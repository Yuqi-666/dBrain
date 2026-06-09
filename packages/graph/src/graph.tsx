"use client";
import React, { useRef, useEffect } from "react";
import { Graph as G6Graph } from "@antv/g6";
import { useDataStore, useUIStore } from "@workspace/store";
import type { View, ViewId, ViewType } from "@workspace/interfaces";
import { GraphContextMenu } from "@workspace/ui/components/graph-context-menu/graph-context-menu";
import { PreviewBlock } from "@workspace/ui/components/preview-block";
import { transformToG6Data } from "./transform";
import {
  createLayoutOptions,
  createNodeOptions,
  createThemeOptions,
} from "./options";
import { useGraphInstance } from "./hooks/useGraphInstance";
import { useGraphEventHandlers } from "./hooks/useGraphEventHandlers";
import type { Mutation } from "@workspace/store/useDataStore";
import { useGraph } from "@workspace/hooks"

const VIEW_TYPE_TO_LAYOUT: Record<ViewType, "D3force" | "dagre"> = {
  Force: "D3force",
  Flow: "dagre",
};
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resolvedViewRef = useRef<View | undefined>(undefined);
  const isMountedRef = useRef(false);

  const ui = useUIStore();
  const { onCreateEdge } = useGraph()
  // 图实例 Hook
  const graphRef = useGraphInstance({
    containerRef,
    theme,
    handleNodeSelect: (ids) => ui.setSelectedNodeIds(new Set(ids)),
    handleEdgeSelect: (ids) => ui.setSelectedEdgeIds(new Set(ids)),
    fixPreviewOnFocus: (nodeId: string) =>
      ui.setPreviewBlock({ nodeId, visible: true, isFocus: true }),
    handleCreateEdge: async (
      sourceNodeId: string[],
      targetNodeId: string | null,
      x: number,
      y: number
    ) => {
      onCreateEdge(sourceNodeId, targetNodeId, x, y, ui.setContextMenu)
    },
  });
  // 事件处理 Hook
  useGraphEventHandlers({
    graphRef,
    containerRef,
  });

  // ----------------------------------------------------------------------
  // 数据同步逻辑
  // ----------------------------------------------------------------------

  // 全量同步
  const performFullSync = (graph: G6Graph) => {
    const state = useDataStore.getState();
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
      currentView?.viewType ? VIEW_TYPE_TO_LAYOUT[currentView.viewType] : undefined,
    );
    graph.setData(g6Data);
    graph.setLayout(createLayoutOptions({ viewType: currentView?.viewType }));
    graph.setOptions({
      node: createNodeOptions({ viewType: currentView?.viewType }),
    });

    if (isMountedRef.current) {
      graph.render().then(() => {
        if (currentView?.viewType !== "Force") {
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
            currentView?.viewType ? VIEW_TYPE_TO_LAYOUT[currentView.viewType] : undefined,
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
            currentView?.viewType ? VIEW_TYPE_TO_LAYOUT[currentView.viewType] : undefined,
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
    const unsubscribe = useDataStore.subscribe((state) => {
      if (!graphRef.current || state.latestMutations.length === 0) return;
      processMutations(graphRef.current, state.latestMutations);
      useDataStore.getState().clearMutations();
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
      {ui.contextMenu.visible && ui.contextMenu.type && ui.contextMenu.context && (
        <GraphContextMenu
          x={ui.contextMenu.x}
          y={ui.contextMenu.y}
          visible={ui.contextMenu.visible}
          type={ui.contextMenu.type}
          context={ui.contextMenu.context as never}
          onClose={ui.closeContextMenu}
          setContextMenu={ui.setContextMenu}
        />
      )}
      {ui.previewBlock.visible && ui.previewBlock.nodeId && (
        <PreviewBlock
          nodeId={ui.previewBlock.nodeId}
          containerRef={containerRef}
          onClose={ui.closePreviewBlock}
          visible={ui.previewBlock.visible}
          isFocus={ui.previewBlock.isFocus}
        />
      )}
    </div>
  );
}
