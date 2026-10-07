"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useUIStore } from "@workspace/store";
import {
  DynamicIsland,
  type IslandNavItem,
} from "@workspace/ui/components/dynamic-island/dynamic-island";

import { ISLAND_ROUTES } from "@/components/island-routes";

/**
 * `<DynamicIslandHost />` — the only place that knows both the app and the
 * island.
 *
 * The island is a controlled shell: it reads no store, no route and no global
 * keyboard, and it renders whatever `nav` and `content` it is handed. This file
 * is the adapter that supplies them, and it does exactly three things.
 *
 * 1. **Route ↔ nav.** `usePathname()` decides `active`; `router.push()` is
 *    `onSelect`; `enabled` comes from `ISLAND_ROUTES`, so an unimplemented route
 *    is never routed to.
 * 2. **Store binding.** `islandPanel` and `setIslandPanel` are two **minimal
 *    selectors**, never the whole store, so a change to any unrelated slice
 *    cannot re-render the island.
 * 3. **The height variable.** A `ResizeObserver` on the capsule writes
 *    `--dynamic-island-height`, so a host that has to lay out around the island
 *    (the dashboard grid, the editor) can read the live value instead of
 *    guessing. It watches the capsule through the ref the island hands back —
 *    not through a `document.querySelector`, which would find any island, in any
 *    document, and would have to re-attach on every panel change.
 *
 * What is deliberately **not** here: the global ⌘K / ⌘⇧K shortcuts. They belong
 * to whoever owns the current panel, the open overlays and the focused node, and
 * registering them twice is how a shortcut fires twice. Until they move here the
 * island handles only its own local `Escape`.
 */
export function DynamicIslandHost() {
  const pathname = usePathname();
  const router = useRouter();
  const islandPanel = useUIStore((s) => s.islandPanel);
  const setIslandPanel = useUIStore((s) => s.setIslandPanel);

  const capsule = useRef<HTMLDivElement | null>(null);

  /**
   * The navigation row, in capsule order: the page items, then search.
   *
   * `active` is a strict `===` against the route's own `href`: `/graph` and
   * `/dashboard` are siblings, so a `startsWith` would light both up for a
   * hypothetical nested path and blur which one is current.
   *
   * The search item is not a route — it opens a panel — which is why it is built
   * inline instead of coming from `ISLAND_ROUTES`. It carries `separator`, so the
   * hairline that splits navigation from search is a host decision rather than
   * something the island infers from a `key`.
   *
   * It **toggles**: once the island is open the same icon closes it. On a tablet
   * that is the discoverable half of "close" (the other half is 点击岛外, which
   * the island owns); without it an expanded island could only be closed with a
   * keyboard `Esc`, which the tablet does not have.
   */
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
        label: "搜索",
        icon: <Search className="size-4" />,
        active: islandPanel === "search",
        enabled: true,
        separator: true,
        onSelect: () =>
          setIslandPanel(islandPanel === "search" ? "idle" : "search"),
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
    />
  );
}
