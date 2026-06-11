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
import { useGraph } from "@workspace/hooks"
import type { Diff } from "@workspace/store/dataStore";

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
  const processDiff = (graph: G6Graph, diff: Diff) => {
    const currentView = resolvedViewRef.current;
    const layoutKind = currentView?.viewType
      ? VIEW_TYPE_TO_LAYOUT[currentView.viewType]
      : undefined;

    const upsertNodes = [...diff.nodes.added, ...diff.nodes.updated];
    if (upsertNodes.length > 0) {
      const nodeMap = new Map(upsertNodes.map((n) => [n.id, n]));
      const adapted = transformToG6Data(nodeMap, new Map(), currentView, layoutKind);
      const newNodes = adapted.nodes ?? [];
      const existing = newNodes.filter((n) => graph.hasNode(n.id!));
      const added = newNodes.filter((n) => !graph.hasNode(n.id!));

      if (existing.length > 0) {
        graph.updateNodeData(existing);
        graph.draw();
      }
      if (added.length > 0) {
        graph.stopLayout();
        graph.addNodeData(added);
        graph.render();
      }
    }

    if (diff.nodes.removed.length > 0) {
      graph.stopLayout();
      graph.removeNodeData(diff.nodes.removed);
      graph.render();
    }

    const upsertEdges = [...diff.edges.added, ...diff.edges.updated];
    if (upsertEdges.length > 0) {
      const edgeMap = new Map(upsertEdges.map((e) => [e.id, e]));
      const adapted = transformToG6Data(new Map(), edgeMap, currentView, layoutKind);
      const newEdges = adapted.edges ?? [];
      const existing = newEdges.filter((e) => graph.hasEdge(e.id!));
      const added = newEdges.filter((e) => !graph.hasEdge(e.id!));

      if (existing.length > 0) {
        graph.updateEdgeData(existing);
        graph.draw();
      }
      if (added.length > 0) {
        graph.stopLayout();
        graph.addEdgeData(added);
        graph.render();
      }
    }

    if (diff.edges.removed.length > 0) {
      graph.stopLayout();
      graph.removeEdgeData(diff.edges.removed);
      graph.render();
    }

    for (const updatedView of diff.views.updated) {
      const currentViewId = resolvedViewRef.current?.id;
      if (currentViewId && updatedView.id === currentViewId) {
        performFullSync(graph);
      }
    }
    // diff.views.added / removed: 当前实现与旧 Mutation 实现一致，不触发额外同步
  };

  // ----------------------------------------------------------------------
  // Effects
  // ----------------------------------------------------------------------

  // 1. 订阅全局 Store 的增量更新
  useEffect(() => {
    const unsubscribe = useDataStore.subscribe((state) => {
      if (!graphRef.current || state.isDiffEmpty()) return;
      const diff = state.diff;
      processDiff(graphRef.current, diff);
      useDataStore.getState().clearDiff();
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
