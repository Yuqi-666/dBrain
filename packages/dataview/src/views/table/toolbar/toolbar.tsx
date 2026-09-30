"use client";

/**
 * The table view's toolbar — the single control strip of the view
 * (`docs/propmt/dataview-table-1.md` §toolbar).
 *
 * Layout contract (keep it): **view configuration on the left, view functions on
 * the right**, every control a button or a dropdown menu.
 *
 *   left   添加记录 · 字段配置 · 筛选 · 分组 · 排序 · 行高 · 填色
 *   right  导出 · 搜索 · 更多
 *
 * There is no side config panel and no generic 视图配置 popover: every setting
 * this view exposes has a dedicated menu (the leftover toggles keep their
 * defaults, and the ones the header/field menus can already write — hidden
 * columns, frozen columns, sort state — are written from there).
 *
 * It is one control row (`min-h-9`, controls `h-7`), quiet (muted-foreground,
 * hairline separators) and `--primary` is spent only on state the user has
 * engaged — an active filter / grouping / sort / colour rule, an open search
 * box — never on plain affordances.
 *
 * **The function group is fixed-size by construction.** The row is right-anchored
 * (`flex-1` config group + `shrink-0` function group), and in a flex row an
 * item's x depends only on the widths of the items *after* it — so a control
 * that appears, disappears or changes width drags itself (and, if it sits
 * before a neighbour, that neighbour too) around on every re-render. Everything
 * that used to do that is gone: the 删除选中 button (item removed by design —
 * rows are deleted from the cell context menu), and the search box with its
 * per-keystroke counter/addon, which now lives in its own row below
 * (`TableSearchBar`). Only the row-count readout on the left may change width,
 * and it changes into empty space. Keep it that way: no conditional buttons and
 * no auto-width counters in this group.
 */
import { useMemo } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  Rows2,
  Rows3,
  Rows4,
  Search,
  SortAsc,
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
import { Separator } from "@workspace/ui/components/ui/separator";
import { Switch } from "@workspace/ui/components/ui/switch";
import { TooltipProvider } from "@workspace/ui/components/ui/tooltip";
import type {
  DatabaseField,
  DataRow,
  TableColorRule,
  TableCondition,
  TableViewConfig,
} from "@workspace/interfaces";

import { TableColorMenu } from "../menus/color-menu";
import { TableConditionMenu } from "../menus/condition-menu";
import { TableFieldMenu, type AddFieldRequest } from "../menus/field-menu";
import { TableFilterMenu } from "../menus/filter-menu";
import { TableSearchBar } from "./search-bar";
import type { TableFilterState } from "../core/filter";
import { visibleTableColumns } from "../core/schema";
import { useViewActions } from "../../../toolbar/view-actions";

/**
 * Row height, as the design names it: 低 / 中等 / 高.
 *
 * The persisted enum stays `compact | comfortable | spacious` (no schema
 * change) — only the wording the user sees is renamed.
 */
const DENSITY_OPTIONS: {
  value: TableViewConfig["density"];
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "compact", label: "低", icon: Rows2 },
  { value: "comfortable", label: "中等", icon: Rows3 },
  { value: "spacious", label: "高", icon: Rows4 },
];

/**
 * `config.sortState` as the 排序 menu's condition list.
 *
 * A condition whose field no longer exists is dropped (self-healing), but an
 * empty (not-yet-chosen) field is kept so the row stays visible; the table
 * filters unusable entries out before handing them to VTable.
 */
export function activeSortConditions(
  sortState: TableViewConfig["sortState"],
  fields: readonly DatabaseField[],
): TableCondition[] {
  const known = new Set(fields.map((field) => field.id));
  return (sortState ?? []).filter(
    (entry) => Boolean(entry) && (!entry.fieldId || known.has(entry.fieldId)),
  );
}

