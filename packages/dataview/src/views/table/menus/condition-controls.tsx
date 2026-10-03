"use client";

/**
 * The small controls the 筛选 / 填色 menus share: a type-aware value input.
 *
 * The `字段 + 方向` condition row (and its order switch) is not here — it serves
 * two views, so it lives in `shared/condition-menu.tsx`.
 */
import { cn } from "@workspace/ui/lib/utils";
import { Input } from "@workspace/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import type { DatabaseField } from "@workspace/interfaces";

import type { TableFilterOperator } from "../core/filter";

/** Radix `Select` rejects an empty item value, so "not set" needs a sentinel. */
const NONE = "__none__";

/** Enum-ish values compare by equality, so the input becomes a picker. */
function optionValuesFor(field: DatabaseField | undefined): string[] | null {
  if (!field) return null;
  if (field.type === "select" || field.type === "multiSelect") {
    return (field.options ?? []).map((option) => option.name);
  }
  if (field.type === "checkbox") return ["是", "否"];
  return null;
}

/**
 * The third control of a condition row: free text, an option picker or a
 * boolean picker, depending on the field the condition points at.
 */
export function ConditionValueInput({
  field,
  operator,
  value,
  disabled,
  placeholder = "请输入",
  onChange,
  className,
}: {
  field: DatabaseField | undefined;
  operator: TableFilterOperator;
  value: string | undefined;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const inert = operator === "empty" || operator === "notEmpty";
  const optionValues = optionValuesFor(field);

  if (optionValues) {
    return (
      <Select
        value={value || NONE}
        disabled={disabled || inert}
        onValueChange={(next) => onChange(next === NONE ? "" : next)}
      >
        <SelectTrigger
          size="sm"
          aria-label="条件值"
          className={cn("h-7 min-w-0 flex-1 py-1 pl-2 text-[11px]", className)}
        >
          <SelectValue placeholder="请选择" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE} className="text-[11px]">
            请选择
          </SelectItem>
          {optionValues.map((option) => (
            <SelectItem key={option} value={option} className="text-[11px]">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      aria-label="条件值"
      className={cn("h-7 min-w-0 flex-1 px-2 text-[11px]", className)}
      disabled={disabled || inert}
      value={value ?? ""}
      placeholder={inert ? "—" : placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
