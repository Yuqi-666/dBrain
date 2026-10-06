"use client";

/**
 * The **only** floating shell the icon / cover selectors use (sel §2/§3.3).
 *
 * Frozen shape (see `docs/plan/node-content-ui.md` §0-2 — W1-A owns the body).
 * Layout contract, left to right and top to bottom:
 *
 *   ┌─ [tab] [tab] [tab]                       [动词区] ─┐  ← tab 行，动词右锚定
 *   ├─────────────────────────────────────────────────────┤
 *   │ 搜索  →  网格 / 落地区 / URL 行                     │  ← 体，`bodyMaxHeight` 封顶
 *   └─────────────────────────────────────────────────────┘
 *
 * Three load-bearing decisions:
 *
 * 1. **The body renders inside a single `<Command>`**, so `MediaSearchInput` /
 *    `MediaGrid` may be used as its children directly and the query string lives
 *    in that `Command`. Switching tabs must therefore **not** remount it — `key`
 *    is never the tab id (sel §5 搜索: 切换 tab 保留查询串). The tab row and the
 *    body are siblings *inside* the popover but the `<Command>` wraps only the
 *    body, so a host may render either a `CommandList` + `MediaGrid` pair or a
 *    plain upload pane as `children`.
 * 2. **`side="bottom"` + `align="start"`** — the panel is left-aligned with the
 *    trigger (sel §2 形态常量). The shell deliberately does **not** pass
 *    `container` to `PopoverContent`: whether the panel must be portalled into
 *    the transformed editor dialog is G2 第 10 条 / §M2.2-8, a main-agent
 *    decision, and the default portal is tried first.
 * 3. **The tab row is a recessed segmented track, not a coloured tab strip.**
 *    The active item is the raised one (`bg-background` + `shadow-xs`) and
 *    `--primary` is never used here: it is reserved for state the user activated
 *    on the data (sel §0.3-8). The row borrows `dataview`'s `ViewSwitcher`
 *    idiom (`aria-pressed` buttons in a `bg-muted/60` track) instead of
 *    `role="tab"`, because the design keeps the browser's own focus traversal
 *    across the tabs (sel §5 `Tab`) rather than the arrow-key model a real
 *    tablist promises.
 *
 * `width` is applied as a **minimum**: on a fine pointer the panel measures
 * exactly the design's 320 / 420px, while the `(pointer: coarse)` 44px grid
 * (sel §5 尺寸) is allowed to widen the panel instead of being clipped.
 */
import type { ReactNode } from "react";
import { Command } from "@workspace/ui/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/ui/popover";
import { Button } from "@workspace/ui/components/ui/button";
import { cn } from "@workspace/ui/lib/utils";

export interface MediaPopoverTab {
  /** Stable id — `emoji` / `icon` / `upload` / `node` / `url`. */
  value: string;
  label: string;
}

export interface MediaPopoverShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The trigger, rendered `asChild`; pass the real button. */
  trigger: ReactNode;
  tabs: MediaPopoverTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  /**
   * Right-anchored verbs of the tab row (e.g. 移除). Always present and merely
   * `disabled` when unusable — a control that appears and disappears pushes its
   * left-hand neighbours around (sel §5 清除).
   */
  actions?: ReactNode;
  /** Panel width: `320` for the icon selector, `420` for the cover selector. */
  width?: number;
  /** Body ceiling: `min(384px, 52vh)` / `min(360px, 52vh)`. */
  bodyMaxHeight?: string;
  children: ReactNode;
  className?: string;
}

export function MediaPopoverShell({
  open,
  onOpenChange,
  trigger,
  tabs,
  activeTab,
  onTabChange,
  actions,
  width = 320,
  bodyMaxHeight = "min(384px, 52vh)",
  children,
  className,
}: MediaPopoverShellProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        style={{ minWidth: width, maxWidth: "calc(100vw - 2rem)" }}
        className={cn("w-auto gap-0 p-0", className)}
        onOpenAutoFocus={(event: Event) => {
          // sel §5 keyboard: `Enter` opens the panel and the caret lands in the
          // search field. Radix's focus scope would otherwise pick the first
          // tabbable node — the first tab button — so hand focus to the
          // `Command` input when the active tab has one, and leave Radix's
          // default untouched when it does not (the upload tab).
          const content = event.currentTarget as HTMLElement | null;
          const input = content?.querySelector<HTMLElement>("[cmdk-input]");
          if (!input) return;
          event.preventDefault();
          input.focus();
        }}
      >
        <div className="flex shrink-0 items-center gap-1 border-b border-border/60 p-1">
          <div className="flex min-w-0 flex-1 items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
            {tabs.map((tab) => {
              const active = tab.value === activeTab;
              return (
                <Button
                  key={tab.value}
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-pressed={active}
                  className={cn(
                    "h-6 min-w-0 flex-1 gap-1.5 rounded-md px-2 text-xs hover:bg-background/70",
                    active
                      ? "bg-background text-foreground shadow-xs hover:bg-background"
                      : "text-muted-foreground",
                  )}
                  onClick={() => onTabChange(tab.value)}
                >
                  <span className="truncate">{tab.label}</span>
                </Button>
              );
            })}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-1">{actions}</div>
          ) : null}
        </div>
        {/* Body ceiling: the `Command` is clamped and its inner list
            (`flex-1 min-h-0`, supplied by the host) is what scrolls. `height:
            auto` is inline because the base class is `size-full` and
            `tailwind-merge` does not treat `size-*` as conflicting with `h-*`;
            a percentage height here would resolve against the popover's auto
            height and defeat the clamp. The descendant rule releases
            `CommandList`'s own `max-h-72` (288px), which is *below* sel §2's
            `min(384px, 52vh)` and would otherwise be the real ceiling. */}
        <Command
          shouldFilter
          className="rounded-none! bg-transparent p-0 [&_[cmdk-list]]:max-h-none"
          style={{ height: "auto", maxHeight: bodyMaxHeight }}
        >
          {children}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
