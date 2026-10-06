"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

import { useIslandEnvironment } from "./island-config";

/**
 * The island's four visual layers (design §3.1; plan
 * `docs/plan/dynamic-island.md` §M4.1 第 2 行). Layers 1–3 and the inside half
 * of layer 4 are drawn here; the outside half of layer 4 is exported as a
 * constant because only the shell can paint it (see {@link ISLAND_OUTER_EDGE}).
 *
 * | # | layer    | technique                                                        |
 * | - | -------- | ---------------------------------------------------------------- |
 * | 1 | base     | `bg-popover/85` (light) / `bg-popover/80` (dark)                 |
 * | 2 | refraction | `backdrop-filter: blur(20px) saturate(180%)`, gated by `@supports` |
 * | 3 | highlight | a real `<span aria-hidden>` carrying the radial gradient          |
 * | 4 | edge     | inset top highlight (here) + outer shadow (the shell)            |
 *
 * Four decisions worth stating, because each of them looks like an accident
 * otherwise:
 *
 * 1. **The blur is never animated.** `backdrop-filter` sits on the compositor:
 *    on the target tablet it re-samples a canvas that the force worker repaints
 *    every frame (§0.3-2), so it is only ever *switched*, never interpolated.
 * 2. **The highlight is a real element, not `::before`.** The design writes
 *    `::before`, but `packages/ui/src/styles/globals.css` is a frozen, shared
 *    file and a pseudo-element cannot be reached from here. The `<span>` is also
 *    what the shell's `pointermove` writes `--light-x` / `--light-y` for.
 * 3. **The highlight sits under the content.** It is the first child of an
 *    `isolate` stacking context with a negative `z-index`: exactly where a
 *    `::before` paints (over the base colour, under the text), and it keeps the
 *    white wash off the nav labels.
 * 4. **The blur is opt-out at runtime.** `blurEnabled={false}` is the
 *    "simulation is running" row of the degrade matrix (§3.4 第 3 行) — but see
 *    that prop's own note: P0 has no wiring for it yet.
 */

/**
 * Layer 2 is expressed as a Tailwind `supports-[…]` variant rather than a
 * `style` value so that a browser without `backdrop-filter` never even receives
 * the property (§3.4 第 2 行: it falls back to opaque `bg-popover`, which is
 * layer 1's base class). `blur < 12px` reads as "dirty" rather than glass, hence
 * the design's 20px.
 */
const BLUR_LAYER = [
  "supports-[backdrop-filter:blur(1px)]:bg-popover/85",
  "supports-[backdrop-filter:blur(1px)]:dark:bg-popover/80",
  "supports-[backdrop-filter:blur(1px)]:backdrop-blur-[20px]",
  "supports-[backdrop-filter:blur(1px)]:backdrop-saturate-[180%]",
].join(" ");

/**
 * The "no blur right now" tone (§3.4 第 3 行). Opaque enough to stay readable
 * over the graph without paying for a per-frame filter.
 */
const OPAQUE_LAYER = "bg-popover/90";

/**
 * Layer 3. The two CSS variables are written by the shell on the capsule and
 * inherited by this span, so the gradient can follow the pointer without a
 * re-render; the fallback pair (`30%` / `20%`) is the resting highlight.
 */
export const ISLAND_HIGHLIGHT_GRADIENT =
  "radial-gradient(circle at var(--light-x, 30%) var(--light-y, 20%), rgb(255 255 255 / 0.35), transparent 60%)";

/**
 * Layer 4, inside half. Applied here, on the element that is actually visible:
 * an inset shadow on the capsule would be painted over by this surface.
 */
export const ISLAND_INNER_EDGE = "inset 0 1px 0 rgb(255 255 255 / 0.28)";

/**
 * Layer 4, outside half — the drop shadow plus the optional cool/warm 1px
 * edges (§3.1 第 4 层). It is exported for the **capsule** to apply because the
 * capsule is `overflow-hidden` (a required anchor class), and an ancestor's
 * overflow clips a descendant's outer shadow completely: painted here, the
 * shadow would simply not exist. The shell therefore spreads this constant into
 * the capsule's `style`, which is also where motion's `layout` compensates
 * `boxShadow` (§0.3-3②).
 */
