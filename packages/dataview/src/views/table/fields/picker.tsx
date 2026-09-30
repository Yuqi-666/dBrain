"use client";

/**
 * The searchable field dropdown every table menu uses to pick a field
 * (筛选 / 分组 / 排序 / 填色).
 *
 * The design asks for "点击选择字段则出现带搜索的字段列表下拉菜单": a button
 * showing the current field, opening a `Command` list with a search box. The
 * table view is lazy, so pulling `cmdk` (via `@workspace/ui/components/ui/command`)
 * in here does not touch the shell's static import graph.
 */
import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/ui/popover";
import type { DatabaseField } from "@workspace/interfaces";

import { FieldTypeIcon, filterFieldsByQuery } from "./meta";

export interface TableFieldPickerProps {
  fields: readonly DatabaseField[];
  value?: string;
  onValueChange: (fieldId: string) => void;
  /** Trigger text when nothing is selected. */
  placeholder?: string;
  /** Rendered inline (not in a popover) — used inside a menu's own popover. */
  disabled?: boolean;
  className?: string;
  /** Let the trigger shrink inside a dense row. */
  triggerClassName?: string;
}

export function TableFieldPicker({
  fields,
  value,
  onValueChange,
  placeholder = "选择字段",
  disabled,
  className,
  triggerClassName,
}: TableFieldPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = fields.find((field) => field.id === value);
  const matches = filterFieldsByQuery(fields, query);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          aria-label={placeholder}
          className={cn(
            "h-7 min-w-0 justify-between gap-1.5 px-2 text-xs font-normal text-muted-foreground",
            triggerClassName,
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {selected && (
              <FieldTypeIcon
                type={selected.type}
                className="size-3.5 shrink-0"
              />
            )}
            <span
              className={cn("truncate", selected && "text-foreground")}
              title={selected?.name}
            >
              {selected?.name ?? placeholder}
            </span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            placeholder="搜索字段"
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty className="py-4 text-xs text-muted-foreground">
              没有匹配的字段
            </CommandEmpty>
            {matches.map((field) => (
              <CommandItem
                key={field.id}
                value={field.id}
                className="text-xs"
                onSelect={() => {
                  onValueChange(field.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <FieldTypeIcon
                  type={field.type}
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1 truncate">{field.name}</span>
                {field.id === value && <Check className="size-3.5" />}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
