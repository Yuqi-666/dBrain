"use client";

/**
 * The `Or add via URL` row, shared by both selectors' upload tab.
 *
 * Frozen shape (`docs/plan/node-content-ui.md` §0-2 — W1-A owns the body).
 *
 * Write rule (sel §5 URL / §7): the input is local state and **nothing is
 * persisted while typing** — `onSubmit` fires once, on `Enter` or on blur, and
 * only for a non-empty value without whitespace. Blur-submit must be skipped
 * when focus moves *within* the row (otherwise pressing the submit button would
 * commit twice).
 */
import type { ReactNode } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/ui/input-group";
import { LinkIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export interface MediaUrlRowProps {
  /** Fully controlled: the owner keeps the draft so it can clear it after a commit. */
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (url: string) => void;
  /** Defaults to the design's `Or add via URL`. */
  placeholder?: string;
  disabled?: boolean;
  /** When given, the row shows it and refuses to submit. */
  invalidReason?: string;
  className?: string;
}

export function MediaUrlRow({
  value,
  onValueChange,
  onSubmit,
  placeholder = "Or add via URL",
  disabled,
  invalidReason,
  className,
}: MediaUrlRowProps): ReactNode {
  const canSubmit = !disabled && !invalidReason && value.trim().length > 0;

  const submit = () => {
    const url = value.trim();
    if (!canSubmit || /\s/.test(url)) return;
    onSubmit(url);
  };

  return (
    <div className={cn("p-1", className)}>
      <InputGroup>
        <InputGroupAddon>
          <LinkIcon className="size-4 shrink-0 opacity-50" />
        </InputGroupAddon>
        <InputGroupInput
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={invalidReason ? true : undefined}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          onBlur={(event) => {
            // Only submit when focus actually leaves the row.
            if (event.currentTarget.contains(event.relatedTarget)) return;
            if (value.trim().length > 0) submit();
          }}
        />
        <InputGroupButton
          type="button"
          size="sm"
          disabled={!canSubmit}
          onClick={submit}
        >
          添加
        </InputGroupButton>
      </InputGroup>
      {invalidReason ? (
        <p className="px-1 pt-1 text-xs text-destructive">{invalidReason}</p>
      ) : null}
    </div>
  );
}
