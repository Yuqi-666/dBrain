"use client";

/**
 * The kanban's field picker — one shadcn `Select` over a field list.
 *
 * The kanban picks fields in three places (分组字段 / 卡片标题 / 排序字段) and
 * every one of them lives inside a settings popover, so a compact `Select` is
 * the right primitive here: the option lists are short, and the table's
 * searchable popover+`Command` picker would add a second floating layer inside
 * the first for no gain.
 */
import type { DatabaseField } from "@workspace/interfaces";
import { cn } from "@workspace/ui/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";

import { FieldTypeIcon } from "../../../shared/field-meta";

/** Radix reserves `""` for "no value", so "nothing selected" needs a sentinel. */
const NO_FIELD = "__kanban_no_field__";

export interface KanbanFieldSelectProps {
  fields: readonly DatabaseField[];
  /** The selected field id, or `""` for none. */
  value: string;
  onValueChange: (fieldId: string) => void;
  /** Trigger text when nothing is selected. */
  placeholder: string;
  /** Adds a leading "no field" row (排序 offers 不排序). */
  noneLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function KanbanFieldSelect({
  fields,
  value,
  onValueChange,
  placeholder,
  noneLabel,
  disabled,
  className,
}: KanbanFieldSelectProps) {
  const selected = fields.find((field) => field.id === value);

  return (
    <Select
      value={selected ? selected.id : NO_FIELD}
      disabled={disabled}
      onValueChange={(next) => onValueChange(next === NO_FIELD ? "" : next)}
    >
      <SelectTrigger
        size="sm"
        aria-label={placeholder}
        className={cn("w-full text-xs", className)}
      >
        <SelectValue>
          {selected ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <FieldTypeIcon
                type={selected.type}
                className="size-3.5 shrink-0 text-muted-foreground"
              />
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="truncate text-muted-foreground">
              {placeholder}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {noneLabel && (
          <SelectItem
            value={NO_FIELD}
            className="text-xs text-muted-foreground"
          >
            {noneLabel}
          </SelectItem>
        )}
        {fields.map((field) => (
          <SelectItem key={field.id} value={field.id} className="text-xs">
            <FieldTypeIcon
              type={field.type}
              className="size-3.5 shrink-0 text-muted-foreground"
            />
            <span className="truncate">{field.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
