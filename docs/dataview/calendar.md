# 日历视图（Calendar DataView）设计文档

> 状态：**已实现**（`packages/dataview/src/views/calendar/`）
> 依赖：[README.md](./README.md)、../database-node-design.md
> 实现说明：本文档保留原始设计；§0 记录实际落地的差异与文件地图。

---

## 0. 实现状态（先读这一节）

已经落地的是日历视图的完整交互链路：月/周/日/列表/多月五种视图、字段映射（开始/结束/标题/
颜色/悬浮提示）、拖拽改期、拖边缘改时长、框选新增行、双击新增行、点击事件（打开记录）、悬浮提示、
键盘可达的 FullCalendar 头部导航、浅深主题、以及「字段配置 / 视图」两个工具栏面板。

**第五轮：`交互` 与 `显示` 两个面板被删除。** 里面每一项的默认值都是正确答案，所以它们直接变成
固定行为：可写性由**宿主能力**决定（有 `onCellChange` 才能拖拽改期，有 `onRowInsert` 才能框选/
双击新建），点击事件恒为「打开记录」（详情弹层随之删除），呈现方式（`zh-CN`、铺满面板、周末列、
当前时刻线、多事件折叠、跟随主题）集中在 `core/config.ts` 的 `CALENDAR_FIXED`。

与原设计的差异（都是有意的）：

| 原设计                                             | 实际落地                                                                                        | 原因                                                                                                                                                                                                                                                             |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §8.1「自建 CalendarDataView 壳」                   | 壳 + `board/calendar-surface.tsx`（`memo` 包裹的 FullCalendar 实例）+ `board/event-readout.tsx` | 事件不是 React 节点，悬停/点击读数的状态只能放在壳里；而 FullCalendar 的 React 封装**每次 re-render 都会 `resetOptions`**，不隔离就会让一次鼠标移动重绘整个日历（见下「不能破坏的约束」）                                                                        |
| config 面板独立成文（C3「字段映射配置面板」）      | 配置进了**视图工具栏**的面板（字段配置 / 视图），注册表里**没有** `configEditor`                | 与表格 / 看板同一条演化路径（M2.5：配置并入工具条，配置左 / 功能右）。所有设置都有专属入口，不留「视图配置」兜底                                                                                                                                                 |
| §4 `height: "auto" \| number`                      | 固定为**铺满面板**（`height: "100%"`）；`CALENDAR_FIXED.height` 是 `"auto"`                     | 外壳给的是一块固定高度的盒子（README §8.1），"auto" 在这里的自然语义就是「用满可用空间」；写成 FullCalendar 的 `height: "auto"` 反而会在一块高盒子里留出空白                                                                                                     |
| §9「v1 固定本地时区」                              | `config.timeZone` 仍然持久化，但**不生效**（永远走 `local`）                                    | 保留字段是为了前向兼容；控件只放一个选项等于占位空态，所以干脆不给控件。date-only 单元格本来也不涉及时区换算                                                                                                                                                     |
| §3.1 `startField` / `endField` 为空                | 与原设计一致，但**空的开始日期是不可达的正常态**：默认配置在无日期字段的表上就是 `""`，渲染引导 | 「还没有选择开始日期」正是这么来的                                                                                                                                                                                                                               |
| §4 `_defaultView_` 只作为初值                      | 用户在日历头部点视图按钮时，**通过 `datesSet` 写回 `config.defaultView`**                       | 与表格「表头排序写回 config」同一条规则（README §8）：视图是声明，用户的选择应当被记住                                                                                                                                                                           |
| §5.4「工具栏：上一页/下一页/今天、视图切换、标题」 | 交给 **FullCalendar 自己的 headerToolbar**，工具栏面板只决定「有哪些视图按钮」                  | 翻页/标题本来就是日历库的强项；自绘一套会与库内部的日期状态打架。`headerToolbar` 只被读成一个决定 —— 视图按钮列表（`readCalendarToolbarLayout` / `writeCalendarToolbarLayout`）；`今天按钮` 的开关在第六轮删除，按钮固定为 `prev,next today`，旧配置读入时归一化 |
| §3.2「end 排他边界减一天」                         | 落在 `core/schema.ts` 的 `rangeToCells`，且**单日区间不写 end**                                 | 写 `end = start` 会让「单日」和「两日」在表格里长得一样；留空才能区分                                                                                                                                                                                            |

