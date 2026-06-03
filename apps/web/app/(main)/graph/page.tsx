"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Graph } from "@workspace/graph";
import { useUIStore, useGraphStore } from "@workspace/store";
import { GraphCQRS } from "@workspace/api-client";
import { GraphHeader } from "@workspace/ui/components/header/graph-header/graph-header";
import { CognitiveGraphLayout } from "@workspace/ui/components/layout/cognitive-graph-layout";
import { CognitiveSidebar } from "@workspace/ui/components/sidebar/cognitive-sidebar";
import { NodeEditor, NodeSemanticDialog, EdgeSemanticDialog } from "@workspace/ui/components/editor";

export default function GraphPage(): ReactNode {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isInitialized, setIsInitialized] = useState(false);
  const ui_store = useUIStore();
  const mainView = useUIStore((state) => state.mainViewType);
  const currentViewId = ui_store.currentViewId ?? undefined;

  useEffect(() => {
    const initGraph = async () => {

      await Promise.all([
        GraphCQRS.syncView(),
        GraphCQRS.syncNodeSemantic(),
        GraphCQRS.syncEdgeSemantic(),
        GraphCQRS.syncNode(),
        GraphCQRS.syncEdge(),
        GraphCQRS.syncNodeTag(),
      ]);

      const views = useGraphStore.getState().views;
      const firstViewId = views.keys().next().value;
      if (firstViewId) {
        ui_store.setCurrentViewId(firstViewId);
      }
      useGraphStore.getState().clearMutations()
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
        <NodeSemanticDialog />
        <EdgeSemanticDialog />
      </div>
    </CognitiveGraphLayout>
  );
}
