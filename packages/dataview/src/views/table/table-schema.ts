/**
 * The table view's data-transformation layer: `fields` → VTable columns,
 * `rows` → VTable records, and a VTable edit result → a `DatabaseCell`.
 *
 * Everything here is pure and library-light (only *types* come from
 * `@visactor/vtable`), so the mapping rules stay reviewable independently of
 * the imperative `ListTable` shell in `table-data-view.tsx`.
 *
 * See `docs/dataview/table.md` §3.
 */
import type { ColumnDefine, ColumnsDefine } from "@visactor/vtable";
import type {
  DatabaseCell,
  DatabaseField,
  DataViewSource,
  NodeId,
  TableColumnConfig,
  TableViewConfig,
} from "@workspace/interfaces";

import { DEFAULT_EMPTY_TEXT, displayText } from "../../source/cell-resolver";

/** The hidden record key that carries `DatabaseRow.id` back to the source row. */
export const TABLE_ROW_ID_FIELD = "__rowId";

/** One VTable record: display scalars keyed by field id, plus the row id. */
export type TableRecord = Record<string, unknown> & {
  [TABLE_ROW_ID_FIELD]: string;
};

/** Row height per density (table.md §4 — `density`). */
export const TABLE_DENSITY_ROW_HEIGHT: Record<
  TableViewConfig["density"],
  number
> = {
  compact: 26,
  comfortable: 34,
  spacious: 46,
};

/** Header row height per density — the header is never shorter than its text. */
export const TABLE_DENSITY_HEADER_HEIGHT: Record<
  TableViewConfig["density"],
  number
> = {
  compact: 30,
  comfortable: 36,
  spacious: 46,
};

/** Context the record builders need from the host. */
export interface TableRecordContext {
  /** Resolves a `relation` node id to its title; falls back to the raw id. */
  resolveNodeTitle?: (nodeId: NodeId) => string | undefined;
}

// ============================================================================
// Fields → columns
// ============================================================================

/**
 * Self-heals a persisted `config.columns` against the current schema.
 *
 * A column whose field no longer exists (or that is duplicated) is dropped, and
 * a field the config has never seen is appended in schema order — so a field
 * added elsewhere in the node shows up without the config being rewritten
 * (table.md §9 "自愈").
 */
export function resolveTableColumns(
  config: TableViewConfig,
  fields: readonly DatabaseField[],
): TableColumnConfig[] {
  const known = new Set(fields.map((field) => field.id));
  const seen = new Set<string>();
  const resolved: TableColumnConfig[] = [];

  for (const column of config.columns ?? []) {
    if (!known.has(column.fieldId) || seen.has(column.fieldId)) continue;
    seen.add(column.fieldId);
    resolved.push(column);
  }
  for (const field of fields) {
    if (seen.has(field.id)) continue;
    seen.add(field.id);
    resolved.push({ fieldId: field.id, visible: true });
  }
  return resolved;
}

/**
 * A column is visible when its own config says so **and** it is not in the
 * `hiddenFieldIds` shortcut list (which the header context menu writes).
 */
export function isColumnVisible(
  column: TableColumnConfig,
  config: TableViewConfig,
): boolean {
  if (!column.visible) return false;
  return !(config.hiddenFieldIds ?? []).includes(column.fieldId);
}

/** The columns the table actually renders, in config order. */
export function visibleTableColumns(
  config: TableViewConfig,
  fields: readonly DatabaseField[],
): TableColumnConfig[] {
  return resolveTableColumns(config, fields).filter((column) =>
    isColumnVisible(column, config),
  );
}

/** `config.frozenColumnCount` clamped to the number of columns on screen. */
export function effectiveFrozenColumnCount(
  config: TableViewConfig,
  fields: readonly DatabaseField[],
): number {
  const visible = visibleTableColumns(config, fields).length;
  if (visible === 0) return 0;
  return Math.max(0, Math.min(config.frozenColumnCount ?? 0, visible));
}

/** The VTable cell type a field renders as, before any per-column override. */
export function defaultCellTypeForField(field: DatabaseField): string {
  switch (field.type) {
    case "checkbox":
      return "checkbox";
    case "url":
      return "link";
    default:
      return "text";
  }
}

// ============================================================================
// Cells → display scalars
// ============================================================================

/**
 * The date shown and edited in a date cell.
 *
 * Only the calendar day is meaningful to the editor (`<input type="date">`
 * speaks `YYYY-MM-DD`), and slicing the ISO string keeps the day from shifting
 * with the viewer's timezone.
 */
export function cellToDateInputValue(cell: DatabaseCell | undefined): string {
  if (cell?.type !== "date" || !cell.date) return "";
  return cell.date.slice(0, 10);
}

function optionName(
  field: DatabaseField | undefined,
  optionId: string | null,
): string {
  if (!optionId) return "";
  return (
    field?.options?.find((option) => option.id === optionId)?.name ?? optionId
  );
}

