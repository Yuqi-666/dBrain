# 甘特图视图（Gantt DataView）设计文档

> 状态：**已实现**（`packages/dataview/src/views/gantt/`，@visactor/vtable-gantt 1.26.8）
> 依赖：[README.md](./README.md)、../database-node-design.md
> 相关：table.md（同一套 VTable 主题语言）、calendar.md（同一套「字段即角色」配置面板）

---

## 0. 实现现状与关键决策

```text
views/gantt/
├── gantt-data-view.tsx        # 壳：字段映射、写回、hover 读数、折叠态、空态引导（registry 唯一入口）
├── core/config.ts             # 角色解析（自愈）、时间粒度 → scales、GANTT_FIXED
├── core/schema.ts             # rows → 视图模型记录（含合成分组行）、拖拽 → 单元格
├── canvas/theme.ts            # tokens → 任务列表 ITableThemeDefine + 时间轴/网格/条形字面色
├── board/gantt-surface.tsx    # memo 包裹的命令式 <Gantt>：构造/销毁、事件、setRecords
├── board/task-readout.tsx     # 悬浮读数（锚在指针上）
└── toolbar/gantt-toolbar.tsx  # 字段配置（5 个角色 + 共享字段列表）/ 视图（表头·粒度·行高·今日线·周末）
```

**注册表里没有 `configEditor`**：字段配置 / 视图 两个面板覆盖了 `GanttViewConfig` 里
用户能决定的每一项，所以像表格 / 看板 / 日历一样省略兜底的「视图配置」弹层
（`views/gantt/config-editor.tsx` 已删除）。

### 0.1 必须知道的坑（都在浏览器里实测过）

1. **`groupBy` 是类型谎言。** `GanttConstructorOptions.groupBy` 只有声明，1.26.8 的
   运行时代码里一次都没读；官方的「分组」其实只有「嵌套 `children` + 列上 `tree: true`」
   一条路，而嵌套会把任务列表的 tree 显式关掉（`_generateListTableOptions` 里
   `columns[i].tree = false`）。所以**分组是本视图自研的**：记录保持**一层平铺**，每个分组
   由一条合成的 `type: "project"` 行代表（它自己的 `__ganttStart/__ganttEnd` 是该组的
   跨度），折叠时把成员行从 records 里去掉 —— 折叠前后列表与时间轴的顺序天然一致。
2. **记录是视图模型，不是行。** 记录用保留键 `__gantt*`（`GANTT_ROW_ID` / `TITLE` /
   `START` / `END` / `PROGRESS` / `GROUP_KEY` / `GROUP_LABEL` / `GROUP_COUNT`）承载字段值，
   而不是直接用 field id。好处有两个：分组行能带没有字段承接的值（跨度、任务数），以及
   写回时**用活 schema 重新解析**（`resolveStartField` / `resolveEndField`），字段被删掉
   也不可能写到死 id 上。
3. **结束日期是含端点的**（`taskDays = end - start + 1`），与日历相反：日历里 FullCalendar 的
   `end` 是开区间、要 −1 天，这里**没有任何 ±1 天换算**，`date` 单元格直接就是任务条的一端。
4. **拖拽会原地修改你传进去的记录对象**，然后才 fire `change_date_range`。我们的 records 每次
   渲染都重建，所以「写回由宿主负责」这条规则在这里同样成立：`change_date_range`
   → `taskRangeToCells` → `onCellChange`（起点、终点两个单元格）。
5. **列表行点击不能信 `originData`。** 折叠删掉若干行之后，`originData` 仍按 _构造时_ 的记录
   数组解析，会把屏幕上第 3 行解析成已经不在列表里的任务（实测：折叠「设计」后点「数据层」
   得到的是「竞品调研」）。行记录一律按 `row - columnHeaderLevelCount` 索引到**我们自己
   `setRecords` 的那个数组**，`originData` 只作为越界兜底。
6. **进度只是读数，没有拖拽手柄。** vtable-gantt 把手柄画在 `y = height - 3`（12px 高），
   也就是条形下沿往**下**伸出去，而 hover 组在指针离开条形时立刻隐藏 —— 浏览器实测：hover
   到手柄位置时光标已经不是 `ew-resize`，按下既不改进度也不触发条形事件，抓不住。
   因此 `progressAdjustable: false`，进度条只由 `progressField`（0–1）填充，改进度去记录编辑页
   （表格视图 / 记录页）。这也是设计文档 §5/§6 没有把「拖进度」列为功能的原因。
