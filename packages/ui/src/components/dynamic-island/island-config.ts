"use client";

import { useEffect, useState } from "react";
import type { Transition } from "motion/react";

/**
 * Shape, spring and degrade constants for the Dynamic Island
 * (`docs/dynamic-island/README.md` §2.1 形态常量, §3.3 弹簧参数, §3.4 降级矩阵;
 * plan `docs/plan/dynamic-island.md` §M4.1 第 1 行).
 *
 * Everything that the component files would otherwise hard-code lives here, so
 * that `dynamic-island.tsx` reads as the shell, `island-nav.tsx` as the row and
 * `island-surface.tsx` as the four visual layers.
 *
 * Three facts from the design are load-bearing and are repeated on the symbols
 * they constrain:
 *
 * 1. **The radius is data, not a class.** motion's `layout` animates sizes with
 *    `transform: scale()` and only compensates `borderRadius` / `boxShadow` when
 *    they are handed over through `style` (design §0.3-3②). A Tailwind
 *    `rounded-*` class is therefore invisible to the correction and the corners
 *    would visibly smear during the morph — which is why `radius` is a number in
 *    this file and never a class name.
 * 2. **The origin is the bottom.** The island hangs at the bottom of the
 *    viewport, so `originY` must be `1`. The widely copied community sample
 *    animates a *top* island with `originY: 0`; copying it verbatim makes this
 *    island grow downwards out of nowhere (design §3.3 marks this as the single
 *    easiest thing to get wrong).
 * 3. **The 640px and `(hover: none)` rows of the degrade matrix are CSS-only.**
 *    Nothing here needs to *measure* them: the expanded width caps itself with
 *    `max-width: calc(100vw - 32px)` (§2.1 + §3.4) and the nav labels are
 *    `hidden md:inline`. Only the two rows that change *behaviour* — reduced
 *    motion and a coarse pointer — get a JS predicate.
 */

/**
 * The island's four forms.
 *
 * This is a **third, structurally equivalent copy** of the frozen literal union:
 * `IslandPanel` lives in `dynamic-island.tsx` per the §5.2 contract and a second
 * copy lives in `packages/store/src/uiStore.ts` per §6.1. The duplication is
 * deliberate in both directions — `packages/ui` may not import
 * `@workspace/store` (§0.2-2), and importing the type back out of
 * `dynamic-island.tsx` would close a *runtime* cycle, because the shell imports
 * the shape table below. Because all copies are the same literal union they are
 * mutually assignable, so a host can forward its store value untouched.
 */
export type IslandPanelShape = "idle" | "preview" | "search" | "agent";

/**
 * One form's geometry. Every field ends up in an inline `style` (never in a
 * class) so motion's `layout` can measure and compensate it (design §0.3-3).
 */
export interface IslandShape {
  /** `style.width` of the capsule. `idle` is content-sized (≈132–176px). */
  width: string;
  /**
   * `style.maxWidth` of the capsule. `calc(100vw - 32px)` is the whole of the
   * `max-width: 640px` row of the degrade matrix (design §3.4): at 640px the
   * viewport-derived value is still wider than the 560px search form, so the
   * two agree, and on a narrower screen the island can never overflow the
   * viewport by more than the 16px gutter on each side.
   */
  maxWidth: string;
  /**
   * `style.height`, pinned only by `idle` (the 40px pill). Expanded forms are
   * content-driven up to `maxHeight`.
   */
  height?: string;
  /**
   * `style.maxHeight` of the capsule. Expanded panels scroll inside this bound
   * rather than growing the island past the form's declared ceiling.
   */
  maxHeight: string;
  /**
   * The height a **built-in placeholder** fills, and the `max-height` the panel
   * body is allowed to scroll at (minus the 2px fake border the shell adds).
   * P0 has no host-injected content, so without this the expanded island would
   * collapse to the height of one line of placeholder copy.
   */
  panelHeight: string;
  /**
   * Passed as `style.borderRadius`. See the file header: a `rounded-*` class
   * would not be compensated by motion's scale-based `layout`.
   */
  radius: number;
}

/**
 * §2.1's table. `preview` is narrower than the search/agent pair because the
 * preview body is the old 320px `PREVIEW_WIDTH` plus 40px of padding, so its
 * content does not need to re-flow (design §2.1 note, §7.2).
 */
