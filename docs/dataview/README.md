# 数据展示组件（DataView）设计文档

> 状态：外壳已实现；**统一记录编辑页与统一记录右键菜单已实现**（见 §3.5 / §3.6）；表格视图已实现
> （`packages/dataview/src/views/table/`），看板视图已实现
> （`packages/dataview/src/views/kanban/`，见 kanban.md），日历视图已实现
> （`packages/dataview/src/views/calendar/`，见 calendar.md），画廊视图已实现并**重构**
> （`packages/dataview/src/views/gallery/`，见 gallery.md），甘特图视图已实现
> （`packages/dataview/src/views/gantt/`，见 gantt.md），其余两个视图（图表 / 节点图）仍为占位
> 范围：集成进 collection 与 database 节点类型的 node-content 的数据展示组件
> 相关文档：../database-node-design.md（定义了 fields / rows 数据源）

---

## 1. 概述与目标

DataView 是一个「多视图数据展示组件」。它接收一份结构化数据源（fields + rows），用多种视图形态（表格 / 看板 / 日历 / 甘特图 / 画廊 / 图表 / 节点图）渲染同一份数据，让用户通过增删视图、切换视图、修改视图配置，从多角度浏览数据，并以多种方式交互和操作数据。

它被集成进两类复杂节点的 node-content 编辑器：

| 宿主节点   | 数据源来源                                        | 说明                                                     |
| ---------- | ------------------------------------------------- | -------------------------------------------------------- |
| database   | DatabaseContent.fields + DatabaseContent.rows     | 自包含二维表（schema + records），是 DataView 的主数据源 |
| collection | CollectionContent.filterConfig 投影出的节点属性表 | 一组图谱节点的过滤视图，其「行」是被选中的图谱节点       |

设计目标：

1. 一份数据、多份视图：视图是「如何看待同一份数据」的声明，不复制数据。
2. 视图可增删改切：视图增删、命名、排序、切换、配置编辑都是组件一等能力。
3. 数据源可插拔：通过适配层把 database 的 fields/rows 与 collection 的节点投影统一成同一份 DataViewSource，视图渲染器不感知宿主差异。
4. 第三方优先、自主兜底：表格/甘特图用 VTable、图表用 VChart、日历用 FullCalendar、看板用 REUI（shadcn）看板、画廊自研、节点图复用 @workspace/graph。
5. 懒加载与可裁剪：每个视图的第三方库按需动态加载，避免首屏拉满所有依赖。

---

## 2. 术语与命名（与 graph View 区分）

项目已有一个图谱视图类型 View（packages/interfaces/src/models/view.ts，viewType 为 Force | Flow），它是工作区级的图谱布局视图。为避免冲突，本组件所有类型一律加 Data 前缀：

| 本组件术语   | 类型名           | 说明                                                            |
| ------------ | ---------------- | --------------------------------------------------------------- |
| 数据视图     | DataView         | 挂在节点 content 下的一个视图实例                               |
| 数据视图类型 | DataViewType     | table / kanban / calendar / gantt / gallery / chart / nodeGraph |
| 数据视图配置 | DataViewConfig   | 按 DataViewType 区分的判别联合                                  |
| 数据源       | DataViewSource   | 归一化后的 fields + rows（+ 可选 filterConfig）                 |
| 视图注册表   | DataViewRegistry | DataViewType 到描述符（图标/渲染器/配置面板/允许的节点类型）    |

---

## 3. 组件基本形态

### 3.1 结构总览

