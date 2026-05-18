"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Graph } from "@workspace/graph";
import { useUIStore } from "@workspace/store";
import { GraphCQRS } from "@workspace/api-client";
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
import { NodeEditor } from "@workspace/ui/components/editor";

export default function GraphPage(): ReactNode {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isInitialized, setIsInitialized] = useState(false);
  const ui_store = useUIStore();
  const mainView = useUIStore((state) => state.mainViewType);
  const currentViewId = ui_store.currentViewId ?? undefined;

  useEffect(() => {
    const initGraph = async () => {
      ui_store.setCurrentViewId(DEMO_VIEW.id);

      await Promise.all([
        GraphCQRS.addView(DEMO_VIEW),
        ...INITIAL_NODE_SEMANTICS.map((s) => GraphCQRS.addNodeSemantic(s)),
        ...INITIAL_EDGE_SEMANTICS.map((s) => GraphCQRS.addEdgeSemantic(s)),
        ...INITIAL_NODES.map((n) => GraphCQRS.addNode(n)),
        ...INITIAL_EDGES.map((e) => GraphCQRS.addEdge(e)),
      ]);

      setIsInitialized(true);
    };

    initGraph();
  }, []);

  return (
    <CognitiveGraphLayout sidebar={<CognitiveSidebar />}>
      <div className="absolute inset-0 z-0">
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