### 0.3 统一记录编辑页与右键菜单（第三轮）

- **点击事件**：点击事件打开**统一记录编辑页**（`useRecordActions().openRecord` → 宿主 `onOpenRecord`，页面由 node-content 渲染），而不是
  让视图自己去 `onOpenRecord`。第五轮删掉 `交互` 面板后只剩这一种行为（`CALENDAR_FIXED.eventClick`），
  原先 `popover` 模式的详情弹层（`EventDetailPopover`）随之删除——打开节点仍然可以从记录右键菜单
  里选（collection 才有该项）。
- **右键事件**：事件元素由 FullCalendar 自己渲染，**不是 React 节点**，而且浏览器
  `contextmenu` 的 target 是库自己的 `<a class="fc-event">`（实测：在 `.fc-event-main-frame`
  上右键，target 仍是 `A.fc-event`），所以在 `eventContent` 里包一层 Radix `ContextMenu`
  永远不会触发。日历改为在 `eventDidMount` 里挂原生 `contextmenu` 监听，调用
  `openRecordMenu(point, rowId)`；外壳用 `RecordMenuAtPoint`（受控 `DropdownMenu` + 1×1
  fixed 锚点）在指针处渲染同一份记录菜单。**不要把它改回 `eventContent`。**
- `hiddenFieldIds` 是日历没有展示的字段（开始/结束/标题/颜色/悬浮字段之外的全部）。

### 文件地图

```text
packages/dataview/src/views/calendar/
├── calendar-data-view.tsx      # 壳：字段映射、写回链路、悬浮读数、主题变量、引导（注册表唯一入口）
├── core/
│   ├── config.ts               # 配置自愈（开始/结束/标题/颜色/提示字段）、headerToolbar 往返、FullCalendar 视图名映射
│   ├── schema.ts               # rows → events、event/select → 单元格、事件读数（纯函数，无 React）
│   └── theme.ts                # DataViewThemeTokens → FullCalendar 的 --fc-* CSS 变量
├── board/
│   ├── calendar-surface.tsx    # memo 包裹的 <FullCalendar>：插件、locale、onApi、全部事件回调
│   └── event-readout.tsx       # 悬浮提示（Tooltip），锚在事件矩形上
└── toolbar/calendar-toolbar.tsx  # 字段配置 / 视图 两个面板
```

分层规则与表格 / 看板一致：`core/*` 是纯逻辑（`schema.ts` 只 import FullCalendar 的**类型**），
`board/*` 组装 FullCalendar 与 shadcn 组件，`toolbar/*` 只读 config 并向上报 `onConfigChange`；
**没有任何文件 import `calendar-data-view.tsx`**。日历**没有** `config-editor.tsx`。

### 0.4 字段配置（第四轮）

「字段」面板改名为**「字段配置」**，内容也从四个 `Select` 换成**表格 `字段配置` 的那份字段列表**
（`shared/field-config-list.tsx`：搜索框 + 类型图标 + 眼睛 + 每行「…」菜单 + `新增字段`）。

