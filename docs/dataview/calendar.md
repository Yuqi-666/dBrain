# 日历视图（Calendar DataView）设计文档

> 状态：设计稿（未实现）
> 依赖：[README.md](./README.md)、../database-node-design.md
> 定位：核心视图，需全功能设计并优先实现

---

## 1. 概述与使用场景

日历视图把 rows 里带日期的事件/记录按时间轴铺到日历上，支持月/周/日/列表等多视角，并用拖拽直接改日期。它是 database 节点的「时间维度」视图，collection 节点则用节点的创建/更新时间作为日期。

使用场景：

- database 节点：字段含 date 类型（截止日、计划日、发布日期、起止区间等），按日历查看排期。
- collection 节点：按 __createdAt / __updatedAt 浏览节点的时间分布。
- 排期调整：拖拽事件改日期、拖拽边缘改时长、点击事件打开记录。
- 时间概览：月视图看全貌、周/日视图看细节、列表视图按时间顺序排列。

---

## 2. 技术选型

采用 **FullCalendar** 并二次开发。

| 包 | 用途 | 许可 |
| --- | --- | --- |
| @fullcalendar/core | 核心引擎 | MIT |
| @fullcalendar/react | React 封装 | MIT |
| @fullcalendar/daygrid | 月视图（month grid） | MIT |
| @fullcalendar/timegrid | 周/日时间轴视图 | MIT |
| @fullcalendar/list | 列表视图（议程） | MIT |
| @fullcalendar/multimonth | 多月视图（v6.1+，可选） | MIT |
| @fullcalendar/interaction | 拖拽/选择/点击交互 | MIT |

> 不引入 premium 插件（resource / resource-timeline / timeline / scrollgrid / adaptive，需付费许可）。资源视图（按人/泳道）不在 v1 范围。

---

## 3. 数据转换适配

### 3.1 rows → events

~~~ts
// packages/dataview/src/views/calendar/calendar-schema.ts
export function rowsToEvents(source: DataViewSource, config: CalendarViewConfig): CalendarEvent[] {
  return source.rows.map((row) => {
    const start = CellResolver.toDate(row.cells[config.startField]);
    if (!start) return null;                          // 无开始日期的事件跳过
    const end = config.endField
      ? CellResolver.toDate(row.cells[config.endField]) ?? undefined
      : undefined;
    return {
      id: row.id,
      title: CellResolver.displayText(row.cells[config.titleField], titleField, resolveNodeTitle) || "未命名",
      start: toDateInput(start),
      end: end ? toDateInput(end) : undefined,
      allDay: true,                                   // date 字段为 date-only，恒 allDay
      backgroundColor: config.colorField
        ? CellResolver.toColor(row.cells[config.colorField], colorField) ?? undefined
        : undefined,
      extendedProps: { rowId: row.id },               // 回写与打开记录用
    };
  }).filter(Boolean);
}
~~~

- startField 为必需（date 类型）；endField 可选（date 类型，形成区间事件）；titleField 默认主列（首个 text）；colorField 可选（select 类型，取 option.color）。
- date 类型是 date-only（ISO 日期，无时分），因此事件统一 allDay；timegrid 视图对 allDay 事件显示在「全天」区。

### 3.2 拖拽写回

~~~ts
// eventDrop / eventResize → 更新 start/end 字段的单元格
function eventToCells(info, config): Array<{ rowId, fieldId, cell }> {
  const start = { type: "date", date: toISODate(info.event.start) };
  const cells = [{ rowId: info.event.extendedProps.rowId, fieldId: config.startField, cell: start }];
  if (config.endField && info.event.end) {
    cells.push({ rowId: info.event.extendedProps.rowId, fieldId: config.endField,
                 cell: { type: "date", date: toISODate(subtractDay(info.event.end)) } });
  }
  return cells;  // 逐个冒泡 onCellChange
}
~~~

> 区间语义约定：FullCalendar 的 end 是排他边界，date 字段的 end 是「结束当天」，写回时 end 日期 = event.end 减一天（保持 allDay 单日/多日语义直观）。

### 3.3 collection 投影

collection 场景 startField 可选 __createdAt / __updatedAt，titleField 用 __title，colorField 用 __nodeType（节点类型哈希取色）；只读（禁用拖拽写回），点击事件经 rowId → nodeIds 触发 onOpenNode。

---

## 4. 配置项（CalendarViewConfig）

~~~ts
export interface CalendarViewConfig {
  // —— 字段映射 ——
  startField: string;               // 必需：date 字段（事件开始）
  endField?: string;                // 可选：date 字段（事件结束，区间）
  titleField: string;               // 事件标题（text，默认主列）
  colorField?: string;              // 事件颜色（select，取 option.color）
  tooltipFields?: string[];         // 悬浮提示展示的额外字段

  // —— 视图 ——
  defaultView: "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek" | "multiMonth";
  headerToolbar: { left: string; center: string; right: string };  // 工具栏布局
  firstDay: number;                 // 周起始（0 周日）
  locale: string;                   // 语言（zh-cn）
  timeZone: "local" | string;

  // —— 交互 ——
  editable: boolean;                // 是否允许拖拽改期/改时长（collection 恒 false）
  selectable: boolean;              // 是否允许框选日期新建事件
  eventClick: "open" | "popover" | "none";   // 点击事件行为
  eventLimit: boolean | number;     // 多事件折叠（+N more）

