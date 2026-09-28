"use client";

/**
 * The table data view — a VTable `ListTable` driven through React.
 *
 * The shell follows the same shape as the graph package's `ForceGraph`: React
 * owns nothing but a container `<div>` and the view-level UI state, while the
 * imperative table instance is created once per structural config change and
 * released on unmount (table.md §7). Records are pushed with `setRecords`
 * rather than by rebuilding the instance, so editing does not reset scroll or
 * sort.
 *
 * Rendering never writes: every edit is reported through `onCellChange`, view
 * config changes through `onConfigChange`, and row insert/delete through the row
 * callbacks. The host node-content decides how to persist (README §3.4).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Table2 } from "lucide-react";
import { ListTable, TYPES } from "@visactor/vtable";
import type { ListTableConstructorOptions } from "@visactor/vtable";
import { SearchComponent } from "@visactor/vtable-search";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/ui/button";
import type {
  DatabaseField,
  DataRow,
  TableColumnConfig,
  TableViewConfig,
} from "@workspace/interfaces";

import { DataViewEmptyState } from "../../shared/empty-state";
import { useDataViewThemeTokens } from "../../shared/theme-tokens";
import type { DataViewRendererProps } from "../../source/types";
import { createTableEditor } from "./table-editors";
import {
  applyTableFilters,
  readFilterState,
  type TableFilterState,
} from "./table-filter";
import {
  TABLE_DENSITY_HEADER_HEIGHT,
  TABLE_DENSITY_ROW_HEIGHT,
  TABLE_ROW_ID_FIELD,
  buildTableColumns,
  createDataRowId,
  effectiveFrozenColumnCount,
  isFieldEditable,
  recordValueToCell,
  reorderTableColumns,
  resolveTableColumns,
  rowsToRecords,
  visibleTableColumns,
  type TableRecord,
} from "./table-schema";
import { TableToolbar } from "./table-toolbar";
import { buildTableTheme } from "./table-theme";

/** Menu keys the column context menu reports back. */
const MENU = {
  sortAsc: "dv_sort_asc",
  sortDesc: "dv_sort_desc",
  hideColumn: "dv_hide_column",
  freezeTo: "dv_freeze_to",
  unfreeze: "dv_unfreeze",
  showAll: "dv_show_all",
} as const;