| 之前                                           | 现在                                                                                                        | 原因                                                                                                                                                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 开始/结束/标题/颜色四个字段下拉                | 每行的「…」菜单：`设为开始日期` / `设为结束日期` / `设为标题` / `设为颜色`（+ 清除结束日期 / 不按字段着色） | 与表格同一套字段列表交互；**第七轮又改了回来**：角色重新成为列表上方的四个配置项（`PanelSection` + `FieldSelect`），行的「…」只剩编辑/删除字段 —— 同一件事在任何视图里都该在同一个位置设置（看板/画廊的 `标题`・`封面` 同理） |
| 悬浮提示字段是一个「排除已映射字段」的复选列表 | 每行一个**眼睛** =「是否出现在悬浮提示里」，对**所有**字段可用                                              | 一个字段一个可见性开关，映射与提示不再互相排斥                                                                                                                                                                                |
| 面板没有字段增删改                             | `新增字段` / `编辑字段` / `删除字段`（需要宿主的 `onFieldsChange`）                                         | 与表格一致：字段管理在任何视图里都该做得到；新增的日期字段若还没有开始日期，会**自动设为开始日期**                                                                                                                            |
| 行上没有角色提示                               | 行尾一行 11px 的角色注解（开始 / 结束 / 标题 / 颜色），开始日期带锁                                         | 一眼看出映射现状，而不是悬停猜                                                                                                                                                                                                |

工具条右侧不再显示「N 事件」：事件就画在日历上，且读数会随数据变宽（AGENTS.md UI 约定）。

### 四条不能破坏的约束（实现时踩过）

1. **FullCalendar 的 React 封装在每次 re-render 都调用 `resetOptions`。** 它用浅比较找出变化的
   option，只要有变化就重绘整棵 preact 树；而壳里为了悬浮提示持有 React state，鼠标
   在事件上移动一次就会触发一次 re-render。所以 `<CalendarSurface>` 必须 `memo` 包裹，且它的
   每个 prop 要么是原始值、要么是 `useMemo`/`useCallback` 稳定引用；壳里的最新值一律通过
   `latest` ref 读取（实测：悬停一次对 `.fc` 子树产生 **0 次 DOM 变更**，而一次配置写入产生 44 次）。
2. **`multiMonth` 与 `multiMonthYear` 是两个不同的视图。** 持久化词汇沿用本文档的
   `multiMonth`（§4），但 FullCalendar 的 `multiMonth` 视图只画**一个月**的多月排版；12 个月
   概览叫 `multiMonthYear`。映射集中在 `core/config.ts` 的 `toFullCalendarView` /
   `fromFullCalendarView`（实测：用原始名时 `monthCount === 1`，映射后 12）。`headerToolbar`
   里存的也是映射后的名字，读回时反向映射。
3. **Radix 的 `asChild` 锚点必须是真正的 DOM 元素。** 事件没有 React 节点可用，悬浮提示渲染一个
   `position: fixed` 的隐形 `<span>`（坐标取自 `arg.el.getBoundingClientRect()`）；这个 span
   **不能**包装在自定义组件里——`asChild` 把 anchor ref 交给直接子元素，不转发 ref 的组件会让
   Floating UI 量到 `null`，面板就会渲染到视口原点（实测：删除前的点击弹层里「打开记录」按钮落在
   `y = -157`，点不到）。
4. **date-only 单元格是「日历日」，不是时间点。** `new Date("2026-05-20")` 是 UTC 午夜，在格林威治
   以西会渲染成 19 日、事件落到错误的格子里；`CellResolver.toDate` 因此对 `YYYY-MM-DD` 走本地
   分量构造，带时间的 ISO 字符串仍按时间点解析后再取本地日。

### 验证方式

与表格 / 看板一致：仓库内**没有**测试基建，日历是通过临时的 `apps/web` 页面 + 无头 Chromium
（CDP）驱动验证的 —— 月/周/日/列表/多月渲染、拖拽改期、拖边缘改时长、框选新增、双击新增、
点击打开、悬浮提示、两个配置面板的每一项（字段角色的增删改、headerToolbar 按钮增删）、只读
（无拖拽/无框选）、三种引导态、浅深主题，以及切回看板/画廊的回归。临时页面已删除。

---

## 1. 概述与使用场景

日历视图把 rows 里带日期的事件/记录按时间轴铺到日历上，支持月/周/日/列表等多视角，并用拖拽直接改日期。它是 database 节点的「时间维度」视图，collection 节点则用节点的创建/更新时间作为日期。

