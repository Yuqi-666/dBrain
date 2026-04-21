"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { CommonEvent, Graph as G6Graph } from "@antv/g6";
import { useGraphStore } from "@workspace/store";
import type { View, ViewId } from "@workspace/interfaces";
import { GraphContextMenu } from "@workspace/ui/components/graph-context-menu";
import { PreviewBlock } from "@workspace/ui/components/preview-block";
import { transformToG6Data } from "./transform";
import {
  getLayoutConfig,
  getThemeConfig,
  getBehaviorsConfig,
  getPluginsConfig,
  getNodeConfig,
  getEdgeConfig,
} from "./options";
import type { Mutation } from "./types";
import { NodeEvent, EdgeEvent, CanvasEvent } from "@antv/g6";

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
// 2. 定义局部状态类型 (保留原接口用于类型提示)
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
  previewBlock: {
    nodeId: string | null;
    visible: boolean;
  };
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
  className,
  style,
  onLoad,
}: GraphProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<G6Graph | null>(null);
  const resolvedViewRef = useRef<View | undefined>(undefined);

  // ----------------------------------------------------------------------
  // 替换 Zustand：使用 useState 管理局部 UI 状态
  // ----------------------------------------------------------------------
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());

  const handleNodeSelect = useCallback((nodeIds: string[]) => {
    setSelectedNodeIds(new Set(nodeIds));
  }, []);

  const handleEdgeSelect = useCallback((edgeIds: string[]) => {
    setSelectedEdgeIds(new Set(edgeIds));
  }, []);

  const [contextMenu, setContextMenuState] = useState<LocalGraphUIState["contextMenu"]>({
    x: 0,
    y: 0,
    target: null,
    visible: false,
  });
  const [previewBlock, setPreviewBlockState] = useState<LocalGraphUIState["previewBlock"]>({
    nodeId: null,
    visible: false,
  });

  // 状态操作方法 (使用 useCallback 优化性能，避免不必要的重渲染)
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
    setPreviewBlockState(prev => ({ ...prev, visible: false }));
  }, []);

  const nodes = useGraphStore((state) => state.nodes);

  const isMountedRef = useRef(false);
  const isDragging = useRef(false);
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
    graph.setLayout(getLayoutConfig(currentView?.layout));
    if (currentView?.layout === "D3force") {
      graph.updateBehavior({
        key: 'drag-element-force',
        enable: true,
      })
      graph.updateBehavior({
        key: 'drag-element',
        enable: false,
      })
    } else {
      graph.updateBehavior({
        key: 'drag-element-force',
        enable: false,
      })
      graph.updateBehavior({
        key: 'drag-element',
        enable: true,
      })
    }

    if (isMountedRef.current) {
      // graph.draw().then(() => {
      //   graph.layout().then(() => graph.fitCenter());
      // });
      graph.render().then(() => graph.fitCenter())
    }
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
            currentView?.layout,
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
              currentView?.layout,
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
            currentView?.layout,
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
              currentView?.layout,
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
          break;
        case "updateView": {
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

  // 1. 初始化 G6 实例
  useEffect(() => {
    if (!containerRef.current) return;
    // 获取节点和边配置
    const nodeConfig = getNodeConfig(resolvedViewRef.current?.layout);
    const edgeConfig = getEdgeConfig();

    const graph = new G6Graph({
      container: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      data: { nodes: [], edges: [] },
    });

    graphRef.current = graph;

    graph.setOptions(
      {
        layout: getLayoutConfig(),
        behaviors: getBehaviorsConfig({
          onNodeSelect: handleNodeSelect,
          onEdgeSelect: handleEdgeSelect,
          graph
        }),
        plugins: getPluginsConfig(),
        node: nodeConfig,
        edge: edgeConfig,
        background: getThemeConfig(theme).background,
      }
    )
    graph.on(NodeEvent.CONTEXT_MENU, (e: any) => {
      e.preventDefault();
      let id: string = e.target.id;
      let { x: clientX, y: clientY } = e.client;
      if (!id) return;
      closePreviewBlock();
      setContextMenu({
        x: clientX,
        y: clientY,
        target: { type: "node", id: id },
        visible: true,
      });
    });
    graph.on(EdgeEvent.CONTEXT_MENU, (e: any) => {
      e.preventDefault();
      if (!e.target.id) return;
      setContextMenu({
        x: e.client.x,
        y: e.client.y,
        target: { type: "edge", id: e.target.id },
        visible: true,
      });
    });
    graph.on(CanvasEvent.CONTEXT_MENU, (e: any) => {
      e.preventDefault();
      setContextMenu({
        x: e.client.x,
        y: e.client.y,
        target: { type: "canvas" },
        visible: true,
      });
    });
    graph.on(CanvasEvent.CLICK, (e: any) => {
      closeContextMenu();
    });

    graph.on(CommonEvent.KEY_DOWN, (e: any) => {
      if (e.key == "Control") {
        graph.updateBehavior({
          key: 'drag-canvas-1',
          enable: false,
        })
        graph.updateBehavior({
          key: 'scroll-canvas-1',
          enable: false,
        })
      }
    })
    graph.on(CommonEvent.KEY_UP, (e: any) => {
      if (e.key == "Control") {
        graph.updateBehavior({
          key: 'drag-canvas-1',
          enable: (event: any) => {
            if ('targetType' in event) return event.targetType === 'canvas';
            return true;
          },
        })
        graph.updateBehavior({
          key: 'scroll-canvas-1',
          enable: true,
        })
      }
    })

    let hoverTimer: ReturnType<typeof setTimeout> | null = null;

    graph.on(NodeEvent.POINTER_ENTER, (e: any) => {
      const HOVER_DELAY = 150;  // 进入延迟
      const nodeId = e.target?.id;
      if (!nodeId || isDragging.current) return;
      // 清除旧的显示定时器
      if (hoverTimer) clearTimeout(hoverTimer);

      hoverTimer = setTimeout(() => {
        setPreviewBlock({
          nodeId,
          visible: true,
        });
      }, HOVER_DELAY);
    });

    graph.on(NodeEvent.POINTER_LEAVE, () => {
      // 进入关闭流程：先清除显示定时器
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
      closePreviewBlock()
    });

    graph.on(CanvasEvent.POINTER_ENTER, () => {
      closePreviewBlock();
    });

    graph.on(NodeEvent.DRAG, () => {
      if (isDragging.current) return;
      isDragging.current = true;
      closePreviewBlock();
    })
    graph.on(NodeEvent.DRAG_END, () => {
      isDragging.current = false;
    })
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (containerRef.current && graphRef.current) {
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          graph.setSize(width, height);
        }
      }, 20);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      graph.destroy();
      graphRef.current = null;
    };
  }, [closeContextMenu, closePreviewBlock, setContextMenu, setPreviewBlock, theme]);

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
    if (!isMountedRef.current) {
      graphRef.current.render().then(() => {
        isMountedRef.current = true;
        performFullSync(graphRef.current!);
      });
    } else {
      performFullSync(graphRef.current);
    }
  }, [view, viewId]);

  // 4. Theme 变化更新样式
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.setOptions({
      background: getThemeConfig(theme).background,
    });
    graphRef.current?.render();
  }, [theme]);

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
        />
      )}
    </div>
  );
}
