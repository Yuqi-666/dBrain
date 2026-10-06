"use client";

/**
 * The selectors' item grid (emoji / Lucide icons / nodes).
 *
 * Frozen shape (`docs/plan/node-content-ui.md` §0-2 — W1-A owns the body).
 *
 * Load-bearing rule (sel §5 尺寸/键盘): the grid is a **single tab stop**. It
 * must never turn its items into 300 separate `tabIndex={0}` stops — arrows move
 * a roving tabindex inside the grid, `Home`/`End` jump to the ends of a row, and
 * the shell's own tab order (search → grid → 分类条 → 移除) stays intact.
 */
import type { ReactNode } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { cn } from "@workspace/ui/lib/utils";

export interface MediaGridItem {
  /** Stable identity — dedupe key (最近使用 dedupes by `kind:value`). */
  key: string;
  /** Accessible name; also the text `Command` filters on. */
  label: string;
  /** Extra filter terms (emoji names, Lucide keywords). */
  keywords?: string[];
  /** What to draw: an emoji character, `<Icon />`, or an `<img>`. */
  content: ReactNode;
}

export interface MediaGridProps {
  items: MediaGridItem[];
  onSelect: (item: MediaGridItem) => void;
  /** Defaults to the design's 8 columns. */
  columns?: number;
  /** Shown when `items` is empty. */
  emptyState?: ReactNode;
  className?: string;
}

export function MediaGrid({
  items,
  onSelect,
  columns = 8,
  emptyState,
  className,
}: MediaGridProps) {
  if (items.length === 0) return <>{emptyState ?? null}</>;

  // TODO(W1-A): roving tabindex (←→ / Home / End, one tab stop for the whole
  // grid) and the `(pointer: coarse)` 44px cell size.
  return (
    <div
      role="grid"
      className={cn("grid gap-1 p-1", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item, index) => (
        <Button
          key={item.key}
          type="button"
          size="icon-sm"
          variant="ghost"
          role="gridcell"
          aria-label={item.label}
          tabIndex={index === 0 ? 0 : -1}
          className="size-9 text-lg"
          onClick={() => onSelect(item)}
        >
          {item.content}
        </Button>
      ))}
    </div>
  );
}
