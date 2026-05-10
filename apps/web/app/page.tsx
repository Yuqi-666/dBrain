"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Graph } from "@workspace/graph";
import { useGraphStore, useUIStore } from "@workspace/store";
import {
  INITIAL_NODE_SEMANTICS,
  INITIAL_EDGE_SEMANTICS,
  INITIAL_NODES,
  INITIAL_EDGES,
  DEMO_VIEW,
} from "@workspace/dev/MOCK";
import { GraphHeader } from "@workspace/ui/components/header/graph-header/graph-header";
import { CognitiveGraphLayout } from "@workspace/ui/components/layout/cognitive-graph-layout";
import { CognitiveSidebar } from "@workspace/ui/components/sidebar/cognitive-sidebar";
import { EditorHeader } from "@workspace/ui/components/header/editor-header/editor-header";
import { NodeEditor } from "@workspace/ui/components/editor";

export default function GraphDemoPage(): ReactNode {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isInitialized, setIsInitialized] = useState(false);
  const ui_store = useUIStore();
  const mainView = useUIStore((state) => state.mainViewType);
  const graph_store = useGraphStore();
  const currentViewId = ui_store.currentViewId ?? undefined;
  useEffect(() => {
    ui_store.setCurrentViewId(DEMO_VIEW.id);
    graph_store.setViews([DEMO_VIEW]);
    graph_store.setNodeSemantics(INITIAL_NODE_SEMANTICS);
    graph_store.setEdgeSemantics(INITIAL_EDGE_SEMANTICS);
    graph_store.setNodes(INITIAL_NODES);
    graph_store.setEdges(INITIAL_EDGES);
    setIsInitialized(true);
  }, []);

  return (
    <CognitiveGraphLayout sidebar={<CognitiveSidebar />}>
      <div className="absolute inset-0 z-0">
        {/* <GraphHeader /> */}
        {mainView === "graph" ? (
          <>
            <GraphHeader />
            {isInitialized && (
              <Graph
                theme={theme}
                viewId={currentViewId}
                enableMinimap={true}
                enableGrid={true}
                enableFisheye={false}
                enableNodeDragging={true}
                enableEdgeInteractions={true}
                className="w-full h-full"
                onLoad={(graph) =>
                  console.log("[GraphDemo] Graph loaded", graph)
                }
              />
            )}
            <NodeEditor />
          </>
        ) : (
          <>
            <NodeEditor />
          </>
        )}
      </div>
    </CognitiveGraphLayout>
  );
}
