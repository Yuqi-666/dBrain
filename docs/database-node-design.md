# database 节点类型设计文档

> 状态：已实现（本轮**不含** `database` 内容编辑器 A8/A9；§6 持久化用 `fields` / `rows` 两个专用列，直接建在 0 号脚本里）
> 目标：为 dBrain 知识图谱新增一种「Notion 式结构化表格」节点类型，命名 `database`。

---

## 1. 概述

在现有 9 种节点类型（`text / image / pdf / video / audio / webpage / website` 单一型，`collection / rich-text` 复杂型）之上，新增第 10 种：**`database`**。

`database` 是一个**复杂节点类型**，内嵌一张用户自定义的二维表：

- **Schema（列）**：有序的字段列表，每个字段有名字 + 类型 + 可选配置（如 select 的选项）。
- **Records（行）**：有序的记录列表，每个记录按 `fieldId` 存单元格值。

它与 `collection` 的区别在于：`collection` 是「一组图谱节点的过滤视图」，不持有自己的数据；`database` 是「自包含的结构化数据」，行记录可以独立存在，也可以借由 `relation` 字段反指图谱节点。

---

## 2. 语义定位与分类

| 维度 | 决定 |
| --- | --- |
| 单/复杂 | **复杂节点类型**（`ComplexNodeDataType`），与 `collection`、`rich-text` 平级 |
| 类比 | Notion Database / Airtable：列是带类型的字段，行是记录 |
| 图谱集成 | 通过 `relation` 字段类型让某一行指向其它图谱节点（软引用，不自动建边） |
| 节点自身标题 | 沿用 `NodeBase.title`，作为该「数据库」的名字；行记录**不是**独立节点 |

### 为什么是复杂类型

`database` 有一个可变 schema + 一组记录，数据是自包含且结构化的，与 `rich-text`（块文档）、`collection`（过滤视图）一样需要独立的内容编辑器与预览，而非单一型那种「一个 URL / 一段源码」的载荷。

---

## 3. 数据模型（`@workspace/interfaces`）

新增文件 `packages/interfaces/src/models/node/nodes/complex/database.ts`：

```ts
import type { NodeBase, NodeId } from "../../base";
import type { NodeType } from "../../types";

export interface DatabaseNodeData extends NodeBase, NodeType<"database"> {
  content: DatabaseContent;
}

/**
 * 字段类型的**唯一真源**：`DatabaseFieldType` 由它派生，domain 的 VO 直接复用，
 * tRPC 的 `z.enum()` 也用它。新增一种字段类型只需改这一个数组 + `DatabaseCell`
 * 联合 + 渲染 switch，不再需要在多处手抄字面量。
 */
export const DATABASE_FIELD_TYPES = [
  "text",
  "number",
  "select",
  "multiSelect",
  "date",
  "checkbox",
  "url",
  "relation",
] as const;

export type DatabaseFieldType = (typeof DATABASE_FIELD_TYPES)[number];

export interface DatabaseFieldOption {
  id: string;
  name: string;
  color?: string;
}

export interface DatabaseField {
  id: string;
  name: string;
  type: DatabaseFieldType;
  /** select / multiSelect 的选项列表（这两种类型必须非空）；其它类型不参与校验但原样保留 */
  options?: DatabaseFieldOption[];
}

export type DatabaseCell =
  | { type: "text"; text: string }
  | { type: "number"; number: number | null }
  | { type: "select"; optionId: string | null }
  | { type: "multiSelect"; optionIds: string[] }
  | { type: "date"; date: string | null } // ISO 8601
  | { type: "checkbox"; checked: boolean }
  | { type: "url"; url: string | null }
  | { type: "relation"; nodeIds: NodeId[] };

export interface DatabaseRow {
  id: string;
  /** 单元格值，按 DatabaseField.id 键 */
  cells: Record<string, DatabaseCell>;
}

export interface DatabaseContent {
  fields: DatabaseField[];
  rows: DatabaseRow[];
}
```

### 设计要点