```text
┌─────────────────────────────── DataViewRoot ───────────────────────────────┐
│  ┌──────────────────────────── DataViewToolbar ──────────────────────────┐  │
│  │  视图 tab 切换器 │ [+ 新建视图]                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────── ActiveDataView（按 DataViewType 路由）────────────────┐  │
│  │   ┌────────────────── ViewToolbar（每个视图自己的工具条）───────────┐  │  │
│  │   │  视图配置（左对齐，按钮 + 下拉菜单） │ 视图功能（右对齐） + 更多  │  │  │
│  │   └────────────────────────────────────────────────────────────────┘  │  │
│  │   TableDataView │ KanbanDataView │ CalendarDataView │ … │ NodeGraph  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

> 设计变更（docs/propmt/dataview-table-1.md）：**视图配置不再使用侧边栏**，统一集成进各
> 视图自己的工具栏，以「按钮 + 下拉菜单」呈现，且**配置靠左、功能靠右**。外壳只保留视图
> 切换条；`<DataViewConfigPanel />` 侧栏已删除。
>
> 后续调整（按使用者反馈）：表格的七个配置控件全部有了专属菜单，因此表格**不再有**
> `视图配置` 兜底弹层，也不再注册 `configEditor`；`TableViewConfig.rowLimit`（渲染上限）
> 一并删除 —— 它会静默隐藏新行，是「新增记录看不到新行」的根因。
>
> 再一轮反馈：**视图级操作（更多：设为默认 / 复制 / 删除）也从页签条移进了视图工具条的
> 功能区**，页签条只做导航（页签 + 新建视图）。外壳用 `toolbar/view-actions.tsx` 的槽位
> context 把菜单交给当前渲染器的工具条，所以任何画了 `ViewToolbar` 的视图（含占位视图）
> 都自动带上它。功能区因此必须只放**固定尺寸、常驻**的控件：宽度会变的控件（搜索输入框、
> 随选中出现的按钮）会把右对齐行里它左侧的邻居一起推开。
>
> 第六轮又收了一轮：**菜单/面板里不再有说明性文字** —— 下拉菜单的标题行（设置行高 /
> 导出为 / 设置分组条件 / 设置筛选条件 / 设置填色条件 / 新建视图）和面板里的 hint 段落
> 全部删除（只保留「先添加字段，才能设置条件。」这类空态/禁用态提示）：触发器已经说了
> 这个菜单是什么，菜单项自己会说话。同时**同一件事在不同视图里的按钮长得一样**：
> 表格的「分组 / 排序」改成看板的样子（中性无高亮 + 显示当前字段名，图标也用同一套
> `Columns3` / `ArrowUpDown`），日历的「字段配置」用表格的 `FolderTree` 触发器，
> 表格的「添加记录」与其它按钮同为 `text-muted-foreground`。
>
> 第七轮把**角色从字段行的「…」菜单里拿出来，统一成配置项**：看板/画廊的「卡片配置」有
> `标题` / `封面` 两个配置项，日历的「字段配置」有 `开始日期` / `结束日期` / `标题` / `颜色`
> 四个配置项 —— 都是「一个 `PanelSection` + 一个 `FieldSelect`」，同一件事在任何视图里
> 都在同一个位置、用同一个控件设置。字段列表退化成「哪些字段在上面」（眼睛）+ 字段增删改，
> 行尾只**标注**角色（开始 / 结束 / 标题 / 颜色 / 封面 + 标题/开始上的锁），
> `shared/field-config-list.tsx` 的 `fieldItems` 因此被删除（没有任何调用方了）。
> 日历的「视图」面板同时去掉 `今天按钮` 开关：按钮固定为 `prev,next today`
> （`writeCalendarToolbarLayout` 不再接受这个决定，旧配置读入时被归一化）。
>
> 随后一轮补回三件事：① **筛选 / 分组 / 排序 / 填色 四个面板的标题行回来了**（`设置…条件`，
> `清除` 就在这一行）—— 说明性的 hint 段落仍然不写，但四个同形菜单需要一个标题把自己和别人
> 区分开；② **看板的「排序」就是表格的排序菜单**（同一个 `shared/condition-menu.tsx`：
> 同样的触发器、同样的 `字段 + 方向` 条件行、`添加条件` / 拖动排优先级 / `清除`），因此
> `KanbanViewConfig` 新增多级 `sortState`（旧 `sortBy` 仍被读取）；③ 修掉表格「排序不生效」：
> 排序面板只写了 `config.sortState`，而 `structureKey` 故意不含排序、表格不会因此重建，
> 所以配置必须由 `updateSortState` 显式推给活的 VTable。搜索 / 分组 / 排序 / 填色的字段选择器
> （`shared/field-picker.tsx`）与条件菜单（`shared/condition-menu.tsx`）因此都搬进了 `shared/`。
>
> 本轮把**记录编辑页的所有权交给宿主 node-content**：`DataViewRoot` 不再自己挂那份 Sheet，
> 只把「打开了哪条记录 + 该视图没展示哪些字段」上报给宿主（`onOpenRecord(rowId, { hiddenFieldIds })`），
> 由 `database-node-content.tsx` / `collection-node-content.tsx` 渲染 `<RecordEditor>`
> ——记录的数据、写路径和它本来就都在 node-content，编辑页因此和节点内容同层，而不是叠在
> 数据视图外壳里。`RecordEditor` 因此改成 props 驱动（`source` / `editable` / 各回调都从
> props 进，不再读 `useRecordActions`），记录**右键菜单**仍然归外壳（它是记录上的铬，不是页面）。
> 顺带清掉渲染器契约里那条从未被调用过的 `onOpenRecord`（表格/日历只是把它塞进 `latest` ref）。
> 紧接着又修掉这页在**对话窗口模式下的越界**：它原来是 `fixed` + portal 到 body 的 Sheet，
> 于是 node-content 挂在 1200×80vh 的节点编辑对话窗里时，记录页却从屏幕顶贯到屏幕底（实测
> 1000px 视口 / 800px 对话窗，页面高 1000 而不是 728）。现在它是宿主 `relative` 盒子里的一列
> （`absolute inset-y-0 right-0` + 遮罩），被盖住的数据视图标 `inert`，Esc 用 `window` capture
> 拦下来——否则 Radix 挂在 `document` 的 capture 监听会把宿主对话窗一起关掉。

### 3.2 组件接口

```ts
// packages/dataview/src/data-view-root.tsx（示意）
export interface DataViewRootProps {
  source: DataViewSource; // 归一化数据源（宿主通过适配层构造）
  views: DataView[]; // 该节点下挂的全部视图
  activeViewId: DataViewId; // 当前激活视图 id
  readOnly?: boolean; // 是否只读（collection 投影默认只读）

  // —— 视图管理（增删改切） ——
  onViewsChange?: (views: DataView[]) => void; // 整体替换（宿主据此写回 content）
  onActiveViewChange?: (id: DataViewId) => void;

  // —— 数据交互 ——
  onCellChange?: (rowId: string, fieldId: string, cell: DatabaseCell) => void; // 单元格写回
  onOpenRecord?: (rowId: string, source: DataViewSource) => void; // 打开记录/关联节点
  onOpenNode?: (nodeId: string) => void; // 打开图谱节点
  onRowInsert?: (row: DataRow, index?: number) => void;
  onRowDelete?: (rowIds: readonly string[]) => void;
  onRowReorder?: (rowIds: readonly string[]) => void;
  // 字段（schema）增删改：database 宿主专供；rows 存在时表示同一次写回还要重写单元格
  onFieldsChange?: (fields: DatabaseField[], rows?: DataRow[]) => void;
  resolveNodeTitle?: (nodeId: string) => string | undefined;

