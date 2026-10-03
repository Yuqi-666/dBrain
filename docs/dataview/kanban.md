# 看板视图（Kanban DataView）设计文档

> 状态：**已实现**（`packages/dataview/src/views/kanban/`）
> 依赖：[README.md](./README.md)、../database-node-design.md
> 实现说明：本文档保留原始设计；§0 记录实际落地的差异与文件地图。

---

## 0. 实现状态（先读这一节）

已经落地的是看板视图的完整交互链路：泳道渲染（选项 + 未分组）、卡片渲染、跨泳道拖拽写回、
泳道内重排（会话内）、点击打开、泳道内新建卡片、泳道折叠/展开、泳道重排（写回 `laneOrder`）、
泳道选项重命名/改色（写回 `onFieldsChange`）、以及「分组 / 卡片配置 / 排序」三个工具栏面板。

**卡片本身与画廊共用**（第四轮）：`shared/card.tsx` 的 `DataCard`（封面 + 标题 + 染色标签 + 值行）、
`shared/card-cover.tsx` 的封面盒、`shared/card-ops.ts` 的数据纯逻辑、`shared/card-config.tsx` 的
`卡片配置` 菜单。看板侧只多了拖拽 handle、泳道、以及菜单里的「移动到」。config 的卡片半边是
`DataCardConfig`（`titleField` / `coverField` / `cardFields` / `compact`），看板自己的
`groupByField` / `laneOrder` / `sortState`（多级排序，旧 `sortBy` 兼容读取）/ `showUnassigned`
仍在 `KanbanViewConfig` 上。

第五轮又砍掉两样东西：`显示` 面板（泳道计数 / 允许拖拽 / 允许新建卡片）和卡片上的「…」按钮。
三个开关的默认值每次都是正确答案，所以看板直接按默认行为——**宿主能力就是全部规则**（有
`onCellChange` 就能拖、有 `onRowInsert` 就能新建、泳道头恒显示计数）；卡片上不再有任何悬浮控件，
右键即记录菜单，选择与拖拽是手势。

与原设计的差异（都是有意的）：

| 原设计                                            | 实际落地                                                                                | 原因                                                                                                                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REUI 官方 `kanban.json`（base 风格）              | **radix 风格变体**（`styles/radix-nova/kanban.json`），源码 vendor 到 `reui/kanban.tsx` | 本项目 shadcn 全部构建在 `radix-ui` 单包上；radix 变体的依赖只有 `@dnd-kit/*` + `radix-ui`，不引入 `@base-ui/react`                                             |
| 配置面板（K4「配置面板」）                        | 配置进了**视图工具栏**的三个面板（分组 / 卡片 / 排序），注册表里**没有** `configEditor` | 与表格同一条演化路径（M2.5：配置并入工具条，配置左 / 功能右）。每个设置都有专属入口，不留「视图配置」兜底弹层                                                   |
| 泳道头菜单做「编辑选项（复用字段 options 编辑）」 | **泳道标题本身是 Popover 触发器**，面板里只有「选项名称 + 颜色」两件事                  | 「改选项」只需要写 `fields`，而删选项/加选项会牵动 rows（`DatabaseContent` 拒绝引用未声明选项的单元格），那是表格的领域；把两件事混在一个菜单里会让只读性变模糊 |
| §6「泳道内排序（局部，不落库）」                  | 保留为局部态；另加**泳道拖拽重排 → 写回 `config.laneOrder`**                            | 配置里本来就有 `laneOrder`，拖列是看板最自然的操作之一；未分组列恒定排在最后，不进 `laneOrder`                                                                  |
| §5「泳道折叠/展开（可选）」                       | 已实现（每列各自的局部态，不持久化）                                                    | 折叠列渲染成 48px 的竖排窄条，便于在宽看板上一眼扫过                                                                                                            |

### 文件地图