/** `select` / `multiSelect` → the option names the user actually sees. */
export function cellToOptionNames(
  cell: DatabaseCell | undefined,
  field: DatabaseField | undefined,
): string[] {
  if (cell?.type === "select") {
    return cell.optionId ? [optionName(field, cell.optionId)] : [];
  }
  if (cell?.type === "multiSelect") {
    return (cell.optionIds ?? []).map((optionId) =>
      optionName(field, optionId),
    );
  }
  return [];
}

/**
 * The scalar a field's cell contributes to a VTable record.
 *
 * Select-ish fields contribute **option names** rather than ids so the canvas
 * shows — and VTable's in-cell editor edits — the same text the user reads;
 * {@link recordValueToCell} maps the edited name back to its id.
 */
export function cellToRecordValue(
  cell: DatabaseCell | undefined,
  field: DatabaseField,
  context: TableRecordContext = {},
): string | number | boolean {
  switch (field.type) {
    case "text":
      return cell?.type === "text" ? cell.text : "";
    case "number":
      return cell?.type === "number" && cell.number != null ? cell.number : "";
    case "select":
      return optionName(field, cell?.type === "select" ? cell.optionId : null);
    case "multiSelect":
      return cellToOptionNames(cell, field).join(", ");
    case "date":
      return cellToDateInputValue(cell);
    case "checkbox":
      return cell?.type === "checkbox" ? cell.checked : false;
    case "url":
      return cell?.type === "url" && cell.url ? cell.url : "";
    case "relation":
      return displayText(cell, field, context.resolveNodeTitle);
  }
}

/** Every row of a source as VTable records, each carrying `__rowId`. */
export function rowsToRecords(
  source: DataViewSource,
  context: TableRecordContext = {},
): TableRecord[] {
  return source.rows.map((row) => {
    const record = { [TABLE_ROW_ID_FIELD]: row.id } as TableRecord;
    for (const field of source.fields) {
      record[field.id] = cellToRecordValue(row.cells[field.id], field, context);
    }
    return record;
  });
}

// ============================================================================
// Edited values → cells
// ============================================================================

const ISO_8601_DATE =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isUrl(value: string): boolean {
  try {
    // Mirrors the domain rule (`assertUrl`): anything `new URL` accepts.
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Resolves an edited select text back to an option id (by name, then by id). */
export function optionTextToId(
  field: DatabaseField | undefined,
  text: string,
): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const options = field?.options ?? [];
  const byName = options.find((option) => option.name === trimmed);
  if (byName) return byName.id;
  const byId = options.find((option) => option.id === trimmed);
  return byId ? byId.id : null;
}

function optionTextsToIds(
  field: DatabaseField | undefined,
  texts: readonly string[],
): string[] {
  const options = field?.options ?? [];
  const ids: string[] = [];
  for (const text of texts) {
    const trimmed = text.trim();
    if (!trimmed) continue;
    const matched =
      options.find((option) => option.name === trimmed) ??
      options.find((option) => option.id === trimmed);
    // An unrecognised entry is dropped rather than persisted: the domain
    // rejects option ids that miss `options`.
    if (matched && !ids.includes(matched.id)) ids.push(matched.id);
  }
  return ids;
}

/**
 * Turns one edited VTable value back into a `DatabaseCell`.
 *
 * Returns `null` when the edit must be rejected (a non-finite number, a
 * malformed date or url) — the domain value objects throw on those, so the
 * renderer drops the edit instead of surfacing a persistence error
 * (table.md §3.2 "非法输入不进 store").
 */
export function recordValueToCell(
  field: DatabaseField,
  value: unknown,
): DatabaseCell | null {
  switch (field.type) {
    case "text":
      return { type: "text", text: value == null ? "" : String(value) };
    case "number": {
      if (value === "" || value === null || value === undefined) {
        return { type: "number", number: null };
      }
      const parsed = typeof value === "number" ? value : Number(value);
      return isFiniteNumber(parsed) ? { type: "number", number: parsed } : null;
    }
    case "select":
      return {
        type: "select",
        optionId: optionTextToId(field, value == null ? "" : String(value)),
      };
    case "multiSelect": {
      const texts = Array.isArray(value)
        ? value.map((entry) => String(entry))
        : String(value ?? "")
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean);
      return { type: "multiSelect", optionIds: optionTextsToIds(field, texts) };
    }
    case "date": {
      const text = value == null ? "" : String(value).trim();
      if (!text) return { type: "date", date: null };
      if (!ISO_8601_DATE.test(text) || Number.isNaN(Date.parse(text))) {
        return null;
      }
      return { type: "date", date: text.slice(0, 10) };
    }
    case "checkbox":
      return { type: "checkbox", checked: Boolean(value) };
    case "url": {
      const text = value == null ? "" : String(value).trim();
      if (!text) return { type: "url", url: null };
      return isUrl(text) ? { type: "url", url: text } : null;
    }
    case "relation":
      // Relation editing is deferred (table.md §9): the picker depends on a
      // graph overlay, so v1 renders the resolved titles read-only.
      return null;
  }
}

