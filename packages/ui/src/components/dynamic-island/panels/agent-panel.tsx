"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

/**
 * The `agent` form's built-in body (design §7.4; plan
 * `docs/plan/dynamic-island.md` §M4.1 第 5 行).
 *
 * Today the island's agent mode is a placeholder either way — the design's own
 * `<AgentMode>` is one sentence of copy — so the only thing this file must get
 * right is **reserving the two containers now**: a conversation area that takes
 * the remaining height and an input row of a fixed height. If it rendered a
 * single line instead, the island would change shape a second time when M9
 * fills the panel in, and the whole point of the layout springs is that a form
 * changes shape for a reason the user can see.
 *
 * A placeholder is not an error state: no destructive colour, no alert icon,
 * just muted copy in the muted token.
 */
export interface IslandAgentPanelProps {
  className?: string;
}

export function IslandAgentPanel({
  className,
}: IslandAgentPanelProps): React.ReactNode {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-3 p-4", className)}>
      {/* 对话区 — `flex-1 min-h-0` so it absorbs whatever the island's shape
          leaves after the input row, and scrolls instead of pushing it out. */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain rounded-xl bg-muted/40 px-4 text-center text-sm text-muted-foreground">
        agent 面板将在 M9 接入
      </div>
      {/* 输入区 — fixed 64px, reserved before there is an input to put in it. */}
      <div className="flex h-16 shrink-0 items-center rounded-xl border border-dashed border-border px-3 text-xs text-muted-foreground">
        输入区将在 M9 接入
      </div>
    </div>
  );
}
