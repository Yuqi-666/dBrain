"use client";

/**
 * The 分组 and 排序 dropdowns share one component: both are an ordered list of
 * `字段 + 方向` conditions with 添加条件 below, exactly as the design shows
 * (`docs/propmt/dataview-table-1.md` §分组 / §排序).
 *
 * A condition starts with no field (`fieldId: ""`), so its picker reads
 * 选择字段 until the user picks one; consumers drop empty levels before use.
 */
import type { LucideIcon } from "lucide-react";
import { GripVertical, Plus, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/ui/popover";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import type { DatabaseField, TableCondition } from "@workspace/interfaces";

import { ConditionOrderToggle } from "./condition-controls";
import { TableFieldPicker } from "../fields/picker";

export interface TableConditionMenuProps {
  /** Trigger label, e.g. "分组". */
  label: string;
  icon: LucideIcon;
  /** Panel heading, e.g. "设置分组条件". */
  title: string;
  conditions: TableCondition[];
  fields: DatabaseField[];
  disabled?: boolean;
  onChange: (next: TableCondition[]) => void;
  /** Rendered at the right of the heading (排序's 自动排序 switch). */
  headerExtra?: ReactNode;
  className?: string;
}

export function TableConditionMenu({
  label,
  icon: Icon,
  title,
  conditions,
  fields,
  disabled,
  onChange,
  headerExtra,
  className,
}: TableConditionMenuProps) {
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  const active = conditions.filter((condition) => condition.fieldId !== "");

  const patch = (index: number, next: Partial<TableCondition>) =>
    onChange(
      conditions.map((condition, position) =>
        position === index ? { ...condition, ...next } : condition,
      ),
    );

  const remove = (index: number) =>
    onChange(conditions.filter((_, position) => position !== index));

  /**
   * 添加条件 appends an empty level: the picker reads 选择字段 until the user
   * chooses the field, which is what makes the new row obviously "not set yet"
   * (and keeps the toolbar badge at zero until it is).
   */
  const add = () => onChange([...conditions, { fieldId: "", order: "asc" }]);

  /** Dragging a row onto another swaps their priority. */
  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...conditions];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground",
            active.length > 0 &&
              "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
            className,
          )}
        >
          <Icon className="size-3.5" />
          {label}
          {active.length > 0 && (
            <Badge className="h-4 min-w-4 justify-center rounded-sm px-1 text-[10px] leading-none">
              {active.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      {/* `gap-0`: the shadcn panel ships `gap-4`, which doubled every
          explicit margin below and left a hole above 添加条件. */}
      <PopoverContent align="start" className="w-96 gap-0 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium">{title}</span>
          {headerExtra ??
            (conditions.length > 0 && (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="h-6 px-1.5 text-[11px] text-muted-foreground"
                onClick={() => onChange([])}
              >
                清除
              </Button>
            ))}
        </div>

        {/* With no conditions the list must not leave a hole between the title
            and 添加条件 — no empty scroll area, no extra margin. */}
        {conditions.length > 0 && (
          <ScrollArea className="max-h-72">
            <div className="flex flex-col gap-1.5 pr-1">
              {conditions.map((condition, index) => (
                <div
                  key={index}
                  draggable={conditions.length > 1}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragOver={(event) => {
                    if (conditions.length > 1) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const from = Number(
                      event.dataTransfer.getData("text/plain"),
                    );
                    if (Number.isFinite(from)) move(from, index);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <GripVertical
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground/60",
                      conditions.length > 1 ? "cursor-grab" : "opacity-0",
                    )}
                  />
                  <TableFieldPicker
                    fields={fields}
                    value={condition.fieldId || undefined}
                    triggerClassName="w-28 shrink-0"
                    onValueChange={(fieldId) => patch(index, { fieldId })}
                  />
                  <ConditionOrderToggle
                    type={fieldById.get(condition.fieldId)?.type}
                    value={condition.order}
                    disabled={condition.fieldId === ""}
                    className="ml-auto"
                    onChange={(order) => patch(index, { order })}
                  />
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label="删除条件"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => remove(index)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* No fields → nothing to group/sort on; say so rather than offering a
            disabled button that swallows the click. */}
        {fields.length === 0 ? (
          <p className="px-1.5 py-1 text-[11px] text-muted-foreground">
            先添加字段，才能设置条件。
          </p>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 justify-start gap-1.5 px-1.5 text-xs font-normal text-muted-foreground",
              conditions.length > 0 && "mt-2",
            )}
            onClick={add}
          >
            <Plus className="size-3.5" />
            添加条件
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