- **`fields` / `rows` 都是有序数组**：列的显示顺序、行的显示顺序都靠数组顺序表达（PocketBase 的 JSON 字段保留数组顺序）。
- **单元格用判别联合（discriminated union）**：`DatabaseCell.type` 必须与所属字段的 `DatabaseField.type` 一致，由领域层校验，前端据此渲染对应编辑器。
- **`relation` 字段**：单元格存的是 `NodeId[]`，即**软引用**到图谱中其它节点。v1 不自动生成 `Edge` 记录（避免边权限/级联删除复杂度），只在编辑器中呈现为可点击链接，用户如需连边可手动在画布上连。
- **行记录不是节点**：`DatabaseRow.id` 是行内自生成 id（如 `crypto.randomUUID()`），与 `NodeId` 无关；行不进入图谱渲染。

### 类型登记（`packages/interfaces/src/models/node/types.ts`）

```ts
export type ComplexNodeDataType = "collection" | "rich-text" | "database";

export const COMPLEX_NODE_DATA_TYPES: ComplexNodeDataType[] = [
  "collection",
  "rich-text",
  "database",
];
```

`NODE_DATA_TYPES` 是**硬编码数组**（并非由上面两者拼接），因此必须手动追加 `"database"`；`SINGLE_NODE_DATA_TYPES` 不变。`packages/utils` 的 filter 选项、QuickPanel 的「全部 / 节点类型」tab 都从 `NODE_DATA_TYPES` 派生，追加后自动出现。

---

## 4. 字段类型与单元格值对照

| `DatabaseFieldType` | 单元格 `DatabaseCell` | 编辑控件 | 校验 |
| --- | --- | --- | --- |
| `text` | `{ type:"text", text }` | 单行输入 | 无 |
| `number` | `{ type:"number", number \| null }` | 数字输入 | `number` 或 `null` |
| `select` | `{ type:"select", optionId \| null }` | 单选下拉 | `optionId` ∈ `options` 或 `null` |
| `multiSelect` | `{ type:"multiSelect", optionIds[] }` | 多选标签 | 每个 `optionId` ∈ `options` |
| `date` | `{ type:"date", date \| null }` | 日期选择 | ISO 8601 或 `null` |
| `checkbox` | `{ type:"checkbox", checked }` | 复选框 | boolean |
| `url` | `{ type:"url", url \| null }` | URL 输入 | 合法 URL 或 `null` |
| `relation` | `{ type:"relation", nodeIds[] }` | 节点选择器 | 每个 id 为图谱内合法 `NodeId` |

### 显示列（主列）约定

v1 采用**隐式主列**：第一个 `type === "text"` 的字段作为行的显示标题（预览/列表里展示该单元格值，空则显示 `未命名`）。不引入显式 `isPrimary` 标志，减少校验面；若后续需要，可加 `DatabaseField.isPrimary?: boolean`。

---

## 5. 领域模型（`@workspace/domain`）

### 5.1 值对象（`backend/domain/src/models/node/value-objects.ts`）

- 在 `NodeType` 的 `validTypes` 中追加 `"database"`。
- 新增不可变 VO：`DatabaseField`、`DatabaseFieldOption`、`DatabaseCell`、`DatabaseRow`、`DatabaseContent`。
- `DATABASE_FIELD_TYPES` 与 `DatabaseFieldType` **不再在 domain 内重复声明**，而是从 `@workspace/interfaces` 引入后原样 re-export（`DatabaseCellValue` 同理，是 interfaces `DatabaseCell` 的类型别名）。字段类型字面量全仓库只存在一份。
- `DatabaseContent` 构造时执行**结构校验**：
  - `fields` 内 `id` 唯一、`name` 非空；
  - `select / multiSelect` 字段必须有非空 `options`；其它类型上的 `options` 不参与校验，但会被原样保留（避免整表往返时丢数据）；
  - 同一字段的 `options` 内 `id` 唯一（重复选项会让 `hasOption` 语义含糊、并让将来的编辑器出现 React key 冲突）；
  - `rows` 内 `id` 唯一；
  - 每个单元格的 `DatabaseCell.type` 与对应字段的 `type` 一致；
  - `select` 的 `optionId` 必须命中字段 `options`（或为 `null`）；
  - `number` 单元格必须是**有限数**或 `null`（用 `Number.isFinite`，不是 `typeof`：`Infinity` 能通过 `typeof` 检查，但 `JSON.stringify` 会把它写成 `null`，等于静默改值）。