使用场景：

- database 节点：字段含 date 类型（截止日、计划日、发布日期、起止区间等），按日历查看排期。
- collection 节点：按 **createdAt / **updatedAt 浏览节点的时间分布。
- 排期调整：拖拽事件改日期、拖拽边缘改时长、点击事件打开记录。
- 时间概览：月视图看全貌、周/日视图看细节、列表视图按时间顺序排列。

---

## 2. 技术选型

采用 **FullCalendar** 并二次开发。

| 包                        | 用途                    | 许可 |
| ------------------------- | ----------------------- | ---- |
| @fullcalendar/core        | 核心引擎                | MIT  |
| @fullcalendar/react       | React 封装              | MIT  |
| @fullcalendar/daygrid     | 月视图（month grid）    | MIT  |
| @fullcalendar/timegrid    | 周/日时间轴视图         | MIT  |
| @fullcalendar/list        | 列表视图（议程）        | MIT  |
| @fullcalendar/multimonth  | 多月视图（v6.1+，可选） | MIT  |
| @fullcalendar/interaction | 拖拽/选择/点击交互      | MIT  |

全部按 `6.1.21` 装进 `packages/dataview/package.json`（React 19 在 peer 范围内），并且只被
`views/calendar/*` 顶层 import —— 那些模块本身在 `registry.ts` 的 `React.lazy` 之后，所以日历
的 bundle 只有第一次切到日历视图才会加载（README §3.3/§9.1）。theme 走 FullCalendar v6 的
`--fc-*` CSS 变量（`core/theme.ts`），不 fork 它的样式表。

> 不引入 premium 插件（resource / resource-timeline / timeline / scrollgrid / adaptive，需付费许可）。资源视图（按人/泳道）不在 v1 范围。

---

## 3. 数据转换适配

### 3.1 rows → events

```ts
// packages/dataview/src/views/calendar/calendar-schema.ts
export function rowsToEvents(
  source: DataViewSource,
  config: CalendarViewConfig,
): CalendarEvent[] {
  return source.rows
    .map((row) => {
      const start = CellResolver.toDate(row.cells[config.startField]);
      if (!start) return null; // 无开始日期的事件跳过
      const end = config.endField
        ? (CellResolver.toDate(row.cells[config.endField]) ?? undefined)
        : undefined;
      return {
        id: row.id,
        title:
          CellResolver.displayText(
            row.cells[config.titleField],
            titleField,
            resolveNodeTitle,
          ) || "未命名",
        start: toDateInput(start),
        end: end ? toDateInput(end) : undefined,
        allDay: true, // date 字段为 date-only，恒 allDay
        backgroundColor: config.colorField
          ? (CellResolver.toColor(row.cells[config.colorField], colorField) ??
            undefined)
          : undefined,
        extendedProps: { rowId: row.id }, // 回写与打开记录用
      };
    })
    .filter(Boolean);
}
```

- startField 为必需（date 类型）；endField 可选（date 类型，形成区间事件）；titleField 默认主列（首个 text）；colorField 可选（select 类型，取 option.color）。
- date 类型是 date-only（ISO 日期，无时分），因此事件统一 allDay；timegrid 视图对 allDay 事件显示在「全天」区。

实际落地（`core/schema.ts`）：函数名 `rowsToEvents(source, config, resolveNodeTitle?)`，返回
`CalendarEventInput[]`（结构上就是 FullCalendar 的 `EventInput`）。与原设计的差异：

- `extendedProps` 带的不只是 `rowId`，还有 `nodeId`（collection）和 `details` ——
  `config.tooltipFields` 的读数（字段名 + 文本 + 选项色）。悬浮提示与点击弹层因此不需要在每次
  鼠标移动时回查数据源；`readEventRecord` / `readEventReadout` 负责把 `extendedProps` 读回来。