export const ISLAND_SHAPES: Record<IslandPanelShape, IslandShape> = {
  idle: {
    width: "fit-content",
    maxWidth: "calc(100vw - 32px)",
    height: "40px",
    maxHeight: "40px",
    panelHeight: "40px",
    radius: 9999,
  },
  preview: {
    width: "360px",
    maxWidth: "calc(100vw - 32px)",
    maxHeight: "min(340px, 44vh)",
    panelHeight: "min(340px, 44vh)",
    radius: 28,
  },
  search: {
    width: "560px",
    maxWidth: "calc(100vw - 32px)",
    maxHeight: "min(440px, 52vh)",
    panelHeight: "min(440px, 52vh)",
    radius: 28,
  },
  agent: {
    width: "560px",
    maxWidth: "calc(100vw - 32px)",
    maxHeight: "min(440px, 52vh)",
    panelHeight: "min(440px, 52vh)",
    radius: 28,
  },
};

/**
 * The island's transform origin, spread into the capsule's `style`.
 *
 * `originY: 1` = the bottom edge stays put while the box grows upwards, which
 * is the only origin that matches a bottom-anchored island (see the file
 * header, point 2, and design §3.3).
 *
 * **These are motion style keys, not `style.transformOrigin`.** The design
 * writes the origin as `transformOrigin: { originX: 0.5, originY: 1 }`, which
 * is motion's *internal* `TransformOrigin` record; in motion 12 the two keys
 * belong at the top level of `style` (`motion-dom`'s `buildHTMLStyles` hands
 * any `origin*` key to `transform-origin`, and `calcBoxDelta` reads
 * `latestValues.originX/originY` as the layout projection's own origin). Given
 * the nested form, motion would write `style.transformOrigin = {…}` — an
 * invalid CSS value that React stringifies — and the projection would silently
 * fall back to a centred origin. The rendered result is identical to the
 * design's intent: `transform-origin: 50% 100% 0`.
 */
export const ISLAND_ORIGIN = { originX: 0.5, originY: 1 };

/**
 * `idle ⇄ expanded`: deliberately under-damped (stiffness 110 / damping 12), so
 * the pill overshoots a little and then settles — the "liquid" part of the
 * effect. Applied to the capsule's `layout` (design §3.3).
 */
export const LIQUID_SPRING: Transition = {
  type: "spring",
  stiffness: 110,
  damping: 12,
  mass: 1,
};

/**
 * Expanded-state internals: a panel switching form, or its content changing
 * height. Much stiffer than {@link LIQUID_SPRING} so the inner layer can never
 * visibly trail the capsule and poke out of its `overflow-hidden` box.
 */
export const SNAP_SPRING: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 30,
  mass: 0.9,
};

/**
 * Content cross-fade (design §3.3). **Opacity only** — the design forbids
 * moving the content itself, because a content transform would compose with the
 * capsule's layout scale and read as a jitter (design §2.3).
 */
export const FADE: Transition = {
  duration: 0.14,
  ease: [0.32, 0.72, 0, 1] as const,
};

/**
 * The 40ms stagger between an outgoing and an incoming panel body (§2.3). It is
 * a delay on the *incoming* fade only, so with `AnimatePresence`'s
 * `mode="popLayout"` the old body leaves while the new one is still arriving.
 */
export const CONTENT_STAGGER = 0.04;

/**
 * Reduced motion swaps the size change for a hard cut (`duration: 0` on the
 * layout transition) and keeps an ≈120ms fade so the content swap is still
 * legible. The island stays fully functional — it is **not** disabled
 * (design §3.4 第 1 行, WCAG 2.2 §2.3.3).
 */
export const REDUCED_LAYOUT: Transition = { duration: 0 };

/** See {@link REDUCED_LAYOUT}. */
export const REDUCED_FADE: Transition = { duration: 0.12 };

/**
 * Which capsule transition to use. Kept as a function (rather than branching in
 * the shell) so the two rows of the degrade matrix are decided in one place.
 */
export function resolveLayoutTransition(reducedMotion: boolean): Transition {
  return reducedMotion ? REDUCED_LAYOUT : LIQUID_SPRING;
}