### 5.2 实体（`backend/domain/src/models/node/entities.ts`）

新增 `DatabaseNode extends Node`（结构对齐现有 `CollectionNode` / `RichTextNode`）：

```ts
export class DatabaseNode extends Node {
  protected readonly _content: DatabaseContent;
  private constructor(props: NodeBaseProps & { content: DatabaseContent }) {
    super({ ...props, nodeType: new NodeType<"database">("database") });
    this._content = props.content;
  }
  get content(): DatabaseContent { return this._content; }
  static create(props: { ...; content: DatabaseContent; ... }): DatabaseNode { ... }
  updateContent(content: DatabaseContent): DatabaseNode { ... }
  protected cloneWith(props: Partial<NodeBaseProps>): DatabaseNode { ... }
}
```

**结构变更方法**（均已实现；返回新实例，符合不可变约定）：

- `addField(field)` / `renameField(id, name)` / `setFieldOptions(id, options)` / `setFieldType(id, type, options?)` / `removeField(id)`
- `addRow(row)` / `updateCell(rowId, fieldId, cell)` / `removeRow(rowId)`
- `reorderFields(ids)` / `reorderRows(ids)`

> **列级联约定**：凡使单元格失效的 schema 变更，都由聚合自己级联，不允许把非法状态留给 `DatabaseContent` 抛错。
>
> - `removeField(id)`：删除所有行里该 `fieldId` 的单元格。
> - `setFieldOptions(id, options)`：被移除的选项从数据里清掉 —— `select` 单元格置 `optionId: null`，`multiSelect` 单元格只保留仍存在的 `optionId`。
> - `setFieldType(id, type, options?)`：**整列清空**（该列所有单元格删除）。类型变更后旧 payload 的判别字段必然与新类型不符，聚合不做静默强转；`select / multiSelect` 必须同时给出新的 `options`。
> - `reorderFields/reorderRows`：`ids` 必须是现有 id 的全排列，长度不符或出现未知/重复 id 直接抛错（不静默丢项）。

### 5.3 仓储接口（`backend/domain/src/repositories/index.ts`）

`INodeRepository` 增加类型化查找器（与其它 9 种节点类型一致）：

```ts
findDatabaseNode(id: NodeId): Promise<DatabaseNode | null>;
```

---

## 6. 持久化

**`database` 使用两个专用 JSON 列 `fields` / `rows`，直接加在 0 号脚本 `pb/pb_migrations/1700000000_initial_schema.js` 的 `nodes` 集合里，没有附加迁移。**

- 记录形状 `DatabaseNodeRecord extends BaseNodeRecord`：`{ nodeType: "database"; fields: DatabaseField[]; rows: DatabaseRow[] }` —— 记录里**没有** `content` 字段。
- **存储用两列、传输仍用 `content`**：与 `rich-text` 完全同构 —— 线上 / DTO 形状是 `content: { fields, rows }`（见 tRPC `addSchema` 与 `DatabaseNodeDTO`），只有 infrastructure 的 `NodeMapper` 负责在 `content` 与两列之间拆装。
- `fields` / `rows` 与 `filterConfig`、`referencedNodes`、`docs` 一样是 `type: "json"`，由 `nodeType` 判别含义；其它节点类型不写这两列。

**为什么给专用列，而不是复用 `content`**：本仓库已有一条明确规律 —— **单一类型节点**（text / image / pdf / video / audio / webpage / website）都把载荷写进共用的 `content` 列，而**复杂类型节点各自占用专用列**（`collection` → `filterConfig`；`rich-text` → `referencedNodes` + `docs`）。`database` 是复杂类型，且其内容是「有序列定义 + 有序记录行」这一对，因此照 `rich-text` 的双列形态给 `fields` + `rows`，比塞进 `content` 更符合既有规律（也让 PocketBase 后台能逐列检视表结构）。

**改 0 号脚本的前提：必须先删库重建。** PocketBase 只按**文件名**去重迁移，不比对文件内容（见 `_migrations` 表）。若某个库已经执行过 `1700000000_initial_schema.js`，改写该文件**不会**让它重跑，那两列也就永远不会出现，写 `database` 节点会直接报 unknown field。因此本方案约定：改 0 号脚本 → 删掉 `pb/pb_data` → 重新启动 PocketBase 由 0 号脚本重建全部集合。

