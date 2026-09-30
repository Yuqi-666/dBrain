# 数据展示组件（DataView）设计文档

> 状态：外壳已实现；表格视图已实现（`packages/dataview/src/views/table/`），其余六个视图仍为占位
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
> context 把菜单交给当前渲染器的工具条，所以任何画了 `ViewToolbar` 的视图（含六个占位视图）
> 都自动带上它。功能区因此必须只放**固定尺寸、常驻**的控件：宽度会变的控件（搜索输入框、
> 随选中出现的按钮）会把右对齐行里它左侧的邻居一起推开。

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

## 4. 数据源与适配层（数据转换适配）

### 4.1 归一化数据源 DataViewSource

两种宿主最终都归一化为同一形状；视图渲染器只认识它：

```ts
// packages/interfaces/src/models/data-view.ts（建议位置）
export type DataViewSourceKind = "database" | "collection";

export interface DataViewSource {
  kind: DataViewSourceKind;
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
): DataViewSource {
  return { kind: "database", fields: content.fields, rows: content.rows };
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

| 视图             | database | collection | 数据源依赖                                            | 技术方案                               |
| ---------------- | :------: | :--------: | ----------------------------------------------------- | -------------------------------------- |
| 表格 table       |    ✅    |     ✅     | fields/rows                                           | VTable + editors/export/search/plugins |
| 看板 kanban      |    ✅    |     ✅     | 需 select/multiSelect 分组字段                        | REUI shadcn 看板（dnd-kit）二次开发    |
| 日历 calendar    |    ✅    |     ✅     | 需 date 字段（collection 用 **createdAt/**updatedAt） | FullCalendar 二次开发                  |
| 甘特图 gantt     |    ✅    |     ⚠️     | 需 date 起止字段                                      | VTable（@visactor/vtable-gantt）       |
| 画廊 gallery     |    ✅    |     ✅     | 需主列/封面字段（collection 复用节点预览）            | 自研（shadcn + 现有 previews）         |
| 图表 chart       |    ✅    |     ✅     | 需维度/度量字段                                       | VChart 全类型                          |
| 节点图 nodeGraph |    ❌    |     ✅     | 仅 filterConfig（复用 @workspace/graph）              | 复用 <Graph />                         |

- ✅ 完整支持；⚠️ 支持但依赖字段可用性（缺少日期字段时给出引导）。
- 节点图视图只在 collection 出现：database 的行不是图谱节点，无图可画；nodeGraph 描述符 nodeTypes 为 ["collection"]。

---

## 8. 跨视图通用能力

以下能力不随视图类型变化，放在 DataViewRoot / 共享 hook 层，各视图按需消费：

| 能力               | 说明                                   | 归属                                                                                   |
| ------------------ | -------------------------------------- | -------------------------------------------------------------------------------------- |
| 行级过滤           | 对 rows 施加字段条件过滤               | DataViewRoot → 过滤后的 source 下发；表格视图另有 `筛选` 菜单                          |
| 排序               | 对 rows 排序                           | 视图内局部态（写回视图 config）                                                        |
| 选择与批量操作     | 多选行 → 批量删除/导出/改字段          | 各视图各自实现，共享 useRowSelection                                                   |
| 打开记录/节点      | 行 → 详情浮层 / 关联节点               | onOpenRecord / onOpenNode 冒泡                                                         |
| 导出               | 当前视图导出 CSV/Excel/PNG             | 各视图（table 用 vtable-export，chart 用 vchart 导出）                                 |
| 主题               | 浅/深色跟随 next-themes                | 共享 themeTokens → 各库 theme 映射                                                     |
| 只读               | collection 投影只读；database 可编辑   | readOnly prop 逐视图传导                                                               |
| 空态/字段缺失引导  | 无数据、缺必需字段时的引导 UI          | 各视图 + 共享 EmptyState                                                               |
| 视图配置入口       | 每个视图自己的工具栏（配置左、功能右） | `shared/view-toolbar.tsx`：ViewToolbar（+ 可选的 ViewConfigMenu 兜底）                 |
| 视图级操作（更多） | 每个视图工具条功能区的末尾             | `toolbar/view-actions.tsx`：槽位 context + `ViewActionsMenu`（设为默认/复制/删除视图） |

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
  没有专属菜单的配置项放这里（六个占位视图目前只有它）。
- 渲染器如果为全部配置都做了专属菜单（表格：添加记录/字段配置/筛选/分组/排序/行高/填色），
  就不要再用通用弹层兜底 —— 表格既不注册 `configEditor`，也不渲染 `ViewConfigMenu`。
- **配置控件内不要留占位空态**：下拉菜单里不放「还没有条件…」这类虚线占位块，空菜单只留标题 +
  底部「添加条件」；字段/条件选择器未选时统一显示「选择字段」。

---

## 9. 依赖清单与包结构

### 9.1 新包 packages/dataview

仿照 @workspace/graph / @workspace/editor，把 DataView 做成独立包，隔离重量级依赖：

| 依赖                                                                              | 用途                      | 视图      |
| --------------------------------------------------------------------------------- | ------------------------- | --------- |
| @visactor/vtable + vtable-editors + vtable-export + vtable-search                 | 表格                      | table     |
| @visactor/vtable-gantt                                                            | 甘特图                    | gantt     |
| @visactor/vchart + @visactor/react-vchart                                         | 图表                      | chart     |
| @fullcalendar/react + core + daygrid + timegrid + list + multimonth + interaction | 日历                      | calendar  |
| @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities                            | 看板拖拽（REUI 看板依赖） | kanban    |
| @workspace/graph                                                                  | 节点图复用 <Graph />      | nodeGraph |
| @workspace/ui（shadcn 基础）、interfaces、store、utils                            | 基础依赖                  | 全部      |

上述第三方库全部懒加载（React.lazy + 动态 import），只有切到对应视图时才加载其 bundle。

### 9.2 集成进 node-content

packages/ui/src/components/dialog/editor/content/ 下：

- node-content-editor.tsx 增加 case "database" → <DatabaseNodeContent />。
- collection-node-content.tsx 由「只读列表」升级为「内嵌 <DataViewRoot />」，并在工具条保留「节点图」入口（详见 node-graph.md）。
- 新增 database-node-content.tsx：内嵌 <DataViewRoot />，source = databaseToDataViewSource(node.content)，onCellChange 走 NodeService.upsert 乐观写。

---

## 10. 目录结构（建议）

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
│   └── field-utils.ts       # 主列/日期/数字/选项字段选择器
├── shared/
│   ├── view-toolbar.tsx     # ViewToolbar 骨架 +（可选）ViewConfigMenu 通用配置弹层
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
    │                │              + condition-menu.tsx + condition-controls.tsx
    │                │              + color-menu.tsx + select-menu.tsx
    │                └── fields/   meta.tsx + picker.tsx + editor.tsx
    ├── kanban/      …
    ├── calendar/    …
    ├── gantt/       …
    ├── gallery/     …
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
| M3 核心视图-日历  | FullCalendar 集成 + 日期映射/拖拽写回/多视图 + config 面板（核心，全功能）                                                               | M1           |
| M4 图表           | VChart 全类型 + 字段编码 + 聚合 + 联动过滤 + 导出                                                                                        | M1           |
| M5 看板           | REUI 看板二次开发 + dnd-kit 拖拽写回                                                                                                     | M1           |
| M6 画廊           | 自研卡片/网格/虚拟滚动（database 自定义卡片 + collection 复用预览）                                                                      | M1           |
| M7 甘特图         | @visactor/vtable-gantt 集成 + 日期写回                                                                                                   | M1           |
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