function asFieldId(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * VTable hands some listeners a `BaseTableAPI`; the instance behind it is the
 * `ListTable` we created, so narrowing is safe and confined to this helper.
 */
function asListTable(table: unknown): ListTable {
  return table as ListTable;
}

/** The record id behind a cell, read from the event or the table itself. */
function rowIdFromArgs(
  table: ListTable,
  args: { col: number; row: number; originData?: unknown },
): string | undefined {
  const record = (args.originData ??
    table.getCellOriginRecord(args.col, args.row)) as
    | Record<string, unknown>
    | undefined;
  return asFieldId(record?.[TABLE_ROW_ID_FIELD]);
}

/** The field a cell belongs to, tolerating events that omit it. */
function fieldIdFromArgs(
  table: ListTable,
  args: { col: number; row: number; field?: unknown },
): string | undefined {
  const fromEvent = asFieldId(args.field);
  if (fromEvent) return fromEvent;
  const define = table.getBodyColumnDefine(args.col, args.row) as
    | { field?: unknown }
    | undefined;
  return asFieldId(define?.field);
}

/** The field a header or body cell belongs to, resolved either way. */
function fieldIdAt(
  table: ListTable,
  col: number,
  row: number,
): string | undefined {
  const header = table.getHeaderDefine(col, 0) as
    | { field?: unknown }
    | undefined;
  const fromHeader = asFieldId(header?.field);
  if (fromHeader) return fromHeader;
  const body = table.getBodyColumnDefine(col, row) as
    | { field?: unknown }
    | undefined;
  return asFieldId(body?.field);
}

/** Row ids currently covered by VTable's selection. */
function selectedRowIds(table: ListTable): string[] {
  const ids = new Set<string>();
  for (const range of table.getSelectedCellRanges() ?? []) {
    for (let row = range.start.row; row <= range.end.row; row += 1) {
      const record = table.getCellOriginRecord(range.start.col, row) as
        | Record<string, unknown>
        | undefined;
      const id = asFieldId(record?.[TABLE_ROW_ID_FIELD]);
      if (id) ids.add(id);
    }
  }
  return Array.from(ids);
}

/**
 * The record ids in the order the table currently displays them.
 *
 * The first column is tried first, but the row-number series does not always
 * resolve to a record, so the body columns are probed until one does.
 */
function rowIdsInTableOrder(table: ListTable): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (let row = 0; row < table.rowCount; row += 1) {
    let record: Record<string, unknown> | undefined;
    for (let col = 0; col < table.colCount && !record; col += 1) {
      const candidate = table.getCellOriginRecord(col, row) as
        | Record<string, unknown>
        | undefined;
      if (candidate && asFieldId(candidate[TABLE_ROW_ID_FIELD])) {
        record = candidate;
      }
    }
    const id = asFieldId(record?.[TABLE_ROW_ID_FIELD]);
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/** `config.sortState` → VTable's `SortState[]`. */
function toVTableSortState(
  sortState: TableViewConfig["sortState"],
): TYPES.SortState[] {
  return (sortState ?? [])
    .filter((entry) => entry && entry.fieldId)
    .map((entry) => ({ field: entry.fieldId, order: entry.order }));
}

/** VTable's current sort state → `config.sortState`. */
function fromVTableSortState(
  sortState: TYPES.SortState | TYPES.SortState[] | null,
): NonNullable<TableViewConfig["sortState"]> {
  const list = Array.isArray(sortState)
    ? sortState
    : sortState
      ? [sortState]
      : [];
  return list.flatMap((entry) => {
    const order = String(entry.order).toLowerCase();
    if (order !== "asc" && order !== "desc") return [];
    return [{ fieldId: String(entry.field), order }];
  });
}

/**
 * Reads the visual column order and widths back out of a live table.
 *
 * The header defines are the reliable index: the body column offset shifts when
 * a row-number series is present, whereas `getHeaderDefine(col, 0)` yields one
 * entry per visual column, series included.
 */
function readColumnLayout(
  table: ListTable,
  config: TableViewConfig,
  fields: readonly DatabaseField[],
): TableColumnConfig[] {
  const resolved = resolveTableColumns(config, fields);
  const known = new Set(resolved.map((column) => column.fieldId));
  const order: string[] = [];
  const widths = new Map<string, number>();

  for (let col = 0; col < table.colCount; col += 1) {
    const define = table.getHeaderDefine(col, 0) as
      | { field?: unknown }
      | undefined;
    const fieldId = asFieldId(define?.field);
    if (!fieldId || !known.has(fieldId) || order.includes(fieldId)) continue;
    order.push(fieldId);
    const width = table.getColWidth(col);
    if (Number.isFinite(width) && width > 0) {
      widths.set(fieldId, Math.round(width));
    }
  }

  if (order.length === 0) return resolved;
  return reorderTableColumns(config, fields, order).map((column) =>
    widths.has(column.fieldId)
      ? { ...column, width: widths.get(column.fieldId) }
      : column,
  );
}

/** The state a `[recreate]` effect keys off — everything but data and sort. */
function tableStructureKey(
  config: TableViewConfig,
  fields: readonly DatabaseField[],
  readOnly: boolean | undefined,
): string {
  return JSON.stringify({
    readOnly: Boolean(readOnly),
    fields: fields.map(
      (field) =>
        `${field.id}\u0001${field.name}\u0001${field.type}\u0001${(
          field.options ?? []
        )
          .map((option) => `${option.id}=${option.name}`)
          .join(",")}`,
    ),
    columns: resolveTableColumns(config, fields).map((column) => ({
      fieldId: column.fieldId,
      visible: column.visible,
      width: column.width,
      cellTypeOverride: column.cellTypeOverride,
      emptyText: column.format?.emptyText,
    })),
    hidden: config.hiddenFieldIds ?? [],
    editable: config.editable,
    selectable: config.selectable,
    sortable: config.sortable,
    resizable: config.resizable,
    reorderable: config.reorderable,
    groupable: config.groupable,
    density: config.density,
    frozen: config.frozenColumnCount,
    showRowNumber: config.showRowNumber,
    groupBy: config.groupBy ?? [],
  });
}

export function TableDataView({
  source,
  config,
  readOnly,
  onCellChange,
  onOpenRecord,
  onOpenNode,
  onConfigChange,
  onRowInsert,
  onRowDelete,
  onRowReorder,
  resolveNodeTitle,
  className,
}: DataViewRendererProps<TableViewConfig>) {
  const tokens = useDataViewThemeTokens(config.theme);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<ListTable | null>(null);
  const searchRef = useRef<SearchComponent | null>(null);
  const sortStateRef = useRef<TYPES.SortState[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatch, setSearchMatch] = useState({ count: 0, index: -1 });
  const [selectedCount, setSelectedCount] = useState(0);

  const filters = useMemo(
    () => readFilterState(config.filterState),
    [config.filterState],
  );

  const records = useMemo(
    () => rowsToRecords(source, { resolveNodeTitle }),
    [source, resolveNodeTitle],
  );

  const filteredRecords = useMemo(
    () => applyTableFilters(records, filters),
    [records, filters],
  );

  /**
   * What VTable is actually given: `rowLimit` is a render cap, not a data
   * filter (table.md §9) — the full row count stays visible in the toolbar.
   */
  const displayRecords = useMemo(
    () =>
      config.rowLimit && config.rowLimit > 0
        ? filteredRecords.slice(0, config.rowLimit)
        : filteredRecords,
    [filteredRecords, config.rowLimit],
  );

  const columns = useMemo(
    () => visibleTableColumns(config, source.fields),
    [config, source.fields],
  );

  const structureKey = useMemo(
    () => tableStructureKey(config, source.fields, readOnly),
    [config, source.fields, readOnly],
  );

  /**
   * Latest values for the VTable listeners, which are attached once per table
   * instance and would otherwise close over the render that created them.
   */
  const latest = useRef({
    config,
    source,
    readOnly,
    filters,
    resolveNodeTitle,
    onCellChange,
    onOpenRecord,
    onOpenNode,
    onConfigChange,
    onRowInsert,
    onRowDelete,
    onRowReorder,
  });
  useEffect(() => {
    latest.current = {
      config,
      source,
      readOnly,
      filters,
      resolveNodeTitle,
      onCellChange,
      onOpenRecord,
      onOpenNode,
      onConfigChange,
      onRowInsert,
      onRowDelete,
      onRowReorder,
    };
  });

  const patchConfig = useCallback((patch: Partial<TableViewConfig>) => {
    const current = latest.current.config;
    latest.current.onConfigChange?.({
      ...current,
      ...patch,
    } as TableViewConfig);
  }, []);

  /** The records VTable currently owns, so a rejected edit can be reverted. */
  const filteredRecordsRef = useRef<TableRecord[]>([]);
  useEffect(() => {
    filteredRecordsRef.current = displayRecords;
  }, [displayRecords]);

  /** Re-pushes the records VTable owns, undoing a rejected in-place edit. */
  const restoreRecords = useCallback(() => {
    const table = tableRef.current;
    if (!table) return;
    table.setRecords(filteredRecordsRef.current, {
      sortState: sortStateRef.current,
    });
  }, []);

  const buildOptions = useCallback(
    (
      nextConfig: TableViewConfig,
      nextSource: typeof source,
      nextReadOnly: boolean | undefined,
    ): ListTableConstructorOptions => {
      const density = nextConfig.density;
      const editable = !nextReadOnly && nextConfig.editable;
      const columnsDefine = buildTableColumns({
        config: nextConfig,
        fields: nextSource.fields,
        readOnly: nextReadOnly,
        resolveEditor: createTableEditor,
        interactiveColor: tokens.primary,
      });
      const fieldById = new Map(
        nextSource.fields.map((field) => [field.id, field]),
      );

      const columnMenu = (
        fieldId: string | undefined,
      ): TYPES.MenuListItem[] => {
        if (!fieldId || !fieldById.has(fieldId)) return [];
        return [
          { text: "升序排列", menuKey: MENU.sortAsc },
          { text: "降序排列", menuKey: MENU.sortDesc },
          { type: "split" },
          { text: "隐藏该列", menuKey: MENU.hideColumn },
          { text: "冻结到此列", menuKey: MENU.freezeTo },
          { text: "取消冻结", menuKey: MENU.unfreeze },
          { type: "split" },
          { text: "显示全部列", menuKey: MENU.showAll },
        ];
      };

      const groupBy = (nextConfig.groupBy ?? []).filter((fieldId) =>
        fieldById.has(fieldId),
      );

      return {
        container: containerRef.current,
        records: [],
        columns: columnsDefine,
        widthMode: "standard",
        // `standard` (not `adaptive`) is deliberate: `adaptive` re-computes row
        // heights to fill the container, which stretches four rows across the
        // whole pane. With `standard` the configured density is respected and
        // the table still fills the pane once the rows are taller than it.
        heightMode: "standard",
        autoFillWidth: true,
        defaultRowHeight: TABLE_DENSITY_ROW_HEIGHT[density],
        defaultHeaderRowHeight: TABLE_DENSITY_HEADER_HEIGHT[density],
        defaultColWidth: 140,
        frozenColCount: effectiveFrozenColumnCount(
          nextConfig,
          nextSource.fields,
        ),
        theme: buildTableTheme(tokens),
        ...(groupBy.length > 0 ? { groupBy } : {}),
        ...(nextConfig.showRowNumber
          ? {
              rowSeriesNumber: {
                title: "#",
                // Wide enough for the drag handle the reorder mode draws in
                // the same cell, plus a two-digit number.
                width: 56,
                dragOrder: nextConfig.reorderable,
                style: {
                  color: tokens.mutedForeground,
                  bgColor: tokens.muted,
                  padding: [7, 2],
                },
                headerStyle: { bgColor: tokens.muted },
              },
            }
          : {}),
        sortState: toVTableSortState(nextConfig.sortState),
        multipleSort: true,
        ...(editable
          ? { editCellTrigger: "doubleclick" as const }
          : { editCellTrigger: "api" as const }),
        keyboardOptions: {
          moveFocusCellOnTab: true,
          editCellOnEnter: true,
          selectAllOnCtrlA: true,
          copySelected: true,
          moveSelectedCellOnArrowKeys: true,
          ctrlMultiSelect: true,
          shiftMultiSelect: true,
        },
        select: {
          highlightMode: nextConfig.selectable ? "row" : "cell",
          disableSelect: !nextConfig.selectable,
          headerSelectMode: "inline",
          blankAreaClickDeselect: true,
        },
        hover: { highlightMode: "row" },
        tooltip: {
          isShowOverflowTextTooltip: true,
          renderMode: "html",
          confine: true,
        },
        resize: {
          columnResizeMode: nextConfig.resizable ? "header" : "none",
          rowResizeMode: "none",
        },
        dragOrder: {
          dragHeaderMode: nextConfig.reorderable ? "all" : "none",
        },
        menu: {
          renderMode: "html",
          contextMenuItems: (field, row, col, table) => {
            const fieldId =
              asFieldId(field) ??
              (table ? fieldIdAt(asListTable(table), col, row) : undefined);
            return columnMenu(fieldId);
          },
          defaultHeaderMenuItems: (args) =>
            columnMenu(fieldIdAt(asListTable(args.table), args.col, args.row)),
        },
        emptyTip: {
          text: "暂无数据，点击「新增行」开始录入",
        },
      } as ListTableConstructorOptions;
    },
    [tokens],
  );

  /** Persist the live sort state into the view config. */
  const persistSortState = useCallback((table: ListTable) => {
    const next = fromVTableSortState(table.sortState ?? null);
    sortStateRef.current = toVTableSortState(next);
    latest.current.onConfigChange?.({
      ...latest.current.config,
      sortState: next,
    });
  }, []);

  const attachListeners = useCallback(
    (table: ListTable) => {
      table.on("change_cell_value", (args) => {
        const fieldId = fieldIdFromArgs(table, args);
        const rowId = rowIdFromArgs(table, args);
        const field = fieldId
          ? latest.current.source.fields.find((entry) => entry.id === fieldId)
          : undefined;
        if (!fieldId || !rowId || !field) return;
        if (
          !isFieldEditable(
            field,
            latest.current.config,
            latest.current.readOnly,
          )
        ) {
          restoreRecords();
          return;
        }
        const cell = recordValueToCell(field, args.changedValue);
        if (!cell) {
          // Rejected input (bad number / date / url) never reaches the store;
          // re-stamping the records reverts the canvas instead of leaving the
          // invalid text on screen.
          restoreRecords();
          return;
        }
        latest.current.onCellChange?.(rowId, fieldId, cell);
      });

      table.on("checkbox_state_change", (args) => {
        const fieldId = fieldIdFromArgs(table, args);
        const rowId = rowIdFromArgs(table, args);
        if (!fieldId || !rowId) return;
        const field = latest.current.source.fields.find(
          (entry) => entry.id === fieldId,
        );
        if (!field) return;
        if (
          !isFieldEditable(
            field,
            latest.current.config,
            latest.current.readOnly,
          )
        ) {
          restoreRecords();
          return;
        }
        latest.current.onCellChange?.(rowId, fieldId, {
          type: "checkbox",
          checked: Boolean(args.checked),
        });
      });

      table.on("click_cell", (args) => {
        if (args.cellLocation !== "body") return;
        const fieldId = fieldIdFromArgs(table, args);
        if (!fieldId) return;
        const field = latest.current.source.fields.find(
          (entry) => entry.id === fieldId,
        );
        if (field?.type !== "relation") return;
        const rowId = rowIdFromArgs(table, args);
        const cell = rowId
          ? latest.current.source.rows.find((row) => row.id === rowId)?.cells[
              fieldId
            ]
          : undefined;
        const [nodeId] = cell?.type === "relation" ? (cell.nodeIds ?? []) : [];
        if (nodeId) latest.current.onOpenNode?.(nodeId);
      });

      table.on("dblclick_cell", (args) => {
        // Editable cells consume the double-click to start editing; a
        // read-only row (collection projection) opens the record instead.
        if (!latest.current.readOnly) return;
        if (args.cellLocation !== "body") return;
        const rowId = rowIdFromArgs(table, args);
        if (rowId) {
          latest.current.onOpenRecord?.(rowId, latest.current.source);
        }
      });

      table.on("after_sort", () => persistSortState(table));

      const persistLayout = () => {
        const layout = readColumnLayout(
          table,
          latest.current.config,
          latest.current.source.fields,
        );
        latest.current.onConfigChange?.({
          ...latest.current.config,
          columns: layout,
        });
      };

      /**
       * Drag-reordering rows only makes sense against the complete row set: a
       * filter or `rowLimit` hides rows the user cannot see, and reporting a
       * partial order would silently move the hidden ones.
       */
      const persistRowOrder = () => {
        const current = latest.current;
        if (!current.onRowReorder) return;
        if (table.recordsCount !== current.source.rows.length) return;
        const rowIds = rowIdsInTableOrder(table);
        if (rowIds.length !== current.source.rows.length) return;
        current.onRowReorder(rowIds);
      };

      table.on("resize_column_end", persistLayout);
      table.on("change_header_position", (args) => {
        /**
         * VTable reports the drag axis only for programmatic moves; a drag
         * started from the row-number handle arrives with `movingColumnOrRow`
         * unset, so the source column identifies it instead.
         */
        const movedRows =
          args.movingColumnOrRow === "row" ||
          (args.movingColumnOrRow === undefined &&
            table.isSeriesNumber(args.source.col, args.source.row));
        if (movedRows) persistRowOrder();
        else persistLayout();
      });

      const refreshSelection = () =>
        setSelectedCount(selectedRowIds(table).length);
      table.on("selected_cell", refreshSelection);
      table.on("selected_changed", refreshSelection);
      table.on("selected_clear", refreshSelection);
      table.on("drag_select_end", refreshSelection);

      table.on("dropdown_menu_click", (args) => {
        const fieldId = fieldIdAt(table, args.col, args.row);
        if (!fieldId) return;
        const current = latest.current.config;
        const visibleIds = visibleTableColumns(
          current,
          latest.current.source.fields,
        ).map((column) => column.fieldId);

        switch (args.menuKey) {
          case MENU.sortAsc:
            table.updateSortState({ field: fieldId, order: "asc" });
            persistSortState(table);
            return;
          case MENU.sortDesc:
            table.updateSortState({ field: fieldId, order: "desc" });
            persistSortState(table);
            return;
          case MENU.hideColumn: {
            if (visibleIds.length <= 1) return;
            patchConfig({
              hiddenFieldIds: Array.from(
                new Set([...(current.hiddenFieldIds ?? []), fieldId]),
              ),
            });
            return;
          }
          case MENU.freezeTo: {
            const index = visibleIds.indexOf(fieldId);
            if (index < 0) return;
            patchConfig({ frozenColumnCount: index + 1 });
            return;
          }
          case MENU.unfreeze:
            patchConfig({ frozenColumnCount: 0 });
            return;
          case MENU.showAll:
            patchConfig({ hiddenFieldIds: [] });
            return;
          default:
            return;
        }
      });
    },
    [patchConfig, persistSortState, restoreRecords],
  );

  // —— create / release the imperative table ——
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const current = latest.current;
    const table = new ListTable(
      container,
      buildOptions(current.config, current.source, current.readOnly),
    );
    tableRef.current = table;
    sortStateRef.current = toVTableSortState(current.config.sortState);
    attachListeners(table);

    const observer = new ResizeObserver(() => table.resize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      searchRef.current = null;
      tableRef.current = null;
      // VTable leaks canvas/scene-graph state without an explicit release.
      table.release();
    };
  }, [structureKey, buildOptions, attachListeners]);

  // —— data ———
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    table.setRecords(displayRecords, { sortState: sortStateRef.current });
  }, [displayRecords, structureKey]);

  // —— search ——
  const ensureSearch = useCallback((): SearchComponent | null => {
    const table = tableRef.current;
    if (!table) return null;
    if (!searchRef.current) {
      searchRef.current = new SearchComponent({
        table,
        skipHeader: true,
        autoJump: true,
      });
    }
    return searchRef.current;
  }, []);

  useEffect(() => {
    const component = searchRef.current;
    if (!searchQuery.trim()) {
      component?.clear();
      setSearchMatch({ count: 0, index: -1 });
      return;
    }
    const search = ensureSearch();
    if (!search) return;
    const result = search.search(searchQuery);
    setSearchMatch({
      count: result.results.length,
      index: result.results.length > 0 ? result.index : -1,
    });
    // `displayRecords` is in the deps so a data change re-runs the highlight
    // pass over the freshly rendered cells; `structureKey` covers the table
    // being rebuilt underneath the query.
  }, [searchQuery, displayRecords, structureKey, ensureSearch]);

  const handleSearchStep = useCallback((direction: 1 | -1) => {
    const search = searchRef.current;
    if (!search) return;
    const result = direction === 1 ? search.next() : search.prev();
    setSearchMatch({
      count: result.results.length,
      index: result.results.length > 0 ? result.index : -1,
    });
  }, []);

  // —— row operations ———
  const handleInsertRow = useCallback(() => {
    const row: DataRow = { id: createDataRowId(), cells: {} };
    latest.current.onRowInsert?.(row);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    const table = tableRef.current;
    if (!table) return;
    const rowIds = selectedRowIds(table);
    if (rowIds.length === 0) return;
    latest.current.onRowDelete?.(rowIds);
    table.clearSelected();
    setSelectedCount(0);
  }, []);

  // —— export ———
  const handleExport = useCallback(async (format: "csv" | "excel") => {
    const table = tableRef.current;
    if (!table) return;
    const name = `dataview-${Date.now().toString(36)}`;
    try {
      const {
        exportVTableToCsv,
        exportVTableToExcel,
        downloadCsv,
        downloadExcel,
      } = await import("@visactor/vtable-export");
      if (format === "csv") {
        const csv = exportVTableToCsv(table, { exportAllData: true });
        await downloadCsv(csv, `${name}.csv`);
      } else {
        const buffer = await exportVTableToExcel(table, {}, true);
        await downloadExcel(buffer, `${name}.xlsx`);
      }
    } catch (error) {
      console.error("[TableDataView] Export failed", error);
    }
  }, []);

  const handleFiltersChange = useCallback(
    (next: TableFilterState) => {
      patchConfig({
        filterState: next as TableViewConfig["filterState"],
      });
    },
    [patchConfig],
  );

  const handleShowAllColumns = useCallback(() => {
    patchConfig({ hiddenFieldIds: [] });
  }, [patchConfig]);

  const fieldCount = source.fields.length;

  if (fieldCount === 0) {
    return (
      <DataViewEmptyState
        icon={Table2}
        title="这个数据表还没有字段"
        description="先在节点里添加字段，表格视图就会显示对应的列。"
        className={className}
      />
    );
  }

  if (columns.length === 0) {
    return (
      <DataViewEmptyState
        icon={Eye}
        title="所有列都被隐藏了"
        description="在配置面板或列头菜单里重新显示至少一列。"
        className={className}
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleShowAllColumns}
        >
          显示全部列
        </Button>
      </DataViewEmptyState>
    );
  }

  return (
    <div
      data-dataview-table
      className={cn("flex h-full min-h-0 w-full flex-col", className)}
    >
      <TableToolbar
        config={config}
        fields={source.fields}
        readOnly={readOnly}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchMatchCount={searchMatch.count}
        searchIndex={Math.max(0, searchMatch.index)}
        onSearchStep={handleSearchStep}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        visibleRowCount={displayRecords.length}
        totalRowCount={records.length}
        selectedCount={selectedCount}
        canInsertRow={
          !readOnly && config.editable && Boolean(onRowInsert) && fieldCount > 0
        }
        onInsertRow={handleInsertRow}
        onDeleteSelected={handleDeleteSelected}
        onExport={(format) => {
          void handleExport(format);
        }}
        onConfigChange={onConfigChange}
      />

      <div
        ref={containerRef}
        data-dataview-table-canvas
        className="min-h-0 w-full flex-1"
      />
    </div>
  );
}
