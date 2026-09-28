"use client";

/**
 * Config editor for the table data view.
 *
 * It edits `TableViewConfig` only — never the data — and self-heals against the
 * current `source.fields`, so a field deleted in another part of the node
 * disappears from the list instead of leaving a dangling `fieldId`
 * (table.md §4 / §9).
 *
 * Layout notes (keep them): sections are separated by a single hairline, each
 * control row is 28px tall, labels are 12px sentence case with an 11px muted
 * hint underneath, and `--primary` marks state the user has engaged (a checked
 * switch, an active sort) rather than decorating the panel.
 */
import { useId, useMemo, type ReactNode } from "react";
import { ArrowDown, ArrowUp, RotateCcw, X } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { Checkbox } from "@workspace/ui/components/ui/checkbox";
import { Input } from "@workspace/ui/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/ui/input-group";
import { Label } from "@workspace/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import { Switch } from "@workspace/ui/components/ui/switch";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/ui/tooltip";
import type {
  DatabaseField,
  DatabaseFieldType,
  TableColumnConfig,
  TableViewConfig,
} from "@workspace/interfaces";

import { primaryFieldId } from "../../source/field-utils";
import type { DataViewConfigEditorProps } from "../../source/types";
import {
  isColumnVisible,
  resolveTableColumns,
  visibleTableColumns,
} from "./table-schema";

const DENSITY_OPTIONS: { value: TableViewConfig["density"]; label: string }[] =
  [
    { value: "compact", label: "紧凑" },
    { value: "comfortable", label: "适中" },
    { value: "spacious", label: "宽松" },
  ];

const THEME_OPTIONS: { value: TableViewConfig["theme"]; label: string }[] = [
  { value: "auto", label: "跟随主题" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
];

const FIELD_TYPE_LABELS: Record<DatabaseFieldType, string> = {
  text: "文本",
  number: "数字",
  select: "单选",
  multiSelect: "多选",
  date: "日期",
  checkbox: "勾选",
  url: "链接",
  relation: "关联",
};

const BEHAVIOUR_TOGGLES: {
  key: keyof Pick<
    TableViewConfig,
    | "editable"
    | "selectable"
    | "sortable"
    | "filterable"
    | "resizable"
    | "reorderable"
    | "groupable"
  >;
  label: string;
  hint: string;
}[] = [
  { key: "editable", label: "可编辑", hint: "双击单元格进入编辑" },
  { key: "selectable", label: "可选择", hint: "点击行进行多选" },
  { key: "sortable", label: "可排序", hint: "点击列头按该列排序" },
  { key: "filterable", label: "可筛选", hint: "工具条显示列筛选" },
  { key: "resizable", label: "可调列宽", hint: "拖拽列头分隔线" },
  { key: "reorderable", label: "可拖拽列序", hint: "拖动列头调整顺序" },
  { key: "groupable", label: "可分组", hint: "工具条允许选择分组字段" },
];

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border px-3 py-3 last:border-b-0">
      <div className="mb-2 flex h-5 items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-medium">
          {title}
          {count !== undefined && (
            <Badge
              variant="muted"
              className="h-4 px-1 text-[10px] font-normal tabular-nums"
            >
              {count}
            </Badge>
          )}
        </h4>
        {action}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

/** Label + control on one baseline, used by the presentation section. */
function Row({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label
        htmlFor={htmlFor}
        title={hint}
        className="text-xs font-normal text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  const id = useId();
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3",
        disabled && "opacity-50",
      )}
    >
      <Label
        htmlFor={id}
        className={cn(
          "flex-col items-start gap-0.5 text-xs font-normal",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
        )}
      >
        <span>{label}</span>
        {hint && (
          <span className="text-[11px] font-normal text-muted-foreground">
            {hint}
          </span>
        )}
      </Label>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        className="mt-0.5"
        onCheckedChange={onChange}
      />
    </div>
  );
}

