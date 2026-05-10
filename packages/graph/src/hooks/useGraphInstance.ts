import React, { useRef, useEffect } from "react";
import { Graph as G6Graph } from "@antv/g6";
import {
  createLayoutOptions,
  createThemeOptions,
  createBehaviorOptions,
  createPluginOptions,
  createNodeOptions,
  createEdgeOptions,
} from "../options";
import { registerExtensions } from "../extensions";

interface UseGraphInstanceProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  theme: "light" | "dark";
  handleNodeSelect: (nodeIds: string[]) => void;
  handleEdgeSelect: (edgeIds: string[]) => void;
  fixPreviewOnFocus: (nodeId: string) => void;
}

export function useGraphInstance({
  containerRef,
  theme,
  handleNodeSelect,
  handleEdgeSelect,
  fixPreviewOnFocus,
}: UseGraphInstanceProps) {
  const graphRef = useRef<G6Graph | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const nodeConfig = createNodeOptions();
    const edgeConfig = createEdgeOptions();
    registerExtensions();
    const graph = new G6Graph({
      container: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      data: { nodes: [], edges: [] },
    });

    graphRef.current = graph;

    graph.setOptions({
      layout: createLayoutOptions(),
      behaviors: createBehaviorOptions({
        onNodeSelect: handleNodeSelect,
        onEdgeSelect: handleEdgeSelect,
        onPreviewShow: fixPreviewOnFocus,
        graph,
      }),
      plugins: createPluginOptions(),
      node: nodeConfig,
      edge: edgeConfig,
      background: createThemeOptions({ theme: theme }).background,
    });

    return () => {
      graph.destroy();
      graphRef.current = null;
    };
  }, [
    containerRef,
    theme,
    handleNodeSelect,
    handleEdgeSelect,
    fixPreviewOnFocus,
  ]);

  return graphRef;
}