  className?: string;
}
```

组件对外只暴露一个 <DataViewRoot />；内部由两个子块组合：

| 子块            | 职责                                                                      |
| --------------- | ------------------------------------------------------------------------- |
| DataViewToolbar | 视图 tab 切换、新建视图菜单、视图操作菜单（重命名/复制/删除/设为默认）    |
| ActiveDataView  | 按 activeView.type 路由到具体视图渲染器（懒加载）；渲染器自带 ViewToolbar |

### 3.3 视图生命周期与切换

- 切换：activeViewId 变化只替换 ActiveDataView 子树，数据源 source 不变；视图之间不共享任何中间渲染状态（过滤/排序/选择都是视图 config 或视图内局部态）。
- 懒加载：每个视图渲染器用 React.lazy + 动态 import 拉取对应第三方库；首次切换到某视图才加载其 bundle。
- 保活策略：v1 不保活（切换即卸载渲染器实例，依赖释放走各自 table.release() / calendar.destroy() / vchart.release() 生命周期）；若后续需要「切回来保持滚动位置」，再引入 keepAlive（把滚动/选择态写入视图 config 的 ui 片段）。

### 3.4 视图渲染器统一契约

每个视图渲染器接收同一份最小契约，内部自行做字段映射 + 数据转换；**并自行渲染自己的
ViewToolbar**（`shared/view-toolbar.tsx` 提供 `<ViewToolbar>` 骨架与 `<ViewConfigMenu>`
通用配置弹层）：

```ts
export interface DataViewRendererProps<C = DataViewConfig> {
  source: DataViewSource; // 只读数据源
  config: C; // 该视图类型的具体配置
  readOnly?: boolean; // 只读（禁用编辑/拖拽写回）
  onCellChange?: (rowId, fieldId, cell) => void; // 单元格/卡片/事件写回
  onOpenRecord?: (rowId, source) => void;
  onOpenNode?: (nodeId) => void;
  // —— 渲染器直接操作的补充契约（表格视图引入） ——
  onConfigChange?: (config: C) => void; // 画布上的排序/列宽/列序写回视图 config
  onRowInsert?: (row: DataRow, index?: number) => void;
  onRowDelete?: (rowIds: readonly string[]) => void;
  onRowReorder?: (rowIds: readonly string[]) => void;
  onFieldsChange?: (fields: DatabaseField[], rows?: DataRow[]) => void; // schema 增删改
  resolveNodeTitle?: (nodeId: string) => string | undefined; // relation 显示名
}
```

关键约束：视图渲染器不直接调用 NodeService / useDataStore 写数据，所有数据变更通过 onCellChange 冒泡回 DataViewRoot，再由宿主 node-content 决定如何落库（复用既有 NodeService.upsert 乐观写）。这保证「组件只负责展示与交互，数据所有权在节点」。同理，`onConfigChange` 只在宿主传了 `onViewsChange` 时下发，视图仍然不自己持久化。

`onFieldsChange` 是唯一一处「渲染器报告 schema 变更」的通道：字段的增删改（含改类型/改选项）
由表格的字段编辑下拉产生，渲染器把**整份新 fields**、以及（当删字段/改类型/设默认值需要重写
单元格时）**整份新 rows** 一起上报，宿主在一次 `NodeService.upsert` 里落库。`readOnly` 或宿主
未提供该回调时，表格不渲染列末「+」、字段菜单的编辑项禁用。

宿主一侧还有两条硬要求（`database-node-content.tsx` 已实现，见 table.md §8.5）：patch 必须基于
**store 里的最新 content**（一次手势可能报两次变更，用渲染闭包里的旧 content 会覆盖掉前一次），
并且**同一条记录的写入必须串行 + 合并** —— PocketBase SDK 会按 `requestKey`（记录 id）取消上一个
未完成请求，并发写同一条记录会 abort 掉前一个（症状：新行闪一下又消失，控制台报
`The request was aborted (most likely autocancelled…)`）。

---

### 3.5 统一记录编辑页（右侧弹出）

各视图「点击记录」统一打开**同一个**记录编辑页：视图只调用
`useRecordActions().openRecord(rowId, { hiddenFieldIds })`
（`packages/dataview/src/shared/record-actions.tsx` 的 context），外壳把它上报给宿主
（`DataViewRoot` 的 `onOpenRecord`），**由宿主 node-content 渲染**一份 `<RecordEditor>`
（`absolute inset-y-0 right-0` 的一列 + 一层点击关闭的遮罩）——记录的数据与写路径都在 node-content
（`database-node-content.tsx` / `collection-node-content.tsx`），编辑页因此和节点内容同层，
不由外壳自己挂。外壳仍然持有**记录右键菜单**（§3.6，它是记录上的「铬」而不是页面）。

```text
┌──────────────────────── RecordEditor（node-content 容器内右侧一列）──────────────────────┐
│  记录标题（主列的值）                              [复制] [删除] [×]                    │
│  数据库记录 / 图谱节点                                                                  │
│  ────────────────────────────────────────────────────────────────────────────────────  │
│  字段图标 + 名称     │  该字段的编辑控件（FieldInput：文本 / 数字 / 勾选 / 单选多选 / 日期）│
│  …（当前视图已展示的字段在前）                                                          │
│  ⌄ 共 N 个隐藏字段                                                                     │
│  ────────────────────────────────────────────────────────────────────────────────────  │
│  + 新增字段（宿主允许 schema 写入时才有）                                               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

- `hiddenFieldIds` 是**该视图没有展示**的字段（表格未显示的列、看板卡片字段之外的字段…），
  它们折进「隐藏字段」折叠块；这与参考截图一致。
- 编辑仍然只冒泡：控件的每一次写入都走 `onCellChange`，字段增删改走 `onFieldsChange`
  （内部用 `reconcileRowsForFields` 同步重写单元格），删除记录走 `onRowDelete`，复制记录走
  `onRowInsert`。渲染器/编辑页都不落库（§3.4 的所有权约定不变）——宿主把**自己的**回调
  当 props 交给编辑页（`RecordEditorProps`），所以这条路径和节点内容写入是同一条。
- 只读投影（collection）打开的是同一个页面，只是所有控件降级为只读显示；集合的「打开节点」
  是右键菜单里的另一项。
- 宿主没传 `onOpenRecord` 时，外壳只渲染视图本身：点记录不会有页面弹出（记录编辑页不再是
  外壳的内置能力）。
- **记录页在宿主的容器内排版，不是视口级浮层**：它是 `absolute inset-y-0 right-0` 的一列 +
  一层点击即关闭的遮罩，宿主必须给它一个 `relative` 的盒子，并在页面打开时把被覆盖的那块标成
  `inert`（页面不是模态，没有焦点陷阱，`inert` 才是 Tab 不进被盖住的表格的原因）。node-content
  既可能全屏（`mainViewType === "editor"`，旁边还可能有属性侧栏）也可能挂在节点编辑器的
  对话窗口里（`"graph"`，1200×80vh），所以任何 `fixed`/portal 到 body 的抽屉都会跑出它所属的
  窗口。
- **Esc 归记录页自己**：Radix 的对话窗关闭逻辑是挂在 `document` 的 **capture** 监听，记录页
  因此把 Esc 监听挂在 `window` 的 capture 阶段（事件路径上更早，可以拦住它），且只在焦点在页面
  自己身上时才关页——日期选择器 / 下拉 / `字段编辑` 弹窗这些 portal 出去的浮层各有各的 Esc。
  `字段编辑` 表单仍是真正的模态（`DialogContent`，居中、`sm:max-w-md`）。
- **遮罩只在「自己见过 `pointerdown`」时才因 click 关闭。** 画布视图（甘特条形、日历事件）是
  被一次触摸打开的，浏览器随后会为**同一次**触摸补发一套兼容鼠标事件 —— `mousedown` /
  `mouseup` / `click`，而且**在派发的那一刻**才做命中测试。页面此时已经挂上了，于是那个「幻影
  click」砸在遮罩上，页面刚开就被关掉（实测日志：`touchend` 时挂上 `record-scrim`，4ms 后
  `click` 的 target 就是 `record-scrim`，再 5ms 页面被移除；鼠标路径没有这套兼容事件，所以
  只有触控会「闪一下就关」）。现在遮罩用一个 ref 记住自己有没有收到过 `pointerdown`：真实的
  点按（鼠标按下、手指落在遮罩上）一定先有 `pointerdown`，而打开页面的那一次触摸的
  `pointerdown` 早在遮罩存在之前就打在画布上了。触控点开记录页因此留得住，点遮罩依然能关
  （两种输入都实测过）。
