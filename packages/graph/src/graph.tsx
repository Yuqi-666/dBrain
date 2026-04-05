import React, { useRef, useEffect } from "react";
import { create } from "zustand";
import { useStoreWithEqualityFn } from "zustand/traditional";
import type { StoreApi } from "zustand";
import { Graph as G6Graph, type GraphData } from "@antv/g6";
import { useGraphStore } from "@workspace/store";
import type { View, ViewId } from "@workspace/interfaces";
import { GraphContextMenu } from "@workspace/ui/components/graph-context-menu";
import { transformToG6Data } from "./transform";
import {
  getLayoutConfig,
  getThemeConfig,
  getBehaviorsConfig,
  getPluginsConfig,
  getNodeConfig,
  getEdgeConfig,
} from "./options";
import { registerEventHandlers } from "./on";
import type { GraphEventHandlers } from "./on";
import type { Mutation } from "./types";

// ----------------------------------------------------------------------
// 1. 定义组件 Props
// ----------------------------------------------------------------------
export interface GraphProps extends GraphEventHandlers {
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
// 2. 定义局部 Zustand Store (用于内部 UI 状态)
// ----------------------------------------------------------------------
interface LocalGraphUIState {
  selectedNodeIds: Set<string>;
  selectedEdgeIds: Set<string>;
  contextMenu: {
    x: number;
    y: number;
    target: { type: "node" | "edge" | "canvas"; id?: string } | null;
    visible: boolean;
  };
  setSelectedNodeIds: (ids: Set<string>) => void;
  setSelectedEdgeIds: (ids: Set<string>) => void;
  setContextMenu: (menu: LocalGraphUIState["contextMenu"]) => void;
  closeContextMenu: () => void;
}

// ----------------------------------------------------------------------
// 3. 主组件
// ----------------------------------------------------------------------
export function Graph({
  viewId,
  view,
  theme = "light",
  enableMinimap = true,
  enableGrid = true,
  enableFisheye = false,
  enableNodeDragging = true,
  enableEdgeInteractions = true,
  className,
  style,
  onLoad,
  ...eventHandlers
}: GraphProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<G6Graph | null>(null);
  const cleanupHandlersRef = useRef<(() => void) | null>(null);
  const resolvedViewRef = useRef<View | undefined>(undefined);

  // ----------------------------------------------------------------------
  // 初始化局部 Zustand Store (仅在组件内部使用)
  // ----------------------------------------------------------------------
  const localStoreRef = useRef<StoreApi<LocalGraphUIState> | null>(null);

  if (!localStoreRef.current) {
    localStoreRef.current = create<LocalGraphUIState>((set) => ({
      selectedNodeIds: new Set(),
      selectedEdgeIds: new Set(),
      contextMenu: { x: 0, y: 0, target: null, visible: false },

      setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
      setSelectedEdgeIds: (ids) => set({ selectedEdgeIds: ids }),
      setContextMenu: (menu) => set({ contextMenu: menu }),
      closeContextMenu: () =>
        set((state) => ({
          contextMenu: { ...state.contextMenu, visible: false },
        })),
    }));
  }

  // 便捷 Hook 用于消费局部状态
  const useLocalStore = <T,>(selector: (state: LocalGraphUIState) => T) => {
    return useStoreWithEqualityFn(localStoreRef.current!, selector);
  };

  // 消费局部状态
  const contextMenu = useLocalStore((s) => s.contextMenu);
  const setSelectedNodeIds = useLocalStore((s) => s.setSelectedNodeIds);
  const setSelectedEdgeIds = useLocalStore((s) => s.setSelectedEdgeIds);
  const setContextMenu = useLocalStore((s) => s.setContextMenu);
  const closeContextMenu = useLocalStore((s) => s.closeContextMenu);

  // ----------------------------------------------------------------------
  // 数据同步逻辑
  // ----------------------------------------------------------------------

  // 全量同步
  const performFullSync = (graph: G6Graph) => {
    const state = useGraphStore.getState();
    const { nodes, edges, nodeSemantics, edgeSemantics, views } = state;

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
    );
    graph.setData(g6Data);
    graph.setLayout(getLayoutConfig(currentView?.layout));
    graph.render();
  };