代价是**所有既有数据一起丢失**（本项目的 `pb_data` 是纯开发数据，可随时重建）。若将来需要保留数据地加列，正确做法是追加一条迁移，而不是改 0 号脚本。

| 节点 | 持久化载体 |
| --- | --- |
| text | `content`（JSON） |
| collection | `filterConfig`（JSON） |
| rich-text | `referencedNodes` + `docs`（JSON） |
| **database** | **`fields` + `rows`（JSON）** |

**为什么给专用列，而不是复用 `content`**：`content` 已是 text / image / pdf / video / audio / webpage / website 共用的「单一载荷」列；database 持有的是**成对的 schema + 数据**，且与 rich-text 的双列形态一致，因此给它专用列，避免 `content` 的解释再分叉。

---

## 7. 前端渲染与交互

| 场景 | 行为 |
| --- | --- |
| 图节点 | 无特殊处理——`force/transform.ts` 只透传 `nodeType`，`database` 自动入图，用语义/标签/标题渲染 |
| 悬停预览 `DatabasePreview` | 只读紧凑表格：列头 = 字段名，行 = 前 N 条记录，`relation` 单元格显示被引节点标题（需要时查 `useDataStore`） |
| 编辑器 `DatabaseNodeContent` | 可编辑表格：增删列、改列名/类型、增删行、编辑单元格（按字段类型切换控件）——**本轮不实现（A8/A9 暂缓）**。schema 侧所需的领域操作已全部就位（含 `setFieldType`，见 §5.2） |
| 图标 | `lucide-react` 的 `Table`（或 `Database`） |
| 类型标签 | `Database`（`NODE_TYPE_LABELS`） |
| 快速面板（QuickPanel） | 建议新增 `database` 分组 tab（标签「数据」），或并入现有「集合」tab；至少出现在「全部」与「节点类型」里（`NODE_DATA_TYPES` 已自动包含） |

---

## 8. 全链路实现清单

按依赖顺序排列；每层改完即可 `pnpm --filter=<pkg> typecheck` 校验。

### A. 前端

| # | 文件 | 改动 |
| --- | --- | --- |
| A1 | `packages/interfaces/src/models/node/types.ts` | `ComplexNodeDataType` + `COMPLEX_NODE_DATA_TYPES` 加 `"database"` |
| A2 | `packages/interfaces/src/models/node/nodes/complex/database.ts` | **新建** 全部类型 + `DATABASE_FIELD_TYPES` 常量（字段类型的唯一真源，§3） |
| A3 | `packages/interfaces/src/models/node/nodes/complex/index.ts` | 导出新类型 + **值导出** `DATABASE_FIELD_TYPES` |
| A4 | `packages/interfaces/src/models/node/nodes/index.ts` | `ComplexNodeData` 联合 + `export type` + 值导出 `DATABASE_FIELD_TYPES` |
| A5 | `packages/hooks/src/useGraph.ts` | 导入 `DatabaseNodeData`；`onAddNode` 加 `case "database"`（默认 `content:{ fields:[], rows:[] }`） |
| A6 | `packages/ui/src/components/menu/node/dataType-list.tsx` | `NODE_TYPE_LABELS.database = "Database"` |
| A7 | `packages/ui/src/components/preview-block/preview-header.tsx` | `nodeTypeIcons.database = Table` |
| A8 | `packages/ui/src/components/dialog/editor/content/node-content-editor.tsx` | **本轮不实现**——不加 `case "database"`，落到既有 `default` 分支（显示 `Unsupported node type: database`） |
| A9 | `packages/ui/src/components/dialog/editor/content/database-node-content.tsx` | **本轮不实现**（待编辑器单独排期） |
| A10 | `packages/ui/src/components/preview-block/preview-block.tsx` | 路由 `case "database"` |
| A11 | `packages/ui/src/components/preview-block/previews/database-preview.tsx` | **新建** 预览 |
| A12 | `packages/ui/src/components/dialog/quick-panel/quick-panel.type.ts` | 新增/调整 database 分组 |
| A13 | `packages/dev/src/MOCK/demo-data.ts` | `DemoNodeSeed["nodeType"]` 联合加 `"database"`（可选加示例数据） |
| A14 | `packages/dev/src/MOCK/seed.ts` | `nodePayload` 加 `case "database"` |

