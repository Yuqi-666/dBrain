/**
 * Calendar config resolution — the self-healing layer between a persisted
 * `CalendarViewConfig` and the concrete fields an event list is built from, plus
 * the read/write pair for the header-toolbar layout.
 *
 * A view config outlives the schema it was written against: a date field can be
 * deleted or retyped between two openings, so nothing here trusts the persisted
 * ids. Every resolver answers "what is the *live* thing this id means" and
 * degrades to `null`/`""` instead of throwing (README §5.1); the renderer turns
 * that into the missing-field guidance.
 *
 * Pure module: no React, no third-party library.
 */
import type { CalendarViewConfig, DatabaseField } from "@workspace/interfaces";

/** The five view shapes the calendar can open in (`defaultView`). */
export type CalendarViewName = CalendarViewConfig["defaultView"];

/**
 * Every view the calendar offers, in the order the toolbar and the header
 * button list show them.
 *
 * `multiMonth` is FullCalendar's 12-month multi-month view (the plugin
 * registers both `multiMonth` and `multiMonthYear`).
 */
export const CALENDAR_VIEW_OPTIONS: ReadonlyArray<{
  value: CalendarViewName;
  label: string;
  /** Spelled out for the header button the user builds. */
  buttonLabel: string;
}> = [
  { value: "dayGridMonth", label: "月", buttonLabel: "月" },
  { value: "timeGridWeek", label: "周", buttonLabel: "周" },
  { value: "timeGridDay", label: "日", buttonLabel: "日" },
  { value: "listWeek", label: "列表", buttonLabel: "列表" },
  { value: "multiMonth", label: "多月", buttonLabel: "多月" },
];

export const CALENDAR_VIEW_NAMES: readonly CalendarViewName[] =
  CALENDAR_VIEW_OPTIONS.map((option) => option.value);

/** Narrows an arbitrary FullCalendar view type to ours. */
export function isCalendarViewName(value: string): value is CalendarViewName {
  return (CALENDAR_VIEW_NAMES as readonly string[]).includes(value);
}

