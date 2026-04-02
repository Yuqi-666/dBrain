import React, { useRef, useEffect, useState, useMemo } from "react";
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
  DEFAULT_NODE_STYLE,
  DEFAULT_EDGE_STYLE,
  SELECTED_NODE_STYLE,
  SELECTED_EDGE_STYLE,
  HOVER_NODE_STYLE,
  HOVER_EDGE_STYLE,
} from "./options";
import { registerEventHandlers } from "./on";
import type { GraphEventHandlers } from "./on";
import type { Mutation } from "./types";
import type { Graph as G6GraphType } from "@antv/g6";

export interface GraphProps extends GraphEventHandlers {
  viewId?: ViewId;
  view?: View;
  syncMode?: "full" | "incremental";
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

export function Graph({
  viewId,
  view,
  syncMode = "incremental",
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
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const cleanupHandlersRef = useRef<(() => void) | null>(null);

  // Internal state
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(
    new Set(),
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: { type: "node" | "edge" | "canvas"; id?: string } | null;
    visible: boolean;
  }>({ x: 0, y: 0, target: null, visible: false });

  // Get data from store
  const nodes = useGraphStore(
    (s: ReturnType<typeof useGraphStore.getState>) => s.nodes,
  );
  const edges = useGraphStore(
    (s: ReturnType<typeof useGraphStore.getState>) => s.edges,
  );
  const views = useGraphStore(
    (s: ReturnType<typeof useGraphStore.getState>) => s.views,
  );
  const nodeSemantics = useGraphStore(
    (s: ReturnType<typeof useGraphStore.getState>) => s.nodeSemantics,
  );
  const edgeSemantics = useGraphStore(
    (s: ReturnType<typeof useGraphStore.getState>) => s.edgeSemantics,
  );
  const latestMutations = useGraphStore(
    (s: ReturnType<typeof useGraphStore.getState>) => s.latestMutations,
  );
  const clearMutations = useGraphStore(
    (s: ReturnType<typeof useGraphStore.getState>) => s.clearMutations,
  );

  // Resolve view
  const resolvedView = useMemo(() => {
    if (view) return view;
    if (viewId) return views.get(viewId);
    return undefined;
  }, [view, viewId, views]);

  // Transform data to G6 format
  const g6Data = useMemo((): GraphData => {
    return transformToG6Data(
      nodes,
      edges,
      nodeSemantics,
      edgeSemantics,
      resolvedView,
    );
  }, [nodes, edges, nodeSemantics, edgeSemantics, resolvedView]);

  // Process mutations for incremental sync
  const processMutations = (graph: any, mutations: Mutation[]) => {
    mutations.forEach((mutation) => {
      switch (mutation.type) {
        case "addNode": {
          const node = mutation.payload;
          const adapted = transformToG6Data(
            new Map([[node.id, node]]),
            new Map(),
            nodeSemantics,
            edgeSemantics,
            resolvedView,
          );
          const nodes = adapted.nodes ?? [];
          if (nodes.length > 0) {
            graph.addItem("node", nodes[0]);
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
              nodeSemantics,
              edgeSemantics,
              resolvedView,
            );
            const nds = adapted.nodes ?? [];
            if (nds.length > 0) {
              graph.updateItem(id, nds[0]);
            }
          }
          break;
        }
        case "deleteNode": {
          const { id } = mutation.payload;
          graph.removeItem(id);
          break;
        }
        case "addEdge": {
          const edge = mutation.payload;
          const adapted = transformToG6Data(
            new Map(),
            new Map([[edge.id, edge]]),
            nodeSemantics,
            edgeSemantics,
            resolvedView,
          );
          const edgs = adapted.edges ?? [];
          if (edgs.length > 0) {
            graph.addItem("edge", edgs[0]);
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
              nodeSemantics,
              edgeSemantics,
              resolvedView,
            );
            const edgs = adapted.edges ?? [];
            if (edgs.length > 0) {
              graph.updateItem(id, edgs[0]);
            }
          }
          break;
        }
        case "deleteEdge": {
          const { id } = mutation.payload;
          graph.removeItem(id);
          break;
        }
        // Handle view changes by re-rendering entire graph
        case "addView":
        case "updateView":
        case "deleteView":
          graph.changeData(g6Data);
          break;
      }
    });
  };