7. **任务列表是真正的 `ListTable`**（`gantt.taskListTableInstance`），三件事要对齐：
   - 表头行数/高度由 gantt 对齐到时间轴表头（实测列表表头 1 行 = 56px = 2×28 的两层时间轴表头），
     所以左右两侧的行 y 是对的上的 —— 不要手动去补 `defaultHeaderRowHeight`；
   - `select: { disableSelect: true }`：这个视图没有「选中」语义（点击已经是「打开记录」/
     「折叠分组」），不关掉的话 VTable 会用它自己的蓝色把用户点过的那一格一直高亮着；
   - 行 hover 底色来自 `theme.taskListTheme.bodyStyle.hover`，与表格视图同一套 token。
8. **主题是「构造项 + 一个 ListTable 主题」两半**：时间轴、网格、条形、边框都写死在
   `GanttConstructorOptions` 里，没有整体主题对象；`canvas/theme.ts` 把 `DataViewThemeTokens`
   翻成字面色（canvas 认不了 CSS 变量），任务列表那份是 `ITableThemeDefine`。
9. **空数据不构造 gantt**：没有开始日期字段、或没有任何带日期的行时不 mount surface（没有记录
   就没有时间轴范围可言），走 `DataViewEmptyState` 引导。分组全部折叠时仍有分组行，不会落到空态。
10. **面板要能滚。** 「字段配置」是 5 个角色 + 字段列表，实测在 633px 视口里弹层高 624px 且
    `overflow: visible` —— 底部「新增字段」点不到。共享的 `shared/settings-panel.tsx` 因此给
    弹层内容加了 `max-h-[min(70vh,var(--radix-popover-content-available-height))] overflow-y-auto`
    （看板 / 日历 / 画廊的面板同样受益）。
11. **容器必须是 `position: relative`，而且要是层叠上下文（`isolate`）。** 库往容器里塞了三层，
    其中两层是绝对定位：时间轴画布 `.vtable-gantt`（库注入的样式表写死 `position: absolute`，
    再由 `element.style.left = <任务列表宽度>` 推到右边）和中间那条分割线手柄
    （`verticalSplitResizeLine`，库还给它写死 `z-index: 100`）。容器**没有**定位上下文时它们以
    页面（初始包含块）为基准：实测左右两块画布按容器自身的左偏移（25px）重叠了一段，分割线手柄
    画在 `y = 0`，比图表顶端高出 99px —— 也就是「左右 canvas 交汇处重叠 + 分割线向上偏离」。
    容器加一个 `relative`，两处一起归位（两张画布严丝合缝地拼在任务列表宽度上）。
    那个 `z-index: 100` 还要求容器**自己成为层叠上下文**（Tailwind `isolate`，即
    `isolation: isolate`）：`relative` + `z-index: auto` 不是层叠上下文，分割线的 100 会和盒子
    外面的层比大小 —— 记录编辑页的遮罩是 `z-30`、页面是 `z-40`，于是「打开记录时分割线不被模糊
    覆盖」。实测在同一坐标取 `elementsFromPoint`：`isolation: isolate` 时最上面是
    `record-scrim`，把它改成 `auto` 后最上面立刻变成分割线本身。
12. **任务列表的层级是本视图自己画的。** 分组是本视图自研的（坑 1），库并不知道哪条是分组行、
    哪条是组内任务：不处理时两者是同一层平铺的普通行，只有标题里的 ▸/▾ 能看出区别。列表列用
    一个 `style` 函数区分——分组行加粗、任务行缩进 `GANTT_FIXED.taskListIndent`（20px）——
    行记录用 `args.table.getCellOriginRecord(col, row)` 取**活**记录（它按当前 layout 解析，
    和坑 5 里那个会过期的 `originData` 不是一回事）。表头行要显式跳过，否则表头文字也会被
    缩进。
