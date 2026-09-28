/**
 * Small field-selection helpers shared by default-config builders and (later)
 * the per-view config editors, so "the primary column", "the first date field"
 * and friends are defined once.
 */
import type { DatabaseField, DatabaseFieldType } from "@workspace/interfaces";

/** Field ids of `type`, in schema order. */
export function fieldIdsOfType(
  fields: readonly DatabaseField[],
  type: DatabaseFieldType,
): string[] {
  return fields.filter((field) => field.type === type).map((field) => field.id);
}

/** First field of `type` (schema order), if any. */
export function firstFieldOfType(
  fields: readonly DatabaseField[],
  type: DatabaseFieldType,
): DatabaseField | undefined {
  return fields.find((field) => field.type === type);
}

/**
 * The table's primary column: the first text field, else the first field of
 * any type. Views use it as their default title field.
 */
export function primaryFieldId(
  fields: readonly DatabaseField[],
): string | undefined {
  return fields.find((field) => field.type === "text")?.id ?? fields[0]?.id;
}

/** A field that can group rows (kanban lanes, gantt groups). */
export function firstGroupableFieldId(
  fields: readonly DatabaseField[],
): string | undefined {
  return (
    fields.find(
      (field) => field.type === "select" || field.type === "multiSelect",
    )?.id ?? undefined
  );
}

/** Date-like fields in schema order — start/end pairs come from here. */
export function dateFieldIds(fields: readonly DatabaseField[]): string[] {
  return fieldIdsOfType(fields, "date");
}

/** First `number` field id (chart measures, gantt progress). */
export function firstNumberFieldId(
  fields: readonly DatabaseField[],
): string | undefined {
  return firstFieldOfType(fields, "number")?.id;
}

/** First `url` field id (gallery covers). */
export function firstUrlFieldId(
  fields: readonly DatabaseField[],
): string | undefined {
  return firstFieldOfType(fields, "url")?.id;
}

/** Every select-ish field (kanban groups, chart dimensions, gallery badges). */
export function selectFieldIds(fields: readonly DatabaseField[]): string[] {
  return fields
    .filter((field) => field.type === "select" || field.type === "multiSelect")
    .map((field) => field.id);
}