/** `config.groupBy` / `config.groupOrder` → the 分组 menu's condition list. */
export function readGroupConditions(
  config: TableViewConfig,
  fields: readonly DatabaseField[],
): TableCondition[] {
  const known = new Set(fields.map((field) => field.id));
  return (config.groupBy ?? [])
    .filter((fieldId) => !fieldId || known.has(fieldId))
    .map((fieldId) => ({
      fieldId,
      order: config.groupOrder?.[fieldId] ?? "asc",
    }));
}

export interface TableToolbarProps {
  config: TableViewConfig;
  fields: DatabaseField[];
  rows: DataRow[];
  /** Data is read-only → field CRUD and row deletion are withheld. */
  readOnly?: boolean;

  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchMatchCount: number;
  searchIndex: number;
  onSearchStep: (direction: 1 | -1) => void;
  /** The 搜索 button toggles the search row below the strip. */
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;

  filters: TableFilterState;
  onFiltersChange: (next: TableFilterState) => void;

  /** Rows currently rendered (after filters) vs. all rows in the source. */
  visibleRowCount: number;
  totalRowCount: number;

  canInsertRow: boolean;
  onInsertRow: () => void;
  onExport: (format: "csv" | "excel") => void;

  /** Set by the shell to open the 新增字段 panel anchored at its own control. */
  addFieldRequest?: AddFieldRequest | null;
  /** Lets the field menu clear that request when its panel closes. */
  onAddFieldDismiss?: () => void;

  /** Absent when the host does not allow view management. */
  onConfigChange?: (config: TableViewConfig) => void;
  /** Absent when the host does not allow data edits (field CRUD). */
  onFieldsChange?: (fields: DatabaseField[], rows?: DataRow[]) => void;

  className?: string;
}

