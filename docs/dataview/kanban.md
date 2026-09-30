# 看板视图（Kanban DataView）设计文档

> 状态：**已实现**（`packages/dataview/src/views/kanban/`）
> 依赖：[README.md](./README.md)、../database-node-design.md
> 实现说明：本文档保留原始设计；§0 记录实际落地的差异与文件地图。

---

## 0. 实现状态（先读这一节）

已经落地的是看板视图的完整交互链路：泳道渲染（选项 + 未分组）、卡片渲染、跨泳道拖拽写回、
泳道内重排（会话内）、点击打开、泳道内新建卡片、泳道折叠/展开、泳道重排（写回 `laneOrder`）、
泳道选项重命名/改色（写回 `onFieldsChange`）、以及「分组 / 卡片 / 排序 / 显示」四个工具栏面板。

与原设计的差异（都是有意的）：

| 原设计                                            | 实际落地                                                                                       | 原因                                                                                                                                                            |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REUI 官方 `kanban.json`（base 风格）              | **radix 风格变体**（`styles/radix-nova/kanban.json`），源码 vendor 到 `reui/kanban.tsx`        | 本项目 shadcn 全部构建在 `radix-ui` 单包上；radix 变体的依赖只有 `@dnd-kit/*` + `radix-ui`，不引入 `@base-ui/react`                                             |
| 配置面板（K4「配置面板」）                        | 配置进了**视图工具栏**的四个面板（分组 / 卡片 / 排序 / 显示），注册表里**没有** `configEditor` | 与表格同一条演化路径（M2.5：配置并入工具条，配置左 / 功能右）。每个设置都有专属入口，不留「视图配置」兜底弹层                                                   |
| 泳道头菜单做「编辑选项（复用字段 options 编辑）」 | **泳道标题本身是 Popover 触发器**，面板里只有「选项名称 + 颜色」两件事                         | 「改选项」只需要写 `fields`，而删选项/加选项会牵动 rows（`DatabaseContent` 拒绝引用未声明选项的单元格），那是表格的领域；把两件事混在一个菜单里会让只读性变模糊 |
| §6「泳道内排序（局部，不落库）」                  | 保留为局部态；另加**泳道拖拽重排 → 写回 `config.laneOrder`**                                   | 配置里本来就有 `laneOrder`，拖列是看板最自然的操作之一；未分组列恒定排在最后，不进 `laneOrder`                                                                  |
| §5「泳道折叠/展开（可选）」                       | 已实现（每列各自的局部态，不持久化）                                                           | 折叠列渲染成 48px 的竖排窄条，便于在宽看板上一眼扫过                                                                                                            |

### 文件地图

```text
packages/dataview/src/views/kanban/
├── kanban-data-view.tsx        # 壳：board 状态、写回链路、能力开关、空态引导（注册表唯一入口）
├── reui/kanban.tsx             # vendor 的 REUI 看板原语（Kanban/KanbanBoard/KanbanColumn/KanbanItem/…）
├── core/
│   ├── board.ts                # rows + 分组字段 → 泳道/卡片（纯函数，无 React）
│   └── config.ts               # 配置自愈、泳道顺序、选项颜色、拖拽落点 → 单元格
├── board/
│   ├── kanban-board.tsx        # 泳道条 + 拖拽编排（value/onValueChange/onValueCommit）
│   ├── kanban-card.tsx         # 卡片本体 + 卡片菜单（打开 / 移动到）
│   ├── lane-option-editor.tsx  # 编辑选项（重命名 + 颜色）
│   └── …
├── fields/field-select.tsx     # 字段选择器（shadcn Select）
└── toolbar/kanban-toolbar.tsx  # 分组 / 卡片 / 排序 / 显示 四个面板
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
export interface KanbanViewConfig {
  groupByField: string; // 必需：select（或 multiSelect）分组字段
  titleField: string; // 卡片标题字段（text，默认主列）
  cardFields?: string[]; // 卡片上额外展示的字段 id
  sortBy?: { fieldId: string; order: "asc" | "desc" }; // 泳道内排序
  laneOrder?: string[]; // 泳道显式顺序（默认按 options 顺序）
  showCardCount: boolean; // 泳道头计数
  showUnassigned: boolean; // 是否显示「未分组」泳道
  allowDrag: boolean; // 是否允许跨泳道拖拽（collection 恒 false）
  allowCreate: boolean; // 是否允许在泳道内新建卡片
  compact: boolean; // 紧凑卡片
}
```

默认配置（defaultConfig）：groupByField 取首个 select 字段、titleField 取主列、cardFields 空、
allowDrag/allowCreate = 宿主是 database。

**配置入口**：与表格相同，配置全部落在视图工具栏的四个面板里（`分组` / `卡片` / `排序` / `显示`），
注册表**不注册** `configEditor`，因此看板没有「视图配置」兜底弹层。每个面板的内容：

| 面板 | 控件                                        | 写到 config                                              |
| ---- | ------------------------------------------- | -------------------------------------------------------- |
| 分组 | 分组字段（只列 单选/多选）；显示未分组      | `groupByField`（同时清空 `laneOrder`）、`showUnassigned` |
| 卡片 | 标题字段；显示字段（复选列表）；紧凑卡片    | `titleField`、`cardFields`、`compact`                    |
| 排序 | 排序字段（含「不排序」）；方向（升序/降序） | `sortBy`                                                 |
| 显示 | 泳道计数；允许拖拽；允许新建卡片            | `showCardCount`、`allowDrag`、`allowCreate`              |

`allowDrag` / `allowCreate` 还会被宿主能力二次收口：只读宿主（collection）或宿主没给
`onCellChange` / `onRowInsert` 时，开关被禁用并给出原因文案。

---

## 5. 功能点

- 泳道列渲染（选项名 + 颜色点 + 计数）；「未分组」泳道兜底。
- 卡片渲染：标题 + cardFields 字段值（单选/多选渲染成带色点的 chip，其余渲染成「字段名 · 值」一行；空值直接省略）。
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
5. 只读（collection）：不渲染 `KanbanItemHandle` / 列抓手 / 「+」/「编辑选项」，`allowDrag` 开关禁用。

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
| K4  | 配置入口             | 分组 / 卡片 / 排序 / 显示 四个工具栏面板（无 configEditor）   | `toolbar/kanban-toolbar.tsx`                              |
| K5  | 卡片交互             | 点击打开 + 泳道内新建卡片 + 卡片菜单（打开 / 移动到）         | `board/kanban-card.tsx`                                   |
| K6  | collection 只读投影  | 不渲染 drag handle / 「+」/ 编辑选项，绑定开关禁用            | `kanban-data-view.tsx`                                    |
| K7  | 泳道操作             | 折叠、重排（`laneOrder`）、编辑选项（改名/改色）              | `board/kanban-board.tsx` + `board/lane-option-editor.tsx` |
