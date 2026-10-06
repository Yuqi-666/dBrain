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
import type { CSSProperties, ReactNode } from "react";
import { Command } from "@workspace/ui/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/ui/popover";
import { Button } from "@workspace/ui/components/ui/button";
import { cn } from "@workspace/ui/lib/utils";

export interface MediaPopoverTab {
  /** Stable id — `emoji` / `icon` / `upload` / `node`. */
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
  /**
   * The body ceiling with Radix's own measurement folded in.
   *
   * `--radix-popover-content-available-height` is written by the popper onto the
   * content element (children inherit it), so `min(...)` keeps the design's
   * `min(384px, 52vh)` on a roomy viewport while never letting the panel outgrow
   * the space Radix found for it — the same trick `dataview`'s settings panel
   * uses. It is also the value the list's cap is derived from, so both
   * mechanisms agree.
   */
  const bodyCap = `min(${bodyMaxHeight}, var(--radix-popover-content-available-height, 100vh))`;

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
        {/* Body ceiling — **the panel's scroll contract** (G2-r1 第 1 条).
            The old shape put the ceiling on the `Command` (inline `maxHeight`)
            and expected the host's `flex-1 min-h-0` `CommandList` to scroll
            through it. A flex item inside an `height: auto` flex container is
            *not* shrunk by that container's `max-height`: the 368-cell grid
            computed ~1900px, `Command` clipped it at 384px and no scrollport
            existed anywhere — nothing could scroll.

            Two independent mechanisms now, both copied from shapes that already
            work in this repo:
            1. **`CommandList` owns the ceiling again** — `popover + Command +
                CommandList` with the list's own `max-height: auto
                overflow-y-auto` is how `dataview/shared/field-picker.tsx` and
                `settings-panel.tsx` scroll inside this very editor dialog; M2
                had switched it off with `max-h-none`. The cap is handed over as
                a CSS variable so the shell stays the one place that knows it,
                minus the search row's height (`CommandInput`'s wrapper is
                `p-1 pb-0` + `h-8` = 2.25rem; the list is the only body child on
                every grid tab).
            2. **The wrapper is a single safety net** for hosts whose body is not
                a `CommandList` (the upload panes): same cap, `overflow-y-auto`.
                On a grid tab the two add up to exactly the cap, so the wrapper
                never grows a second scrollbar.

            The cap also folds in `--radix-popover-content-available-height`
            (which Radix sets on the popover content and children inherit, the
            same variable `settings-panel.tsx` uses), so a popover anchored near
            the viewport edge is never taller than the space Radix measured for
            it. `Command` keeps giving up clipping (`overflow-visible` — the same
            `tailwind-merge` group as its base `overflow-hidden`, so the later
            class wins) and `height: auto` stays inline because the base class is
            `size-full` and `tailwind-merge` does not treat `size-*` as
            conflicting with `h-*`. `MediaSearchInput` pins itself to the top of
            whichever of the two viewports ends up scrolling. */}
        <div
          className="min-h-0 overflow-y-auto overscroll-contain"
          style={{ maxHeight: bodyCap }}
        >
          <Command
            shouldFilter
            className="rounded-none! overflow-visible bg-transparent p-0 [&_[cmdk-list]]:max-h-[calc(var(--media-body-cap)_-_2.25rem)]"
            style={
              { height: "auto", "--media-body-cap": bodyCap } as CSSProperties
            }
          >
            {children}
          </Command>
        </div>
      </PopoverContent>
    </Popover>
  );
}
