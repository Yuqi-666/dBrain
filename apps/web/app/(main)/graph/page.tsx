"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Graph } from "@workspace/graph";
import { useUIStore, useDataStore, useWorkspaceStore } from "@workspace/store";
import { WorkspaceService } from "@workspace/services";
import { seedDemoIntoCurrentWorkspace } from "./demo-seed";
import type { ViewId } from "@workspace/interfaces";
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

  // Workspace-first load — after login, sync the user's workspaces, open the
  // first one (loads its scoped data), then activate the first view.
  useEffect(() => {
    const initGraph = async () => {
      await WorkspaceService.sync();

      const wsStore = useWorkspaceStore.getState();
      const firstWorkspace = Array.from(wsStore.workspaces.values())[0];

      if (!firstWorkspace) {
        useDataStore.getState().clearDiff();
        setIsInitialized(true);
        return;
      }

      const firstWorkspaceId = firstWorkspace.id;
      await WorkspaceService.open(firstWorkspaceId);

      // In dev, seed demo data into the freshly-provisioned empty workspace.
      if (process.env.NODE_ENV !== "production") {
        await seedDemoIntoCurrentWorkspace();
      }

      const views = useDataStore.getState().views;
      const firstViewId = views.keys().next().value as ViewId | undefined;
      if (firstViewId) {
        ui_store.setCurrentViewId(firstViewId);
      }

      useDataStore.getState().clearDiff();
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