13. **悬浮读数和右键菜单必须 portal 到 `document.body`。** 两者都是「在库报告的坐标放一个隐形
    `position: fixed` 盒子当 Radix 锚点」。节点内容经常挂在节点编辑器对话框里，而 `DialogContent`
    是 `-translate-x-1/2 -translate-y-1/2` 居中的（Tailwind v4 写的是独立 `translate` 属性，
    它和 `transform` 一样会给固定定位建立包含块）：于是 `left/top` 变成「对话框内的坐标」，读数
    落到指针右下角。实测对话框面板在 `128,63`，一个 `position: fixed; left:100; top:100` 的盒子
    渲染在 `228,163` —— 偏移正好是对话框的页面位置。`shared/body-layer.tsx` 把整份 primitive
    portal 到 body，锚点和 Radix 自己 portal 的浮层就共享视口坐标系。日历悬浮读数与
    `RecordMenuAtPoint` 走同一个组件（同一个坑，一起修）。
14. **表头默认是「节点名」，改标题走 `updateColumns`，不进 `structureKey`。** 任务列表只有一列，
    标题由 `resolveTaskColumnTitle`（`core/config.ts`）分三步定：`config.taskColumnTitle` →
    宿主节点名（`DataViewSource.nodeTitle`，两个适配器都会带上，`databaseToDataViewSource` 多收
    一个参数）→ `GANTT_FIXED.taskColumnTitle`（「任务」，给还没命名的节点兜底）。它**不能**进
    `structureKey`：默认值就是宿主节点的名字，而节点名正是在同一个节点编辑器里改的，一次键入
    一次重建（丢滚动位置、把拖过的分割线弹回 200px）。所以标题走
    `gantt.taskListTableInstance.updateColumns(taskListColumns(title))` —— 和构造时同一个工厂函数，
    层级 `style` 与列宽一起带过去。实测：改标题、改节点名之后画布上的探针都还在（没有重建），
    分割线拖到 170px 后再改节点名仍是 170px，任务行缩进的像素测量值前后完全一致。

---

## 1. 概述与使用场景

甘特图视图把 rows 里带起止日期的任务/计划画成时间轴条形图，直观展示时间跨度、进度与（可选的）分组。它是「项目排期、任务计划、里程碑」类数据的时间线形态。

使用场景：

- database 节点：字段含 date 起止（开始日 + 结束日）与 number 进度（0–1），做排期管理。
- 计划调整：拖拽条形改起止日期、拖边缘改时长、读进度条。
- 分组概览：按 select 字段（阶段/负责人/分类）分组折叠。

> collection 节点（节点属性投影）用 `__createdAt` / `__updatedAt` 当起止日期也能画（默认配置会
> 取前两个 date 字段），只是投影只读，条形不能拖。

---

## 2. 技术选型

**@visactor/vtable-gantt 1.26.8**（建立在 @visactor/vtable 之上，与表格视图同源），懒加载：
`registry.ts` 用 `React.lazy` 动态 import，`board/gantt-surface.tsx` 顶层 import 该库，
只有切到甘特图才会拉到这份 bundle。

它给到的能力：时间轴刻度（day/week/month/…）、任务条（起止 + 进度填充 + 标签）、
拖拽平移 / 拖边缘改时长 / 今日线（markLine）、周末隐藏与底色、任务列表（真正的 ListTable）。
它**没有**给到的：可用的分组、可用的进度手柄、任务条 tooltip、右键菜单（`taskBar.menu.
contextMenuItems` 也只是声明）—— 这四件事都由本视图自己实现（见 §0.1）。

---

## 3. 数据转换适配

### 3.1 rows → records（`core/schema.ts`）

```ts
rowsToGanttRecords(source, config, { collapsed, resolveNodeTitle }): GanttRecord[]
```

- 没有可解析开始日期的行**跳过**（不编造日期）；有开始日期但没有结束日期（或没配结束字段）
  的任务是**单日**：记录的 `__ganttEnd` 镜像 `__ganttStart`（条形必须有跨度）。
- 结束早于开始按单日降级；`progressField` 的 0–1 会被钳到 [0,1] 再 ×100 交给库
  （vtable-gantt 的进度是 0–100，超界只钳不缩放）。
- 配了 `groupByField` 时按「字段声明的选项顺序，其余按首次出现顺序，未分组最后」分组
  （和看板泳道同一条规则），每组先出一条 `type: "project"` 的合成头行：
  - `__ganttTitle` = `▸ 名称（N）`（折叠）/ `▾ 名称`（展开），`__ganttGroupLabel` 保留纯名称；
  - 跨度 = 组内任务的 min(start) / max(end)，折叠时成员行不出现在 records 里，头行的跨度不变。