- **遮罩要盖得住画布库自己注入的 `z-index`。** 画布容器必须自己建立层叠上下文（甘特图根 div 的
  `relative isolate`，见 `gantt.md` §0.1 第 11 条）：库塞进容器的分割线写死 `z-index: 100`，
  容器不隔离时它会盖在 `z-30` 遮罩之上——现象就是「打开记录时分割线不被模糊覆盖」。

### 3.6 统一记录右键菜单

`packages/dataview/src/shared/record-menu.tsx` 定义一份条目模型和三个渲染面：

| 渲染面                | 用在哪                                                 | 形态                                  |
| --------------------- | ------------------------------------------------------ | ------------------------------------- |
| `RecordContextMenu`   | 看板卡片、画廊卡片                                     | shadcn `ContextMenu` 包住记录元素     |
| `RecordMenuItems`     | `RecordMenuAtPoint` 的下拉体                           | 同一份条目渲染成 `DropdownMenuItem`   |
| `RecordMenuAtPoint`   | 日历事件（FullCalendar 自己画的 DOM，不是 React 节点） | 在指针位置受控弹出一个 `DropdownMenu` |
| `buildRecordSections` | 表格（VTable 菜单只能渲染 `{text, menuKey}`）          | 映射成 VTable 菜单项 + `menuKey` 分发 |

**通用项**：打开记录 / 打开节点（collection）/ 复制记录 / 删除记录。
**各视图独有项**通过 `sections` 追加：看板的「移动到」子菜单、画廊的「选择 / 删除选中」等。
卡片上**没有**右上角「…」按钮：卡片整体是记录，左键打开、右键出菜单，选择靠手势（Space /
Ctrl-Cmd 点击 / Shift 连选 / Ctrl+A / Esc），只有必须落点的批量动作才出现在右键菜单里。
宿主能力决定条目是否出现（只读数据没有复制/删除，没有 `onRowInsert` 就没有复制）。

### 3.7 统一字段显示与编辑组件

- **显示**：`shared/field-value.tsx`。单选 / 多选统一是染色的 shadcn `Badge`（`OptionBadge`），
  日期是本地化文本，勾选是 `Check`，链接是 `<a>`，关联是 chip。看板卡片、画廊卡片、
  记录编辑页、日历 readout 全部走它；**唯一的例外是表格画布**（canvas 不能挂 React，
  `views/table/canvas/pill.ts` 用画布原语镜像同一套规则）。
- **编辑**：`shared/field-input.tsx` 按字段类型分发；日期用 shadcn `Calendar`
  （`shared/date-picker.tsx`，`Popover` + `Calendar`），单选/多选用
  `shared/option-picker.tsx`（`Popover` + `Command`，支持「查找或创建选项」），
  文本/数字/链接是回车或失焦提交的输入框，勾选是 `Switch`。
- 两个入口都依赖同一份字段词汇表 `shared/field-meta.tsx`，所以同一个选项在表格、看板、画廊
  和记录页里是同一个颜色。

### 3.8 统一卡片与卡片配置（看板 + 画廊）

看板和画廊画的是同一张卡片，所以卡片本身和它的配置菜单都只有一份：

| 关注点       | 落点                                                      | 说明                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 卡片本体     | `shared/card.tsx`（`DataCard` + `shared/card-cover.tsx`） | 封面 + 标题 + 每个单选/多选一个染色 `Badge` + 每个其它字段**一行值**（值不写字段名，字段名是该行的 tooltip）。`layout` 决定排布：`grid` 固定高度、`masonry` 按图片自身比例、`list` 缩略图 + 右列、`board` 固定比例封面。`cover` 三态：`undefined` = **完全不画封面区**（没有封面来源：database 没配封面字段 / 该字段解析不出来），`null` = 有封面来源但这一行空着 → 首字占位；看板与画廊同一条规则 |
| 卡片数据     | `shared/card-ops.ts`                                      | 纯函数：`readCardSettings`（含旧画廊 `badgeFields`/`metaFields` 迁移）、标题/封面/字段解析、`cardCoverEnabled`（这张卡要不要画封面区）、`cardFieldValues`（空值不上卡）、`resolveRowCover`（collection 用节点预览）                                                                                                                                                                                |
| 卡片配置菜单 | `shared/card-config.tsx`（`卡片配置`）                    | **角色是配置项、列表只是字段**：`标题` / `封面` 各是一个 `PanelSection` + `FieldSelect`（与日历的 `字段配置` 同一套「一个角色一个配置项」形状），列表只回答「哪些字段在卡上」（眼睛）+ 编辑/删除/新增字段。**角色绝不在字段行的「…」菜单里设置**，行尾只**标注**该字段当前的角色（`标题` / `封面` 注解，标题带锁）。封面不是字段角色时（collection 用节点预览）控件保留但置灰并说明来源            |
| 卡片上的控件 | 无                                                        | 卡片上不放复选框、也不放「…」按钮：整张卡片是记录本身（左键打开、右键出菜单），选择是手势而不是卡上的控件；唯一的批量动作（删除选中）跟着右键菜单走                                                                                                                                                                                                                                                |
| 持久化片段   | `interfaces` 的 `DataCardConfig`                          | 看板与画廊的 config 都继承它：`titleField` / `coverField` / `cardFields` / `compact`；各自的 `layout`、`cardSize`、`groupByField` 等留在自己的 config 里                                                                                                                                                                                                                                           |

字段列表本身是共享的：`shared/field-config-list.tsx` 就是表格 `字段配置` 的列表（搜索框、类型图标、
眼睛、行尾角色注解、每行「…」菜单、`新增字段`），只是没有列编组。日历的 `字段配置` 面板也用它：
「单选/多选」的显隐换成「是否出现在悬浮提示」，行尾注解换成四个角色（开始 / 结束 / 标题 / 颜色），
而**角色的设置是列表上方的配置项**（看板/画廊的 `标题`・`封面`），不在行的「…」里 ——
列表行只标注、不设置。