```text
packages/dataview/src/views/kanban/
├── kanban-data-view.tsx        # 壳：board 状态、写回链路、能力开关、空态引导（注册表唯一入口）
├── reui/kanban.tsx             # vendor 的 REUI 看板原语（Kanban/KanbanBoard/KanbanColumn/KanbanItem/…）
├── core/
│   ├── board.ts                # rows + 分组字段 → 泳道/卡片（纯函数，无 React；卡片值走 shared/card-ops）
│   └── config.ts               # 分组字段解析、泳道顺序、选项颜色、拖拽落点 → 单元格
├── board/
│   ├── kanban-board.tsx        # 泳道条 + 拖拽编排（value/onValueChange/onValueCommit）
│   ├── kanban-card.tsx         # 共享 DataCard + 拖拽 handle + 记录右键菜单（移动到在菜单里）
│   └── lane-option-editor.tsx  # 编辑选项（重命名 + 颜色）
└── toolbar/kanban-toolbar.tsx  # 分组 / 卡片配置（共享）/ 排序 三个面板
```

分层规则与表格一致：`core/*` 是纯逻辑（不 import React），`board/*` 组装 REUI 原语与
shadcn 组件，`toolbar/*` 只读 config 并向上报 `onConfigChange`；**没有任何文件 import
`kanban-data-view.tsx`**。

### 两条不能破坏的约束（实现时踩过）

1. **卡片 id 必须是 `laneId + "::" + rowId`。** REUI 要求 item id 在**所有列之间**唯一，且不能与
   column id 相同；`multiSelect` 分组时同一行本来就会出现在多个泳道里。行 id 永远从卡片对象上取
   （`findCardByKey`），不要解析 key。
2. **拖拽激活器是 handle，不是 item。** REUI 把 ARIA 属性放在 `KanbanItem`、把
   pointer/keyboard listeners 放在 `KanbanItemHandle`：所以「不可拖拽」= 不渲染 handle
   （传 `disabled` 会把卡片整体置灰，只读看板不该看起来像被禁用）。卡片菜单因此是 handle 的
   **兄弟节点**（绝对定位浮在卡片右上角），按它不会触发拖拽。
3. **`DndContext` 必须拿到稳定 `id`。** dnd-kit 用一个模块级计数器生成
   `aria-describedby` 指向的 id；服务端渲染与 hydration 的计数不同，React 会保留服务端的
   `aria-describedby` 并报 hydration mismatch（无障碍说明指向不存在的 id）。本视图把 React 的
   `useId()` 透传给 `DndContext`（`reui/kanban.tsx` 里 `id` 的唯一改动）。

### 验证方式

与表格一致：仓库内**没有**测试基建，看板是通过临时的 `apps/web` 页面 + 无头 Chromium（CDP）
驱动验证的 —— 渲染、跨泳道拖拽写回、拖入未分组清空选项、卡片菜单「移动到」、泳道内新建卡片、
泳道重命名/改色、泳道重排写回 `laneOrder`、折叠、四个配置面板、排序、只读（collection 语义）、
两种缺字段引导，以及切回表格的回归。临时页面已删除。

---

## 1. 概述与使用场景

看板视图把 rows 按某个分类字段（select / multiSelect）分列成泳道（列），每行渲染为一张卡片，支持卡片在泳道间拖拽切换分类。它是「按状态/阶段/归属推进」类数据的经典形态。

使用场景：

- database 节点：有 select 字段表示状态（待办/进行中/完成）、阶段、优先级、负责人等，用看板拖动推进。
- collection 节点：按 **nodeType（节点类型）、**semantic（语义类型）、\_\_permission（权限）分列，卡片为节点。
- 快速改分类：拖卡片到目标泳道即写回该 select 字段值。

---

## 2. 技术选型

采用 **REUI shadcn 看板**（https://reui.io/components/kanban）二次开发。

关键事实：REUI 看板不是 npm 包，而是可复制（copy-ready）的 shadcn 风格组件（基于 @dnd-kit 拖拽 +
Tailwind + shadcn/ui）。因此「集成」= 把源码 vendor 进 dataview 包 + 适配 DataRow 数据模型，而非
npm 依赖。

实际 vendor 的是 **radix 风格变体**（`GET https://reui.io/r/styles/radix-nova/kanban.json`）——
REUI 的默认变体依赖 `@base-ui/react`，而本项目的 shadcn 全部构建在 `radix-ui` 单包上，radix 变体
因此只需要 `@dnd-kit/*`。

