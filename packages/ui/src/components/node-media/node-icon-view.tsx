"use client";

/**
 * The single renderer for a node's `icon` (`NodeIcon`).
 *
 * Frozen shape (see `docs/plan/node-content-ui.md` §0-2 — the main agent writes
 * this file first so W1-A/W1-C/W1-D can compile against it; **W1-A owns the
 * body**). The fallback chain is:
 *
 *   `icon` → image (`resolveFileUrl`, load failure falls back)
 *          → emoji (drawn as text)
 *          → Lucide name looked up in the static name table
 *          → `fallback` (the consumer's node-type glyph)
 *
 * A Lucide name that is missing from the table must fall back, never throw: the
 * stored name may come from a newer `lucide-react` or a hand-edited row.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import type { NodeIcon } from "@workspace/interfaces";
import { resolveFileUrl } from "@workspace/api-client";
import { cn } from "@workspace/ui/lib/utils";

export interface NodeIconViewProps {
  /** The node's icon; when absent the caller's `fallback` is drawn. */
  icon?: NodeIcon;
  /** Drawn when there is no icon, or the icon cannot be resolved. */
  fallback?: ReactNode;
  /** Sizing and rounding: 36px trigger button, 20px header, card corner. */
  className?: string;
}

export function NodeIconView({
  icon,
  fallback,
  className,
}: NodeIconViewProps): ReactNode {
  if (!icon) return fallback ?? null;

  if (icon.kind === "image") {
    return <IconImage src={icon.value} fallback={fallback} className={className} />;
  }

  if (icon.kind === "emoji") {
    // TODO(W1-A): apply `icon.color` as the background (a tinted square behind
    // the glyph) without touching the glyph itself.
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center leading-none",
          className,
        )}
      >
        {icon.value}
      </span>
    );
  }

  // TODO(W1-A): look `icon.value` up in the static Lucide name table
  // (`Record<string, LucideIcon>`, ~150 entries) and render the glyph; an
  // unknown name falls through to `fallback`.
  return fallback ?? null;
}

/** The `kind:"image"` half — kept separate so a broken URL only resets itself. */
function IconImage({
  src,
  fallback,
  className,
}: {
  src: string;
  fallback?: ReactNode;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return fallback ?? null;

  return (
    <img
      src={resolveFileUrl(src)}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      className={cn("size-full object-cover", className)}
    />
  );
}
