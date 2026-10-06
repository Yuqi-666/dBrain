"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@workspace/ui/lib/utils";

import {
  ISLAND_ORIGIN,
  ISLAND_SHAPES,
  resolveInnerLayoutTransition,
  resolveLayoutTransition,
  resolvePanelFade,
  useIslandEnvironment,
} from "./island-config";
import { IslandNav } from "./island-nav";
import {
  ISLAND_OUTER_EDGE,
  IslandSurface,
} from "./island-surface";
import { IslandAgentPanel } from "./panels/agent-panel";
import { IslandNavPanel } from "./panels/nav-panel";

/**
 * `<DynamicIsland />` — the always-on bottom capsule (design
 * `docs/dynamic-island/README.md` §5; plan `docs/plan/dynamic-island.md` §M4.1
 * 第 4 行).
 *
 * **Three boundaries, frozen by §5.2.** They are the reason this file is a
 * plain controlled component rather than a feature:
 *
 * 1. **It reads no store and no route.** `panel` is controlled and `nav` is a
 *    prop, so the host owns `/graph` vs `/dashboard`, `previewBlock`, and the
 *    `search` > `agent` > `preview` > `idle` priority (§2.2). Writing the route
 *    table in here would hard-code `/dashboard` into a shared package while it
 *    only exists in `apps/web/middleware.ts` (§0.3-5).
 * 2. **It does no business.** Preview / search / agent are `ReactNode`s from
 *    the host. P0's host injects none of them, so each expanded form renders a
 *    built-in placeholder at the shape's own size instead of collapsing —
 *    `quick-panel` (search + agent) is still the live UI through P0–P1 by
 *    design (§6.3).
 * 3. **It registers no global keyboard listener.** `⌘K` / `⌘⇧K` need to know
 *    the current panel, `currentEditingNodeId` and the open overlays, which only
 *    the host knows. The one key this component handles is `Escape`, and it
 *    handles it **locally** on the capsule (see `handleKeyDown`).
 *
 * **Where the motion traps are paid for.** Every item below is one line in
 * design §0.3 and each of them silently degrades the morph if missed:
 *
 * - The capsule's `borderRadius` goes through `style` (a `rounded-*` class is
 *   invisible to motion's scale compensation), and there is no `border`
 *   anywhere — the 1px edge is the inner layer's `p-px` (§0.3-3②③).
 * - The fixed container is the `layoutRoot` (§0.3-4): a `position: fixed`
 *   element that changes size must be a measurement root, or page scroll offset
 *   leaks into the projection.
 * - The origin is `ISLAND_ORIGIN` (`originY: 1`), so the island grows out of
 *   the bottom of the screen instead of dropping in from above (§3.3).
 * - The content layer animates `opacity` only; it must not also move, or its
 *   transform would compose with the capsule's layout scale (§2.3).
 *
 * **P0 deliberately does not implement §2.2's optional `nav-hover`** (hovering
 * the collapsed capsule to float the labels out). The collapsed footprint is
 * the acceptance criterion of G4 第 1 条 (≤ 40px tall, ≤ 180px wide), and a row
 * that grows on hover turns that measurement into "it depends where your
 * pointer is". The labels are therefore only ever rendered by the *expanded*
 * form (`panels/nav-panel.tsx`), which is also the only place the design marks
 * as wide-screen.
 */

/**
 * The island's forms. **Frozen literal** (design §5.2) — the same union is
 * declared independently in `packages/store/src/uiStore.ts` (§6.1) and once more
 * in `./island-config` (for the shape table).
 *
 * Two structurally-equivalent declarations are deliberate: `packages/ui` may not
 * depend on `@workspace/store` (§0.2-2), so neither copy can be the single
 * source of truth. Because both are literal unions they are mutually
 * assignable, and the host forwards its store value without a cast.
 */
export type IslandPanel = "idle" | "preview" | "search" | "agent";

/** One entry of the navigation row. See {@link DynamicIslandProps.nav}. */
export interface IslandNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  enabled: boolean;
  onSelect: () => void;
  disabledReason?: string;
}

export interface DynamicIslandProps {
  /** 受控：宿主持有状态（store），组件不做业务判断 */
  panel: IslandPanel;
  onPanelChange: (panel: IslandPanel) => void;

  nav: IslandNavItem[];

  /** 节点预览面板（宿主决定渲染什么，组件只提供容器与动效） */
  previewContent?: React.ReactNode;
  /** 搜索面板 */
  searchContent?: React.ReactNode;
  /** agent 面板 */
  agentContent?: React.ReactNode;

  /** 展开态底部/右侧的自定义动作（如预览面板的「打开节点」） */
  actions?: React.ReactNode;

  className?: string;
}

/** Copy for the three P0 placeholders — muted, never an error state. */
const PLACEHOLDER_COPY: Record<Exclude<IslandPanel, "idle">, string> = {
  preview: "节点预览将在 M8 接入",
  search: "搜索面板将在 M9 接入",
  agent: "agent 面板将在 M9 接入",
};

/**
 * The island. Renders a fixed, pointer-transparent bottom strip whose only
 * interactive child is the capsule; everything else about it is described in
 * this file's header.
 */
