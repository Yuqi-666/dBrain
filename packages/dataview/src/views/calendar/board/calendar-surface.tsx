"use client";

/**
 * The FullCalendar surface — the one place the library is instantiated.
 *
 * The shell drives it; nothing here knows about rows, cells or the host. Two
 * decisions are load-bearing:
 *
 * - **It is `memo`-wrapped on purpose.** FullCalendar's React wrapper applies
 *   `resetOptions` on *every* re-render (`componentDidUpdate`), and a changed
 *   option makes FullCalendar re-render its whole preact tree. The shell holds
 *   the hover readout / click popover in React state, so without the memo a
 *   mouse move over an event would re-render the calendar. Every prop here is
 *   therefore either a primitive, a memoized array/object, or a `useCallback`
 *   the shell keeps stable; the surface then only re-renders when the config or
 *   the data actually changed.
 * - **Views are switched imperatively.** `initialView` is read once at mount, so
 *   the shell calls `api.changeView` through {@link CalendarSurfaceProps.onApi}
 *   when `config.defaultView` changes — remounting the surface would throw away
 *   the date the user navigated to.
 *
 * Locale: FullCalendar resolves a locale *code* only if that locale is
 * registered, and this package ships exactly one (`zh-cn`). `en` is built into
 * the core; everything else falls back to `zh-cn`, so a hand-written config can
 * never crash the view with an unregistered locale.
 */
import { memo, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import multimonthPlugin from "@fullcalendar/multimonth";
import timeGridPlugin from "@fullcalendar/timegrid";
import zhCnLocale from "@fullcalendar/core/locales/zh-cn";
import type {
  CalendarApi,
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventDropArg,
  EventHoveringArg,
  LocaleInput,
  PluginDef,
} from "@fullcalendar/core";
import type {
  DateClickArg,
  EventResizeDoneArg,
} from "@fullcalendar/interaction";

import type { CalendarViewConfig } from "@workspace/interfaces";

import { buttonTextFor, toFullCalendarView } from "../core/config";
import type { CalendarEventInput } from "../core/schema";

/** The five plugins the calendar's views need; no premium plugin is used. */
const PLUGINS: PluginDef[] = [
  dayGridPlugin,
  timeGridPlugin,
  listPlugin,
  multimonthPlugin,
  interactionPlugin,
];

/** `zh-CN` / `en` are the two the toolbar offers; anything else is 中文. */
function resolveLocale(code: string): LocaleInput | string {
  return code === "en" ? "en" : zhCnLocale;
}

export interface CalendarSurfaceProps {
  events: CalendarEventInput[];
  /** Read only at mount; later changes go through `onApi` + `changeView`. */
  initialView: CalendarViewConfig["defaultView"];
  headerToolbar: CalendarViewConfig["headerToolbar"];
  firstDay: number;
  locale: string;
  /** `"auto"` fills the pane; a number is a fixed pixel height. */
  height: "auto" | number;
  editable: boolean;
  selectable: boolean;
  showWeekends: boolean;
  nowIndicator: boolean;
  dayMaxEvents: boolean | number;

  /** Reports the live `CalendarApi` (and `null` on unmount). */
  onApi: (api: CalendarApi | null) => void;
  onEventDrop: (arg: EventDropArg) => void;
  onEventResize: (arg: EventResizeDoneArg) => void;
  onSelectRange: (arg: DateSelectArg) => void;
  onDateDoubleClick: (arg: DateClickArg) => void;
  onEventClick: (arg: EventClickArg) => void;
  onEventMouseEnter: (arg: EventHoveringArg) => void;
  onEventMouseLeave: () => void;
  onDatesSet: (arg: DatesSetArg) => void;
}

export const CalendarSurface = memo(function CalendarSurface({
  events,
  initialView,
  headerToolbar,
  firstDay,
  locale,
  height,
  editable,
  selectable,
  showWeekends,
  nowIndicator,
  dayMaxEvents,
  onApi,
  onEventDrop,
  onEventResize,
  onSelectRange,
  onDateDoubleClick,
  onEventClick,
  onEventMouseEnter,
  onEventMouseLeave,
  onDatesSet,
}: CalendarSurfaceProps) {
  const handleRef = useCallback(
    (instance: FullCalendar | null) => {
      onApi(instance ? instance.getApi() : null);
    },
    [onApi],
  );

  return (
    <FullCalendar
      ref={handleRef}
      plugins={PLUGINS}
      initialView={toFullCalendarView(initialView)}
      headerToolbar={headerToolbar}
      // `"auto"` means "the pane's height": the shell hands the surface a box
      // of exactly that size, so 100% is what "automatic" is here.
      height={height === "auto" ? "100%" : height}
      locale={resolveLocale(locale)}
      buttonText={buttonTextFor(locale)}
      firstDay={firstDay}
      timeZone="local"
      editable={editable}
      selectable={selectable}
      selectMirror
      weekends={showWeekends}
      nowIndicator={nowIndicator}
      dayMaxEvents={dayMaxEvents}
      navLinks={false}
      dayHeaders
      events={events}
      eventDrop={onEventDrop}
      eventResize={onEventResize}
      select={onSelectRange}
      dateClick={onDateDoubleClick}
      eventClick={onEventClick}
      eventMouseEnter={onEventMouseEnter}
      eventMouseLeave={onEventMouseLeave}
      datesSet={onDatesSet}
    />
  );
});