/**
 * Which inner-layer transition to use. Under reduced motion this is the same
 * hard cut as the capsule, otherwise the snappier {@link SNAP_SPRING}.
 */
export function resolveInnerLayoutTransition(
  reducedMotion: boolean,
): Transition {
  return reducedMotion ? REDUCED_LAYOUT : SNAP_SPRING;
}

/**
 * The fade for one side of a panel swap. `enter` carries the 40ms stagger and
 * `exit` does not; reduced motion drops the stagger and shortens the fade.
 */
export function resolvePanelFade(
  reducedMotion: boolean,
  phase: "enter" | "exit",
): Transition {
  if (reducedMotion) return REDUCED_FADE;
  if (phase === "exit") return FADE;
  return {
    duration: 0.14,
    ease: [0.32, 0.72, 0, 1] as const,
    delay: CONTENT_STAGGER,
  };
}

/**
 * `(prefers-reduced-motion: reduce)` — design §3.4 第 1 行 / §0.3-9.
 */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * A touch device. Both halves are checked because they answer different
 * questions: `(hover: none)` is what removes the hover preview intent (§0.3-7),
 * `(pointer: coarse)` is what makes a 36px icon too small to hit. This is also
 * the row that turns off the highlight follow and `nav-hover` (design §3.4).
 */
export const COARSE_POINTER_QUERY = "(hover: none), (pointer: coarse)";

/**
 * The `key` an expanded-state / search entry is expected to carry, so the
 * collapsed row can put its 1px divider exactly where design §7.1 asks for it
 * ("3 个图标 + 1px 分隔线", the line separating page navigation from search).
 *
 * The nav list is host-injected, so the divider cannot be inferred from the
 * item itself; the convention lives here instead of being spelled in the row.
 */
export const ISLAND_SEARCH_ITEM_KEY = "search";

/** Safe `matchMedia` read: `false` on the server and in non-DOM environments. */
export function matchesMediaQuery(query: string): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia(query).matches;
}

/** Pure predicate form of {@link REDUCED_MOTION_QUERY}. */
export function isReducedMotion(): boolean {
  return matchesMediaQuery(REDUCED_MOTION_QUERY);
}

/** Pure predicate form of {@link COARSE_POINTER_QUERY}. */
export function isCoarsePointer(): boolean {
  return matchesMediaQuery(COARSE_POINTER_QUERY);
}

/** The two degrade branches the island reacts to at runtime. */
export interface IslandEnvironment {
  readonly reducedMotion: boolean;
  readonly coarsePointer: boolean;
}

/**
 * The server render — and the first client paint — must not depend on
 * `matchMedia`, or hydration would mismatch. These defaults therefore describe
 * the *capable* device; the effect in {@link useIslandEnvironment} corrects them
 * on the first commit, one frame later, which only ever removes motion.
 */
const DEFAULT_ENVIRONMENT: IslandEnvironment = {
  reducedMotion: false,
  coarsePointer: false,
};

/** One synchronous read of both queries. */
export function readIslandEnvironment(): IslandEnvironment {
  return {
    reducedMotion: isReducedMotion(),
    coarsePointer: isCoarsePointer(),
  };
}

/**
 * Subscribes to the two behavioural degrade queries. Both are media queries, so
 * they can change while the island is mounted (the user toggles "reduce motion"
 * in system settings, or plugs in a mouse); `useState` + `change` listeners keep
 * the component honest without re-reading `matchMedia` on every render.
 */
export function useIslandEnvironment(): IslandEnvironment {
  const [environment, setEnvironment] =
    useState<IslandEnvironment>(DEFAULT_ENVIRONMENT);

  useEffect(() => {
    const queries = [REDUCED_MOTION_QUERY, COARSE_POINTER_QUERY].map((query) =>
      window.matchMedia(query),
    );
    const update = () => {
      const next = readIslandEnvironment();
      setEnvironment((current) =>
        current.reducedMotion === next.reducedMotion &&
        current.coarsePointer === next.coarsePointer
          ? current
          : next,
      );
    };

    update();
    queries.forEach((query) => query.addEventListener("change", update));
    return () =>
      queries.forEach((query) => query.removeEventListener("change", update));
  }, []);

  return environment;
}