**无需改动**：`packages/graph`（`nodeType` 透传）、`packages/utils`（`filter.ts` 的 nodeType 过滤与选项均派生自 `NODE_DATA_TYPES`）、`packages/store`（`uiStore.nodeType` 为泛型 `NodeDataType`）。

### B. 后端

| # | 文件 | 改动 |
| --- | --- | --- |
| B1 | `backend/domain/src/models/node/value-objects.ts` | `NodeType.validTypes` 加 `"database"`；新增 `DatabaseField/Option/Cell/Row/Content` VO + 校验；`DATABASE_FIELD_TYPES` / `DatabaseFieldType` / `DatabaseCellValue` 从 interfaces 引入后 re-export（不重复声明） |
| B2 | `backend/domain/src/models/node/entities.ts` | 新增 `DatabaseNode` 实体 + 结构变更方法 |
| B3 | `backend/domain/src/models/node/index.ts` | 导出 `DatabaseNode` + 新内容 VO（含值导出 `DATABASE_FIELD_TYPES`） |
| B4 | `backend/domain/src/repositories/index.ts` | `INodeRepository` 加 `findDatabaseNode`；导入 `DatabaseNode` |
| B5 | `backend/application/src/commands/node/command.ts` | 新增 `CreateDatabaseNodeCommand` + 并入 `CreateNodeCommand` |
| B6 | `backend/application/src/commands/node/node-command.service.ts` | `createNode` 加 `case "database"`；`updateNodeContent` 加 `DatabaseNode` 分支 |
| B7 | `backend/application/src/dto/node.dto.ts` | 新增 `DatabaseNodeDTO` + 并入 `NodeDTO` |
| B8 | `backend/application/src/dto/node-dto.mapper.ts` | `toNodeDTO` 加 `case "database"` |
| B9 | `backend/infrastructure/src/database/mappers/node.mapper.ts` | `DatabaseNodeRecord`（顶层 `fields` / `rows`，无 `content`）+ `VALID_NODE_TYPES` 加 `"database"` + `toDomain`/`toRecord` 在 `content` 与两列之间拆装；`mapDatabaseNode` 对两列为 `null` 的记录直接抛错（§10） |
| B10 | `backend/infrastructure/src/repositories/pocketbase-node.repository.ts` | 实现 `findDatabaseNode`；导入 `DatabaseNode` |
| B11 | `backend/adapter-back/src/dao/node.dao.ts` | `findDatabaseNode` + `findByNodeType` 联合加 `"database"` |
| B12 | `backend/adapter-front/src/trpc/router/node.ts` | `databaseContentSchema`（zod）+ `z.discriminatedUnion` 加 `nodeType:"database"` 分支；字段类型枚举用 `z.enum(DATABASE_FIELD_TYPES)`（不手抄），`number` 单元格用 `z.number().finite()` |

**已改动**：0 号脚本 `pb/pb_migrations/1700000000_initial_schema.js` 的 `nodes` 集合里加了 `fields` / `rows` 两个 JSON 列（无附加迁移、无新增迁移文件）。
**无需改动**：领域事件（`NodeCreated/Updated/Deleted` 已是泛型）。

---

## 9. 校验规则汇总

1. 字段 `id` 全局唯一（`fields` 内）；字段 `name` 非空。
2. `select` / `multiSelect` 必须有**非空** `options`；其余类型不要求带 `options`，但一旦带上就原样保留（避免整表往返丢数据）。
3. 任一字段的 `options` 内 `id` 唯一（非 select 类型携带的 `options` 同样检查）。
4. 行 `id` 全局唯一（`rows` 内）。
5. `cells` 的每个键必须对应存在的 `fieldId`；不能指向已删除字段。
6. `DatabaseCell.type` === 对应 `DatabaseField.type`。
7. `select` / `multiSelect` 的 `optionId` 必须命中字段 `options`。
8. `date` 为 ISO 8601 或 `null`；`url` 为合法 URL 或 `null`；`number` 为**有限数**或 `null`（`Infinity` 会被 `JSON.stringify` 写成 `null`，故必须拒绝）。
9. `relation` 的 `nodeIds` 为字符串数组（不强制校验目标存在性，前端渲染时对缺失目标降级为纯文本）。