/** A view def the calendar actually opened in. */
export function calendarViewLabel(value: string): string {
  return (
    CALENDAR_VIEW_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

// —— field resolution ————————————————————————————————————————————————————

export function isDateField(
  field: Pick<DatabaseField, "type"> | undefined,
): boolean {
  return field?.type === "date";
}

/** Every field a start/end date may point at, in schema order. */
export function dateFields(fields: readonly DatabaseField[]): DatabaseField[] {
  return fields.filter(isDateField);
}

/**
 * The live start field.
 *
 * `null` when the id is empty (nothing chosen yet) or no longer names a `date`
 * field — the two cases the guidance UI distinguishes by looking at
 * {@link dateFields}: "pick a field" vs "this table has no date field".
 */
export function resolveStartField(
  fields: readonly DatabaseField[],
  startField: string | undefined,
): DatabaseField | null {
  const field = fields.find((candidate) => candidate.id === startField);
  return isDateField(field) ? (field ?? null) : null;
}

/**
 * The live end field: the configured one, unless it does not resolve, is not a
 * date, or is the start field itself (an event cannot end where it begins).
 */
export function resolveEndField(
  fields: readonly DatabaseField[],
  endField: string | undefined,
  startFieldId: string | undefined,
): DatabaseField | null {
  if (!endField || endField === startFieldId) return null;
  const field = fields.find((candidate) => candidate.id === endField);
  return isDateField(field) ? (field ?? null) : null;
}

/** The live event-title field: the configured one, else the primary column. */
export function resolveTitleField(
  fields: readonly DatabaseField[],
  titleField: string | undefined,
): DatabaseField | null {
  return (
    fields.find((field) => field.id === titleField) ??
    fields.find((field) => field.type === "text") ??
    fields[0] ??
    null
  );
}

/** The live event-colour field: a select-ish field, or `null`. */
export function resolveColorField(
  fields: readonly DatabaseField[],
  colorField: string | undefined,
): DatabaseField | null {
  const field = fields.find((candidate) => candidate.id === colorField);
  if (field?.type === "select" || field?.type === "multiSelect") return field;
  return null;
}

/** Field types that carry an option colour a calendar event can be tinted by. */
export function colorableFields(
  fields: readonly DatabaseField[],
): DatabaseField[] {
  return fields.filter(
    (field) => field.type === "select" || field.type === "multiSelect",
  );
}

/** The live hover-tooltip fields (a deleted id silently drops out). */
export function resolveTooltipFields(
  fields: readonly DatabaseField[],
  tooltipFields: readonly string[] | undefined,
): DatabaseField[] {
  if (!tooltipFields || tooltipFields.length === 0) return [];
  const byId = new Map(fields.map((field) => [field.id, field]));
  return tooltipFields
    .map((fieldId) => byId.get(fieldId))
    .filter((field): field is DatabaseField => field !== undefined);
}

// —— header-toolbar layout ——————————————————————————————————————————————

/**
 * `config.headerToolbar` read as the two decisions it actually encodes.
 *
 * The persisted shape is FullCalendar's raw three-segment string triple, which
 * is not a UI: the calendar edits "is the 今天 button there" and "which view
 * buttons appear", and every other button (`prev`, `next`, `title`) is fixed.
 * Reading it back into those two decisions is what lets the config round-trip
 * without the toolbar having to expose FreeText.
 */
export interface CalendarToolbarLayout {
  showToday: boolean;
  views: CalendarViewName[];
}

export const DEFAULT_CALENDAR_TOOLBAR_LAYOUT: CalendarToolbarLayout = {
  showToday: true,
  views: ["dayGridMonth", "timeGridWeek", "timeGridDay", "listWeek"],
};

/** Parses a persisted `headerToolbar` into the toolbar's two decisions. */
export function readCalendarToolbarLayout(
  headerToolbar: CalendarViewConfig["headerToolbar"] | undefined,
): CalendarToolbarLayout {
  if (!headerToolbar) return { ...DEFAULT_CALENDAR_TOOLBAR_LAYOUT };
  const showToday = (headerToolbar.left ?? "")
    .split(",")
    .some((part) => part.trim() === "today");
  const views: CalendarViewName[] = [];
  for (const part of (headerToolbar.right ?? "").split(",")) {
    const view = fromFullCalendarView(part.trim());
    // A hand-written toolbar may name the same view twice; a duplicate checkbox
    // row would then toggle two entries at once.
    if (view && !views.includes(view)) views.push(view);
  }
  return { showToday, views };
}

/** The inverse of {@link readCalendarToolbarLayout}. */
export function writeCalendarToolbarLayout(
  layout: CalendarToolbarLayout,
): CalendarViewConfig["headerToolbar"] {
  return {
    left: layout.showToday ? "prev,next today" : "prev,next",
    center: "title",
    right: layout.views.map(toFullCalendarView).join(","),
  };
}

// —— FullCalendar view names ————————————————————————————————————————————

/**
 * `config.defaultView` → the FullCalendar view name.
 *
 * The persisted vocabulary is calendar.md §4's, where the multi-month view is
 * called `multiMonth`. FullCalendar registers **two** views around that name:
 * `multiMonth` lays out a *single* month in the multi-month component, and
 * `multiMonthYear` is the 12-month overview the 多月 button obviously means.
 * The mapping (and its inverse) live here so the config keeps the documented
 * name while the calendar opens a year — verified in the browser: with the raw
 * name the view drew exactly one month.
 */
export function toFullCalendarView(view: CalendarViewName): string {
  return view === "multiMonth" ? "multiMonthYear" : view;
}

/** The inverse of {@link toFullCalendarView}; `null` for a foreign view. */
export function fromFullCalendarView(
  viewName: string,
): CalendarViewName | null {
  if (viewName === "multiMonthYear") return "multiMonth";
  return isCalendarViewName(viewName) ? viewName : null;
}

/**
 * Header button text for the views no locale names.
 *
 * Every locale the core ships defines `month` / `week` / `day` / `list`, but
 * the multi-month plugin registers its view with no `buttonText` default at all,
 * so without this the button falls back to the raw view name.
 */
export function buttonTextFor(code: string): Record<string, string> {
  return code === "en"
    ? { multiMonth: "Multi-month", multiMonthYear: "Multi-month" }
    : { multiMonth: "多月", multiMonthYear: "多月" };
}