export const ISLAND_OUTER_EDGE = [
  "0 8px 24px rgb(0 0 0 / 0.18)",
  "-1px 0 0 rgb(255 100 100 / 0.10)",
  "1px 0 0 rgb(100 150 255 / 0.10)",
].join(", ");

/** One resting position of the breathing highlight, as a translate offset. */
interface IslandHighlightDrift {
  readonly x: string;
  readonly y: string;
}

/**
 * §3.3's "呼吸/高光动画": a very slow drift of the highlight, expressed as a
 * `transform` so it stays on the compositor (the design allows nothing else than
 * `transform` / `opacity` / size). Percentages are relative to the span, i.e. to
 * the island itself, so ~1.5% is a handful of pixels on any form.
 */
const DRIFT_STEPS: readonly IslandHighlightDrift[] = [
  { x: "0%", y: "0%" },
  { x: "1.5%", y: "-1%" },
  { x: "0%", y: "1%" },
  { x: "-1.5%", y: "-1%" },
];

/** Resting position, and the value used whenever drift is off. */
const NO_DRIFT: IslandHighlightDrift = { x: "0%", y: "0%" };

/**
 * 2.4s is the design's value; anything slower than ~4s stops reading as life and
 * starts reading as a distraction on an always-on component (§3.3).
 */
const DRIFT_INTERVAL_MS = 2400;

export interface IslandSurfaceProps {
  /**
   * Whether layer 2 may be painted.
   *
   * **P0 does not wire this to a running force simulation.** The design's
   * intended source is `packages/graph`'s `simulation:stopped`, and
   * `packages/ui` may not import `@workspace/graph` (§0.2-2); plan §M4.2-9
   * therefore registers the cheap equivalent — "300ms without a repaint on the
   * island" — for a later milestone. Until then this prop has exactly one
   * consumer: its own default branch. `false` is the degrade itself (no
   * `backdrop-filter`, `bg-popover/90`).
   */
  blurEnabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Renders the island's backdrop: base colour, gated blur, highlight and the
 * inside edge. Sized and clipped by the caller — this component intentionally
 * carries no width, height or radius of its own, so that all geometry stays in
 * one place (the shell's `style`, from `island-config.ts`).
 */
export function IslandSurface({
  blurEnabled = true,
  className,
  children,
}: IslandSurfaceProps): React.ReactNode {
  const { reducedMotion } = useIslandEnvironment();
  const [driftStep, setDriftStep] = React.useState(0);

  // The breathing highlight is a *motion* preference, so reduced motion stops
  // it (§3.4 第 1 行). It is also stopped on unmount, and it costs one timer
  // tick every 2.4s rather than a rAF loop — the island is mounted for the
  // whole life of the app.
  React.useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(
      () => setDriftStep((step) => (step + 1) % DRIFT_STEPS.length),
      DRIFT_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  const drift = reducedMotion
    ? NO_DRIFT
    : (DRIFT_STEPS[driftStep] ?? NO_DRIFT);

  return (
    <div
      className={cn(
        // `isolate` gives the negative-z highlight a stacking context to live
        // in; without it the span would sink behind the capsule's background.
        "relative isolate h-full w-full rounded-[inherit]",
        // Layer 1's base is the opaque fallback; layer 2 upgrades it only where
        // `backdrop-filter` exists.
        "bg-popover",
        blurEnabled ? BLUR_LAYER : OPAQUE_LAYER,
        className,
      )}
      style={{ boxShadow: ISLAND_INNER_EDGE }}
    >
      <span
        aria-hidden
        data-island-highlight
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] transition-transform duration-[2400ms] ease-in-out"
        style={{
          backgroundImage: ISLAND_HIGHLIGHT_GRADIENT,
          transform: `translate3d(${drift.x}, ${drift.y}, 0)`,
        }}
      />
      <div className="relative h-full w-full">{children}</div>
    </div>
  );
}