- 记录顺序 = `source.rows` 顺序（分组时按组重排），本视图**不**按日期自动排序：行序归表格视图
  （拖拽行序 + `onRowReorder`），甘特图只换一种看法。

### 3.2 拖拽写回

- 拖动条形平移 → 写回起点与终点（保持时长）。
- 拖动条形左/右边缘 → 写回起点或终点（改时长）。
- 两者都由库 fire 同一个 `change_date_range` → `taskRangeToCells` → `onCellChange`（起点 + 终点
  两个单元格；没有结束字段时只写起点）。分组头行是 `project` 类型，库本身就拒绝拖动，
  `moveable` / `resizable` 还额外用函数把它挡掉。
- 是否可写由宿主能力决定：`readOnly` 或宿主没给 `onCellChange` 就不能拖；没有结束字段就不能
  拖边缘。**没有** `editable` 配置项。
- 分组只影响展示层级，不写数据。

---

## 4. 配置项（GanttViewConfig）

```ts
export interface GanttViewConfig {
  startField: string; // 必需：开始日期（date）
  endField?: string; // 可选：结束日期（date），无则单日
  titleField: string; // 标题（默认主列）
  progressField?: string; // 进度（number 0–1）
  groupByField?: string; // 分组（select / multiSelect）
  tooltipFields?: string[]; // 悬浮读数里额外显示的字段（字段配置的眼睛）

  taskColumnTitle?: string; // 表头；留空 = 节点名（视图面板）
  viewMode: "day" | "week" | "month"; // 时间粒度
  rowHeight: number; // 行高（视图面板：低/中/高 = 28/36/48）
  showTodayLine: boolean; // 今日线
  showWeekends: boolean; // 周末列（只有「日」粒度有时间轴周末列）
}
```

默认配置（`defaults.ts`）：`startField` 取首个 date、`endField` 取第二个 date、`titleField` 取主列、
`progressField` 取首个 number、`viewMode: "week"`、`rowHeight: 36`、今日线与周末都开；
**不默认分组**（时间轴本身才是这个视图的重点），**不写 `taskColumnTitle`** —— 不写就是「跟随节点
名」，显式写死反而会让节点改名之后表头还停在旧名字上。

相对设计稿删掉的三项（沿用日历的取舍）：`editable`（能不能写是宿主能力，不是口味）、
`theme`（跟随 `next-themes`，固定在 `GANTT_FIXED.theme`）、`minDate` / `maxDate`
（v1 时间轴范围永远由任务自己算出来）。

`GANTT_FIXED`（`core/config.ts`）：`headerRowHeight: 28`、任务列表列宽 200、表头兜底「任务」、
未命名占位、未分组名称。

---

## 5. 功能点

- 时间轴条形：起止跨度 + 进度填充（`progressField` 0–1）+ 任务名标签（画在条形**外侧**，
  所以文字永远不会和填充打架，深浅色同一套颜色）。
- 表头（任务列表唯一一列的标题）可改：视图面板里留空就是节点名，改节点名表头跟着改
  （坑 14：走 `updateColumns`，不重建图表）。
- 时间粒度：日 / 周 / 月（`buildTimelineScales`：月+日 / 月+周 / 年+月，最细一级决定列宽）。
- 拖拽平移改起止、拖边缘改时长（database 可编辑；collection 只读）。
- 分组折叠/展开：点分组头行或分组汇总条，标题上的 ▸ / ▾ 与折叠时的任务数就是状态。
- 今日线、周末列（隐藏或描底色）、当前时间范围（范围永远来自数据）。
- 点击任务条 / 任务列表行 → 统一记录编辑页；右键 → 统一记录菜单（分组行没有菜单）。
- 悬浮提示：标题、起止（含端点，`2026年10月2日 → 2026年10月9日`）、进度或分组任务数，
  以及 `tooltipFields` 的字段值（单选/多选带自己的颜色）。

---

## 6. 交互与操作方法