> 以上规则全部由值对象与 `DatabaseContent.validate` 强制执行，**不依赖调用方**。规则 8 的 `date` / `url` 在 tRPC 的 zod schema 里复刻同一套正则（**不得比领域更严**，否则线上会拒掉领域能接受的值），`number` 的有限性两端各自校验（领域 `Number.isFinite` / zod `z.number().finite()`），字段类型枚举则由 `z.enum(DATABASE_FIELD_TYPES)` 直接派生。

---

## 10. 设计取舍与边界情况

- **软引用 vs 硬边**：`relation` 存 `NodeId[]` 而非自动建 `Edge`。理由：避免行级引用与边生命周期（删除节点时级联清理边）耦合；v1 简单可靠。后续可加「一键物化为边」。
- **行非节点**：行不入图、无独立 `NodeBase`。若未来需要「每一行都是可连边的实体」，应改为「database 节点 + 一组子节点」模型——那是另一个设计，v1 不做。
- **两列全量读写**：`fields` / `rows` 各是一整列 JSON，一次读写全量替换，与 `rich-text` 的 `referencedNodes` + `docs` 同构。表很大时（数千行）会有整包写放大，届时再引入行级分页存储。
- **主列隐式**：第一个 `text` 字段为显示列；空表或首个字段非 text 时回退「未命名」。
- **并发**：沿用 `NodeService` 的乐观 upsert（前端先写、后端落库）；行/列编辑走 `UpdateNodeCommand.content` 整体替换，不做行级并发。
- **不做老数据兼容（但空表是合法的）**：`fields` / `rows` 两列由 0 号脚本建表时一并创建，因此不存在「先有 database 记录、后有这两列」的历史数据需要迁移。两条入口的规则不同，这是有意的：
  - **创建入口（tRPC `add`）**：`content: { fields: [], rows: [] }` 是合法输入（§8 A5 的默认值就是空表），`DatabaseContent.fromData` 因此把缺省字段当作 `[]` 处理。
  - **记录入口（`NodeMapper.mapDatabaseNode`）**：`fields` / `rows` 为 `null` / `undefined` 时**直接抛错**，不再交给 `fromData` 兜成空表 —— 只有手工改库或绕过应用的 REST 直插才会出现这种记录，此时宁可报错也不静默变成空表。
  - 无论哪条入口，**JSON 内容本身被改坏（类型不符、字段悬空、选项不存在、`Infinity`）都会在构造时抛错**，不做 salvage。
- **坏记录会放大到整表查询**：`NodeMapper.toDomain` 抛出的错误会冒泡到 `findAll`，因此一条被手工改坏的 database 记录会让 `listByWorkspace` / QuickPanel / 种子幂等查询整体失败，而不是只跳过该条。这是「不 salvage」的必然代价，v1 接受。

---

## 11. 验收标准

