"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bot } from "lucide-react";
import { useDataStore, useUIStore } from "@workspace/store";
import {
  DynamicIsland,
  type IslandNavItem,
} from "@workspace/ui/components/dynamic-island/dynamic-island";

import { SearchMode } from "@workspace/ui/components/dialog/quick-panel/search-mode";
import { AgentMode } from "@workspace/ui/components/dialog/quick-panel/agent-mode";
import { IslandNodePreview } from "@workspace/ui/components/preview-block/island-node-preview";

import { ISLAND_ROUTES } from "@/components/island-routes";

/** App adapter: routes, feature panels, global shortcuts and live island height. */
export function DynamicIslandHost() {
  const pathname = usePathname();
  const router = useRouter();
  const islandPanel = useUIStore((s) => s.islandPanel);
  const setIslandPanel = useUIStore((s) => s.setIslandPanel);

  const previewNodeId = useUIStore((s) => s.islandPreviewNodeId);
  const previewType = useDataStore((s) =>
    previewNodeId ? s.nodes.get(previewNodeId)?.nodeType : undefined,
  );
  const close = () => setIslandPanel("idle");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      const state = useUIStore.getState();
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey
      ) {
        const key = event.key.toLowerCase();
        if (key !== "k" && key !== "j") return;
        event.preventDefault();
        const target = key === "k" ? "search" : "agent";
        state.closePreviewBlock();
        state.setIslandPanel(state.islandPanel === target ? "idle" : target);
      } else if (event.key === "Escape" && state.islandPanel !== "idle") {
        state.collapseIsland();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setIslandPanel("idle");
  }, [pathname, setIslandPanel]);

  const capsule = useRef<HTMLDivElement | null>(null);

  const nav = useMemo<IslandNavItem[]>(
    () => [
      ...ISLAND_ROUTES.map((route): IslandNavItem => {
        const Icon = route.icon;
        return {
          key: route.key,
          label: route.label,
          icon: <Icon className="size-4" />,
          active: pathname === route.href,
          enabled: route.enabled,
          disabledReason: route.disabledReason,
          onSelect: () => router.push(route.href),
        };
      }),
      {
        key: "search",
        label: "搜索 · Ctrl+K",
        icon: <Search className="size-4" />,
        active: islandPanel === "search",
        enabled: true,
        separator: true,
        onSelect: () =>
          setIslandPanel(islandPanel === "search" ? "idle" : "search"),
      },
      {
        key: "agent",
        label: "Agent · Ctrl+J",
        icon: <Bot className="size-4" />,
        active: islandPanel === "agent",
        enabled: true,
        onSelect: () =>
          setIslandPanel(islandPanel === "agent" ? "idle" : "agent"),
      },
    ],
    [pathname, islandPanel, router, setIslandPanel],
  );

  useEffect(() => {
    const island = capsule.current;
    if (!island) return;

    const root = document.documentElement;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      // The *painted* height, so a consumer avoids the capsule including its 1px
      // rim (an inset shadow, which costs no layout space).
      root.style.setProperty(
        "--dynamic-island-height",
        `${Math.round(entry.target.getBoundingClientRect().height)}px`,
      );
    });
    observer.observe(island);

    return () => {
      observer.disconnect();
      root.style.removeProperty("--dynamic-island-height");
    };
  }, []);

  return (
    <DynamicIsland
      ref={capsule}
      panel={islandPanel}
      onPanelChange={setIslandPanel}
      nav={nav}
      contentWidths={{
        preview: ["image", "video", "pdf", "webpage"].includes(
          previewType ?? "",
        )
          ? 400
          : 360,
      }}
      content={{
        search: (
          <>
            <PanelHeader title="搜索" />
            <SearchMode onClose={close} />
          </>
        ),
        agent: (
          <>
            <PanelHeader title="Agent" />
            <AgentMode />
          </>
        ),
        preview: previewNodeId ? (
          <IslandNodePreview nodeId={previewNodeId} onClose={close} />
        ) : null,
      }}
    />
  );
}

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between px-4 pt-3 pb-1">
      <span className="text-sm font-medium">{title}</span>
    </div>
  );
}