| 操作             | 手势/入口              | 结果                                                                        |
| ---------------- | ---------------------- | --------------------------------------------------------------------------- |
| 改起止           | 拖拽条形               | 写回 start / end 字段                                                       |
| 改时长           | 拖左右边缘             | 写回 start 或 end 字段（向右拖出数据范围会被钳住：范围永远来自数据，见 §4） |
| 缩放粒度         | 工具条 视图 → 时间粒度 | 切换时间轴刻度与列宽                                                        |
| 行高             | 工具条 视图 → 行高     | 低/中/高（28/36/48）                                                        |
| 展开/折叠分组    | 点分组行 / 分组汇总条  | 组内任务行显隐（不写数据）                                                  |
| 打开记录         | 点击任务条或任务列表行 | 统一记录编辑页                                                              |
| 记录菜单         | 右键任务条或任务列表行 | 统一记录菜单（打开记录/打开节点/复制/删除）                                 |
| 详情             | 悬浮任务条             | 起止 / 进度（或组内任务数）+ tooltipFields                                  |
| 调整任务列表宽度 | 拖中间分隔线           | 仅影响本次会话的展示宽度                                                    |

**不做**：任务间依赖连线（rows 之间没有依赖字段）、资源/泳道维度（用分组近似）、
拖拽改进度（库的手柄抓不住，见 §0.1）、拖拽改行序（行序归表格视图）。

---

## 7. 二次开发要点

1. 库的主题分两半：`taskListTable.theme` 是 `ITableThemeDefine`（`canvas/theme.ts` 里
   `buildTaskListTheme`），其余颜色是构造项（时间轴表头 / 网格线 / 条形 / 外框 / 滚动条）。
2. `gantt.release()` 必须调用：它会摘掉监听、两张 canvas 和库自己插进容器的 DOM；
   StrictMode 下不释放会叠两张图。
3. **容器要有定位上下文，而且要是层叠上下文**：库的绝对定位层（时间轴画布、分割线手柄）以最近的
   有定位祖先为基准，而分割线还自带 `z-index: 100`，surface 的根 div 因此带
   `relative isolate`（§0.1 第 11 条）；不要为了别的目的把它们去掉。
4. 记录用 `setRecords` 更新、**结构**（粒度 / 行高 / 周末 / 今日线 / 主题模式 / 可写能力）
   变化才重建实例（`structureKey`）—— 结构变化重建、数据变化不重建，这样编辑不会丢滚动位置
   和分隔线。库自己监听容器的 resize，宿主不用再挂 ResizeObserver。
5. 画布里没有 React 节点：分组行标题、悬浮读数、右键菜单都靠「库的事件 + 我们自己画的
   DOM/文本」实现（读数与菜单锚在指针上，和日历事件同一套做法，且都经
   `shared/body-layer.tsx` portal 到 body，见 §0.1 第 13 条）。
6. 列表行的层级也在画布里：分组行与任务行的区分是列表列的 `style` 函数（缩进 + 字重），
   不是库的 tree（§0.1 第 1、12 条）。
7. 主题沿用表格的做法：`views/table/canvas/theme.ts` 是同类映射的参考。

---

## 8. 边界与取舍

- 无依赖关系（前置任务连线）：rows 之间没有「依赖」字段，v1 不做；库的 `dependency.links`
  也要求记录里带 task key，等有 relation 字段指向同表行再谈。
- 无资源维度：不按人/泳道分（premium 语义），用 `groupByField` 近似。
- collection 只读：投影没有可写的起止/进度语义，条形只能看。
- 「未分组」永远排最后，且不写数据（它只是没有分组值的那一桶）。
- 分组折叠态是**视图内的临时状态**（不落 config）：换分组字段即全部展开，重开视图也回到展开。

---

## 9. 开发任务清单

| #   | 任务                                                        | 状态                                                     |
| --- | ----------------------------------------------------------- | -------------------------------------------------------- |
| G1  | 评估 vtable-gantt                                           | ✅ 结论见 §0.1（分组/进度手柄/菜单/tooltip 都不可用）    |
| G2  | `core/schema.ts` rows → records + 日期/进度钳制             | ✅                                                       |
| G3  | `GanttDataView` 壳 + `board/gantt-surface.tsx` 实例生命周期 | ✅                                                       |
| G4  | 拖拽写回（平移/缩放 → `onCellChange`）                      | ✅                                                       |
| G5  | 分组/粒度/今日线/周末/行高                                  | ✅                                                       |
| G6  | 兜底方案（ListTable + customLayout 自绘）                   | ❌ 不需要：vtable-gantt 的时间轴与拖拽可用，只有分组自研 |
