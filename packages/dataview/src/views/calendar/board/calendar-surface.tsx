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
 *   the hover readout in React state, so without the memo a
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
  EventMountArg,
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
  /** Cell writes are allowed (a drag writes the date back). */
  editable: boolean;
  /** Row inserts are allowed (a drag over blank days creates one). */
  selectable: boolean;
  /**
   * A right-click on an event element.
   *
   * It is a mount hook rather than `eventContent` because FullCalendar's event
   * element is not a React node: a Radix context-menu trigger rendered *inside*
   * the event never sees the gesture (the browser's `contextmenu` target is the
   * library's own `<a class="fc-event">`, not the content we rendered into it).
   * The shell wires this to the shell-level record menu instead.
   */
  onEventContextMenu?: (rowId: string, point: { x: number; y: number }) => void;

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

/**
 * Hangs the unified record menu off one event element.
 *
 * FullCalendar owns the event DOM and the browser's `contextmenu` target is the
 * library's own `<a class="fc-event">`, so a Radix trigger rendered into
 * `eventContent` never fires; a native listener here does. Kept at module scope
 * so the JSX stays a one-line prop.
 */
function attachEventContextMenu(
  arg: EventMountArg,
  onContextMenu: (rowId: string, point: { x: number; y: number }) => void,
): void {
  const extended = arg.event.extendedProps as { rowId?: string };
  const rowId =
    typeof extended.rowId === "string" ? extended.rowId : arg.event.id;
  arg.el.addEventListener("contextmenu", (event: MouseEvent) => {
    event.preventDefault();
    onContextMenu(rowId, { x: event.clientX, y: event.clientY });
  });
}

export const CalendarSurface = memo(function CalendarSurface({
  events,
  initialView,
  headerToolbar,
  firstDay,
  locale,
  editable,
  selectable,
  onEventContextMenu,
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
      // The calendar fills the pane the shell hands it (`CALENDAR_FIXED.height`
      // is "auto"), so 100% is what "automatic" means here.
      height="100%"
      locale={resolveLocale(locale)}
      buttonText={buttonTextFor(locale)}
      firstDay={firstDay}
      timeZone="local"
      editable={editable}
      selectable={selectable}
      selectMirror
      // The rest is presentation and fixed (see `CALENDAR_FIXED`): weekend
      // columns, the "now" line, and folding a busy day behind "+N more".
      weekends
      nowIndicator
      dayMaxEvents
      navLinks={false}
      dayHeaders
      events={events}
      {...(onEventContextMenu
        ? {
            eventDidMount: (arg: EventMountArg) =>
              attachEventContextMenu(arg, onEventContextMenu),
          }
        : {})}
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
