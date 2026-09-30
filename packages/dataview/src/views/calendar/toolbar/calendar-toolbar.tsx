"use client";

/**
 * The calendar view's toolbar — its one control strip.
 *
 * Layout contract (same as every view): **configuration on the left, functions
 * on the right**, every control a button or a popover panel. The shell's 更多
 * menu is appended to the function group by `ViewToolbar`, so the tab strip
 * stays pure navigation.
 *
 * The calendar has no `configEditor` in the registry: the four panels here
 * (字段 / 视图 / 交互 / 显示) cover every `CalendarViewConfig` key except
 * `timeZone`, which calendar.md §9 pins to `local` for v1 — a control for it
 * would be a select with one option.
 *
 * Each panel is a `Popover` rather than a `DropdownMenu` because its body is a
 * *form* (selects, a checkbox list, switches) rather than a list of commands.
 */
import {
  CalendarDays,
  CalendarRange,
  MousePointerClick,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Checkbox } from "@workspace/ui/components/ui/checkbox";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { Separator } from "@workspace/ui/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/ui/toggle-group";
import type {
  CalendarViewConfig,
  DataViewSource,
  DatabaseField,
} from "@workspace/interfaces";

import { FieldSelect } from "../../../shared/field-select";
import { FieldTypeIcon } from "../../../shared/field-meta";
import {
  CheckboxOptionList,
  PanelSection,
  SettingsPanel,
  SwitchRow,
} from "../../../shared/settings-panel";
import { ViewToolbar } from "../../../shared/view-toolbar";
import {
  CALENDAR_VIEW_OPTIONS,
  type CalendarToolbarLayout,
  readCalendarToolbarLayout,
  writeCalendarToolbarLayout,
} from "../core/config";

/** Week-start choices; FullCalendar numbers days from Sunday. */
const FIRST_DAY_OPTIONS = [
  { value: 1, label: "周一" },
  { value: 0, label: "周日" },
  { value: 6, label: "周六" },
];

const LOCALE_OPTIONS = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en", label: "English" },
];

const HEIGHT_OPTIONS = [
  { value: "auto", label: "铺满可用空间" },
  { value: "480", label: "480 px" },
  { value: "600", label: "600 px" },
  { value: "720", label: "720 px" },
  { value: "900", label: "900 px" },
];

/** `config.eventLimit` (boolean | number) as the panel's four choices. */
type EventLimitChoice = "auto" | "none" | "2" | "3" | "5";

function readEventLimit(eventLimit: boolean | number): EventLimitChoice {
  if (eventLimit === false) return "none";
  if (eventLimit === true) return "auto";
  if (eventLimit >= 5) return "5";
  if (eventLimit >= 3) return "3";
  return "2";
}

function writeEventLimit(choice: EventLimitChoice): boolean | number {
  if (choice === "none") return false;
  if (choice === "auto") return true;
  return Number(choice);
}

const EVENT_CLICK_OPTIONS: ReadonlyArray<{
  value: CalendarViewConfig["eventClick"];
  label: string;
}> = [
  { value: "open", label: "打开记录" },
  { value: "popover", label: "弹出详情" },
  { value: "none", label: "不响应" },
];

/** 提示字段 checkbox list (the extra readout on hover / in the popover). */
function TooltipFieldsList({
  fields,
  selected,
  onChange,
}: {
  fields: readonly DatabaseField[];
  selected: readonly string[];
  onChange: (fieldIds: string[]) => void;
}) {
  if (fields.length === 0) {
    return (
      <span className="text-[11px] text-muted-foreground">
        没有可展示的其它字段
      </span>
    );
  }
  const chosen = new Set(selected);
  return (
    <ScrollArea className="max-h-52 rounded-md border border-border">
      <div className="flex flex-col gap-0.5 p-1">
        {fields.map((field) => (
          <label
            key={field.id}
            className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-accent/60"
          >
            <Checkbox
              checked={chosen.has(field.id)}
              aria-label={field.name}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [...selected, field.id]
                    : selected.filter((fieldId) => fieldId !== field.id),
                )
              }
            />
            <FieldTypeIcon
              type={field.type}
              className="size-3.5 shrink-0 text-muted-foreground"
            />
            <span className="min-w-0 flex-1 truncate">{field.name}</span>
          </label>
        ))}
      </div>
    </ScrollArea>
  );
}

export interface CalendarToolbarProps {
  source: DataViewSource;
  config: CalendarViewConfig;
  /** Rows the calendar actually drew (rows without a start date are skipped). */
  eventCount: number;
  /** The host allows view management → every config write needs this. */
  canConfigure: boolean;
  /** The host allows cell writes → 允许拖拽改期 is meaningful. */
  canEditData: boolean;
  /** The host allows row inserts → 允许框选新建 is meaningful. */
  canInsertRow: boolean;
  dateFields: readonly DatabaseField[];
  colorableFields: readonly DatabaseField[];
  onConfigChange?: (config: CalendarViewConfig) => void;
  className?: string;
}