| 依赖                                                                                   | 用途                                                           |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities                                 | 拖拽引擎（REUI 看板底层依赖）                                  |
| radix-ui                                                                               | vendor 源码里的 `Slot`（`asChild`），与 @workspace/ui 同一个包 |
| @workspace/ui（shadcn 基础组件：Button/DropdownMenu/Popover/Select/Switch/Checkbox/…） | 卡片与交互 UI                                                  |

> 项目已有 shadcn/ui + Tailwind，与 REUI 看板技术栈完全一致，vendor 后几乎零摩擦。vendor 文件顶部
> 注明了来源、抓取日期，以及为适配本仓库 tsconfig（`noUncheckedIndexedAccess` + 无 `@types/node`）
> 所做的两处最小改动。

---

## 3. 数据转换适配

### 3.1 rows → lanes / cards

```ts
// packages/dataview/src/views/kanban/kanban-schema.ts
export function rowsToBoard(
  source: DataViewSource,
  config: KanbanViewConfig,
): Board {
  const groupField = source.fields.find((f) => f.id === config.groupByField);
  const lanes = (groupField?.options ?? []).map((opt) => ({
    id: opt.id,
    title: opt.name,
    color: opt.color,
    cards: [] as Card[],
  }));

  for (const row of source.rows) {
    const optionIds = CellResolver.toOptionIds(row.cells[config.groupByField]); // select → [id]
    const lane = lanes.find((l) => l.id === optionIds[0]);
    (lane ?? unassignedLane).cards.push(rowToCard(row, source, config));
  }
  return { lanes: [...lanes, unassignedLane] };
}

function rowToCard(row, source, config): Card {
  return {
    id: row.id,
    title:
      CellResolver.displayText(
        row.cells[config.titleField],
        titleField,
        resolveNodeTitle,
      ) || "未命名",
    fields: config.cardFields.map((fid) => ({
      fid,
      text: CellResolver.displayText(row.cells[fid], field),
    })),
  };
}
```

- groupByField：select 类型（单选）为主，选项即泳道；无值/未命中选项的行进「未分组」泳道。
- titleField：默认主列；cardFields：卡片上额外展示的字段（标签、日期、数字等）。
- multiSelect 字段作 groupBy：卡片会在多个泳道各出现一份（副本）；v1 拖拽对这种多选分组降级只读，避免「跨泳道拖拽 = 改哪个选项」的二义性（见 §8）。

### 3.2 拖拽写回

- 卡片拖到另一泳道（select）→ 写回该 select 单元格 optionId = 目标泳道 option.id（onCellChange）。
- 泳道内上下拖拽重排：v1 仅前端视觉排序，不落库（rows 顺序是全局的，跨泳道局部顺序无对应存储，见 §8）。

---

## 4. 配置项（KanbanViewConfig）

```ts
// 卡片半边：与画廊共用（interfaces 的 DataCardConfig）
export interface DataCardConfig {
  titleField?: string; // 卡片标题字段（默认文本主列）
  coverField?: string; // 封面字段（url / text 里的图片地址 / relation 节点）
  cardFields?: string[]; // 卡片上展示的字段 id，按卡片顺序
  compact?: boolean; // 展示模式：紧凑
}

export interface KanbanViewConfig extends DataCardConfig {
  groupByField: string; // 必需：select（或 multiSelect）分组字段
  sortState?: TableCondition[]; // 泳道内排序：与表格排序同一份多级条件列表（本轮）
  sortBy?: { fieldId: string; order: "asc" | "desc" }; // 旧单级排序，仍被读取
  laneOrder?: string[]; // 泳道显式顺序（默认按 options 顺序）
  showUnassigned: boolean; // 是否显示「未分组」泳道
}
```

默认配置（defaultConfig）：groupByField 取首个 select 字段，titleField 取主列，
cardFields = 所有单选/多选 + 第一个非标题文本字段，再排除分组字段（它的值就是泳道）。

**配置入口**：与表格相同，配置全部落在视图工具栏的三个面板里（`分组` / `卡片配置` / `排序`），
注册表**不注册** `configEditor`，因此看板没有「视图配置」兜底弹层。每个面板的内容：