- `end` 取**结束字段 + 1 天**（排他边界由这里给出，见 §3.2）；结束早于开始视为无区间。
- 有颜色的选项额外算 `textColor = contrastTextColor(色值)`：`--fc-event-text-color` 只适合
  未着色的默认底色，实心选项色需要各自决定文字色（`shared/color.ts`）。

### 3.2 拖拽写回

```ts
// eventDrop / eventResize → 更新 start/end 字段的单元格
function eventToCells(info, config): Array<{ rowId; fieldId; cell }> {
  const start = { type: "date", date: toISODate(info.event.start) };
  const cells = [
    {
      rowId: info.event.extendedProps.rowId,
      fieldId: config.startField,
      cell: start,
    },
  ];
  if (config.endField && info.event.end) {
    cells.push({
      rowId: info.event.extendedProps.rowId,
      fieldId: config.endField,
      cell: { type: "date", date: toISODate(subtractDay(info.event.end)) },
    });
  }
  return cells; // 逐个冒泡 onCellChange
}
```

> 区间语义约定：FullCalendar 的 end 是排他边界，date 字段的 end 是「结束当天」，写回时 end 日期 = event.end 减一天（保持 allDay 单日/多日语义直观）。

实际落地（`core/schema.ts` 的 `rangeToCells` / `eventToCells` / `selectionToRow`）：±1 天的换算
**只写在这一个函数里**，eventDrop / eventResize / select / 双击四条路径全部经由它。两条规则：

- **end 字段总要写**（配了就必须写），单日区间写 `null`（清空）而不是写回开始日；这样表格里
  「单日」和「两日」才区分得开。
- 写回前用 `resolveStartField` / `resolveEndField` 对**当前 schema** 再解析一次字段 id：配置里
  残留的已删字段不会被写成一个不存在的 fieldId（`DatabaseContent` 会拒绝这种单元格）。

### 3.3 collection 投影

collection 场景 startField 可选 **createdAt / **updatedAt，titleField 用 **title，colorField 用 **nodeType（节点类型哈希取色）；只读（禁用拖拽写回），点击事件经 rowId → nodeIds 触发 onOpenNode。

实际落地：点击事件在两种宿主上都打开**统一记录编辑页**（`useRecordActions().openRecord` → 宿主渲染 `RecordEditor`），
记录右键菜单里 collection 另有「打开节点」；`readOnly` 由宿主传入，壳把它与 `onCellChange` /
`onRowInsert` 折算成 `editable` / `selectable` —— 第五轮删掉 `交互` 面板后，这两个值**就是**
宿主能力本身，没有第二层开关。`colorField` 选 `__nodeType` 时不需要任何特殊代码：
`CellResolver.toColor` 对没有声明颜色的选项按 `字段id:选项id` 求稳定色相。

---

## 4. 配置项（CalendarViewConfig）

```ts
export interface CalendarViewConfig {
  // —— 字段映射 ——
  startField: string; // 必需：date 字段（事件开始）
  endField?: string; // 可选：date 字段（事件结束，区间）
  titleField: string; // 事件标题（text，默认主列）
  colorField?: string; // 事件颜色（select，取 option.color）
  tooltipFields?: string[]; // 悬浮提示展示的额外字段

  // —— 视图 ——
  defaultView:
    | "dayGridMonth"
    | "timeGridWeek"
    | "timeGridDay"
    | "listWeek"
    | "multiMonth";
  headerToolbar: { left: string; center: string; right: string }; // 工具栏布局
  firstDay: number; // 周起始（0 周日）
  timeZone: "local" | string; // 仅前向兼容保留，恒按 local 生效
}
```

配置里**只有**「字段映射 + 视图」两半：第五轮删掉了 `交互` / `显示` 两半的全部键
（`editable` / `selectable` / `eventClick` / `eventLimit` / `height` / `showWeekends` /
`nowIndicator` / `locale` / `theme`）。旧 config 里残留的这些键不会再被读取，因此不需要迁移。