export function TableConfigEditor({
  config,
  source,
  readOnly,
  onChange,
  className,
}: DataViewConfigEditorProps<TableViewConfig>) {
  const fields = source.fields;
  const columns = useMemo(
    () => resolveTableColumns(config, fields),
    [config, fields],
  );
  const visibleColumns = useMemo(
    () => visibleTableColumns(config, fields),
    [config, fields],
  );
  const fieldById = useMemo(
    () => new Map(fields.map((field) => [field.id, field])),
    [fields],
  );
  const primaryId = useMemo(() => primaryFieldId(fields), [fields]);

  const disabled = !onChange;
  const patch = (next: Partial<TableViewConfig>) =>
    onChange?.({ ...config, ...next } as TableViewConfig);

  const writeColumns = (next: TableColumnConfig[]) => patch({ columns: next });

  const toggleVisibility = (fieldId: string, visible: boolean) => {
    // Visibility is stored twice on purpose: `columns[].visible` is the
    // per-column setting, `hiddenFieldIds` is the shortcut the header menu
    // writes. The editor owns the former and drops the id from the latter so
    // the two never fight.
    writeColumns(
      columns.map((column) =>
        column.fieldId === fieldId ? { ...column, visible } : column,
      ),
    );
    patch({
      hiddenFieldIds: (config.hiddenFieldIds ?? []).filter(
        (hidden) => hidden !== fieldId,
      ),
    });
  };

  const setWidth = (fieldId: string, width: number | undefined) => {
    writeColumns(
      columns.map((column) =>
        column.fieldId === fieldId ? { ...column, width } : column,
      ),
    );
  };

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= columns.length) return;
    const next = [...columns];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    writeColumns(next);
  };

  const sortState = config.sortState ?? [];

  return (
    <TooltipProvider delayDuration={400}>
      <div
        data-dataview-table-config
        className={cn("flex flex-col text-xs", className)}
      >
        {readOnly && (
          <p className="border-b border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            数据为只读投影；下面的选项只影响本视图的呈现。
          </p>
        )}

        <Section
          title="列"
          count={visibleColumns.length}
          action={
            (config.hiddenFieldIds ?? []).length > 0 ? (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="h-5 gap-1 px-1.5 text-[11px] text-muted-foreground"
                disabled={disabled}
                onClick={() => patch({ hiddenFieldIds: [] })}
              >
                <RotateCcw className="size-3" />
                恢复隐藏的 {(config.hiddenFieldIds ?? []).length} 列
              </Button>
            ) : undefined
          }
        >
          {columns.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              该数据源没有字段。
            </p>
          )}
          {columns.map((column, index) => {
            const field: DatabaseField | undefined = fieldById.get(
              column.fieldId,
            );
            if (!field) return null;
            const visible = isColumnVisible(column, config);
            return (
              <div
                key={column.fieldId}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 hover:border-border hover:bg-muted/40",
                  !visible && "opacity-55",
                )}
              >
                <Checkbox
                  aria-label={`显示 ${field.name}`}
                  checked={visible}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    toggleVisibility(column.fieldId, checked === true)
                  }
                />
                <span className="min-w-0 flex-1 truncate" title={field.name}>
                  {field.name}
                  {field.id === primaryId && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                      主列
                    </span>
                  )}
                </span>
                <Badge
                  variant="muted"
                  className="h-4 shrink-0 px-1 text-[10px] font-normal"
                >
                  {FIELD_TYPE_LABELS[field.type]}
                </Badge>
                <InputGroup className="h-6 w-[4.5rem] shrink-0 rounded-sm">
                  <InputGroupInput
                    aria-label={`${field.name} 列宽`}
                    type="number"
                    min={40}
                    placeholder="自动"
                    className="h-6 px-1.5 text-[11px] tabular-nums"
                    value={column.width ?? ""}
                    disabled={disabled}
                    onChange={(event) => {
                      const value = event.target.value;
                      setWidth(
                        column.fieldId,
                        value === "" ? undefined : Number(value),
                      );
                    }}
                  />
                  <InputGroupAddon
                    align="inline-end"
                    className="py-0 pr-1.5 pl-0 text-[10px]"
                  >
                    px
                  </InputGroupAddon>
                </InputGroup>
                <div className="flex shrink-0 items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`上移 ${field.name}`}
                        disabled={disabled || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="size-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">上移</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`下移 ${field.name}`}
                        disabled={disabled || index === columns.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="size-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">下移</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </Section>

        <Section
          title="排序"
          count={sortState.length}
          action={
            sortState.length > 0 ? (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="h-5 px-1.5 text-[11px] text-muted-foreground"
                disabled={disabled}
                onClick={() => patch({ sortState: [] })}
              >
                清除
              </Button>
            ) : undefined
          }
        >
          {sortState.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              点击列头可按该列排序，按住 Shift 可叠加多列。
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-1">
              {sortState.map((sort) => {
                const field = fieldById.get(sort.fieldId);
                return (
                  <Badge
                    key={sort.fieldId}
                    variant="secondary"
                    className="h-5 gap-1 pl-1.5 text-[11px] font-normal"
                  >
                    {sort.order === "asc" ? (
                      <ArrowUp className="size-3 text-primary" />
                    ) : (
                      <ArrowDown className="size-3 text-primary" />
                    )}
                    {field?.name ?? sort.fieldId}
                    <button
                      type="button"
                      aria-label={`取消按 ${field?.name ?? sort.fieldId} 排序`}
                      disabled={disabled}
                      className="ml-0.5 rounded-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none"
                      onClick={() =>
                        patch({
                          sortState: sortState.filter(
                            (item) => item.fieldId !== sort.fieldId,
                          ),
                        })
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="行为">
          {BEHAVIOUR_TOGGLES.map((toggle) => (
            <ToggleRow
              key={toggle.key}
              label={toggle.label}
              hint={toggle.hint}
              checked={Boolean(config[toggle.key])}
              disabled={disabled || (readOnly && toggle.key === "editable")}
              onChange={(next) => patch({ [toggle.key]: next })}
            />
          ))}
        </Section>

        <Section title="呈现">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">行密度</span>
            <ToggleGroup
              type="single"
              value={config.density}
              disabled={disabled}
              aria-label="行密度"
              className="w-full rounded-md border border-border p-0.5"
              onValueChange={(value) => {
                if (!value) return;
                patch({ density: value as TableViewConfig["density"] });
              }}
            >
              {DENSITY_OPTIONS.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  size="xs"
                  className="h-6 flex-1 rounded-[calc(var(--radius)-4px)] text-[11px] text-muted-foreground data-[state=on]:bg-muted data-[state=on]:text-foreground"
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Row label="主题">
            <Select
              value={config.theme}
              disabled={disabled}
              onValueChange={(value) =>
                patch({ theme: value as TableViewConfig["theme"] })
              }
            >
              <SelectTrigger
                size="sm"
                aria-label="主题"
                className="h-7 w-28 py-1 text-[11px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-[11px]"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>

          <Row label="冻结列数" hint="从左侧冻结的列数">
            <Input
              aria-label="冻结列数"
              type="number"
              min={0}
              max={Math.max(0, columns.length)}
              className="h-7 w-16 px-2 text-[11px] tabular-nums"
              value={config.frozenColumnCount}
              disabled={disabled}
              onChange={(event) =>
                patch({
                  frozenColumnCount: Math.max(
                    0,
                    Number(event.target.value) || 0,
                  ),
                })
              }
            />
          </Row>

          <Row label="渲染上限" hint="留空则渲染全部行（VTable 自带虚拟滚动）">
            <Input
              aria-label="渲染上限"
              type="number"
              min={1}
              placeholder="全部"
              className="h-7 w-20 px-2 text-[11px] tabular-nums"
              value={config.rowLimit ?? ""}
              disabled={disabled}
              onChange={(event) => {
                const value = event.target.value;
                patch({
                  rowLimit:
                    value === "" ? undefined : Math.max(1, Number(value) || 1),
                });
              }}
            />
          </Row>

          <ToggleRow
            label="显示行号"
            checked={config.showRowNumber}
            disabled={disabled}
            onChange={(next) => patch({ showRowNumber: next })}
          />
        </Section>
      </div>
    </TooltipProvider>
  );
}
