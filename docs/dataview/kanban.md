# 看板视图（Kanban DataView）设计文档

> 状态：设计稿（未实现）
> 依赖：[README.md](./README.md)、../database-node-design.md

---

## 1. 概述与使用场景

看板视图把 rows 按某个分类字段（select / multiSelect）分列成泳道（列），每行渲染为一张卡片，支持卡片在泳道间拖拽切换分类。它是「按状态/阶段/归属推进」类数据的经典形态。

使用场景：

- database 节点：有 select 字段表示状态（待办/进行中/完成）、阶段、优先级、负责人等，用看板拖动推进。
- collection 节点：按 __nodeType（节点类型）、__semantic（语义类型）、__permission（权限）分列，卡片为节点。
- 快速改分类：拖卡片到目标泳道即写回该 select 字段值。

---

## 2. 技术选型

采用 **REUI shadcn 看板**（https://reui.io/components/kanban）二次开发。

关键事实：REUI 看板不是 npm 包，而是 6 个可复制（copy-ready）的 shadcn 风格组件（基于 @dnd-kit 拖拽 + Tailwind + shadcn/ui）。因此「集成」= 把源码 vendor 进 dataview 包 + 适配 DataRow 数据模型，而非 npm 依赖。

| 依赖 | 用途 |
| --- | --- |
| @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities | 拖拽引擎（REUI 看板底层依赖） |
| @workspace/ui（shadcn 基础组件：Card/Badge/DropdownMenu 等） | 卡片与交互 UI |

> 项目已有 shadcn/ui + Tailwind，与 REUI 看板技术栈完全一致，vendor 后几乎零摩擦。

---

## 3. 数据转换适配

### 3.1 rows → lanes / cards

~~~ts
// packages/dataview/src/views/kanban/kanban-schema.ts
export function rowsToBoard(source: DataViewSource, config: KanbanViewConfig): Board {
  const groupField = source.fields.find((f) => f.id === config.groupByField);
  const lanes = (groupField?.options ?? []).map((opt) => ({
    id: opt.id, title: opt.name, color: opt.color, cards: [] as Card[],
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
    title: CellResolver.displayText(row.cells[config.titleField], titleField, resolveNodeTitle) || "未命名",
    fields: config.cardFields.map((fid) => ({ fid, text: CellResolver.displayText(row.cells[fid], field) })),
  };
}
~~~

- groupByField：select 类型（单选）为主，选项即泳道；无值/未命中选项的行进「未分组」泳道。
- titleField：默认主列；cardFields：卡片上额外展示的字段（标签、日期、数字等）。
- multiSelect 字段作 groupBy：卡片会在多个泳道各出现一份（副本）；v1 拖拽对这种多选分组降级只读，避免「跨泳道拖拽 = 改哪个选项」的二义性（见 §8）。

### 3.2 拖拽写回

- 卡片拖到另一泳道（select）→ 写回该 select 单元格 optionId = 目标泳道 option.id（onCellChange）。
- 泳道内上下拖拽重排：v1 仅前端视觉排序，不落库（rows 顺序是全局的，跨泳道局部顺序无对应存储，见 §8）。

---

## 4. 配置项（KanbanViewConfig）

~~~ts
export interface KanbanViewConfig {
  groupByField: string;             // 必需：select（或 multiSelect）分组字段
  titleField: string;               // 卡片标题字段（text，默认主列）
  cardFields?: string[];            // 卡片上额外展示的字段 id
  sortBy?: { fieldId: string; order: "asc" | "desc" };  // 泳道内排序
  laneOrder?: string[];             // 泳道显式顺序（默认按 options 顺序）
  showCardCount: boolean;           // 泳道头计数
  showUnassigned: boolean;          // 是否显示「未分组」泳道
  allowDrag: boolean;               // 是否允许跨泳道拖拽（collection 恒 false）
  allowCreate: boolean;             // 是否允许在泳道内新建卡片
  compact: boolean;                 // 紧凑卡片
}
~~~

默认配置（defaultConfig）：groupByField 取首个 select 字段、titleField 取主列、cardFields 空、allowDrag = !readOnly。

---

## 5. 功能点

- 泳道列渲染（选项名 + 颜色 + 计数）；「未分组」泳道兜底。
- 卡片渲染：标题 + cardFields 字段值（chip/标签形式）。
- 跨泳道拖拽改分类（database 可编辑）→ 写回 select 字段。
- 泳道内拖拽重排（前端局部态）。
- 点击卡片 → onOpenRecord / onOpenNode。
- 泳道内新建卡片（database：追加行并预填 groupBy 字段值）。
- 泳道折叠/展开（可选）。
- 泳道头菜单：改选项（复用字段 options 编辑）、按字段排序。

---

## 6. 交互与操作方法

| 操作 | 手势/入口 | 结果 |
| --- | --- | --- |
| 改分类 | 拖卡片到目标泳道 | 写回 select 字段 |
| 泳道内排序 | 拖卡片上下 | 局部排序（不落库，v1） |
| 打开记录 | 点击卡片 | onOpenRecord / onOpenNode |
| 新建卡片 | 泳道头「+」 | 追加行 + 预填分组值 |
| 折叠泳道 | 泳道头折叠图标 | 折叠/展开 |
| 泳道操作 | 泳道头菜单 | 编辑选项 / 排序 |

键盘：Tab 移动卡片焦点、Space 提起、方向键移动、Space 放下（dnd-kit 无障碍）。

---

## 7. 二次开发要点

1. vendor REUI 看板源码到 packages/dataview/src/views/kanban/reui/，保留组件划分（BoardColumn / BoardCard / BoardContainer），改 props 为 DataRow/Card 模型。
2. 替换示例数据（Todo/tasks）为 rowsToBoard 输出；拖拽 onDragEnd 里判定跨泳道 vs 泳道内。
3. 跨泳道 → onCellChange(rowId, groupByField, { type: "select", optionId })；泳道内 → 只改局部顺序 state。
4. 复用 CellResolver.toOptionIds / displayText / toColor 做分组与卡片渲染。
5. 只读（collection）：allowDrag=false，dnd-kit 不挂 drag handle。

---

## 8. 边界与取舍

- 单选优先：groupBy 以 select 为主；multiSelect 分组时卡片多副本，且拖拽降级只读（避免写回二义性）。
- 泳道内排序不持久：v1 无「泳道内顺序」存储，局部排序仅会话内有效；如需持久，需为 database 增加「排序字段」概念（后续）。
- REUI 为源码而非 npm 依赖：升级/安全跟随上游仓库手动同步，非自动。
- 字段自愈：groupByField 被删/改类型时降级为「未选择」并引导选择分组字段。

---

## 9. 开发任务清单

| # | 任务 | 说明 |
| --- | --- | --- |
| K1 | vendor REUI 看板源码 | 复制 6 组件到 dataview 包 |
| K2 | kanban-schema.ts | rowsToBoard / rowToCard |
| K3 | 拖拽写回 | onDragEnd 跨泳道 → onCellChange |
| K4 | 配置面板 | groupBy/title/cardFields 选择器 |
| K5 | 卡片交互 | 点击打开记录/节点 + 新建卡片 |
| K6 | collection 只读投影 | 复用投影 + 禁用拖拽 |