export function TableToolbar({
  config,
  fields,
  rows,
  readOnly,
  searchQuery,
  onSearchQueryChange,
  searchMatchCount,
  searchIndex,
  onSearchStep,
  searchOpen,
  onSearchOpenChange,
  filters,
  onFiltersChange,
  visibleRowCount,
  totalRowCount,
  canInsertRow,
  onInsertRow,
  onExport,
  addFieldRequest,
  onAddFieldDismiss,
  onConfigChange,
  onFieldsChange,
  className,
}: TableToolbarProps) {
  const viewActions = useViewActions();
  const columns = useMemo(
    () => visibleTableColumns(config, fields),
    [config, fields],
  );
  const sortConditions = useMemo(
    () => activeSortConditions(config.sortState, fields),
    [config.sortState, fields],
  );
  const groupConditions = useMemo(
    () => readGroupConditions(config, fields),
    [config, fields],
  );
  const colorRules = useMemo<TableColorRule[]>(
    () => config.colorRules ?? [],
    [config.colorRules],
  );

  const patchConfig = (patch: Partial<TableViewConfig>) => {
    onConfigChange?.({ ...config, ...patch } as TableViewConfig);
  };

  const writeSortConditions = (next: TableCondition[]) =>
    patchConfig({ sortState: next });

  const writeGroupConditions = (next: TableCondition[]) =>
    patchConfig({
      groupBy: next.map((condition) => condition.fieldId),
      groupOrder: Object.fromEntries(
        next.map((condition) => [condition.fieldId, condition.order]),
      ),
    });

  const writeColorRules = (next: TableColorRule[]) =>
    patchConfig({ colorRules: next });

  const densityLabel =
    DENSITY_OPTIONS.find((option) => option.value === config.density)?.label ??
    "中等";

  return (
    <TooltipProvider delayDuration={400}>
      <div
        data-dataview-table-toolbar
        className={cn(
          // Exactly one row, always. The configuration group is the only thing
          // that reflows (it wraps inside its own flex box); the function group
          // on the right is pinned to the right edge and never lands on another
          // line. With the whole strip wrapping, a resize — or a button that
          // appears only sometimes (删除选中) — flipped the right-hand buttons
          // between line 1 and line 2, so they visibly jumped back and forth.
          "flex min-h-9 shrink-0 items-start gap-1.5 border-b border-border bg-background px-2 py-1 text-xs",
          className,
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {/* ——————— 视图配置（左） ——————— */}

          {/* —— 添加记录 —— */}
          {canInsertRow && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 px-2 text-xs font-normal"
              onClick={onInsertRow}
            >
              <Plus className="size-3.5" />
              添加记录
            </Button>
          )}

          {/* —— 字段配置 —— */}
          <TableFieldMenu
            config={config}
            fields={fields}
            rows={rows}
            readOnly={readOnly}
            onFieldsChange={onFieldsChange}
            onConfigChange={onConfigChange}
            addFieldRequest={addFieldRequest}
            onAddFieldDismiss={onAddFieldDismiss}
          />

          {/* —— 筛选 —— */}
          {config.filterable && (
            <TableFilterMenu
              fields={fields}
              state={filters}
              disabled={!onConfigChange}
              onChange={onFiltersChange}
            />
          )}

          {/* —— 分组 —— */}
          {config.groupable && (
            <TableConditionMenu
              label="分组"
              title="设置分组条件"
              icon={Rows3}
              conditions={groupConditions}
              fields={fields}
              disabled={!onConfigChange}
              onChange={writeGroupConditions}
            />
          )}

          {/* —— 排序 —— */}
          {config.sortable && (
            <TableConditionMenu
              label="排序"
              title="设置排序条件"
              icon={SortAsc}
              conditions={sortConditions}
              fields={fields}
              disabled={!onConfigChange}
              onChange={writeSortConditions}
              headerExtra={
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  自动排序
                  <Switch
                    checked={config.autoSort ?? true}
                    disabled={!onConfigChange}
                    aria-label="自动排序"
                    onCheckedChange={(checked) =>
                      patchConfig({ autoSort: checked })
                    }
                  />
                </label>
              }
            />
          )}

          {/* —— 行高 —— */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!onConfigChange}
                className="h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground"
              >
                <Rows3 className="size-3.5" />
                行高
                <span className="text-foreground">{densityLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                设置行高
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DENSITY_OPTIONS.map(({ value, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={value}
                  onSelect={() => patchConfig({ density: value })}
                  className={cn(
                    "gap-2",
                    config.density === value && "text-primary",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      config.density === value
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* —— 填色 —— */}
          <TableColorMenu
            fields={fields}
            rules={colorRules}
            disabled={!onConfigChange}
            onChange={writeColorRules}
          />
        </div>

        {/* ——————— 视图功能（右） ——————— */}
        {/* One control row tall, pinned to the first row: it must not drift down
            as the configuration group wraps. Every control here is fixed-size
            and always present — a button that appears with a selection, or a
            counter that changes width per keystroke, drags its neighbours
            around on each re-render (see the file header). */}
        <div className="flex h-7 shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground"
              >
                <Download className="size-3.5" />
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
          {/* —— 搜索：只留一个按钮，输入栏在其下方单独一行 —— */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-pressed={searchOpen}
            className={cn(
              "h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground",
              searchOpen &&
                "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
            )}
            onClick={() => onSearchOpenChange(!searchOpen)}
          >
            <Search className="size-3.5" />
          </Button>

          {/* —— 更多（视图级操作：设为默认 / 复制 / 删除） —— */}
          {viewActions}
        </div>
      </div>

      {searchOpen && (
        <TableSearchBar
          query={searchQuery}
          onQueryChange={onSearchQueryChange}
          matchCount={searchMatchCount}
          index={searchIndex}
          onStep={onSearchStep}
          // Closing clears the query too, so no highlight is left behind with no
          // box to clear it from.
          onClose={() => {
            onSearchQueryChange("");
            onSearchOpenChange(false);
          }}
        />
      )}
    </TooltipProvider>
  );
}
