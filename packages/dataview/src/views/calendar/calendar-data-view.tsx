"use client";

/**
 * Calendar data view — rows laid out on a time axis and edited by dragging
 * (calendar.md).
 *
 * The shell owns four things and nothing else:
 *
 * - **the field mapping** (`startField` / `endField` / `titleField` /
 *   `colorField` / `tooltipFields`), resolved against the *live* schema every
 *   render so a deleted field degrades into guidance instead of a crash;
 * - **the write path**: a drop, a resize, a 框选 or a double-click becomes
 *   `onCellChange` / `onRowInsert` calls, with FullCalendar's exclusive `end`
 *   converted to "the last day" in `core/schema.ts` and nowhere else;
 * - **the two readouts**: the hover tooltip and the click popover, which are the
 *   only React state here — and the reason the FullCalendar surface is
 *   `memo`-wrapped (see `board/calendar-surface.tsx`);
 * - **the theme**: the view's `theme` token set is published as `--fc-*`
 *   variables on the calendar's own wrapper.
 *
 * The calendar only renders once a start date field resolves; otherwise the body
 * is the guidance that says which field to pick (or which field to add).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type {
  CalendarApi,
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventDropArg,
  EventHoveringArg,
} from "@fullcalendar/core";
import type {
  DateClickArg,
  EventResizeDoneArg,
} from "@fullcalendar/interaction";

import { DataViewEmptyState } from "../../shared/empty-state";
import { useDataViewThemeTokens } from "../../shared/theme-tokens";
import type {
  CalendarViewConfig,
  DataViewRendererProps,
} from "../../source/types";
import {
  EventDetailPopover,
  EventHoverReadout,
  type EventAnchor,
} from "./board/event-readout";
import { CalendarSurface } from "./board/calendar-surface";
import {
  colorableFields,
  dateFields,
  fromFullCalendarView,
  isCalendarViewName,
  type CalendarViewName,
  resolveEndField,
  resolveStartField,
  toFullCalendarView,
} from "./core/config";
import {
  eventToCells,
  readEventReadout,
  rowsToEvents,
  selectionToRow,
  type CalendarEventReadout,
} from "./core/schema";
import { buildCalendarThemeVars } from "./core/theme";
import { CalendarToolbar } from "./toolbar/calendar-toolbar";

/** The view a calendar opens in when the persisted one is not one of ours. */
const FALLBACK_VIEW: CalendarViewName = "dayGridMonth";

