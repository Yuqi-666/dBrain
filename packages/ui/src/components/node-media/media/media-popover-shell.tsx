"use client";

/**
 * The **only** floating shell the icon / cover selectors use.
 *
 * Frozen shape (see `docs/plan/node-content-ui.md` §0-2 — W1-A owns the body).
 * Layout contract, left to right and top to bottom (sel §2/§5/§6):
 *
 *   ┌─ [tab] [tab] [tab]                       [动词区] ─┐  ← tab 行，动词右锚定
 *   ├─────────────────────────────────────────────────────┤
 *   │ 搜索  →  网格 / 落地区 / URL 行                     │  ← 体，`bodyMaxHeight` 封顶
 *   └─────────────────────────────────────────────────────┘
 *
 * The body renders **inside a `<Command>`**, so `MediaSearchInput` /
 * `MediaGrid` may be used as its children directly; the query string lives in
 * that `Command`, which is why switching tabs must not remount it (`key` must
 * not be the tab id — sel §5 搜索).
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
      {/* `side="bottom"` + `align="start"`: left-aligned with the trigger. The
          shell deliberately does not pass `container` — whether the popover
          needs to be portalled into the transformed editor dialog is G2 第 10 条
          (docs/plan/node-content-ui.md §M2.2-8). */}
      <PopoverContent
        side="bottom"
        align="start"
        className={cn("w-auto p-0", className)}
        style={{ width }}
      >
        <div className="flex items-center gap-1 border-b border-border/60 p-1">
          <div className="flex flex-1 items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
            {tabs.map((tab) => (
              <Button
                key={tab.value}
                type="button"
                size="sm"
                variant={tab.value === activeTab ? "secondary" : "ghost"}
                aria-selected={tab.value === activeTab}
                role="tab"
                onClick={() => onTabChange(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
        </div>
        <Command
          shouldFilter
          className="rounded-none! bg-transparent p-0"
          style={{ maxHeight: bodyMaxHeight }}
        >
          {children}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