默认配置（defaultConfig）：startField 取首个 date 字段、titleField 取主列、defaultView dayGridMonth。

实际落地的默认值还有：`endField` = 第二个 date 字段、`headerToolbar = { left: "prev,next today",
center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" }`（多月按钮默认不开）、
`firstDay: 1`、`timeZone: "local"`。

固定值集中在 `core/config.ts` 的 `CALENDAR_FIXED`：`locale: "zh-CN"`、`height: "auto"`（铺满面板）、
`theme: "auto"`（跟随 next-themes）、`showWeekends: true`、`nowIndicator: true`、`eventLimit: true`
（自动折叠）、`eventClick: "open"`（点击即打开记录编辑页）。可写性不是常量，而是宿主能力：
`editable = 宿主可写单元格`、`selectable = 宿主可新增行`。

配置面板与字段的对应（`toolbar/calendar-toolbar.tsx`，注册表里没有 `configEditor`）：

| 面板         | 覆盖的配置键                                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **字段配置** | 四个角色**配置项**（开始日期 / 结束日期 / 标题 / 颜色，各一个 `PanelSection` + `FieldSelect`）+ 字段列表（眼睛 = `tooltipFields`、行尾角色注解、编辑/删除/新增字段） |
| **视图**     | defaultView（月/周/日/列表/多月）、headerToolbar（只读成「视图按钮列表」；`今天` 固定显示）、firstDay                                                                |

两个面板的触发器都是中性按钮（没有高亮态）。`timeZone` 没有控件（v1 恒 `local`，见 §9）。

---

## 5. 功能点（全功能清单）

### 5.1 视图切换

- 月视图（dayGridMonth）：默认，月度网格。
- 周视图（timeGridWeek）：7 天时间轴（allDay 区 + 小时区）。
- 日视图（timeGridDay）：单日时间轴。
- 列表视图（listWeek）：议程列表，按时间顺序。
- 多月视图（multimonth）：跨月概览（可选）。

### 5.2 日期交互（宿主可写时）

- 拖拽事件改日期（eventDrop → 写回 startField / endField）。
- 拖拽边缘改时长（eventResize → 写回 endField）。
- 框选日期新建事件（select → 追加新行并填 start/end）。
- 双击空日期快速新建（可选）。

### 5.3 事件交互

- 点击事件 → 打开统一记录编辑页（宿主 node-content 渲染）；右键 → 统一记录菜单（打开记录 / 打开节点 / 复制 / 删除）。
- 悬浮提示：标题 + tooltipFields 的字段值。
- 多事件折叠（+N more）展开。
- 事件按 colorField 着色，图例可开关（可选）。

### 5.4 导航与呈现

- 工具栏：上一页/下一页/今天、视图切换、标题（年月范围）。
- 今天高亮、周末开关、当前时刻线。
- 浅/深主题跟随 next-themes。

---

## 6. 交互与操作方法

| 操作     | 手势/入口           | 结果                       |
| -------- | ------------------- | -------------------------- |
| 切换视图 | 工具栏按钮          | 月/周/日/列表              |
| 翻页     | 上一页/下一页/今天  | 变更时间范围               |
| 改日期   | 拖拽事件            | 写回 start/end 字段        |
| 改时长   | 拖拽事件右/下边缘   | 写回 end 字段              |
| 新建事件 | 框选日期 / 双击空白 | 新增行 + 起止日期          |
| 打开记录 | 点击事件            | 统一记录编辑页（宿主渲染） |
| 详情     | 悬浮事件            | tooltip 字段               |

键盘：方向键移动选中事件、Enter 打开、Delete 删除（可编辑时）。

实际落地：

- 五种视图都可用；多月按钮打开的是 **12 个月概览**（`multiMonthYear` 的映射见 §0 约束 2），在
  面板里仍显示为「多月」。
