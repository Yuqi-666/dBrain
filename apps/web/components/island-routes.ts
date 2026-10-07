import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Network } from "lucide-react";

/**
 * One page destination of the island's navigation row (design
 * `docs/dynamic-island/README.md` §5.2 / §7.1).
 *
 * The capsule is a controlled shell: it renders `nav` exactly as the host hands
 * it over, so `enabled` / `disabledReason` are decided **here**, next to the
 * routes this app actually ships, and never inside `packages/ui`.
 */
export interface IslandRoute {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
  disabledReason?: string;
}

/**
 * The island's page list — the **single source of truth** for it (design §5.1;
 * plan `docs/plan/dynamic-island.md` §M4.1 第 8 行). Three things about it are
 * load-bearing:
 *
 * 1. **It lives in the host, not in `packages/ui`.** A route table written into
 *    the shared package would hard-code `/dashboard` into a component that
 *    renders on every page, and the shared package has no way to know which
 *    pages this app ships — the first navigation would be a 404 (design
 *    §0.3-5). The host owns `/graph` vs `/dashboard`, so the host owns this
 *    table.
 * 2. **`/dashboard` is `enabled: false`.** Today it exists only as a protected
 *    path in `apps/web/middleware.ts` — there is no
 *    `apps/web/app/(main)/dashboard/page.tsx` — so the capsule renders it
 *    disabled with `disabledReason` instead of letting a click land on a 404
 *    (plan §M4.2-6).
 * 3. **`/settings` is deliberately absent.** It is the other middleware-only
 *    path. P0's capsule has exactly three slots — graph / dashboard / 搜索 — and
 *    only the first two are destinations; `搜索` is not a route at all, it opens
 *    the `search` panel (see `dynamic-island-host.tsx`).
 *
 * **Array order is the capsule's order**: the page items come first, then search.
 * The 1px separator that splits navigation from search is not inferred by the
 * island — the host marks the item it precedes with `separator` (see
 * `dynamic-island-host.tsx`).
 */
export const ISLAND_ROUTES: IslandRoute[] = [
  {
    key: "graph",
    label: "图谱",
    href: "/graph",
    icon: Network,
    enabled: true,
  },
  {
    key: "dashboard",
    label: "仪表盘",
    href: "/dashboard",
    icon: LayoutDashboard,
    enabled: false,
    disabledReason: "页面尚未实现",
  },
];
