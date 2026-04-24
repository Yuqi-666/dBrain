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

const DEBUG_PREFIX = "[GraphInstance]";

function debugLog(component: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : "";
  console.log(`${DEBUG_PREFIX}[${timestamp}][${component}] ${message}${dataStr}`);
}

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
    debugLog("useEffect", "Effect started", { hasContainer: !!containerRef.current });
    if (!containerRef.current) {
      debugLog("useEffect", "No container - skipping graph creation");
      return;
    }

    debugLog("useEffect", "Creating G6Graph instance");
    const nodeConfig = createNodeOptions();
    const edgeConfig = createEdgeOptions();
    registerExtensions();
    const graph = new G6Graph({
      container: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      data: { nodes: [], edges: [] },
    });

    debugLog("useEffect", "G6Graph created", { width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    graphRef.current = graph;

    debugLog("useEffect", "Setting graph options");
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

    debugLog("useEffect", "Graph initialization complete");
    return () => {
      debugLog("useEffect", "Cleanup - destroying graph");
      graph.destroy();
      graphRef.current = null;
      debugLog("useEffect", "Graph destroyed");
    };
  }, [containerRef, theme, handleNodeSelect, handleEdgeSelect, fixPreviewOnFocus]);

  return graphRef;
}
