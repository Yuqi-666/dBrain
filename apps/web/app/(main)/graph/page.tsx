"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Graph } from "@workspace/graph";
import { useUIStore, useDataStore } from "@workspace/store";
import {
  NodeService,
  EdgeService,
  ViewService,
  NodeSemanticService,
  EdgeSemanticService,
  NodeTagService,
} from "@workspace/services";
import { GraphHeader } from "@workspace/ui/components/header/graph-header/graph-header";
import { CognitiveGraphLayout } from "@workspace/ui/components/layout/cognitive-graph-layout";
import { CognitiveSidebar } from "@workspace/ui/components/sidebar/cognitive-sidebar";
import { NodeEditor, NodeSemanticDialog, EdgeSemanticDialog } from "@workspace/ui/components/editor";
import { QuickPanel } from "@workspace/ui/components/quick-panel/quick-panel";

export default function GraphPage(): ReactNode {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isInitialized, setIsInitialized] = useState(false);
  const ui_store = useUIStore();
  const mainView = useUIStore((state) => state.mainViewType);
  const currentViewId = ui_store.currentViewId ?? undefined;

  // Service sync — required for graph (Graph reads from store,
  // services populate the store)
  useEffect(() => {
    const initGraph = async () => {

      await Promise.all([
        ViewService.sync(),
        NodeSemanticService.sync(),
        EdgeSemanticService.sync(),
        NodeService.sync(),
        EdgeService.sync(),
        NodeTagService.sync(),
      ]);

      const views = useDataStore.getState().views;
      const firstViewId = views.keys().next().value;
      if (firstViewId) {
        ui_store.setCurrentViewId(firstViewId);
      }
      useDataStore.getState().clearDiff()
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
                className="w-full h-full"
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
        <QuickPanel />
      </div>
    </CognitiveGraphLayout>
  );
}
