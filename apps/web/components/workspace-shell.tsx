"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Dashboard } from "@workspace/ui/components/dashboard/dashboard";
import { Graph } from "@workspace/graph";
import { useUIStore } from "@workspace/store";
import { GraphHeader } from "@workspace/ui/components/header/graph-header/graph-header";
import { MainLayout } from "@workspace/ui/components/layout/main-layout";
import { MainSidebar } from "@workspace/ui/components/sidebar/main-sidebar";
import { NodeEditor } from "@workspace/ui/components/editor";
import {
  NodeSemanticDialog,
  EdgeSemanticDialog,
} from "@workspace/ui/components/dialog/semantic-dialog";
import { CreateWorkspaceDialog } from "@workspace/ui/components/dialog/workspace-dialog";
import { ViewDialog } from "@workspace/ui/components/dialog/view-dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { cn } from "@workspace/ui/lib/utils";
import { useWorkspaceInitialization } from "@/hooks/use-workspace-initialization";
import { matchIslandRoute } from "@/components/island-routes";

/**
 * The workspace shell — **one instance for the whole session**, mounted by
 * `app/(main)/layout.tsx` rather than by a page.
 *
 * Why it lives in the layout: `/graph` and `/dashboard` share the `(main)`
 * layout, which Next keeps mounted across a soft navigation, while a *page*
 * component is unmounted the moment its route stops matching. A shell owned by
 * a page therefore re-ran the whole load path (workspace sync → open → per-model
 * syncByWorkspace → demo seed) on every switch between the two, which is what
 * made the switch feel like a reload. In the layout it is initialized exactly
 * once, and a switch is a visibility toggle on an already-live surface.
 *
 * The cost of that is borne in one place: once a surface has been visited it
 * stays mounted (the graph keeps its worker, the dashboard keeps its widgets), so
 * neither has to be rebuilt — the dashboard is mounted on first visit, never
 * before, because a database widget pulls a whole VTable stack in with it.
 *
 * Route ↔ surface: the app's route table (`ISLAND_ROUTES`) is the single source
 * of truth; the shell derives the surface from the pathname so a deep link, a
 * refresh and the browser's back button all land on the right one. The island
 * also writes the surface optimistically on click, so the pane swaps in the same
 * frame instead of waiting for the route to commit.
 */
export function WorkspaceShell(): ReactNode {
  const pathname = usePathname();
  const { isInitialized, error, retry } = useWorkspaceInitialization();

  const routeView = matchIslandRoute(pathname)?.view ?? "graph";

  const mainViewType = useUIStore((state) => state.mainViewType);
  const editorReturnViewType = useUIStore(
    (state) => state.editorReturnViewType,
  );
  const currentViewId = useUIStore((state) => state.currentViewId) ?? undefined;

  // A fullscreen node editor (`mainViewType === "editor"`) is an overlay on the
  // surface it was opened from, so the pane behind it must stay that surface.
  const activeView =
    mainViewType === "editor" ? editorReturnViewType : mainViewType;

  // The pathname is the truth for a link/refresh/back; the store is the truth
  // for a click. Keeping them in step here means every entry point agrees, and
  // the island's optimistic write makes this a no-op in the common case.
  useEffect(() => {
    if (useUIStore.getState().mainViewType !== routeView) {
      useUIStore.getState().setMainViewType(routeView);
    }
  }, [routeView]);

  // The dashboard has no sidebar. A *transient* (temp) sidebar must not stay
  // open behind it; a `fixed` one is the user's own preference and is restored
  // with the graph, so it is deliberately left alone.
  useEffect(() => {
    if (
      activeView === "dashboard" &&
      useUIStore.getState().sidebarMode === "temp"
    ) {
      useUIStore.getState().closeSidebar();
    }
  }, [activeView]);

  // Mount the dashboard on its first visit, then keep it — a database widget
  // drags a whole VTable stack in with it, so it must not be paid for on the
  // graph's behalf at startup. The condition also accepts the visiting frame
  // itself, so the first switch mounts the pane already visible instead of
  // showing an empty one for a commit.
  const [dashboardVisited, setDashboardVisited] = useState(false);
  useEffect(() => {
    if (activeView === "dashboard") setDashboardVisited(true);
  }, [activeView]);

  return (
    <MainLayout sidebar={activeView === "dashboard" ? null : <MainSidebar />}>
      <div className="absolute inset-0 z-0">
        {error ? (
          <div
            className="flex h-screen flex-col items-center justify-center gap-4"
            role="alert"
          >
            <p>{error}</p>
            <Button onClick={retry}>重试</Button>
          </div>
        ) : !isInitialized ? (
          <div className="flex h-screen items-center justify-center text-muted-foreground">
            加载工作空间…
          </div>
        ) : (
          <>
            <WorkspaceSurface active={activeView === "graph"}>
              <GraphHeader />
              <Graph viewId={currentViewId} className="w-full h-full" />
            </WorkspaceSurface>

            {(dashboardVisited || activeView === "dashboard") && (
              <WorkspaceSurface active={activeView === "dashboard"}>
                <Dashboard />
              </WorkspaceSurface>
            )}

            {/* The editor and the dialogs are siblings of the surfaces, not
                children of one: an inactive surface is `invisible` + `inert`,
                and a dialog opened from the graph must survive a switch. */}
            <NodeEditor />
            <NodeSemanticDialog />
            <EdgeSemanticDialog />
            <CreateWorkspaceDialog />
            <ViewDialog />
          </>
        )}
      </div>
    </MainLayout>
  );
}

/**
 * One switchable workspace surface. An inactive one is hidden with
 * `visibility: hidden` **rather than `display: none`**: it keeps its box, so a
 * surface that measures itself (the graph's canvas/worker and the dashboard's
 * grid both do) never sees a 0×0 container and never has to re-measure on the
 * way back. `inert` takes the hidden surface out of the tab order and out of
 * pointer reach, which `visibility: hidden` alone does not do for focus.
 */
function WorkspaceSurface({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}): ReactNode {
  return (
    <div
      className={cn("absolute inset-0", !active && "invisible")}
      inert={!active}
    >
      {children}
    </div>
  );
}
