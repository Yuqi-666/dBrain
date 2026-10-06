"use client";

/**
 * The selectors' search field.
 *
 * Frozen shape (`docs/plan/node-content-ui.md` §0-2 — W1-A owns the body).
 * It is a thin wrapper over `<CommandInput>`, which already *is* the design's
 * 「InputGroup + Command」 pair (the input group and its search addon live in
 * `ui/command.tsx`). It must be rendered inside a `<Command>` — the query
 * string belongs to that `Command`, not to this component, so switching tabs
 * keeps the filter (sel §5 搜索).
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
    <CommandInput
      placeholder={placeholder}
      autoFocus={autoFocus}
      disabled={disabled}
      className={cn(className)}
    />
  );
}