export function DynamicIsland({
  panel,
  onPanelChange,
  nav,
  previewContent,
  searchContent,
  agentContent,
  actions,
  className,
}: DynamicIslandProps): React.ReactNode {
  const { reducedMotion, coarsePointer } = useIslandEnvironment();

  const shape = ISLAND_SHAPES[panel];
  /**
   * The panel body scrolls at the capsule's inner height. The 2px subtraction is
   * the fake border the shell draws with `p-px`: without it the inner content
   * would be 1px taller than its box at both ends and the bottom edge of the
   * surface would be clipped by the capsule's `overflow-hidden`.
   */
  const innerPanelHeight = `calc(${shape.panelHeight} - 2px)`;

  const injectedContent =
    panel === "preview"
      ? previewContent
      : panel === "search"
        ? searchContent
        : panel === "agent"
          ? agentContent
          : undefined;
  const hasInjectedContent =
    injectedContent !== undefined && injectedContent !== null;

  /**
   * Local, layered `Escape` (§2.4): an expanded island collapses, the collapsed
   * one does nothing at all — no `preventDefault`, no `stopPropagation` — so a
   * host dialog or popover that is also listening keeps receiving the key.
   * There is deliberately no `window`/`document` listener here: that is boundary
   * 3 above.
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    if (panel === "idle") return;
    onPanelChange("idle");
  };

  /**
   * Layer 3's pointer follow (§3.1). The variables are written on the capsule
   * itself and inherited by the highlight span, which keeps the highlight on the
   * compositor: no React re-render per pointer move.
   *
   * Off under reduced motion (it is a moving highlight) and off on a coarse
   * pointer where there is no hover at all (§3.4 第 1/4 行).
   */
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || coarsePointer) return;
    const node = event.currentTarget;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    node.style.setProperty("--light-x", `${x}%`);
    node.style.setProperty("--light-y", `${y}%`);
  };

  let body: React.ReactNode;
  if (panel === "idle") {
    body = <IslandNav nav={nav} className="h-full" />;
  } else if (hasInjectedContent) {
    body = (
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {injectedContent}
      </div>
    );
  } else {
    /**
     * The built-in placeholder keeps the expanded form's measured size
     * (`minHeight` = `maxHeight` = the shape's inner height) so the island does
     * not shrink to one line of copy in P0. Both bounds are needed: `maxHeight`
     * is what makes injected content scroll, `minHeight` is what reserves the
     * form when there is none.
     */
    body = (
      <div
        data-island-placeholder={panel}
        className="flex min-h-0 flex-1 flex-col"
        style={{ minHeight: innerPanelHeight, maxHeight: innerPanelHeight }}
      >
        {/*
          The expanded form keeps the navigation reachable — with labelled icons
          on a wide screen and icons only under 640px (§7.1). P1/P2 panels that
          bring their own chrome simply stop rendering this branch.
        */}
        <IslandNavPanel nav={nav} className="shrink-0" />
        {panel === "agent" ? (
          <IslandAgentPanel />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain p-6 text-center text-sm text-muted-foreground">
            {PLACEHOLDER_COPY[panel]}
          </div>
        )}
      </div>
    );
  }

  return (
    // `layoutRoot` belongs on the **fixed** element: the capsule's own box is
    // measured against it, so page scroll offset can never enter the
    // projection (§0.3-4). The container stays pointer-transparent — otherwise
    // it would eat canvas drags and the sidebar's 3px hot zone along the whole
    // bottom edge (§0.3-8).
    <motion.div
      layoutRoot
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <motion.div
        data-island
        data-island-panel={panel}
        layout
        transition={{ layout: resolveLayoutTransition(reducedMotion) }}
        style={{
          width: shape.width,
          maxWidth: shape.maxWidth,
          maxHeight: shape.maxHeight,
          // Only `idle` pins a height; the expanded forms are content-driven up
          // to `maxHeight` (§2.1).
          ...(shape.height ? { height: shape.height } : {}),
          // Radius and shadow must arrive through `style` or motion's
          // scale-based `layout` cannot compensate them (§0.3-3②).
          borderRadius: shape.radius,
          boxShadow: ISLAND_OUTER_EDGE,
          ...ISLAND_ORIGIN,
        }}
        className={cn(
          "pointer-events-auto relative overflow-hidden",
          className,
        )}
        onKeyDown={handleKeyDown}
        onPointerMove={handlePointerMove}
      >
        {/*
          Second `layout` layer. Its `p-px` **is** the 1px edge: a real `border`
          would be stretched to a sub-pixel smear by the layout scale (§0.3-3③),
          and the `bg-border/60` behind the surface's rounded rectangle is what
          the padding actually shows.
        */}
        <motion.div
          layout
          transition={{ layout: resolveInnerLayoutTransition(reducedMotion) }}
          className="h-full rounded-[inherit] bg-border/60 p-px"
        >
          <IslandSurface>
            {/*
              Content and size are controlled separately (§2.3): the capsule
              owns width/height/radius, this layer only cross-fades. One stable
              `key` per form is what lets `popLayout` take the outgoing body out
              of flow while the incoming one fades in 40ms behind it.
            */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={panel}
                data-island-content={panel}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: resolvePanelFade(reducedMotion, "enter"),
                }}
                exit={{
                  opacity: 0,
                  transition: resolvePanelFade(reducedMotion, "exit"),
                }}
                className="flex h-full w-full flex-col justify-center"
                style={{ maxHeight: innerPanelHeight }}
              >
                {body}
                {panel !== "idle" && actions !== undefined && actions !== null ? (
                  <div className="shrink-0 border-t border-border/60 px-3 py-2">
                    {actions}
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </IslandSurface>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