| 面板     | 控件                                                                                                                                                                               | 写到 config                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 分组     | 分组字段（只列 单选/多选）；显示未分组                                                                                                                                             | `groupByField`（同时清空 `laneOrder`）、`showUnassigned`                               |
| 卡片配置 | **标题 / 封面两个配置项**（一个 `PanelSection` + 一个 `FieldSelect`）；展示模式（常规/紧凑）；卡片字段列表（搜索、拖拽排序、眼睛显隐、行尾**角色注解**、编辑/删除/新增字段）       | `titleField`、`coverField`、`cardFields`、`compact`（+ 字段增删改走 `onFieldsChange`） |
| 排序     | **与表格完全相同的排序菜单**（`共享 shared/condition-menu.tsx`）：`字段 + 方向` 条件行（多级）、`添加条件`、拖动排优先级、`清除`；触发器读作 `[图标] 排序 <字段名>`（多级补 `+N`） | `sortState`（写入时顺手清掉旧的 `sortBy`）                                             |

`卡片配置` 与画廊是同一个组件（`shared/card-config.tsx`），所以两个视图的卡片从长相到配置方式完全
一致；三个面板的触发器都是中性按钮，没有高亮态（分组 / 排序读作 `[图标] 分组 <字段名>`，与表格的
分组 / 排序按钮同形同图标）。工具条右侧除了「更多」什么都没有，泳道头自己就有计数（原先的
`泳道计数` 开关已删除）。面板里不写说明性文字（控件自己说明自己），但排序面板保留
`设置排序条件` 这一行标题 —— 它和表格的那个菜单是同一个组件，`清除` 就挂在这一行。
排序面板没有「自动排序」开关：看板的卡片顺序每次都由 config 现算（`buildKanbanBoard`），
不存在「数据变化后是否重新应用排序」这个问题。

**角色不在字段行的「…」里设置**（第七轮）：卡片字段列表的行只标注该字段当前的角色
（`标题` / `封面` 注解，标题带锁），设置入口是列表上方的两个配置项 —— 与日历的
`开始日期` / `结束日期` / `标题` / `颜色` 四个配置项同一套形状。

拖拽与新建不再是开关，而是宿主能力的直接结果（见 `kanban-data-view.tsx`）：
`canDragCards = 可写单元格 && 有分组字段 && 分组字段不是多选`，
`canCreateCard = 可新增行 && 有分组字段`。只读宿主（collection）自然两项都为 false。

---

## 5. 功能点

- 泳道列渲染（选项名 + 颜色点 + 计数）；「未分组」泳道兜底。
- 卡片渲染：共享 `DataCard` —— 封面 + 标题 + 每个单选/多选一个染色标签 + 每个其它字段**一行值**
  （不写字段名，字段名是该行 tooltip；空值直接省略）。
- 跨泳道拖拽改分类（database 可编辑）→ 写回 select 字段；拖进「未分组」写 `optionId: null`。
- 泳道内拖拽重排（前端局部态，不落库）。
- 点击卡片 → onOpenRecord / onOpenNode（collection 行没有 onOpenRecord 时走 onOpenNode）。
- 泳道内新建卡片（database：追加行并预填 groupBy 字段值；标题空则显示「未命名」）。
- 泳道折叠/展开（每列局部态，不持久化）。
- 泳道重排（拖泳道头抓手）→ 写回 `config.laneOrder`。
- 泳道标题点开「编辑选项」→ 重命名 / 改颜色 → `onFieldsChange(fields)`（不改写任何单元格）。
- 卡片菜单：打开 / 移动到 <泳道>（键盘与触屏可达，也是拖拽之外的第二条改分类路径）。

---

## 6. 交互与操作方法

| 操作             | 手势/入口                | 结果                                  |
| ---------------- | ------------------------ | ------------------------------------- |
| 改分类           | 拖卡片到目标泳道         | 写回 select 字段（拖到未分组 = 清空） |
| 改分类（无拖拽） | 卡片菜单 → 移动到 → 泳道 | 同上                                  |
| 泳道内排序       | 拖卡片上下               | 局部排序（不落库）                    |
| 打开记录         | 点击卡片                 | onOpenRecord / onOpenNode             |
| 新建卡片         | 泳道头「+」              | 追加行 + 预填分组值                   |
| 折叠泳道         | 泳道头折叠图标           | 折叠成 48px 竖排窄条                  |
| 重排泳道         | 拖泳道头抓手             | 写回 `laneOrder`（未分组恒在最后）    |
| 编辑选项         | 点泳道标题               | 重命名 / 改颜色                       |

