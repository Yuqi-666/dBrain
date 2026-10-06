"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

import { useIslandEnvironment } from "../island-config";
import { IslandNav } from "../island-nav";
import type { IslandNavItem } from "../dynamic-island";

/**
 * The navigation in its **expanded** form: the same row as
 * `island-nav.tsx`, with each item's `label` shown next to its icon
 * (design §7.1 "展开态（可选，宽屏）：… 横向展开标签"; plan
 * `docs/plan/dynamic-island.md` §M4.1 第 5 行).
 *
 * Two gates, and they are not the same gate:
 *
 * 1. **Pointer, not width, decides the labels here.** `(hover: none)` /
 *    `(pointer: coarse)` is the row of the degrade matrix that switches
 *    `nav-hover` off entirely (§3.4 第 4 行) — on the target tablet the labels
 *    never appear at all. This component is not aware of *when* the row is
 *    expanded (hover, pinned panel, …); the shell decides that.
 * 2. **Width decides whether a shown label is visible.** Each `label` carries
 *    `hidden md:inline`, so `max-width: 640px` silently keeps icons only
 *    (§3.4 第 5 行) without a second media-query listener.
 *
 * It deliberately introduces no icon table of its own: it renders
 * `island-nav.tsx`'s buttons, so an icon, an `aria-current`, a disabled
 * tooltip or a hit-area rule can never drift between the two forms.
 */
export interface IslandNavPanelProps {
  nav: IslandNavItem[];
  className?: string;
}

export function IslandNavPanel({
  nav,
  className,
}: IslandNavPanelProps): React.ReactNode {
  const { coarsePointer } = useIslandEnvironment();

  return (
    <IslandNav
      nav={nav}
      showLabels={!coarsePointer}
      className={cn(
        "w-full justify-start rounded-none border-b border-border/60 px-2 py-1.5",
        className,
      )}
    />
  );
}