**一个必须知道的坑：长列表要用固定高度（`h-72`），不能只写 `max-h-72`。** Radix `ScrollArea` 的
viewport 是 `h-full`，在一个高度 auto 的根上会退化成 `auto`，于是 viewport 长到内容那么高、溢出被
`max-h` 夹住的根约一行的高度，最后几行就画在下面的 `新增字段` 按钮上（实测：按钮中心
`elementFromPoint` 命中的是最后一行的 `span`，按钮点不动）。表格的 `字段配置` 与共享列表都按
「行数 > 7 就 `h-72`」处理。

---

## 4. 数据源与适配层（数据转换适配）

### 4.1 归一化数据源 DataViewSource

两种宿主最终都归一化为同一形状；视图渲染器只认识它：

```ts
// packages/interfaces/src/models/data-view.ts（建议位置）
export type DataViewSourceKind = "database" | "collection";

export interface DataViewSource {
  kind: DataViewSourceKind;
  nodeId?: string; // 宿主节点 id（适配器知道就带上）
  nodeTitle?: string; // 宿主节点名：视图要「给整份数据起个名字」时用它（甘特图表头）
  fields: DatabaseField[]; // database 直接复用；collection 用固定节点属性 schema
  rows: DataRow[]; // id + cells（按 fieldId 键）。collection 每行对应一个节点
  filterConfig?: FilterConfig; // 仅 collection：供 nodeGraph 视图复用 graph 组件
  nodeIds?: string[]; // 仅 collection：与 rows 平行对齐的 nodeId 列表
}

export type DataRow = DatabaseRow; // { id: string; cells: Record<string, DatabaseCell> }
```

### 4.2 适配器（Adapters）

```ts
// packages/dataview/src/source/database-source.ts
export function databaseToDataViewSource(
  content: DatabaseContent,
  nodeId?: string, // 宿主节点 id
  nodeTitle?: string, // 宿主节点名（nodes.title）
): DataViewSource {
  return {
    kind: "database",
    nodeId,
    nodeTitle,
    fields: content.fields,
    rows: content.rows,
  };
}

// packages/dataview/src/source/collection-source.ts
export function collectionToDataViewSource(
  node: CollectionNodeData,
  nodes: Map<NodeId, NodeData>,
): DataViewSource;
```

collection 投影规则：把被选中的图谱节点投影成一张「节点属性表」，字段是固定 schema（沿用 DatabaseField 类型体系），单元格复用 DatabaseCell：

| 字段 id        | 名称     | 类型        | 单元格来源                                 |
| -------------- | -------- | ----------- | ------------------------------------------ |
| \_\_title      | 标题     | text        | node.title                                 |
| \_\_abstract   | 摘要     | text        | node.abstract                              |
| \_\_nodeType   | 节点类型 | select      | node.nodeType（options = NODE_DATA_TYPES） |
| \_\_semantic   | 语义类型 | select      | node.semanticId（options = 语义集合）      |
| \_\_tags       | 标签     | multiSelect | node.tags（options = 标签集合）            |
| \_\_permission | 权限     | select      | node.permission                            |
| \_\_weight     | 权重     | number      | node.stateData.server.weight               |
| \_\_createdAt  | 创建时间 | date        | node.createdAt                             |
| \_\_updatedAt  | 更新时间 | date        | node.updatedAt                             |

说明：filterConfig.ruleGroup（如存在）先用 @workspace/utils 的 filterByViewFilterConfig 求并集，再与 selectedNodes 求交，得到最终行集；投影顺序与 nodeIds 一致。\_\_title 既是「主列」也是各视图默认标题字段。

### 4.3 单元格值解析器（视图共用的转换中枢）

每个视图都要把 DatabaseCell 变成它需要的标量/颜色/日期/节点引用。集中在一个模块，避免各视图重复写 switch：

```ts
// packages/dataview/src/source/cell-resolver.ts
export const CellResolver = {
  displayText(cell, field, nodeTitle?): string;                    // 通用展示文本
  rawScalar(cell, field): string | number | boolean | null;        // 图表/甘特聚合用的原始标量
  toDate(cell): Date | null;                                       // date → Date
  toNumber(cell): number | null;                                   // number → number
  toColor(cell, field): string | null;                             // select → option.color（无则哈希取色）
  toNodeIds(cell): string[];                                       // relation → NodeId[]
  toOptionIds(cell): string[];                                     // select/multiSelect → optionIds
  sortValue(cell, field): string | number;                         // 排序键
};
```

这个模块就是「数据转换适配」的落点：database 的 8 种字段类型与 collection 的节点属性字段，在这里被统一成各视图可消费的稳定输出。

---

## 5. 视图模型（DataView）

### 5.1 类型定义

```ts
export type DataViewId = string;

export type DataViewType =
  | "table"
  | "kanban"
  | "calendar"
  | "gantt"
  | "gallery"
  | "chart"
  | "nodeGraph";

export interface DataViewBase {
  id: DataViewId;
  name: string;
  type: DataViewType;
  isDefault?: boolean; // 首次打开节点时的默认视图
}

export type DataView =
  | (DataViewBase & { type: "table"; config: TableViewConfig })
  | (DataViewBase & { type: "kanban"; config: KanbanViewConfig })
  | (DataViewBase & { type: "calendar"; config: CalendarViewConfig })
  | (DataViewBase & { type: "gantt"; config: GanttViewConfig })
  | (DataViewBase & { type: "gallery"; config: GalleryViewConfig })
  | (DataViewBase & { type: "chart"; config: ChartViewConfig })
  | (DataViewBase & { type: "nodeGraph"; config: NodeGraphViewConfig });
```

各 \*ViewConfig 的完整 schema 见对应视图文档。共同约定：每个 config 都必须能只凭 fields 自愈——字段被删除/改类型后，配置面板要能把失效的字段引用降级为「未选择」而不是崩溃。

### 5.2 挂载位置（持久化）

视图是节点级数据，挂在节点 content 上：

```ts
// packages/interfaces/src/models/node/nodes/complex/database.ts
export interface DatabaseContent {
  fields: DatabaseField[];
  rows: DatabaseRow[];
  views?: DataView[]; // 新增：该 database 节点的数据视图
}

// .../complex/collection.ts
export interface CollectionContent {
  filterConfig?: FilterConfig;
  views?: DataView[]; // 新增：该 collection 节点的数据视图
}
```

后端：延续既有「复杂类型各自占用专用列」规律（见 database-node-design.md §6），为 nodes 集合新增一个 views JSON 列，NodeMapper 在 content.views 与 views 列之间拆装（与 fields/rows/filterConfig 同构）。改 0 号脚本需删库重建，或追加迁移。