- [x] `pnpm --filter=@workspace/interfaces typecheck` **无本次新增错误**（该命令整体退出码仍为 1，4 个既有错误见文末；`database` 已进入 `NODE_DATA_TYPES` 与 `COMPLEX_NODE_DATA_TYPES`）。
- [x] `packages/graph`、`packages/utils`、`packages/store` 零改动仍通过类型检查。
- [x] 后端各层 `pnpm typecheck`（domain/application/infrastructure/adapter-back/adapter-front）通过。
- [x] 领域不变量已用 tsx 实跑验证（15/15）：`Infinity` / `NaN` 的 `number` 单元格被拒；重复 `optionId` 被拒；`setFieldOptions` 清悬空选项（select → `null`，multiSelect 过滤保留）；`setFieldType` 只清该列并保留其它列、转成 select 未给 options 时抛错；`removeField` 级联；单元格往返 JSON 不产生 `{_value}` 包装。
- [x] 运行时导入形态已核对：`DATABASE_FIELD_TYPES` 走裸入口 `@workspace/interfaces`（domain）与 `@workspace/domain`（tRPC），在 tsx 下可解析；深子路径仅用于 `import type`（见文末既有问题）。
- [ ] 新建 database 节点 → 增删列/行、编辑单元格 → 刷新后数据保留（经 tRPC `add`/`update` 落库）——**依赖内容编辑器（A8/A9），本轮未验证**；本轮落库路径已由 demo 种子数据覆盖。
- [x] 悬停预览显示只读表格；relation 单元格正确回显被引节点标题（缺目标时降级为原始 id）。
- [x] `filter` 面板的「节点类型」下拉出现 `database`（`NODE_DATA_TYPES` 是硬编码数组，已手动补入，见 §3）。
- [x] **空目录全新初始化**：只给 `pocketbase` 二进制 + `pb_migrations/`、不带 `pb_data`，`migrate up` → `nodes` 表出现 `fields` / `rows` 两列，`_migrations` 记录 `1700000000_initial_schema.js`；重复 `migrate up` 为 no-op；`migrate down 1` 整库回滚（`nodes` 表消失）后再 `migrate up` 两列恢复。（已用一次性临时库重跑确认，含 `down` / 再 `up`。）
- [x] database 节点真实落库验证（在全新库上）：REST `POST /api/collections/nodes/records` 建 `{"nodeType":"database", fields:[…], rows:[…]}` → 返回体含 `fields` / `rows` 且 `content` 为 `null`；`sqlite3` 直读确认 `json_array_length(fields)=2`、`json_array_length(rows)=1`、`content is null`。
- [ ] **本地已存在的 `pb_data` 未重建**：上述落库/迁移验证都只在一次性新库上成立。当前 `pb/pb_data/data.db` 的 `nodes` 表**没有** `fields` / `rows` 列，而 `_migrations` 已记录 0 号脚本，按 §6 的「PB 只按文件名去重」规则这两列不会补上 —— 直接建 database 节点会报 unknown field，demo 种子里的 database 样例也会被 `seed.ts` 的 try/catch 吞成一条 `console.warn`。本地启用前须删掉 `pb/pb_data` 重启 PocketBase 重建。

### 与预期不符、需注意的既有问题（非本次改动引入）

- `@workspace/interfaces` typecheck 报 `complex/index.ts` 导出的 `RichTextBlock` / `BaseBlock` / `ReferenceBlock` 不存在——这三个类型全仓库无定义，属既有导出笔误。
- `packages/utils/src/filter.ts` 报 `Cannot find module '@workspace/interfaces'`；`@workspace/ui` 报大量 `@workspace/editor/...` 子路径解析失败——均为既有模块解析问题。
- `apps/server` 的 `pnpm typecheck` 也不通过，但**与本次改动无关**：它的 `tsconfig.json` 没有 `@workspace/interfaces` 的 `paths` 别名，而未改动的文件（如 `backend/application/src/dto/edge.dto.ts`）一直导入 `@workspace/interfaces/models/edge/types` 这类子路径；同时 `packages/interfaces` 的 `exports` 只发布 `.`/`./api`/`./common`/`./models`/`./nodes`，深子路径本就无法解析。加之 apps/server 没有 `check-types` 脚本，不在 `turbo run check-types` 覆盖范围内，故各层各自 `pnpm typecheck` 通过即可。
- **深层子路径只能用于 `import type`**（对后续实现 A8/A9 的人尤其重要）：各 `@workspace/*` 包的 `exports` 都只发布入口（`"."`），`tsc` 靠 tsconfig 的 `paths` 通配符能解析 `@workspace/interfaces/models/...`，但 **tsx / Node 运行时会抛 `ERR_PACKAGE_PATH_NOT_EXPORTED`**。所以运行时的**值**导入必须走裸入口（`@workspace/interfaces`、`@workspace/domain`），类型导入才可以写深路径（会被擦除）。本轮的 `DATABASE_FIELD_TYPES` 就走裸入口，`value-objects.ts` 里留了注释说明原因。
- `backend/infrastructure/package.json` 的 `dependencies` 里**没有** `@workspace/domain` / `@workspace/interfaces`，尽管源码在运行时值导入了 `@workspace/domain/models/node/value-objects`；`backend/infrastructure/node_modules/@workspace` 因此不存在，该包在 tsx 下无法加载（既有问题，非本次改动引入，也不在本轮范围内）。