- **新建事件有两种手势，都要求宿主允许新增行**：在空白日期上**拖拽跨天**（`select`，区间 > 1 天）
  或**双击**某个日期（`dateClick`，`jsEvent.detail >= 2`）。单击只高亮不建行 —— 否则误点一下就
  多一条记录。两种手势都经 `selectionToRow` 生成带 `start`/`end` 的新行，落 `onRowInsert`。
- 点击事件只有一种行为：打开统一记录编辑页（`CALENDAR_FIXED.eventClick`）。原先 `popover`
  详情弹层与 `none` 一起随 `交互` 面板删除——需要「不响应」的场景本来也说不清楚，而记录菜单
  （右键）已经能给出全部动作。
- 悬浮提示（Tooltip）显示标题 + 日期区间 + `tooltipFields`（空值行不显示）。它是 Tooltip 而不是
  Popover：只读数、不抢焦点、不常驻。
- 事件按 `colorField` 着色；**图例未做**（设计里本来就是「可选」，且颜色语义由字段选项自身承载）。
- 键盘操作完全交给 FullCalendar（方向键在网格里移动、列表项可 Tab），视图层没有额外快捷键。

---

## 7. 生命周期与资源释放

- 挂载：<FullCalendar> 组件渲染（React 封装），依赖 locale 注入（@fullcalendar/core/locales/zh-cn）。
- 数据更新：events 数组变化由 React 封装自动 diff（内部 EventSource 更新）。
- 卸载：React 卸载自动 destroy；不保活，切换视图即卸载。
- 拖拽/选择事件监听：editable/selectable 关闭时移除对应处理器，避免 collection 只读下误触。

实际落地：`locale` 只有两个可解析值（`zh-CN` → 内置 `zh-cn` 语言包，`en` → 核心自带），
**其它值一律回落到 `zh-CN`** —— FullCalendar 只在语言包已注册时认这个 code，未知 code 会让
`initialView` 一起抛错。`calendarSurface` 的 `memo` + 稳定回调（§0 约束 1）是「一次悬停不重绘
日历」的保证；`DailyRunner`/`rerenderDelay` 由库自理。

生命周期里唯一需要当心的是**视图切换要命令式**：`initialView` 只在挂载时读一次，所以
`config.defaultView` 变化由壳调用 `api.changeView(...)`，而不是重挂载（重挂载会丢掉用户翻到的
日期）。

---

## 8. 二次开发要点（实际做法）

1. 自建 CalendarDataView 壳：包一层 <FullCalendar>，把 config 映射为 options（plugins、initialView、headerToolbar、locale、editable、events、事件回调）。
2. 日期写回：eventDrop/eventResize 里用 eventToCells 还原 DatabaseCell 并逐个 onCellChange；end 日期做「排他边界减一天」换算。
3. 颜色映射：select 字段 option.color → event.backgroundColor；无颜色时按 optionId 哈希取稳定色。
4. 打开记录：eventClick → rowId 反查 source.rows → onOpenRecord（database）或 nodeIds → onOpenNode（collection）。
5. 主题映射：themeTokens 注入 FullCalendar 的 CSS 变量（--fc-border-color 等），深色模式可用内置 themeSystem 或自定义 class。
6. 字段自愈：startField/titleField 失效（字段被删/改类型）时降级为「未选择」并在视图内给引导（「请选择日期字段」）。

实际做法与逐条对应：

1. 壳拆成 `calendar-data-view.tsx`（状态 + 写回 + 读数）与 `board/calendar-surface.tsx`
   （唯一实例化 FullCalendar 的地方）。`plugins` 是模块级常量数组，`buttonText` 只补
   `multiMonth*`（任何语言包都没给它默认文案），其余按钮文案由语言包提供。
2. 见 §3.2；`onCellChange` 对一次手势可能发两次（start + end），宿主按既有规则合并成一次 upsert。
3. `CellResolver.toColor` 已经实现了「声明色优先、否则哈希」，没有颜色字段时用主题色 **16% 混白/
   混黑**的淡底（`--fc-event-bg-color`）而不是实心 `--primary`：一屏实心橙的月视图没法看，而且
   `--primary` 在这个项目里只留给「用户已介入的状态」。