  // 增量同步
  const processMutations = (graph: G6Graph, mutations: Mutation[]) => {
    const state = useGraphStore.getState();
    const { nodeSemantics, edgeSemantics, nodes, edges } = state;
    const currentView = resolvedViewRef.current;

    mutations.forEach((mutation) => {
      switch (mutation.type) {
        case "addNode": {
          const node = mutation.payload;
          const adapted = transformToG6Data(
            new Map([[node.id, node]]),
            new Map(),
            currentView,
          );
          const newNodes = adapted.nodes ?? [];
          const newNode = newNodes[0];
          if (newNode?.id) {
            const existingNode = graph.getNodeData(newNode.id);
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
            );
            const updatedNodes = adapted.nodes ?? [];
            const updatedNode = updatedNodes[0];
            if (updatedNode) graph.updateNodeData([updatedNode]);
          }
          break;
        }
        case "deleteNode": {
          graph.removeNodeData([mutation.payload.id]);
          break;
        }
        case "addEdge": {
          const edge = mutation.payload;
          const adapted = transformToG6Data(
            new Map(),
            new Map([[edge.id, edge]]),
            currentView,
          );
          const newEdges = adapted.edges ?? [];
          const newEdge = newEdges[0];
          if (newEdge?.id) {
            const existingEdge = graph.getEdgeData(newEdge.id);
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
            );
            const updatedEdges = adapted.edges ?? [];
            const updatedEdge = updatedEdges[0];
            if (updatedEdge) graph.updateEdgeData([updatedEdge]);
          }
          break;
        }
        case "deleteEdge": {
          graph.removeEdgeData([mutation.payload.id]);
          break;
        }
        case "addView":
        case "updateView":
        case "deleteView":
          performFullSync(graph);
          break;
      }
    });
  };

  // ----------------------------------------------------------------------
  // Effects
  // ----------------------------------------------------------------------

  // 1. 初始化 G6 实例
  useEffect(() => {
    if (!containerRef.current) return;

    // 获取节点和边配置
    const nodeConfig = getNodeConfig(theme);
    const edgeConfig = getEdgeConfig(theme);

    const graph = new G6Graph({
      container: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      data: { nodes: [], edges: [] },
      layout: getLayoutConfig(),
      behaviors: getBehaviorsConfig(enableNodeDragging, enableEdgeInteractions),
      plugins: getPluginsConfig(enableMinimap, enableGrid, enableFisheye),
      node: nodeConfig,
      edge: edgeConfig,
      background: getThemeConfig(theme).background,
    } as any);

    graph.render();
    graphRef.current = graph;

    // 注册事件 (绑定局部 Store Actions)
    const allHandlers: GraphEventHandlers = {
      ...eventHandlers,
      onNodeRightClick: (node, e) => {
        if (!node?.id) return;
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          target: { type: "node", id: node.id },
          visible: true,
        });
        eventHandlers.onNodeRightClick?.(node, e);
      },
      onEdgeRightClick: (edge, e) => {
        if (!edge?.id) return;
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          target: { type: "edge", id: edge.id },
          visible: true,
        });
        eventHandlers.onEdgeRightClick?.(edge, e);
      },
      onCanvasRightClick: (e) => {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          target: { type: "canvas" },
          visible: true,
        });
        eventHandlers.onCanvasRightClick?.(e);
      },
      onCanvasClick: (e) => {
        closeContextMenu();
        eventHandlers.onCanvasClick?.(e);
      },
      onSelectionChange: (selectedNodes, selectedEdges) => {
        setSelectedNodeIds(
          new Set(
            selectedNodes.filter((n) => n?.id).map((n) => n.id as string),
          ),
        );
        setSelectedEdgeIds(
          new Set(
            selectedEdges.filter((e) => e?.id).map((e) => e.id as string),
          ),
        );
        eventHandlers.onSelectionChange?.(selectedNodes, selectedEdges);
      },
    };

    cleanupHandlersRef.current = registerEventHandlers(graph, allHandlers);

    // 窗口 resize
    const handleResize = () => {
      if (containerRef.current) {
        graph.setSize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight,
        );
      }
    };
    window.addEventListener("resize", handleResize);

    // 初始全量同步
    performFullSync(graph);

    onLoad?.(graph);

    return () => {
      window.removeEventListener("resize", handleResize);
      cleanupHandlersRef.current?.();
      graph.destroy();
      graphRef.current = null;
    };
  }, []);

  // 2. 订阅全局 Store 的增量更新
  useEffect(() => {
    const unsubscribe = useGraphStore.subscribe((state) => {
      if (!graphRef.current || state.latestMutations.length === 0) return;
      processMutations(graphRef.current, state.latestMutations);
      useGraphStore.getState().clearMutations();
    });
    return unsubscribe;
  }, []);

  // 3. View 变化触发全量重绘
  useEffect(() => {
    if (!graphRef.current) return;
    performFullSync(graphRef.current);
  }, [view, viewId]);

  // 4. Theme 变化更新样式
  useEffect(() => {
    if (!graphRef.current) return;

    // 更新主题配置
    const nodeConfig = getNodeConfig(theme);
    const edgeConfig = getEdgeConfig(theme);

    graphRef.current.setOptions({
      background: getThemeConfig(theme).background,
      node: nodeConfig,
      edge: edgeConfig,
    });
    graphRef.current.render();
  }, [theme]);

  // ----------------------------------------------------------------------
  // 事件处理
  // ----------------------------------------------------------------------
  const handleEdit = (target: { type: "node" | "edge"; id: string }) => {
    eventHandlers.onNodeClick?.(
      { id: target.id, data: { originalId: target.id } } as any,
      {} as any,
    );
    closeContextMenu();
  };

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
          onEdit={handleEdit}
          onDelete={closeContextMenu}
          onAddChild={closeContextMenu}
          onConnect={closeContextMenu}
          onDuplicate={closeContextMenu}
        />
      )}
    </div>
  );
}
