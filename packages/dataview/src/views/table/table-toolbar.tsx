"use client";

/**
 * The table view's own toolbar.
 *
 * It sits *inside* the renderer (below the DataViewRoot toolbar) and owns the
 * controls that only make sense for a table: search, per-column filters,
 * grouping, density, row insertion/deletion and export. Every mutation except
 * search is reported upward — `onConfigChange` for view config, the row
 * callbacks for data — never applied locally.
 *
 * Visual contract (keep it): this strip is exactly one control row tall
 * (`h-9`, controls `h-7`), it is quiet (muted-foreground, hairline separators)
 * and `--primary` is spent only on state the user has engaged — an active
 * filter or grouping — never on plain affordances.
 *
 * See `docs/dataview/table.md` §5.
 */
import { useMemo, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileText,
  Group,
  ListFilter,
  Plus,
  Rows2,
  Rows3,
  Rows4,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Input } from "@workspace/ui/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import { Separator } from "@workspace/ui/components/ui/separator";
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
import type { DatabaseField, TableViewConfig } from "@workspace/interfaces";

import {
  activeFilterCount,
  clearFilter,
  filterOperatorsForField,
  type TableFilterOperator,
  type TableFilterState,
} from "./table-filter";
import { visibleTableColumns } from "./table-schema";

/** Radix `Select` rejects an empty item value, so "not set" needs a sentinel. */
const NONE = "__none__";

const OPERATOR_LABELS: Record<TableFilterOperator, string> = {
  contains: "包含",
  equals: "等于",
  empty: "为空",
  notEmpty: "不为空",
};

const DENSITY_OPTIONS: {
  value: TableViewConfig["density"];
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "compact", label: "紧凑", icon: Rows2 },
  { value: "comfortable", label: "适中", icon: Rows3 },
  { value: "spacious", label: "宽松", icon: Rows4 },
];

/** Icon button with a tooltip in place of a visible label. */
function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export interface TableToolbarProps {
  config: TableViewConfig;
  fields: DatabaseField[];
  readOnly?: boolean;

  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchMatchCount: number;
  searchIndex: number;
  onSearchStep: (direction: 1 | -1) => void;

  filters: TableFilterState;
  onFiltersChange: (next: TableFilterState) => void;

  /** Rows currently rendered (after filters) vs. all rows in the source. */
  visibleRowCount: number;
  totalRowCount: number;
  selectedCount: number;

  canInsertRow: boolean;
  onInsertRow: () => void;
  onDeleteSelected: () => void;

  onExport: (format: "csv" | "excel") => void;
  /** Absent when the host does not allow view management. */
  onConfigChange?: (config: TableViewConfig) => void;

  className?: string;
}

