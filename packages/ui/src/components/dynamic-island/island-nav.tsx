"use client";

import * as React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/ui/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { ISLAND_SEARCH_ITEM_KEY, useIslandEnvironment } from "./island-config";
import type { IslandNavItem } from "./dynamic-island";

/**
 * The collapsed island: one row of navigation icons (design §7.1; plan
 * `docs/plan/dynamic-island.md` §M4.1 第 3 行).
 *
 * The row is the whole of the `idle` form, which is why it must stay under
 * 40px tall and ~180px wide (design §1 成功标准 1). It owns no routing and no
 * state: `nav` arrives from the host with `active` and `enabled` already
 * decided, because `/dashboard` and `/settings` only exist in the middleware
 * today and a hard-coded route table inside `packages/ui` would render 404s
 * (§0.3-5). `active` and `enabled` are independent axes — an item may be the
 * current page and still be routed to a page that does not exist yet.
 *
 * The `import type` above is deliberate: it is erased at compile time, so the
 * module graph keeps `dynamic-island.tsx → island-nav.tsx` one-directional at
 * runtime while the frozen prop contract still has exactly one definition.
 */
export interface IslandNavProps {
  nav: IslandNavItem[];
  /**
   * Render `label` next to each icon. Used by the expanded form of the row
   * (`panels/nav-panel.tsx`, design §7.1's optional wide-screen expansion); the
   * collapsed row keeps icons only.
   */
  showLabels?: boolean;
  className?: string;
}

export interface IslandNavButtonProps {
  item: IslandNavItem;
  /** See {@link IslandNavProps.showLabels}. */
  showLabel?: boolean;
  className?: string;
}

/**
 * One navigation icon. Exported so `panels/nav-panel.tsx` can render the same
 * button set with labels instead of re-declaring icons or the disabled rules —
 * the design asks the expanded nav to reuse this row's icon set (§7.1).
 *
 * Interaction rules that are easy to get subtly wrong:
 *
 * - A disabled item is **not** a `disabled` attribute. `<button disabled>` stops
 *   firing pointer events on some engines, which would kill the tooltip that
 *   explains *why* it is disabled; `aria-disabled` + an `onClick` guard keeps it
 *   hoverable, focusable and still inert. An item disabled *without* a reason
 *   gets no tooltip at all (`disabledReason` is optional in the contract).
 * - `onSelect` is never called for a disabled item, so the host cannot navigate
 *   to a page that does not exist (design §7.1).
 */
export function IslandNavButton({
  item,
  showLabel = false,
  className,
}: IslandNavButtonProps): React.ReactNode {
  const { coarsePointer } = useIslandEnvironment();
  const disabled = !item.enabled;

  // Touch has no hover, so the only way to reach a 36px icon reliably is to
  // grow it: 44×44 under `(hover: none)` / `(pointer: coarse)` (§2.4 触摸端补充,
  // §3.4 第 4 行). The labelled form keeps the same height and grows in width.
  const sizing = showLabel
    ? coarsePointer
      ? "h-11 min-w-11 px-2.5"
      : "h-9 min-w-9 px-2.5"
    : coarsePointer
      ? "size-11"
      : "size-9";

  const button = (
    <button
      type="button"
      aria-label={item.label}
      aria-current={item.active ? "page" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      data-island-nav-item={item.key}
      data-island-nav-disabled={disabled ? "true" : undefined}
      onClick={() => {
        if (disabled) return;
        item.onSelect();
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full text-sm transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        sizing,
        item.active
          ? "bg-accent text-foreground"
          : "text-muted-foreground",
        !disabled && !item.active && "hover:bg-accent/60 hover:text-foreground",
        disabled && "opacity-40",
        className,
      )}
    >
      {item.icon}
      {showLabel ? (
        // Wide screens only: at `max-width: 640px` the row keeps its icons
        // (§3.4 第 5 行).
        <span className="hidden md:inline">{item.label}</span>
      ) : null}
    </button>
  );

  // No reason text ⇒ nothing to explain, so no tooltip is mounted at all.
  if (!disabled || !item.disabledReason) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="top">{item.disabledReason}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The `idle` row. `<nav aria-label="主导航">` is the accessible name and the
 * `data-island-nav` hook both the browser probes and the host's outside-click
 * logic can rely on.
 *
 * **This is where the island mounts its own `TooltipProvider`, and it is not
 * optional.** A headless-Chrome probe of the real component proved that Radix's
 * tooltip context has **no default value**: without a provider, `<Tooltip>`
 * throws `` `Tooltip` must be used within `TooltipProvider` ``, the error
 * propagates out of the render, and the whole island renders nothing at all
 * (`document.querySelector('[data-island]')` came back `null`). Nothing else in
 * this repository mounts a provider — `apps/web/app/layout.tsx` is outside this
 * chapter's file whitelist, and `packages/ui/src/components/ui/sidebar.tsx:528`
 * has the same missing provider, reachable only through the collapsed-sidebar
 * tooltip path that is never exercised. So the provider is scoped here: exactly
 * one per rendered nav row, and the island renders exactly one row at a time.
 *
 * Radix's `Provider` is pure context and renders no DOM, so wrapping the
 * `<nav>` leaves every anchor (`data-island-nav`, the buttons, the divider) and
 * the idle row's layout byte-for-byte identical. `delayDuration={0}` matches
 * this repository's own `TooltipProvider` default: a nav tooltip is a
 * consequence of intent (the item is disabled), not a discovery aid.
 */
export function IslandNav({
  nav,
  showLabels = false,
  className,
}: IslandNavProps): React.ReactNode {
  // 1px divider between page navigation and search (design §7.1). The list is
  // host-injected, so the split point comes from the documented key
  // convention; when no item carries it, the divider falls back to sitting
  // before the last item — the design's own order is `页面 · 页面 · 搜索`.
  const searchIndex = nav.findIndex(
    (item) => item.key === ISLAND_SEARCH_ITEM_KEY,
  );
  const dividerIndex = searchIndex > 0 ? searchIndex : nav.length - 1;

  return (
    <TooltipProvider delayDuration={0}>
      <nav
        aria-label="主导航"
        data-island-nav
        className={cn("flex items-center gap-0.5 px-1.5", className)}
      >
        {nav.map((item, index) => (
          <React.Fragment key={item.key}>
            {index === dividerIndex && dividerIndex > 0 ? (
              <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
            ) : null}
            <IslandNavButton item={item} showLabel={showLabels} />
          </React.Fragment>
        ))}
      </nav>
    </TooltipProvider>
  );
}