键盘：Tab 依次落在「卡片拖拽抓手」（role=button）与卡片菜单按钮上，Space 提起、方向键移动、
Space 放下、Esc 取消（dnd-kit 无障碍）。抓手上带 `aria-label="拖动卡片：<标题>"`。

---

## 7. 二次开发要点（实际做法）

1. vendor REUI 看板源码到 `reui/kanban.tsx`，保留原语划分（Kanban / KanbanBoard / KanbanColumn /
   KanbanColumnHandle / KanbanColumnContent / KanbanItem / KanbanItemHandle / KanbanOverlay），
   只在顶部改 `cn` 的 import、加一个 `columnOf` 辅助（适配 `noUncheckedIndexedAccess`）、把 `id`
   透传给 `DndContext`（SSR aria-describedby 稳定性）。数据模型适配发生在 `board/`。
2. `core/board.ts` 的 `buildKanbanBoard(source, config, resolveNodeTitle)` 取代 `rowsToBoard`：
   泳道来自选项 + 未分组伪列，卡片 id 为 `laneId::rowId`。
3. 跨泳道判定走 REUI 的 `onValueCommit`（`activeContainer !== overContainer`）而不是自己比对
   board：默认模式下 `dragOver` 已经把卡片挪到目标列了，只有 commit 的元信息知道「从哪来」。
   → `onCellChange(rowId, groupByField, cellForLane(...))`；泳道内只改局部 state。
4. `core/config.ts` 承担字段自愈（分组字段被删/改类型 → `null` → 引导态）与 `optionColor`；
   卡片用 `CellResolver` 的 `displayText` / `toOptionIds` / `sortValue`。
5. 只读（collection）：不渲染 `KanbanItemHandle` / 列抓手 / 「+」/「编辑选项」——拖拽与新建本就
   由宿主能力收口，所以没有开关需要禁用。

---

## 8. 边界与取舍

- 单选优先：groupBy 以 select 为主；multiSelect 分组时卡片多副本，且拖拽降级只读（避免写回二义性）。
- 泳道内排序不持久：v1 无「泳道内顺序」存储，局部排序仅会话内有效；如需持久，需为 database 增加「排序字段」概念（后续）。
- REUI 为源码而非 npm 依赖：升级/安全跟随上游仓库手动同步，非自动。
- 字段自愈：groupByField 被删/改类型时降级为「未选择」并引导选择分组字段。
- 选项本身只能改名/改色，不能删：删选项会让引用它的单元格失效（`DatabaseContent` 会拒绝），
  必须连同 rows 一起重写，那是表格「字段配置」的职责。
- 泳道拖拽重排写的是**选项顺序**，落到 `config.laneOrder`（视图私有）；「未分组」伪列恒定在最后，
  不写进 `laneOrder`。

---

## 9. 开发任务清单（已完成）

| #   | 任务                 | 说明                                                          | 落地位置                                                  |
| --- | -------------------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| K1  | vendor REUI 看板源码 | radix 变体 8 个原语到 dataview 包                             | `reui/kanban.tsx`                                         |
| K2  | 数据转换             | `buildKanbanBoard` / `moveCardToLane` / `findCardByKey`       | `core/board.ts`                                           |
| K3  | 拖拽写回             | `onValueCommit` 跨泳道 → `onCellChange`；列拖拽 → `laneOrder` | `board/kanban-board.tsx`                                  |
| K4  | 配置入口             | 分组 / 卡片 / 排序 三个工具栏面板（无 configEditor）          | `toolbar/kanban-toolbar.tsx`                              |
| K5  | 卡片交互             | 点击打开 + 泳道内新建卡片 + 记录右键菜单（移动到在菜单里）    | `board/kanban-card.tsx`                                   |
| K6  | collection 只读投影  | 不渲染 drag handle / 「+」/ 编辑选项，绑定开关禁用            | `kanban-data-view.tsx`                                    |
| K7  | 泳道操作             | 折叠、重排（`laneOrder`）、编辑选项（改名/改色）              | `board/kanban-board.tsx` + `board/lane-option-editor.tsx` |