/** `relation` cells are interactive in the body but never edited in place. */
export function isFieldEditable(
  field: DatabaseField,
  config: TableViewConfig,
  readOnly: boolean | undefined,
): boolean {
  if (readOnly || !config.editable) return false;
  return field.type !== "relation";
}

/** A fresh row id for an inserted row. */
export function createDataRowId(): string {
  const globalCrypto = globalThis.crypto;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return `row_${globalCrypto.randomUUID()}`;
  }
  return `row_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// ============================================================================
// Columns → VTable column defines
// ============================================================================

/** Resolves the in-cell editor (or editor name) a field edits with. */
export type TableEditorResolver = (
  field: DatabaseField,
) => ColumnDefine["editor"] | undefined;

export interface BuildTableColumnsOptions {
  config: TableViewConfig;
  fields: readonly DatabaseField[];
  readOnly?: boolean;
  resolveEditor?: TableEditorResolver;
  /** Placeholder an empty cell shows (table.md §4 — `format.emptyText`). */
  emptyText?: string;
  /**
   * Color for cells that behave like links (url / relation). Supplied by the
   * shell from the active theme tokens — never hardcoded, so the canvas follows
   * the app palette in both modes.
   */
  interactiveColor?: string;
}

/**
 * Builds the VTable `columns` array: one entry per visible field, in config
 * order, carrying the editability / sortability / resizability / draggability
 * the view config declares.
 *
 * `width` is only emitted when the config pins one — otherwise VTable falls
 * back to `defaultColWidth`, which keeps columns stable across reloads instead
 * of being recomputed from whatever data is loaded.
 *
 * Column freezing is deliberately *not* expressed here: VTable freezes from the
 * left through the top-level `frozenColCount` option, which the shell derives
 * from `config.frozenColumnCount` with {@link effectiveFrozenColumnCount}.
 */
export function buildTableColumns({
  config,
  fields,
  readOnly,
  resolveEditor,
  emptyText = DEFAULT_EMPTY_TEXT,
  interactiveColor,
}: BuildTableColumnsOptions): ColumnsDefine {
  const byId = new Map(fields.map((field) => [field.id, field]));
  const defines: ColumnDefine[] = [];

  for (const column of resolveTableColumns(config, fields)) {
    const field = byId.get(column.fieldId);
    if (!field || !isColumnVisible(column, config)) continue;

    const editable = isFieldEditable(field, config, readOnly);
    const editor = editable ? resolveEditor?.(field) : undefined;
    const cellType = column.cellTypeOverride ?? defaultCellTypeForField(field);
    const isCheckbox = cellType === "checkbox";
    const interactive = field.type === "url" || field.type === "relation";
    const cellEmptyText = column.format?.emptyText ?? emptyText;

    const define = {
      field: field.id,
      title: field.name || field.id,
      cellType,
      ...(column.width != null ? { width: column.width } : {}),
      sort: config.sortable,
      showSort: config.sortable,
      dragHeader: config.reorderable,
      ...(config.resizable ? {} : { disableColumnResize: true }),
      ...(isCheckbox
        ? {
            // A checkbox column must not run the empty-text placeholder: the
            // format result is the checked state, not a label.
            style: { textAlign: "center" as const },
            ...(editable ? {} : { disable: true }),
          }
        : {
            fieldFormat: (record: Record<string, unknown>) => {
              const value = record?.[field.id];
              if (value === "" || value === null || value === undefined) {
                return cellEmptyText;
              }
              return value as string | number;
            },
            style: {
              textAlign: field.type === "number" ? "right" : "left",
              ...(interactive && interactiveColor
                ? { color: interactiveColor, cursor: "pointer" }
                : {}),
            },
          }),
      ...(editor ? { editor } : {}),
    } as unknown as ColumnDefine;

    defines.push(define);
  }

  return defines as ColumnsDefine;
}

/**
 * Applies a new visible order to `config.columns`: the visible columns follow
 * `fieldIds`, hidden ones stay in their existing slots.
 */
export function reorderTableColumns(
  config: TableViewConfig,
  fields: readonly DatabaseField[],
  fieldIds: readonly string[],
): TableColumnConfig[] {
  const resolved = resolveTableColumns(config, fields);
  const position = new Map(fieldIds.map((fieldId, index) => [fieldId, index]));
  const reordered = resolved
    .filter((column) => position.has(column.fieldId))
    .sort((a, b) => position.get(a.fieldId)! - position.get(b.fieldId)!);
  let cursor = 0;
  return resolved.map((column) =>
    position.has(column.fieldId) ? reordered[cursor++]! : column,
  );
}