前端写回：视图的增删改切都走 NodeService.upsert(nodeId, { content }) 的既有乐观写（先改 store、失败回滚），不新增 DataViewService / tRPC 端点。

取舍：视图内嵌到节点 content 而不是做成独立实体，是因为视图是「这个节点怎么看自己数据」的固有属性、天然属于该节点聚合；复用 NodeService 也避免新增一套 service/端点/store slice。代价是每次改视图会整包替换 content（与 fields/rows 的「全量读写」现状一致，已接受）。

---

## 6. 视图注册表与路由

```ts
// packages/dataview/src/registry.ts
export interface DataViewDescriptor {
  type: DataViewType;
  label: string; // "表格"
  icon: ComponentType<{ className?: string }>; // lucide 图标
  nodeTypes: ("database" | "collection")[]; // 允许出现的宿主节点类型
  renderer: LazyExoticComponent<ComponentType<DataViewRendererProps>>; // 懒加载渲染器
  configEditor?: LazyExoticComponent<ComponentType<DataViewConfigEditorProps>>; // 通用配置面板（可选）
  defaultConfig: (source: DataViewSource) => DataViewConfig; // 智能默认配置
}
```

DataViewRoot 依赖一个单例注册表 DATA_VIEW_REGISTRY: Record<DataViewType, DataViewDescriptor>。三处消费它：

1. 切换器：渲染 tab；「新建视图」菜单只列出 nodeTypes 含当前 source.kind 的视图。
2. 路由：ActiveDataView = descriptors[view.type].renderer。
3. 通用视图配置：configEditor（可选），由 `<ViewConfigMenu>`（视图工具栏里的弹层）按 type 取用。

新增一种视图 = 实现渲染器 +（可选）配置面板 + 注册，不触碰 DataViewRoot 主干；渲染器若把配置
全部做成了自己的专属菜单（表格就是如此），descriptor 直接省略 `configEditor`，也就没有
「视图配置」按钮。

---

## 7. 能力矩阵（节点类型 × 视图类型）