export function TableToolbar({
  config,
  fields,
  readOnly,
  searchQuery,
  onSearchQueryChange,
  searchMatchCount,
  searchIndex,
  onSearchStep,
  filters,
  onFiltersChange,
  visibleRowCount,
  totalRowCount,
  selectedCount,
  canInsertRow,
  onInsertRow,
  onDeleteSelected,
  onExport,
  onConfigChange,
  className,
}: TableToolbarProps) {
  const columns = useMemo(
    () => visibleTableColumns(config, fields),
    [config, fields],
  );
  const fieldById = useMemo(
    () => new Map(fields.map((field) => [field.id, field])),
    [fields],
  );
  const filterCount = activeFilterCount(filters);

  const patchConfig = (patch: Partial<TableViewConfig>) => {
    onConfigChange?.({ ...config, ...patch } as TableViewConfig);
  };

  const setFilter = (fieldId: string, next: TableFilterState[string]) => {
    onFiltersChange({ ...filters, [fieldId]: next });
  };

  const groupValue = config.groupBy?.[0] ?? NONE;
  const grouped = groupValue !== NONE;
  const grouppableFields = useMemo(
    () =>
      fields.filter(
        (field) => field.type === "select" || field.type === "multiSelect",
      ),
    [fields],
  );

  return (
    <TooltipProvider delayDuration={400}>
      <div
        data-dataview-table-toolbar
        className={cn(
          "flex min-h-9 shrink-0 flex-wrap items-center gap-1.5 border-b border-border bg-background px-2 py-1 text-xs",
          className,
        )}
      >
        {/* —— 搜索 —— */}
        <InputGroup className="h-7 w-64 rounded-md">
          <InputGroupAddon align="inline-start" className="py-0 pr-0 pl-2">
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput
            value={searchQuery}
            placeholder="搜索表格"
            aria-label="搜索表格"
            className="h-7 text-xs"
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
          {searchQuery && (
            <InputGroupAddon
              align="inline-end"
              className="gap-0.5 py-0 pr-1 pl-0"
            >
              <span
                className={cn(
                  "px-1 text-[11px] tabular-nums",
                  searchMatchCount === 0
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {searchMatchCount === 0
                  ? "无结果"
                  : `${searchIndex + 1}/${searchMatchCount}`}
              </span>
              <InputGroupButton
                size="icon-xs"
                aria-label="上一个匹配"
                disabled={searchMatchCount === 0}
                onClick={() => onSearchStep(-1)}
              >
                <ChevronUp className="size-3.5" />
              </InputGroupButton>
              <InputGroupButton
                size="icon-xs"
                aria-label="下一个匹配"
                disabled={searchMatchCount === 0}
                onClick={() => onSearchStep(1)}
              >
                <ChevronDown className="size-3.5" />
              </InputGroupButton>
              <InputGroupButton
                size="icon-xs"
                aria-label="清除搜索"
                onClick={() => onSearchQueryChange("")}
              >
                <X className="size-3.5" />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>

        <Separator orientation="vertical" className="h-4 self-center" />

        {/* —— 筛选 —— */}
        {config.filterable && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  "h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground",
                  filterCount > 0 &&
                    "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                )}
              >
                <ListFilter className="size-3.5" />
                筛选
                {filterCount > 0 && (
                  <Badge className="h-4 min-w-4 justify-center rounded-sm px-1 text-[10px] leading-none">
                    {filterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <span className="text-xs font-medium">列筛选</span>
                {filterCount > 0 && (
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    className="h-6 px-1.5 text-[11px] text-muted-foreground"
                    onClick={() => onFiltersChange({})}
                  >
                    清除全部
                  </Button>
                )}
              </div>
              <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto p-3">
                {columns.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    没有可筛选的列。
                  </p>
                )}
                {columns.map((column) => {
                  const field = fieldById.get(column.fieldId);
                  if (!field) return null;
                  const filter = filters[field.id];
                  const operators = filterOperatorsForField(field);
                  const valueDisabled =
                    filter?.operator === "empty" ||
                    filter?.operator === "notEmpty";
                  const optionField =
                    field.type === "select" || field.type === "multiSelect";
                  return (
                    <div key={field.id} className="flex items-center gap-1.5">
                      <span
                        className="w-16 shrink-0 truncate text-[11px] text-muted-foreground"
                        title={field.name}
                      >
                        {field.name}
                      </span>
                      <Select
                        value={filter?.operator ?? NONE}
                        onValueChange={(value) => {
                          if (value === NONE) {
                            onFiltersChange(clearFilter(filters, field.id));
                            return;
                          }
                          setFilter(field.id, {
                            operator: value as TableFilterOperator,
                            value: filter?.value ?? "",
                          });
                        }}
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label={`${field.name} 筛选条件`}
                          className={cn(
                            "h-7 w-[5.25rem] shrink-0 py-1 pl-2 text-[11px]",
                            filter && "border-primary/40",
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE} className="text-[11px]">
                            不过滤
                          </SelectItem>
                          {operators.map((operator) => (
                            <SelectItem
                              key={operator}
                              value={operator}
                              className="text-[11px]"
                            >
                              {OPERATOR_LABELS[operator]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {optionField ? (
                        <Select
                          value={filter?.value || undefined}
                          disabled={!filter || valueDisabled}
                          onValueChange={(value) =>
                            setFilter(field.id, {
                              operator: filter?.operator ?? "equals",
                              value,
                            })
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            aria-label={`${field.name} 筛选值`}
                            className="h-7 min-w-0 flex-1 py-1 pl-2 text-[11px]"
                          >
                            <SelectValue placeholder="全部" />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options ?? []).map((option) => (
                              <SelectItem
                                key={option.id}
                                value={option.name}
                                className="text-[11px]"
                              >
                                {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          aria-label={`${field.name} 筛选值`}
                          className="h-7 min-w-0 flex-1 px-2 text-[11px]"
                          disabled={!filter || valueDisabled}
                          value={filter?.value ?? ""}
                          placeholder="筛选值"
                          onChange={(event) =>
                            setFilter(field.id, {
                              operator: filter?.operator ?? "contains",
                              value: event.target.value,
                            })
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* —— 分组 —— */}
        {config.groupable && (
          <Select
            value={groupValue}
            disabled={!onConfigChange}
            onValueChange={(value) =>
              patchConfig({ groupBy: value === NONE ? [] : [value] })
            }
          >
            <SelectTrigger
              size="sm"
              aria-label="分组字段"
              className={cn(
                "h-7 w-32 py-1 pl-2 text-[11px]",
                grouped &&
                  "border-primary/40 bg-primary/10 text-primary focus-visible:border-primary/40",
              )}
            >
              <Group className="size-3.5 shrink-0" />
              <SelectValue placeholder="不分组" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE} className="text-[11px]">
                不分组
              </SelectItem>
              {grouppableFields.map((field) => (
                <SelectItem
                  key={field.id}
                  value={field.id}
                  className="text-[11px]"
                >
                  {field.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Separator orientation="vertical" className="h-4 self-center" />

        {/* —— 行操作 —— */}
        {canInsertRow && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 px-2 text-xs font-normal"
            onClick={onInsertRow}
          >
            <Plus className="size-3.5" />
            新增行
          </Button>
        )}

        {!readOnly && selectedCount > 0 && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-7 gap-1.5 px-2 text-xs font-normal"
            onClick={onDeleteSelected}
          >
            <Trash2 className="size-3.5" />
            删除 {selectedCount} 行
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {visibleRowCount === totalRowCount ? (
              <>
                {totalRowCount} 行 · {columns.length} 列
              </>
            ) : (
              <>
                <Badge
                  variant="muted"
                  className="h-4 px-1 text-[10px] tabular-nums"
                >
                  {visibleRowCount} / {totalRowCount}
                </Badge>{" "}
                行 · {columns.length} 列
              </>
            )}
          </span>

          {/* —— 密度 —— */}
          <ToggleGroup
            type="single"
            value={config.density}
            disabled={!onConfigChange}
            aria-label="行密度"
            className="rounded-md border border-border p-0.5"
            onValueChange={(value) => {
              if (!value) return;
              patchConfig({ density: value as TableViewConfig["density"] });
            }}
          >
            {DENSITY_OPTIONS.map(({ value, label, icon: Icon }) => (
              <Tip key={value} label={label}>
                <ToggleGroupItem
                  value={value}
                  size="xs"
                  aria-label={label}
                  className="size-6 min-w-6 rounded-[calc(var(--radius)-4px)] text-muted-foreground data-[state=on]:bg-muted data-[state=on]:text-foreground"
                >
                  <Icon className="size-3.5" />
                </ToggleGroupItem>
              </Tip>
            ))}
          </ToggleGroup>

          {/* —— 导出 —— */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 px-2 text-xs font-normal"
              >
                <Download className="size-3.5" />
                导出
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                导出为
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onExport("csv")}>
                <FileText className="size-4" />
                CSV 文件
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onExport("excel")}>
                <FileSpreadsheet className="size-4" />
                Excel 工作簿
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