  // Initialize G6 graph
  useEffect(() => {
    if (!containerRef.current) return;

    const graph = new G6Graph({
      container: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      data: g6Data,
      layout: getLayoutConfig(resolvedView?.layout),
      behaviors: getBehaviorsConfig(
        enableNodeDragging,
        enableEdgeInteractions,
      ) as never[],
      plugins: getPluginsConfig(
        enableMinimap,
        enableGrid,
        enableFisheye,
      ) as never[],
      node: {
        style: {
          ...DEFAULT_NODE_STYLE,
          labelText: "",
        },
      },
      edge: {
        style: DEFAULT_EDGE_STYLE,
      },
      theme: {
        style: {
          background: getThemeConfig(theme).background,
        },
      },
    } as any);

    graph.render();
    graphRef.current = graph;

    // Register event handlers
    const allHandlers: GraphEventHandlers = {
      ...eventHandlers,
      onNodeRightClick: (node, e) => {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          target: { type: "node", id: node.data.originalId },
          visible: true,
        });
        eventHandlers.onNodeRightClick?.(node, e);
      },
      onEdgeRightClick: (edge, e) => {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          target: { type: "edge", id: edge.data.originalId },
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
        setContextMenu((prev) => ({ ...prev, visible: false }));
        eventHandlers.onCanvasClick?.(e);
      },
      onSelectionChange: (selectedNodes, selectedEdges) => {
        setSelectedNodeIds(
          new Set(selectedNodes.map((n) => n.data.originalId)),
        );
        setSelectedEdgeIds(
          new Set(selectedEdges.map((e) => e.data.originalId)),
        );
        eventHandlers.onSelectionChange?.(selectedNodes, selectedEdges);
      },
    };

    cleanupHandlersRef.current = registerEventHandlers(graph, allHandlers);

    // Handle window resize
    const handleResize = () => {
      if (containerRef.current) {
        graph.setSize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight,
        );
      }
    };
    window.addEventListener("resize", handleResize);

    onLoad?.(graph);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (cleanupHandlersRef.current) {
        cleanupHandlersRef.current();
      }
      graph.destroy();
      graphRef.current = null;
    };
  }, []);

  // Handle theme and view changes
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.updateCfg({
      background: getThemeConfig(theme).background,
      defaultNode: {
        style: DEFAULT_NODE_STYLE,
        labelCfg: {
          style: {
            fill: getThemeConfig(theme).labelColor,
          },
        },
      },
      defaultEdge: {
        style: DEFAULT_EDGE_STYLE,
        labelCfg: {
          style: {
            fill: getThemeConfig(theme).labelColor,
          },
        },
      },
    });
    graphRef.current.changeData(g6Data);
    graphRef.current.setLayout(getLayoutConfig(resolvedView?.layout));
    graphRef.current.render();
  }, [theme, resolvedView, g6Data]);

  // Incremental sync
  useEffect(() => {
    if (
      !graphRef.current ||
      syncMode !== "incremental" ||
      latestMutations.length === 0
    )
      return;
    processMutations(graphRef.current, latestMutations);
    clearMutations();
  }, [latestMutations, syncMode]);

  // Context menu handlers
  const handleContextMenuClose = () => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleEdit = (target: { type: "node" | "edge"; id: string }) => {
    eventHandlers.onNodeClick?.(
      { id: target.id, data: { originalId: target.id } } as any,
      {} as any,
    );
    handleContextMenuClose();
  };

  const handleDelete = (_target: { type: "node" | "edge"; id: string }) => {
    // This will be handled by parent component via CQRS
    handleContextMenuClose();
  };

  const handleAddChild = (_nodeId: string) => {
    // Handle add child logic
    handleContextMenuClose();
  };

  const handleConnect = (_nodeId: string) => {
    // Handle connect logic
    handleContextMenuClose();
  };

  const handleDuplicate = (_target: { type: "node" | "edge"; id: string }) => {
    // Handle duplicate logic
    handleContextMenuClose();
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
          onClose={handleContextMenuClose}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddChild={handleAddChild}
          onConnect={handleConnect}
          onDuplicate={handleDuplicate}
        />
      )}
    </div>
  );
}