| 视图             | database | collection | 数据源依赖                                            | 技术方案                                  |
| ---------------- | :------: | :--------: | ----------------------------------------------------- | ----------------------------------------- |
| 表格 table       |    ✅    |     ✅     | fields/rows                                           | VTable + editors/export/search/plugins    |
| 看板 kanban      |    ✅    |     ✅     | 需 select/multiSelect 分组字段                        | REUI shadcn 看板（dnd-kit）二次开发       |
| 日历 calendar    |    ✅    |     ✅     | 需 date 字段（collection 用 **createdAt/**updatedAt） | FullCalendar 二次开发                     |
| 甘特图 gantt     |    ✅    |     ⚠️     | 需 date 起止字段                                      | VTable（@visactor/vtable-gantt）          |
| 画廊 gallery     |    ✅    |     ✅     | 需主列；封面字段可选（collection 用节点预览）         | 自研（shadcn + ui 的 `NodePreviewCover`） |
| 图表 chart       |    ✅    |     ✅     | 需维度/度量字段                                       | VChart 全类型                             |
| 节点图 nodeGraph |    ❌    |     ✅     | 仅 filterConfig（复用 @workspace/graph）              | 复用 <Graph />                            |

- ✅ 完整支持；⚠️ 支持但依赖字段可用性（缺少日期字段时给出引导）。
- 节点图视图只在 collection 出现：database 的行不是图谱节点，无图可画；nodeGraph 描述符 nodeTypes 为 ["collection"]。

---

## 8. 跨视图通用能力

以下能力不随视图类型变化，放在 DataViewRoot / 共享 hook 层，各视图按需消费：

| 能力               | 说明                                   | 归属                                                                                           |
| ------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 行级过滤           | 对 rows 施加字段条件过滤               | DataViewRoot → 过滤后的 source 下发；表格视图另有 `筛选` 菜单                                  |
| 排序               | 对 rows 排序                           | 视图内局部态（写回视图 config）                                                                |
| 选择与批量操作     | 多选行 → 批量删除/导出/改字段          | 各视图各自实现，共享 useRowSelection                                                           |
| 打开记录/节点      | 行 → 统一记录编辑页（容器内右侧一列）  | 宿主 node-content 在 `relative` 容器里渲染 `<RecordEditor>`；外壳只上报 `onOpenRecord`（§3.5） |
| 记录右键菜单       | 通用项 + 视图独有项                    | `shared/record-menu.tsx`（§3.6）                                                               |
| 字段显示/编辑      | 单选多选 → Badge；日期 → Calendar      | `shared/field-value.tsx` / `shared/field-input.tsx`（§3.4b）                                   |
| 导出               | 当前视图导出 CSV/Excel/PNG             | 目前只有表格（vtable-export）；画廊的 CSV 导出已移除，卡片墙没有自己的功能项                   |
| 主题               | 浅/深色跟随 next-themes                | 共享 themeTokens → 各库 theme 映射                                                             |
| 只读               | collection 投影只读；database 可编辑   | readOnly prop 逐视图传导                                                                       |
| 空态/字段缺失引导  | 无数据、缺必需字段时的引导 UI          | 各视图 + 共享 EmptyState                                                                       |
| 视图配置入口       | 每个视图自己的工具栏（配置左、功能右） | `shared/view-toolbar.tsx`：ViewToolbar（+ 可选的 ViewConfigMenu 兜底）                         |
| 视图级操作（更多） | 每个视图工具条功能区的末尾             | `toolbar/view-actions.tsx`：槽位 context + `ViewActionsMenu`（设为默认/复制/删除视图）         |

### 8.1 视图工具栏约定（所有视图）

- 每个渲染器自渲染一条 `ViewToolbar`：**配置控件靠左（`children`），功能控件靠右（`actions`）**，
  控件一律是「按钮 + 下拉菜单 / 弹层」，不再有侧边栏。
- 外壳的**更多**菜单（视图级操作）由 `ViewToolbar` 自动追加到功能组末尾（`useViewActions()`），
  渲染器不需要知道它；自己画工具条的视图（表格）调用同一个 hook 放在功能组末位。
- 功能组里的控件必须**尺寸固定且常驻**：右对齐 flex 行里第 k 个元素的 x 只由它自己与它右侧元素
  的宽度决定，一个「会变宽」或「随状态出现」的控件会把它自己和左侧邻居一起推动（旧版的
  「删除 N 行」和工具条里的搜索输入框就是这样把整条功能区抖起来的）。宽度会变的读数放在
  功能组最左端，输入类控件另起一行。
- `<ViewConfigMenu type source config onConfigChange />` 是通用兜底：它按 `type` 从注册表取
  该视图的懒加载 `configEditor`，渲染进 Popover；该视图没有注册 `configEditor` 时它直接不渲染。
  没有专属菜单的配置项放这里（剩下的占位视图目前只有它）。
- 渲染器如果为全部配置都做了专属菜单（表格：添加记录/字段配置/筛选/分组/排序/行高/填色），
  就不要再用通用弹层兜底 —— 表格既不注册 `configEditor`，也不渲染 `ViewConfigMenu`。
- **配置控件内不要留占位空态**：下拉菜单里不放「还没有条件…」这类虚线占位块，空菜单只留标题 +
  底部「添加条件」；字段/条件选择器未选时统一显示「选择字段」。
- **各视图工具条现状（同一套设计语言）**：
  表格 `添加记录 / 字段配置 / 筛选 / 分组 / 排序 / 行高 / 填色`；看板 `分组 / 卡片配置 / 排序`；
  画廊 `添加记录 / 卡片配置 / 布局`；日历与甘特图都是 `字段配置 / 视图` —— 五个视图右侧的功能区
  都只剩「更多」。
  设置类按钮一律是中性样式：**不给触发器加高亮**（哪些设置已生效在面板里就能看到，染色只会让人猜
  「这个颜色是什么意思」）。
  右侧功能组**不再放数据状态读数**（「N 张卡片」「N 事件」「N 泳道」）：卡片和事件本身就在画面上，
  读数只会随数据和选择变化而改变宽度（见上一条）。

---

## 9. 依赖清单与包结构

### 9.1 新包 packages/dataview

仿照 @workspace/graph / @workspace/editor，把 DataView 做成独立包，隔离重量级依赖：

| 依赖                                                                              | 用途                                  | 视图          |
| --------------------------------------------------------------------------------- | ------------------------------------- | ------------- |
| @visactor/vtable + vtable-editors + vtable-export + vtable-search                 | 表格                                  | table         |
| @visactor/vtable-gantt                                                            | 甘特图                                | gantt         |
| @visactor/vchart + @visactor/react-vchart                                         | 图表                                  | chart         |
| @fullcalendar/react + core + daygrid + timegrid + list + multimonth + interaction | 日历                                  | calendar      |
| @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities                            | 看板拖拽（REUI 看板依赖）             | kanban        |
| radix-ui（已由 @workspace/ui 引入）                                               | REUI 源码的 `Slot`                    | kanban        |
| @workspace/graph                                                                  | 节点图复用 <Graph />                  | nodeGraph     |
| 无（自研：@workspace/ui shadcn + `NodePreviewCover`）                             | 卡片墙 / 窗口化                       | gallery       |
| react-day-picker（经 `@workspace/ui` 的 `calendar`）                              | 统一的日期编辑控件（shadcn Calendar） | 各视图 DOM 面 |
| @workspace/ui（shadcn 基础）、interfaces、store、utils                            | 基础依赖                              | 全部          |

上述第三方库全部懒加载（React.lazy + 动态 import），只有切到对应视图时才加载其 bundle。

### 9.2 集成进 node-content

packages/ui/src/components/dialog/editor/content/ 下：

- node-content-editor.tsx 增加 case "database" → <DatabaseNodeContent />。
- collection-node-content.tsx 由「只读列表」升级为「内嵌 <DataViewRoot />」，并在工具条保留「节点图」入口（详见 node-graph.md）。
- 新增 database-node-content.tsx：内嵌 <DataViewRoot />，source = databaseToDataViewSource(node.content)，onCellChange 走 NodeService.upsert 乐观写。

---

## 10. 目录结构

```text
packages/dataview/src/
├── index.ts                 # 公共导出：DataViewRoot + 类型
├── data-view-root.tsx       # 外壳组件（视图切换条 + 路由）
├── registry.ts              # DATA_VIEW_REGISTRY（视图描述符注册表）
├── defaults.ts              # createDefaultConfig / createDefaultDataView / seedDataViewId
├── toolbar/
│   ├── data-view-toolbar.tsx    # 视图 tab 切换条 + 新建菜单（纯导航）
│   ├── view-actions.tsx         # 视图级操作（更多）菜单 + 槽位 context，供各视图工具条取用
│   └── view-switcher.tsx        # tab 切换（双击改名）+ 新建视图菜单
├── source/
│   ├── types.ts             # DataViewSource / DataView / DataViewType
│   ├── database-source.ts
│   ├── collection-source.ts
│   ├── cell-resolver.ts     # 单元格值解析器（数据转换中枢）
│   ├── row-utils.ts         # createDataRowId / emptyCellForField / createEmptyDataRow
│   │                        #   + editFieldSchema / deleteFieldSchema（各视图字段增删改的 schema 半边）
│   └── field-utils.ts       # 主列/日期/数字/选项字段选择器（+ cardFieldIds：卡片默认字段）
├── shared/
│   ├── card.tsx             # 统一卡片本体 DataCard（封面 + 标题 + 标签 + 值行；四种排布）
│   ├── card-cover.tsx       # 统一卡片封面盒（cell 地址 / 节点预览 / 首字占位）
│   ├── card-ops.ts          # 卡片的纯逻辑：settings 归一化、标题/封面/字段解析、取值、封面来源
│   ├── card-config.tsx      # 统一的「卡片配置」菜单（标题/封面配置项 + 展示模式 + 卡片字段列表）
│   ├── field-config-list.tsx# 统一的字段列表（搜索 + 眼睛 + 行尾角色注解 + 每行「…」+ 新增字段）
│   ├── field-value.tsx      # 统一的只读字段渲染（OptionBadge / FieldValue / 日期助手）
│   ├── field-input.tsx      # 统一的字段编辑控件（按类型分发）
│   ├── option-picker.tsx    # 单选/多选编辑：Popover + Command（查找或创建选项）
│   ├── date-picker.tsx      # 日期编辑：shadcn Calendar + Popover
│   ├── field-editor.tsx     # 字段增删改表单（表格下拉与记录页对话框共用）
│   ├── record-actions.tsx   # 记录面 context：openRecord / openRecordMenu + 菜单条目类型
│   ├── record-menu.tsx      # 统一记录菜单：三个渲染面 + buildRecordSections + duplicateRow
│   ├── record-editor.tsx    # 统一记录编辑页（props 驱动；宿主 node-content 在自己的容器里渲染它的一列）
│   ├── view-toolbar.tsx     # ViewToolbar 骨架 +（可选）ViewConfigMenu 通用配置弹层
│   ├── field-meta.tsx       # 字段类型标签/图标、选项与填色色板、字段搜索（各视图共用的字段词汇表）
│   ├── field-select.tsx     # 弹层内的字段选择器（shadcn Select；看板与日历共用）
│   ├── settings-panel.tsx   # 弹层式设置面板的三件套：SettingsPanel / PanelSection / SwitchRow（+ CheckboxOptionList）
│   ├── color.ts             # contrastTextColor（填色/胶囊/日历事件共用的对比色）
│   ├── use-row-filter.ts
│   ├── use-row-selection.ts
│   ├── theme-tokens.ts      # 浅/深色 → 各库主题映射
│   └── empty-state.tsx
└── views/
    ├── table/       table-data-view.tsx      # 壳（唯一入口，无 config-editor）
    │                ├── core/     schema.ts + column-ops.ts + filter.ts + editors.ts
    │                ├── canvas/   theme.ts + pill.ts
    │                ├── toolbar/  toolbar.tsx + search-bar.tsx
    │                ├── menus/    field-menu.tsx + filter-menu.tsx
    │                │              + condition-controls.tsx + color-menu.tsx + select-menu.tsx
    ├── kanban/      kanban-data-view.tsx     # 壳（唯一入口，无 config-editor）
    │                ├── reui/     kanban.tsx          # vendor 的 REUI 看板原语
    │                ├── core/     board.ts + config.ts
    │                ├── board/    kanban-board.tsx + kanban-card.tsx + lane-option-editor.tsx
    │                └── toolbar/  kanban-toolbar.tsx  # 分组 / 卡片配置（共享）/ 排序（与表格同一个菜单）
    ├── calendar/    calendar-data-view.tsx   # 壳（唯一入口，无 config-editor）
    │                ├── core/     config.ts + schema.ts + theme.ts
    │                ├── board/    calendar-surface.tsx + event-readout.tsx
    │                └── toolbar/  calendar-toolbar.tsx # 字段配置 / 视图
    ├── gallery/     gallery-data-view.tsx        # 壳（唯一入口，无 config-editor）
    │                ├── core/     config.ts + layout.ts + schema.ts
    │                ├── board/    gallery-board.tsx + gallery-card.tsx
    │                │              + use-gallery-scroll.ts + use-gallery-focus.ts
    │                └── toolbar/  gallery-toolbar.tsx   # 添加记录 / 卡片配置（共享）/ 布局
    ├── gantt/       gantt-data-view.tsx           # 壳（唯一入口，无 config-editor）
    │                ├── core/     config.ts + schema.ts
    │                ├── canvas/   theme.ts
    │                ├── board/    gantt-surface.tsx + task-readout.tsx
    │                └── toolbar/  gantt-toolbar.tsx    # 字段配置（5 个角色 + 共享字段列表）/ 视图
    ├── chart/       …
    └── node-graph/  node-graph-data-view.tsx
```

---

## 11. 开发路线图

| 里程碑            | 内容                                                                                                                                     | 依赖         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| M0 数据层         | DataViewSource / DataView 类型落地到 interfaces；cell-resolver；database-source / collection-source 适配器                               | interfaces   |
| M1 外壳           | DataViewRoot + toolbar + registry + 视图增删改切 + 持久化（content.views + NodeService 写回）                                            | M0           |
| M2 核心视图-表格  | VTable 集成 + 编辑/排序/筛选/分组/字段增删改/填色/导出 + 工具栏化 config（核心，全功能）                                                 | M1 ✅ 已实现 |
| M2.5 工具栏化改造 | 删除配置侧栏，配置并入视图 toolbar（配置左 / 功能右）；视图级「更多」也进视图 toolbar 功能区，页签条只留导航；功能组只放固定尺寸常驻控件 | M2 ✅ 已实现 |
| M3 核心视图-日历  | FullCalendar 集成 + 日期映射/拖拽写回/多视图 + 工具栏四面板（核心，全功能）                                                              | M1 ✅ 已实现 |
| M4 图表           | VChart 全类型 + 字段编码 + 聚合 + 联动过滤 + 导出                                                                                        | M1           |
| M5 看板           | REUI 看板二次开发 + dnd-kit 拖拽写回（含泳道重排/编辑选项/四个工具栏面板）                                                               | M1 ✅ 已实现 |
| M6 画廊           | 自研卡片墙：网格/瀑布流/列表 + 自研窗口化/增量分页 + 多选与批量删除（collection 借 `NodePreviewCover` 复用节点预览）                     | M1 ✅ 已实现 |
| M7 甘特图         | @visactor/vtable-gantt 集成 + 日期写回 + 自研分组/今日线/悬浮读数/记录菜单                                                               | M1 ✅ 已实现 |
| M8 节点图         | collection 内嵌 <Graph view={…filterConfig} />                                                                                           | M1 + graph   |

表格、日历为核心视图，功能清单与配置 schema 单独成文（table.md / calendar.md）并优先实现。

---

## 12. 设计取舍汇总

- 归一化优先：所有视图消费同一份 DataViewSource，collection 通过「节点属性投影」伪装成 fields/rows，避免视图渲染器出现两条数据通路。
- 视图是声明不是数据副本：视图只存映射关系 + 展示偏好（config），不复制 rows。
- 数据所有权在节点：视图渲染器只读 source + 通过 onCellChange 冒泡写回，宿主决定落库方式（复用 NodeService）。schema 变更同理走 onFieldsChange，不新增服务。
- **配置入口在视图工具栏，不在侧栏**：侧栏会与「切换视图」争夺空间，也让每个视图必须把自己的配置迁就一个通用面板；改成「配置左 / 功能右」的按钮 + 下拉菜单后，视图可以按自己的语义组织配置（表格的筛选/分组/排序/行高/填色都是表格专属交互），没有专属菜单的散项再由 `ViewConfigMenu` 兜底。
- 注册表驱动扩展：新增视图不改主干；能力矩阵由 nodeTypes 字段声明。
- 懒加载与资源释放：切换卸载实例时调用各库 release 接口，避免 VTable/FullCalendar 实例泄漏。
- collection 只读投影：节点属性表是派生视图，直接编辑投影字段会与图谱节点数据产生双写歧义，v1 一律只读（不改 schema，也不写单元格）；「改节点」通过 onOpenNode 跳转图谱节点编辑器完成。只读不等于视图冻结：视图增删改、列隐藏/列序/分组/排序/填色仍然可用。
