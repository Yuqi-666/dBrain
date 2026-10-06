"use client";

/**
 * The selectors' search field.
 *
 * Frozen shape (`docs/plan/node-content-ui.md` §0-2 — W1-A owns the body).
 * It is a thin wrapper over `<CommandInput>`, which already *is* the design's
 * 「InputGroup + Command」 pair: the input group and its search addon live in
 * `ui/command.tsx`, so this component adds no chrome of its own.
 *
 * Load-bearing constraint (sel §5 搜索): it **must be rendered inside a
 * `<Command>`**. The query string belongs to that `Command`, not to this
 * component — which is exactly why the props carry no `value` / `onChange`:
 * `MediaGrid` reads the query through cmdk's own state (`useCommandState`) to
 * keep its roving tab stop in sync, and `MediaPopoverShell` reads
 * `[cmdk-input]` to place the caret when the panel opens. Keeping the query in
 * the `Command` is also what makes switching tabs preserve it (the shell never
 * remounts the `Command` on a tab change).
 *
 * `autoFocus` is therefore belt-and-braces: Radix focuses the first tabbable
 * node when the popover opens, and the shell overrides that by focusing this
 * input, so a host does not *have* to pass it — but passing it is harmless.
 */
import type { ReactNode } from "react";
import { CommandInput } from "@workspace/ui/components/ui/command";
import { cn } from "@workspace/ui/lib/utils";

export interface MediaSearchInputProps {
  /** Defaults to the design's `Click to filter…`. */
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MediaSearchInput({
  placeholder = "Click to filter…",
  autoFocus,
  disabled,
  className,
}: MediaSearchInputProps): ReactNode {
  return (
    // The shell caps the body and lets either the body wrapper or the
    // `CommandList` below it do the scrolling, so this row pins itself to the top
    // of whichever viewport ends up scrolling: a 46-row emoji grid must not take
    // the filter box away. `z-10` is load-bearing — `CommandItem` is itself
    // `relative`, and a positioned sibling later in DOM order paints above a
    // `z-index: auto` sticky row. `bg-popover` is opaque, so the cells scroll
    // *behind* the row instead of showing through the input group's
    // translucent fill.
    <div className="sticky top-0 z-10 bg-popover">
      <CommandInput
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className={cn(className)}
      />
    </div>
  );
}