  // —— 呈现 ——
  height: "auto" | number;          // 日历高度
  showWeekends: boolean;            // 是否显示周末
  nowIndicator: boolean;            // 当前时刻指示线
  theme: "light" | "dark" | "auto";
}
~~~

默认配置（defaultConfig）：startField 取首个 date 字段、titleField 取主列、defaultView dayGridMonth、locale zh-cn、editable = !readOnly。

---

## 5. 功能点（全功能清单）

### 5.1 视图切换

- 月视图（dayGridMonth）：默认，月度网格。
- 周视图（timeGridWeek）：7 天时间轴（allDay 区 + 小时区）。
- 日视图（timeGridDay）：单日时间轴。
- 列表视图（listWeek）：议程列表，按时间顺序。
- 多月视图（multimonth）：跨月概览（可选）。

### 5.2 日期交互（database 可编辑）

- 拖拽事件改日期（eventDrop → 写回 startField / endField）。
- 拖拽边缘改时长（eventResize → 写回 endField）。
- 框选日期新建事件（select → 追加新行并填 start/end）。
- 双击空日期快速新建（可选）。

### 5.3 事件交互

- 点击事件 → 打开记录详情浮层 / 打开关联节点（eventClick）。
- 悬浮提示：标题 + tooltipFields 的字段值。
- 多事件折叠（+N more）展开。
- 事件按 colorField 着色，图例可开关（可选）。

### 5.4 导航与呈现

- 工具栏：上一页/下一页/今天、视图切换、标题（年月范围）。
- 今天高亮、周末开关、当前时刻线。
- 浅/深主题跟随 next-themes。

---

## 6. 交互与操作方法

| 操作 | 手势/入口 | 结果 |
| --- | --- | --- |
| 切换视图 | 工具栏按钮 | 月/周/日/列表 |
| 翻页 | 上一页/下一页/今天 | 变更时间范围 |
| 改日期 | 拖拽事件 | 写回 start/end 字段 |
| 改时长 | 拖拽事件右/下边缘 | 写回 end 字段 |
| 新建事件 | 框选日期 / 双击空白 | 新增行 + 起止日期 |
| 打开记录 | 点击事件 | onOpenRecord / onOpenNode |
| 详情 | 悬浮事件 | tooltip 字段 |

键盘：方向键移动选中事件、Enter 打开、Delete 删除（可编辑时）。

---

## 7. 生命周期与资源释放

- 挂载：<FullCalendar> 组件渲染（React 封装），依赖 locale 注入（@fullcalendar/core/locales/zh-cn）。
- 数据更新：events 数组变化由 React 封装自动 diff（内部 EventSource 更新）。
- 卸载：React 卸载自动 destroy；不保活，切换视图即卸载。
- 拖拽/选择事件监听：editable/selectable 关闭时移除对应处理器，避免 collection 只读下误触。

---

## 8. 二次开发要点

1. 自建 CalendarDataView 壳：包一层 <FullCalendar>，把 config 映射为 options（plugins、initialView、headerToolbar、locale、editable、events、事件回调）。
2. 日期写回：eventDrop/eventResize 里用 eventToCells 还原 DatabaseCell 并逐个 onCellChange；end 日期做「排他边界减一天」换算。
3. 颜色映射：select 字段 option.color → event.backgroundColor；无颜色时按 optionId 哈希取稳定色。
4. 打开记录：eventClick → rowId 反查 source.rows → onOpenRecord（database）或 nodeIds → onOpenNode（collection）。
5. 主题映射：themeTokens 注入 FullCalendar 的 CSS 变量（--fc-border-color 等），深色模式可用内置 themeSystem 或自定义 class。
6. 字段自愈：startField/titleField 失效（字段被删/改类型）时降级为「未选择」并在视图内给引导（「请选择日期字段」）。

---

## 9. 边界与取舍

- date-only：v1 的 date 字段无时分，事件恒 allDay，不支持精确到小时的时间段；如需时分，扩展 DatabaseFieldType 加 datetime 后再接 timegrid 小时区。
- 无资源视图：按人/泳道（premium resource）不在范围；可用 colorField 近似区分。
- 无递归事件：DatabaseField 无「重复规则」，v1 不做 recurring。
- 时区：v1 local，不做多时区换算（date-only 天然规避时区偏移）。
- 区间语义：end 排他边界与「结束当天」的换算集中在 eventToCells，避免散落各回调。

---

## 10. 开发任务清单

| # | 任务 | 说明 |
| --- | --- | --- |
| C1 | calendar-schema.ts | rowsToEvents / eventToCells / 日期换算 |
| C2 | CalendarDataView 壳 | FullCalendar options 映射 + locale |
| C3 | 字段映射配置面板 | start/end/title/color 字段选择器 |
| C4 | 拖拽写回 | eventDrop/eventResize/select → onCellChange |
| C5 | 事件交互 | eventClick 打开记录/节点 + tooltip |
| C6 | 主题/周末/今天线 | themeTokens + 呈现选项 |
| C7 | collection 只读投影 | 复用投影 + 只读禁用拖拽 |
