/**
 * The table view's per-column quick filters.
 *
 * `TableViewConfig.filterState` is persisted as a loose `Record<string,
 * unknown>` (it is node content, validated by the domain only as an object), so
 * this module owns both the runtime shape and the defensive read that turns the
 * persisted blob back into it.
 *
 * Filters are deliberately simple predicates evaluated against a record's
 * *display* value: `contains` for text-ish fields, `equals` for select-ish ones
 * and `empty` / `notEmpty` for all of them. Richer query building stays out of
 * scope (table.md §5.4).
 */
import type { DatabaseField } from "@workspace/interfaces";

import { type TableRecord } from "./table-schema";

export type TableFilterOperator = "contains" | "equals" | "empty" | "notEmpty";

export interface TableFilterValue {
  operator: TableFilterOperator;
  value?: string;
}

/** fieldId → filter. An entry with an empty operator is inert. */
export type TableFilterState = Record<string, TableFilterValue>;

const OPERATORS: readonly TableFilterOperator[] = [
  "contains",
  "equals",
  "empty",
  "notEmpty",
];

function isFilterValue(value: unknown): value is TableFilterValue {
  if (typeof value !== "object" || value === null) return false;
  const operator = (value as { operator?: unknown }).operator;
  return OPERATORS.includes(operator as TableFilterOperator);
}

/** Reads `config.filterState`, dropping anything that is not a valid filter. */
export function readFilterState(raw: unknown): TableFilterState {
  if (!raw || typeof raw !== "object") return {};
  const state: TableFilterState = {};
  for (const [fieldId, value] of Object.entries(raw)) {
    if (isFilterValue(value)) state[fieldId] = value;
  }
  return state;
}

/** Number of filters that actually narrow the result set. */
export function activeFilterCount(state: TableFilterState): number {
  return Object.keys(state).filter((fieldId) => {
    const filter = state[fieldId];
    if (!filter) return false;
    if (filter.operator === "empty" || filter.operator === "notEmpty") {
      return true;
    }
    return Boolean(filter.value?.trim());
  }).length;
}

/** True when a record passes one column's filter. */
export function recordMatchesFilter(
  record: TableRecord,
  fieldId: string,
  filter: TableFilterValue,
): boolean {
  const raw = record[fieldId];
  const text = raw === null || raw === undefined ? "" : String(raw);
  switch (filter.operator) {
    case "empty":
      return text.trim() === "";
    case "notEmpty":
      return text.trim() !== "";
    case "equals":
      return text === (filter.value ?? "");
    case "contains":
    default:
      return text
        .toLocaleLowerCase()
        .includes((filter.value ?? "").trim().toLocaleLowerCase());
  }
}

/** Applies every active filter to the records, preserving order. */
export function applyTableFilters(
  records: readonly TableRecord[],
  filters: TableFilterState,
): TableRecord[] {
  const active = Object.entries(filters).filter(([, filter]) =>
    filter.operator === "empty" || filter.operator === "notEmpty"
      ? true
      : Boolean(filter.value?.trim()),
  );
  if (active.length === 0) return records as TableRecord[];
  return records.filter((record) =>
    active.every(([fieldId, filter]) =>
      recordMatchesFilter(record, fieldId, filter),
    ),
  );
}

/**
 * The operators a field offers, derived from its type: enum-ish values compare
 * by equality, everything else by substring.
 */
export function filterOperatorsForField(
  field: DatabaseField,
): TableFilterOperator[] {
  switch (field.type) {
    case "select":
    case "multiSelect":
    case "checkbox":
    case "date":
      return ["equals", "contains", "notEmpty", "empty"];
    default:
      return ["contains", "equals", "notEmpty", "empty"];
  }
}

/** Removes a filter from the state (used by "清除筛选"). */
export function clearFilter(
  state: TableFilterState,
  fieldId: string,
): TableFilterState {
  const next = { ...state };
  delete next[fieldId];
  return next;
}
