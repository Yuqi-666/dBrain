/**
 * Row plumbing shared by every view that can mint or empty a row.
 *
 * These are pure data helpers with no React and no third-party library, so they
 * belong next to the other host-independent data conversions (`cell-resolver`,
 * `field-utils`) rather than inside one view's `core/`. The table re-exports
 * them from `views/table/core/schema.ts` for its own call sites; the kanban
 * builds a new card's row with them.
 *
 * See `docs/dataview/README.md` §4.
 */
import type {
  DatabaseCell,
  DatabaseField,
  DataRow,
} from "@workspace/interfaces";

/** A fresh row id for an inserted row. */
export function createDataRowId(): string {
  const globalCrypto = globalThis.crypto;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return `row_${globalCrypto.randomUUID()}`;
  }
  return `row_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** A fresh option id (a new 单选/多选 option the user just typed). */
export function createDatabaseFieldOptionId(): string {
  const globalCrypto = globalThis.crypto;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return `opt_${globalCrypto.randomUUID()}`;
  }
  return `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The empty cell a field carries when it has no value.
 *
 * Every cell must agree with its field's type: `DatabaseContent` rejects a cell
 * whose `type` disagrees, so a view that creates a row fills it from here.
 */
export function emptyCellForField(field: DatabaseField): DatabaseCell {
  switch (field.type) {
    case "number":
      return { type: "number", number: null };
    case "select":
      return { type: "select", optionId: null };
    case "multiSelect":
      return { type: "multiSelect", optionIds: [] };
    case "date":
      return { type: "date", date: null };
    case "checkbox":
      return { type: "checkbox", checked: false };
    case "url":
      return { type: "url", url: null };
    case "relation":
      return { type: "relation", nodeIds: [] };
    case "text":
    default:
      return { type: "text", text: "" };
  }
}

/** A fresh row with every field emptied, optionally overriding one cell. */
export function createEmptyDataRow(
  fields: readonly DatabaseField[],
  seed?: { fieldId: string; cell: DatabaseCell },
): DataRow {
  const cells: Record<string, DatabaseCell> = {};
  for (const field of fields) cells[field.id] = emptyCellForField(field);
  if (seed) cells[seed.fieldId] = seed.cell;
  return { id: createDataRowId(), cells };
}