/** Viewport rect of the event element a readout hangs off. */
function rectOf(element: HTMLElement): EventAnchor {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

/** Hover tooltip or click popover — at most one is mounted at a time. */
interface ReadoutState {
  rect: EventAnchor;
  readout: CalendarEventReadout;
}

export function CalendarDataView({
  source,
  config,
  readOnly,
  onCellChange,
  onOpenRecord,
  onOpenNode,
  onConfigChange,
  onRowInsert,
  resolveNodeTitle,
  className,
}: DataViewRendererProps<CalendarViewConfig>) {
  const tokens = useDataViewThemeTokens(config.theme);
  const themeVars = useMemo(() => buildCalendarThemeVars(tokens), [tokens]);

  // The host may pass these as fresh closures on every render; the events memo
  // below must not depend on their identity, or a re-render would rebuild the
  // event list and make FullCalendar re-render its whole tree.
  const resolveNodeTitleRef = useRef(resolveNodeTitle);
  resolveNodeTitleRef.current = resolveNodeTitle;

  const startField = resolveStartField(source.fields, config.startField);
  const dateFieldList = useMemo(
    () => dateFields(source.fields),
    [source.fields],
  );
  const colorFieldList = useMemo(
    () => colorableFields(source.fields),
    [source.fields],
  );

  const canEditData = !readOnly && Boolean(onCellChange);
  const canInsertRow = !readOnly && Boolean(onRowInsert);
  const canConfigure = Boolean(onConfigChange);

  const events = useMemo(
    () =>
      startField
        ? rowsToEvents(source, config, (nodeId) =>
            resolveNodeTitleRef.current?.(nodeId),
          )
        : [],
    [source, config, startField],
  );

  // Every FullCalendar callback below is stable (`[]` deps) so the memoized
  // surface never re-renders because of a hover; the shell's live values are
  // read through this ref instead.
  const latest = useRef({
    source,
    config,
    readOnly,
    onCellChange,
    onOpenRecord,
    onOpenNode,
    onConfigChange,
    onRowInsert,
  });
  latest.current = {
    source,
    config,
    readOnly,
    onCellChange,
    onOpenRecord,
    onOpenNode,
    onConfigChange,
    onRowInsert,
  };

  const apiRef = useRef<CalendarApi | null>(null);
  const [hover, setHover] = useState<ReadoutState | null>(null);
  const [pinned, setPinned] = useState<ReadoutState | null>(null);
  const pinnedRef = useRef(false);
  pinnedRef.current = pinned !== null;

  const handleApi = useCallback((api: CalendarApi | null) => {
    apiRef.current = api;
  }, []);

  const safeView: CalendarViewName = isCalendarViewName(config.defaultView)
    ? config.defaultView
    : FALLBACK_VIEW;

  // `initialView` is only read at mount, so the toolbar's view switch (and a
  // persisted default) is applied imperatively. `datesSet` writes the view the
  // user picked in FullCalendar's own header back into the config, which lands
  // here as the same value — no loop.
  useEffect(() => {
    const api = apiRef.current;
    if (!api || fromFullCalendarView(api.view.type) === safeView) return;
    api.changeView(toFullCalendarView(safeView));
  }, [safeView]);

  /** The date fields a gesture may write into, resolved against the schema. */
  const writeConfig = useCallback(() => {
    const { source: liveSource, config: liveConfig } = latest.current;
    const start = resolveStartField(liveSource.fields, liveConfig.startField);
    const end = resolveEndField(
      liveSource.fields,
      liveConfig.endField,
      start?.id,
    );
    return { startField: start?.id ?? "", endField: end?.id };
  }, []);

  const openReadout = useCallback((readout: CalendarEventReadout) => {
    const { source: liveSource, onOpenRecord, onOpenNode } = latest.current;
    if (liveSource.kind === "collection") {
      if (readout.nodeId) onOpenNode?.(readout.nodeId);
      return;
    }
    onOpenRecord?.(readout.rowId, liveSource);
  }, []);

  const handleEventDrop = useCallback(
    (arg: EventDropArg | EventResizeDoneArg) => {
      const { onCellChange: write } = latest.current;
      if (!write) {
        arg.revert();
        return;
      }
      const rowId = readEventRecordId(arg);
      for (const cell of eventToCells(
        { rowId, start: arg.event.start, end: arg.event.end },
        writeConfig(),
      )) {
        write(cell.rowId, cell.fieldId, cell.cell);
      }
    },
    [writeConfig],
  );

  const handleSelectRange = useCallback(
    (arg: DateSelectArg) => {
      const { source: liveSource, onRowInsert: insert } = latest.current;
      // The mirror highlight is left over once the row exists; clear it so the
      // new event is what the user sees.
      apiRef.current?.unselect();
      if (!insert) return;
      // One day means "a click or a one-day drag", which is not a creation
      // gesture — 双击 (dateClick) covers the one-day case instead.
      const days = (arg.end.getTime() - arg.start.getTime()) / 86_400_000;
      if (days <= 1) return;
      insert(
        selectionToRow(
          liveSource.fields,
          { start: arg.start, end: arg.end },
          writeConfig(),
        ),
      );
    },
    [writeConfig],
  );

  const handleDateDoubleClick = useCallback(
    (arg: DateClickArg) => {
      const { source: liveSource, onRowInsert: insert } = latest.current;
      if (!insert || arg.jsEvent.detail < 2) return;
      insert(
        selectionToRow(
          liveSource.fields,
          { start: arg.date, end: null },
          writeConfig(),
        ),
      );
    },
    [writeConfig],
  );

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const { config: liveConfig } = latest.current;
      if (liveConfig.eventClick === "none") return;
      const readout = readEventReadout(arg.event, liveConfig.locale);
      setHover(null);
      if (liveConfig.eventClick === "open") {
        openReadout(readout);
        return;
      }
      setPinned({ rect: rectOf(arg.el), readout });
    },
    [openReadout],
  );

  const handleEventMouseEnter = useCallback((arg: EventHoveringArg) => {
    // The click popover already shows everything the tooltip would.
    if (pinnedRef.current) return;
    const { config: liveConfig } = latest.current;
    setHover({
      rect: rectOf(arg.el),
      readout: readEventReadout(arg.event, liveConfig.locale),
    });
  }, []);

  const handleEventMouseLeave = useCallback(() => {
    setHover(null);
  }, []);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    const { config: liveConfig, onConfigChange: report } = latest.current;
    const type = fromFullCalendarView(arg.view.type);
    if (!report || !type) return;
    if (type === liveConfig.defaultView) return;
    // The user switched views from FullCalendar's own header button.
    report({ ...liveConfig, defaultView: type });
  }, []);

  const surface = (
    <CalendarSurface
      events={events}
      initialView={safeView}
      headerToolbar={config.headerToolbar}
      firstDay={config.firstDay}
      locale={config.locale}
      height={config.height}
      editable={config.editable && canEditData}
      selectable={config.selectable && canInsertRow}
      showWeekends={config.showWeekends}
      nowIndicator={config.nowIndicator}
      dayMaxEvents={config.eventLimit}
      onApi={handleApi}
      onEventDrop={handleEventDrop}
      onEventResize={handleEventDrop}
      onSelectRange={handleSelectRange}
      onDateDoubleClick={handleDateDoubleClick}
      onEventClick={handleEventClick}
      onEventMouseEnter={handleEventMouseEnter}
      onEventMouseLeave={handleEventMouseLeave}
      onDatesSet={handleDatesSet}
    />
  );

  return (
    <div
      data-dataview-calendar
      className={cn(
        // The shell's renderer box never scrolls; this view clips itself and
        // owns its own scrolling (dataview/AGENTS.md gotchas).
        "flex h-full min-h-0 w-full flex-col overflow-hidden bg-background",
        className,
      )}
    >
      <CalendarToolbar
        source={source}
        config={config}
        eventCount={events.length}
        canConfigure={canConfigure}
        canEditData={canEditData}
        canInsertRow={canInsertRow}
        dateFields={dateFieldList}
        colorableFields={colorFieldList}
        onConfigChange={onConfigChange}
      />
      <div
        className={cn(
          "min-h-0 flex-1 p-2",
          // "auto" fills the pane, so the calendar scrolls internally (a time
          // grid does this on its own); a fixed height may exceed the pane, and
          // then the pane scrolls instead.
          config.height === "auto" ? "overflow-hidden" : "overflow-auto",
        )}
      >
        <div className="h-full w-full" style={themeVars}>
          {startField ? (
            surface
          ) : (
            <CalendarGuidance
              fieldCount={source.fields.length}
              dateFieldCount={dateFieldList.length}
            />
          )}
        </div>
      </div>
      {hover && <EventHoverReadout rect={hover.rect} readout={hover.readout} />}
      {pinned && (
        <EventDetailPopover
          rect={pinned.rect}
          readout={pinned.readout}
          canOpen={
            source.kind === "collection"
              ? Boolean(onOpenNode)
              : Boolean(onOpenRecord)
          }
          openLabel={source.kind === "collection" ? "打开节点" : "打开记录"}
          onOpen={() => {
            openReadout(pinned.readout);
            setPinned(null);
          }}
          onClose={() => setPinned(null)}
        />
      )}
    </div>
  );
}

/** The row id behind a drag/resize gesture. */
function readEventRecordId(arg: EventDropArg | EventResizeDoneArg): string {
  const props = arg.event.extendedProps as { rowId?: string } | undefined;
  return typeof props?.rowId === "string" ? props.rowId : arg.event.id;
}

/** What to do when no start date field resolves. */
function CalendarGuidance({
  fieldCount,
  dateFieldCount,
}: {
  fieldCount: number;
  dateFieldCount: number;
}) {
  if (fieldCount === 0) {
    return (
      <DataViewEmptyState
        icon={CalendarDays}
        title="这张表还没有字段"
        description="先在表格视图中添加字段，再回来按日期把记录铺到日历上。"
      />
    );
  }

  return (
    <DataViewEmptyState
      icon={CalendarDays}
      title={
        dateFieldCount > 0 ? "还没有选择开始日期" : "日历需要一个「日期」字段"
      }
      description={
        dateFieldCount > 0
          ? "在上方工具条的「字段」里选择事件的开始日期，记录就会落到对应的日子。"
          : "日历把行按某个日期字段铺开。先用表格视图添加一个「日期」字段（例如「截止日」），再回到日历选择它。"
      }
    />
  );
}
