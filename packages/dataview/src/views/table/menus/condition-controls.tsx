"use client";

/**
 * The small controls the 筛选 / 分组 / 排序 / 填色 menus share: a type-aware value
 * input and the two-state order switch the design shows as `A → Z | Z → A`.
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
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/ui/toggle-group";
import type { DatabaseField, DatabaseFieldType } from "@workspace/interfaces";

import type { TableFilterOperator } from "../core/filter";

/** Radix `Select` rejects an empty item value, so "not set" needs a sentinel. */
const NONE = "__none__";

/**
 * The two labels an order switch shows for a field type.
 *
 * The design's 排序 screenshot uses 选项顺序 / 选项倒序 for a select field; the
 * wording follows the data so "ascending" always reads naturally.
 */
export function orderLabelsForField(
  type: DatabaseFieldType | undefined,
): [string, string] {
  switch (type) {
    case "select":
    case "multiSelect":
      return ["选项顺序", "选项倒序"];
    case "number":
      return ["1 → 9", "9 → 1"];
    case "date":
      return ["最早优先", "最晚优先"];
    case "checkbox":
      return ["未勾选优先", "已勾选优先"];
    default:
      return ["A → Z", "Z → A"];
  }
}

export function ConditionOrderToggle({
  type,
  value,
  disabled,
  onChange,
  className,
}: {
  type: DatabaseFieldType | undefined;
  value: "asc" | "desc";
  disabled?: boolean;
  onChange: (order: "asc" | "desc") => void;
  className?: string;
}) {
  const [ascLabel, descLabel] = orderLabelsForField(type);
  return (
    <ToggleGroup
      type="single"
      value={value}
      disabled={disabled}
      aria-label="排序方向"
      className={cn("rounded-md border border-border p-0.5", className)}
      onValueChange={(next) => {
        if (next) onChange(next as "asc" | "desc");
      }}
    >
      <ToggleGroupItem
        value="asc"
        size="xs"
        className="h-6 min-w-16 rounded-[calc(var(--radius)-4px)] px-2 text-[11px] text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-xs"
      >
        {ascLabel}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="desc"
        size="xs"
        className="h-6 min-w-16 rounded-[calc(var(--radius)-4px)] px-2 text-[11px] text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-xs"
      >
        {descLabel}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

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
