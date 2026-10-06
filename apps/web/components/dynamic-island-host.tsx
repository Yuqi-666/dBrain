"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useUIStore } from "@workspace/store";
import {
  DynamicIsland,
  type IslandNavItem,
} from "@workspace/ui/components/dynamic-island/dynamic-island";

import { ISLAND_ROUTES } from "@/components/island-routes";

/**
 * `<DynamicIslandHost />` — the only place that knows both the router/store and
 * the island (design `docs/dynamic-island/README.md` §5.3).
 *
 * The island itself is a **controlled shell**: it reads no store and no route,
 * and it registers no global keyboard (design §5.2's three boundaries). This
 * file is the adapter that gives it everything it cannot know. Design §5.3 lists
 * five host responsibilities; P0 realizes 1, 2a and 5 and deliberately defers
 * the rest:
 *
 * 1. **Route ↔ nav.** `usePathname()` decides `nav[].active`; `useRouter().push()`
 *    is `onSelect`; the disabled flag comes from `ISLAND_ROUTES` so an
 *    unimplemented route is never routed to (design §0.3-5).
 * 2. **Store binding.** The panel is `useUIStore((s) => s.islandPanel)` and the
 *    setter is `useUIStore((s) => s.setIslandPanel)` — two **minimal selectors**,
 *    never the whole store, so a change to any unrelated slice cannot re-render
 *    the island.
 *    - 2b — mapping `previewBlock` → `preview` — is **P1, not P0**: that mapping
 *      ships in M8 together with deleting `ForceGraph`'s `<PreviewBlock>`
 *      overlay, otherwise a hover would open the island placeholder *and* leave
 *      the old pointer-following overlay on screen (plan §M4.2-12).
 * 3. **Keyboard.** Deferred to M9: P0 registers **nothing** — not even `Escape`
 *    on `window` — because `quick-panel.tsx` still owns `⌘K`, and two listeners
 *    would double-fire (and fight over `Tab`). The island keeps its own local
 *    `Escape` (plan §M4.2-10, design §0.3-1 / §6.3). There must be no
 *    `addEventListener("keydown", …)` in this file.
 * 4. **Content injection.** Deferred: P0 passes **no** `previewContent` /
 *    `searchContent` / `agentContent`, so each expanded form renders the
 *    component's own correctly-sized placeholder (`data-island-placeholder`);
 *    `preview` lands in M8, `search`/`agent` in M9 (plan §M4.2-11).
 * 5. **The height variable.** `ResizeObserver` on the capsule writes
 *    `--dynamic-island-height` on `document.documentElement`, so a host that has
 *    to avoid the island (the future dashboard grid, the editor) can read the
 *    live value instead of guessing.
 *
 * **Boundary: the visuals live entirely in `packages/ui`.** This file does only
 * three things — route, store, height variable. It contributes no className, no
 * inline style and no layout to the capsule; the icons it passes carry
 * `className="size-4"` only because the glyph size is part of the host's icon
 * choice (design §7.1), while the hit area stays the island's decision.
 */
export function DynamicIslandHost() {
  const pathname = usePathname();
  const router = useRouter();
  const islandPanel = useUIStore((s) => s.islandPanel);
  const setIslandPanel = useUIStore((s) => s.setIslandPanel);

  /**
   * The navigation row, in capsule order: the two page items, then search
   * (design §7.1; plan §M4.2-15 puts the 1px separator between them, drawn by
   * the island).
   *
   * `active` is a strict `===` against the route's own `href`: `/graph` and
   * `/dashboard` are siblings, so a `startsWith` here would light both up for a
   * hypothetical nested path and blur which one is current.
   *
   * The third item is not a route — it opens the `search` panel — which is why
   * it is built inline instead of coming from `ISLAND_ROUTES`. Its `active` is
   * `islandPanel === "search"` (the store value), not a pathname comparison.
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
        onSelect: () => setIslandPanel("search"),
      },
    ],
    [pathname, islandPanel, router, setIslandPanel],
  );

  /**
   * Responsibility 5 (design §5.3-5). The capsule is rendered by *this*
   * component, so `[data-island]` is in the same document and is queryable from
   * the effect — that attribute is the DOM contract the island publishes for
   * exactly this (plan §M4.2-14).
   *
   * The element is measured with `getBoundingClientRect()` rather than
   * `contentRect`, so the capsule's full painted height (including the fake
   * 1px edge the shell draws with padding) is what a consumer avoids.
   *
   * No polling: the observer fires on every form change. If the node is not
   * there yet the effect returns without throwing, and re-running on the next
   * panel change re-queries it — that is why `islandPanel` is a dependency of
   * what would otherwise be a mount-only effect.
   */
  useEffect(() => {
    const island = document.querySelector("[data-island]");
    if (!(island instanceof HTMLElement)) return;

    const root = document.documentElement;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
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
  }, [islandPanel]);

  return (
    <DynamicIsland
      panel={islandPanel}
      onPanelChange={setIslandPanel}
      nav={nav}
    />
  );
}