4. `eventClick: "open"` 与弹层里的按钮走同一条 `openReadout`，按 `source.kind` 分流。
5. 主题落到 `core/theme.ts`：token → `--fc-*` 变量，挂在日历的包裹元素上；`theme: "dark"` 时
   即使页面是浅色，日历也走深色 token（反之亦然）。
6. 失效降级用 `resolveStartField` / `resolveEndField` / `resolveTitleField` / `resolveColorField` /
   `resolveTooltipFields`，全部返回 `null`/`[]` 而不是抛错；三种引导态见 §0 验证清单。

---

## 9. 边界与取舍

- date-only：v1 的 date 字段无时分，事件恒 allDay，不支持精确到小时的时间段；如需时分，扩展 DatabaseFieldType 加 datetime 后再接 timegrid 小时区。
- 无资源视图：按人/泳道（premium resource）不在范围；可用 colorField 近似区分。
- 无递归事件：DatabaseField 无「重复规则」，v1 不做 recurring。
- 时区：v1 local，不做多时区换算（date-only 天然规避时区偏移）。
- 区间语义：end 排他边界与「结束当天」的换算集中在 eventToCells，避免散落各回调。

补充（实现后确认的取舍）：

- **`timeZone` 字段存在但不生效**：v1 恒 `local`，工具栏也不给控件（单选项控件等于占位空态）。
- **`height` 固定为「铺满面板」**（`CALENDAR_FIXED.height = "auto"` → `height="100%"`），不是
  FullCalendar 的 `height: "auto"`（内容高度）。第五轮删掉 `显示` 面板后，固定像素高度也随之消失。
- **呈现类设置没有 UI**：语言、主题、周末列、当前时刻线、多事件折叠都是常量（`CALENDAR_FIXED`），
  跟着产品默认走；它们原本是 `显示` 面板里的六个控件，但每一项都只有一个正确答案。
- **首屏不保活**：切走即销毁，翻到的月份不写回 config（配置里没有 `currentDate` 这个键；
  想要「切回来还在同一个月」需要扩展 config，属于 v2）。
- **`multiMonth` 只有 12 个月概览一种排版**，没有暴露 `multiMonthMaxColumns` / `multiMonthMinWidth`。

---

## 10. 开发任务清单（已完成）

| #   | 任务                | 说明                                                                | 落地位置                                                |
| --- | ------------------- | ------------------------------------------------------------------- | ------------------------------------------------------- |
| C1  | calendar-schema.ts  | `rowsToEvents` / `rangeToCells` / `eventToCells` / `selectionToRow` | `core/schema.ts`                                        |
| C2  | CalendarDataView 壳 | FullCalendar options 映射 + locale + 命令式视图切换                 | `calendar-data-view.tsx` + `board/calendar-surface.tsx` |
| C3  | 字段映射配置面板    | 字段列表 + 角色菜单（开始 / 结束 / 标题 / 颜色）+ 悬浮提示眼睛      | `toolbar/calendar-toolbar.tsx`（字段配置 面板）         |
| C4  | 拖拽写回            | eventDrop / eventResize / select / dateClick → onCellChange         | `calendar-data-view.tsx` + `core/schema.ts`             |
| C5  | 事件交互            | 点击打开记录 + 悬浮提示（详情弹层第五轮删除）                       | `board/event-readout.tsx`                               |
| C6  | 主题/周末/今天线    | `--fc-*` 变量注入 + `CALENDAR_FIXED` 固定呈现（面板第五轮删除）     | `core/theme.ts` + `core/config.ts`                      |
| C7  | collection 只读投影 | 复用投影 + 只读即禁用拖拽/框选（宿主能力是唯一开关）                | `calendar-data-view.tsx`                                |
| C8  | 字段自愈 + 引导态   | 三种缺字段引导、「还没有选择开始日期」可达                          | `core/config.ts` + `calendar-data-view.tsx`             |