export function CalendarToolbar({
  source,
  config,
  eventCount,
  canConfigure,
  canEditData,
  canInsertRow,
  dateFields,
  colorableFields,
  onConfigChange,
  className,
}: CalendarToolbarProps) {
  const patch = (next: Partial<CalendarViewConfig>) =>
    onConfigChange?.({ ...config, ...next });

  const startField =
    source.fields.find((field) => field.id === config.startField) ?? null;

  const layout = readCalendarToolbarLayout(config.headerToolbar);
  const patchLayout = (next: Partial<CalendarToolbarLayout>) =>
    patch({
      headerToolbar: writeCalendarToolbarLayout({ ...layout, ...next }),
    });

  const mappedFieldIds = new Set(
    [
      config.startField,
      config.endField,
      config.titleField,
      config.colorField,
    ].filter((fieldId): fieldId is string => Boolean(fieldId)),
  );

  /**
   * Toggles one view button in the calendar header.
   *
   * A list with nothing in it leaves the calendar with no way back to another
   * view, so the last enabled button cannot be switched off; and removing the
   * button of the *open* view also moves the open view onto a remaining one in
   * the same config write. Only the open view moves — every other button stays.
   */
  const toggleViewButton = (
    value: CalendarViewConfig["defaultView"],
    checked: boolean,
  ) => {
    const views = checked
      ? [...layout.views, value]
      : layout.views.filter((view) => view !== value);
    if (views.length === 0) return;
    const moveOpenView = !checked && config.defaultView === value;
    patch({
      headerToolbar: writeCalendarToolbarLayout({ ...layout, views }),
      ...(moveOpenView ? { defaultView: views[0]! } : {}),
    });
  };

  return (
    <ViewToolbar
      className={className}
      actions={
        <Badge
          variant="secondary"
          className="h-6 px-2 text-[11px] font-normal text-muted-foreground tabular-nums"
        >
          {eventCount} 事件
        </Badge>
      }
    >
      {/* ——————— 字段 ——————— */}
      <SettingsPanel
        label="字段"
        icon={CalendarRange}
        active={Boolean(startField)}
        value={startField?.name}
        width="w-72"
        disabled={!canConfigure}
      >
        <PanelSection
          label="开始日期"
          hint={
            dateFields.length === 0
              ? "这张表还没有「日期」字段，日历无法定位事件。"
              : undefined
          }
        >
          <FieldSelect
            fields={dateFields}
            value={config.startField}
            placeholder="选择字段"
            disabled={dateFields.length === 0}
            onValueChange={(fieldId) =>
              patch({
                startField: fieldId,
                // The old end may now equal the new start (or the field the
                // user just reused); the resolver drops it, but clearing it
                // keeps the config honest.
                endField:
                  config.endField === fieldId ? undefined : config.endField,
              })
            }
          />
        </PanelSection>
        <PanelSection
          label="结束日期"
          hint="搭配「开始日期」形成区间；单日事件不填"
        >
          <FieldSelect
            fields={dateFields.filter(
              (field) => field.id !== config.startField,
            )}
            value={config.endField ?? ""}
            placeholder="不使用"
            noneLabel="不使用"
            disabled={dateFields.length < 2}
            onValueChange={(fieldId) =>
              patch({ endField: fieldId || undefined })
            }
          />
        </PanelSection>
        <Separator />
        <PanelSection label="标题">
          <FieldSelect
            fields={source.fields}
            value={config.titleField}
            placeholder="选择字段"
            onValueChange={(fieldId) => patch({ titleField: fieldId })}
          />
        </PanelSection>
        <PanelSection
          label="颜色"
          hint={
            colorableFields.length === 0
              ? "需要一个「单选」或「多选」字段，按它的选项颜色着色。"
              : "按该字段的选项颜色给事件着色。"
          }
        >
          <FieldSelect
            fields={colorableFields}
            value={config.colorField ?? ""}
            placeholder="不按字段着色"
            noneLabel="不按字段着色"
            disabled={colorableFields.length === 0}
            onValueChange={(fieldId) =>
              patch({ colorField: fieldId || undefined })
            }
          />
        </PanelSection>
        <Separator />
        <PanelSection label="悬浮提示" hint="悬浮事件时额外展示的字段">
          <TooltipFieldsList
            fields={source.fields.filter(
              (field) => !mappedFieldIds.has(field.id),
            )}
            selected={config.tooltipFields ?? []}
            onChange={(fieldIds) => patch({ tooltipFields: fieldIds })}
          />
        </PanelSection>
      </SettingsPanel>

      {/* ——————— 视图 ——————— */}
      <SettingsPanel
        label="视图"
        icon={CalendarDays}
        value={
          CALENDAR_VIEW_OPTIONS.find(
            (option) => option.value === config.defaultView,
          )?.label
        }
        disabled={!canConfigure}
      >
        <PanelSection label="打开视图">
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={config.defaultView}
            disabled={!canConfigure}
            onValueChange={(next) => {
              if (!next) return;
              patch({ defaultView: next as CalendarViewConfig["defaultView"] });
            }}
          >
            {CALENDAR_VIEW_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="h-7 px-2 text-xs"
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </PanelSection>
        <Separator />
        <PanelSection label="工具栏按钮" hint="日历顶部显示哪些视图切换按钮">
          <CheckboxOptionList
            options={CALENDAR_VIEW_OPTIONS.map((option) => ({
              value: option.value,
              label: option.buttonLabel,
            }))}
            selected={layout.views}
            disabled={!canConfigure}
            onToggle={toggleViewButton}
          />
        </PanelSection>
        <Separator />
        <PanelSection label="一周起始">
          <Select
            value={String(config.firstDay)}
            disabled={!canConfigure}
            onValueChange={(next) => patch({ firstDay: Number(next) })}
          >
            <SelectTrigger
              size="sm"
              aria-label="一周起始"
              className="w-full text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIRST_DAY_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={String(option.value)}
                  className="text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PanelSection>
        <Separator />
        <SwitchRow
          label="今天按钮"
          checked={layout.showToday}
          disabled={!canConfigure}
          onCheckedChange={(checked) => patchLayout({ showToday: checked })}
        />
      </SettingsPanel>

      {/* ——————— 交互 ——————— */}
      <SettingsPanel
        label="交互"
        icon={MousePointerClick}
        active={config.editable || config.selectable}
        disabled={!canConfigure}
      >
        <SwitchRow
          label="允许拖拽改期"
          hint={
            canEditData
              ? "拖动事件改日期，拖边缘改时长"
              : "当前数据只读，无法拖拽"
          }
          checked={config.editable && canEditData}
          disabled={!canEditData}
          onCheckedChange={(checked) => patch({ editable: checked })}
        />
        <Separator />
        <SwitchRow
          label="允许框选新建"
          hint={
            canInsertRow
              ? "在空白日期上拖拽或双击，新增一行"
              : "当前数据源不支持新增记录"
          }
          checked={config.selectable && canInsertRow}
          disabled={!canInsertRow}
          onCheckedChange={(checked) => patch({ selectable: checked })}
        />
        <Separator />
        <PanelSection label="点击事件">
          <Select
            value={config.eventClick}
            disabled={!canConfigure}
            onValueChange={(next) =>
              patch({ eventClick: next as CalendarViewConfig["eventClick"] })
            }
          >
            <SelectTrigger
              size="sm"
              aria-label="点击事件"
              className="w-full text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_CLICK_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PanelSection>
      </SettingsPanel>

      {/* ——————— 显示 ——————— */}
      <SettingsPanel
        label="显示"
        icon={SlidersHorizontal}
        disabled={!canConfigure}
        width="w-72"
      >
        <PanelSection
          label="日历高度"
          hint="铺满时日历填满面板；固定高度超出则滚动"
        >
          <Select
            value={config.height === "auto" ? "auto" : String(config.height)}
            disabled={!canConfigure}
            onValueChange={(next) =>
              patch({ height: next === "auto" ? "auto" : Number(next) })
            }
          >
            <SelectTrigger
              size="sm"
              aria-label="日历高度"
              className="w-full text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HEIGHT_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PanelSection>
        <Separator />
        <PanelSection label="多事件折叠">
          <Select
            value={readEventLimit(config.eventLimit)}
            disabled={!canConfigure}
            onValueChange={(next) =>
              patch({ eventLimit: writeEventLimit(next as EventLimitChoice) })
            }
          >
            <SelectTrigger
              size="sm"
              aria-label="多事件折叠"
              className="w-full text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto" className="text-xs">
                自动（+N more）
              </SelectItem>
              <SelectItem value="none" className="text-xs">
                不折叠
              </SelectItem>
              <SelectItem value="2" className="text-xs">
                最多 2 条
              </SelectItem>
              <SelectItem value="3" className="text-xs">
                最多 3 条
              </SelectItem>
              <SelectItem value="5" className="text-xs">
                最多 5 条
              </SelectItem>
            </SelectContent>
          </Select>
        </PanelSection>
        <Separator />
        <SwitchRow
          label="显示周末"
          checked={config.showWeekends}
          disabled={!canConfigure}
          onCheckedChange={(checked) => patch({ showWeekends: checked })}
        />
        <SwitchRow
          label="当前时刻线"
          hint="周/日视图里标记现在"
          checked={config.nowIndicator}
          disabled={!canConfigure}
          onCheckedChange={(checked) => patch({ nowIndicator: checked })}
        />
        <Separator />
        <PanelSection label="语言">
          <Select
            value={config.locale}
            disabled={!canConfigure}
            onValueChange={(next) => patch({ locale: next })}
          >
            <SelectTrigger
              size="sm"
              aria-label="语言"
              className="w-full text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PanelSection>
        <PanelSection label="主题">
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={config.theme}
            disabled={!canConfigure}
            onValueChange={(next) => {
              if (!next) return;
              patch({ theme: next as CalendarViewConfig["theme"] });
            }}
          >
            <ToggleGroupItem value="auto" className="h-7 px-2 text-xs">
              跟随
            </ToggleGroupItem>
            <ToggleGroupItem value="light" className="h-7 px-2 text-xs">
              浅色
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" className="h-7 px-2 text-xs">
              深色
            </ToggleGroupItem>
          </ToggleGroup>
        </PanelSection>
      </SettingsPanel>
    </ViewToolbar>
  );
}
