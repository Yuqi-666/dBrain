# 表格视图（Table DataView）设计文档

> 状态：**已实现**（`packages/dataview/src/views/table/`）
> 依赖：[README.md](./README.md)（DataView 组件形态）、../database-node-design.md（fields/rows 数据模型）
> 定位：核心视图，需全功能设计并优先实现

实现落点（与本文的对应关系）：

`views/table/` 按**职责分层**分目录，壳留在目录根部（它是 `registry.ts` 唯一引用的入口，
也对应其余六个视图的 `<name>-data-view.tsx` 命名）：

```
views/table/
├── table-data-view.tsx   # 壳：ListTable 生命周期 + 事件映射（唯一入口）
├── core/                 # 纯逻辑：无 React、只有 VTable 的「类型」依赖
├── canvas/               # 交给 VTable 画布的：主题与自定义渲染
├── toolbar/              # 工具条这一层
├── menus/                # 所有下拉菜单（含菜单间共用控件）
└── fields/               # 字段这一概念：元数据、选择器、编辑表单
```

| 分组      | 文件                           | 职责                                                                                                                                               |
| --------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| —（入口） | `table-data-view.tsx`          | ListTable 生命周期、事件映射、写回（§7）；视图根与画布容器 `overflow-hidden`（§8 第 12 条，防尺寸回流抖动）                                        |
| core      | `core/schema.ts`               | fields→columns（含编组）、rows→records、编辑值→DatabaseCell、列自愈、填色查找表、字段 reconcile（§3.1/§3.2/§4.3）                                  |
| core      | `core/column-ops.ts`           | 字段配置的纯操作：拖动改序、建组/入组/解散、显示隐藏、增字段/删字段（§5.3）                                                                        |
| core      | `core/editors.ts`              | 只有就地编辑的两类：input（text/number/url）与 date。**单选/多选不再有 VTable 编辑器**（§3.1/§5.8/§8.3）                                           |
| core      | `core/filter.ts`               | `config.filterState` 的运行时形状（条件列表）与旧格式迁移、条件求值（§5.4）                                                                        |
| canvas    | `canvas/theme.ts`              | themeTokens → VTable `ITableThemeDefine`（§8.5）                                                                                                   |
| canvas    | `canvas/pill.ts`               | 单选/多选胶囊单元格：画布文本测量、胶囊布局、`contrastTextColor`，以及选中态的「×」/ 单元格末端 chevron 图标（§5.8/§8.8/§8.13）                    |
| toolbar   | `toolbar/toolbar.tsx`          | 视图工具栏：配置靠左（添加记录/字段配置/筛选/分组/排序/行高/填色）、功能靠右（行数/导出/搜索/更多），搜索栏另起一行（§5，shadcn 组件，见 §8.6）    |
| toolbar   | `toolbar/search-bar.tsx`       | 工具条下方那一行搜索输入栏（「搜索」按钮按下才出现）：输入框 + 匹配计数 + 上/下一个 + 关闭；回车跳转、Esc 关闭（且不会连带关掉所在的弹窗，§5.3.1） |
| menus     | `menus/field-menu.tsx`         | **字段配置** 下拉：搜索、字段列表、可折叠编组块、拖动、隐藏、更多菜单、新增字段、创建编组就地命名（§5.3/§8.11）                                    |
| menus     | `menus/filter-menu.tsx`        | **筛选** 下拉：条件列表 + 添加条件（§5.4）                                                                                                         |
| menus     | `menus/color-menu.tsx`         | **填色** 下拉：颜色 + 范围（单元格/行/列）+ 条件（§5.4）                                                                                           |
| menus     | `menus/select-menu.tsx`        | 单选/多选选项下拉：`查找或创建选项` 搜索框 + 选项胶囊列表 + 创建行；单选选后关闭、多选保持打开（§5.8）                                             |
| menus     | `menus/condition-controls.tsx` | 筛选 / 填色共用的条件值输入（类型感知）。`字段 + 方向` 那一行两个视图都要用，已移到 `shared/condition-menu.tsx`                                    |
| shared    | `shared/condition-menu.tsx`    | **分组** / **排序** 下拉（字段 + 方向，多级）；看板的排序是同一个组件（§5.4）                                                                      |
| shared    | `shared/field-picker.tsx`      | 带搜索的字段选择下拉（筛选/分组/排序/填色 + 看板排序共用）                                                                                         |

依赖方向在目录内是单向的：`menus/` 可以引 `core/`、`canvas/` 与 `shared/`，`core/` 在目录内只引
`canvas/`，`canvas/` 只引 `shared/field-meta.tsx`（取色板与图标）；**没有任何文件反向引
`table-data-view.tsx`**——壳只做装配。（目录外只有三处：`core/schema.ts` 引 `source/cell-resolver`，
`canvas/theme.ts` 引 `shared/theme-tokens`，`toolbar/toolbar.tsx` 引 `toolbar/view-actions`。）
`core/` 与 `canvas/` 的 6 个文件不 import React，是纯函数或纯数据；只有 `menus/`、`fields/`、
`toolbar/` 和壳是 `.tsx` 组件。

表格**没有** `config-editor.tsx`：七个配置控件都已有专属下拉菜单，因此不注册 `configEditor`，
工具栏里也没有「视图配置」兜底弹层（README §8.1）。随之删除的还有 `TableViewConfig.rowLimit`
（渲染上限）——它只在弹层里有入口，却会静默截断渲染，是「点了添加记录却看不到新行」的根因。

尚未实现（见 §9「边界与取舍」与 §10 任务清单）：以行为单位的 relation 选择器、PivotTable 透视模式、行拖拽之外的批量改字段、`format.dateFormat` / `format.numberFormat`、`cellTypeOverride` 的配置入口、编组的嵌套（编组套编组）、行为开关/主题/行号的 UI 入口（`editable` / `selectable` / `sortable` / `filterable` / `resizable` / `reorderable` / `groupable` / `theme` / `showRowNumber` 目前只在默认配置里设定，其中隐藏列与冻结列仍可由列头右键菜单写回）。

---

## 1. 概述与使用场景

表格视图是 DataView 的**默认与核心视图**，用高性能二维表完整展示 fields + rows，并提供行/列级编辑与操作。它是 database 节点的「原生」形态，也用于 collection 的节点属性投影表。

使用场景：

- database 节点：新增/编辑字段、新增/删除/编辑记录行、查看全部列数据。
- collection 节点：只读浏览被选中节点的属性表（标题/类型/标签/时间等），点击行打开节点。
- 数据维护：批量选择行后删除、改字段值、导出。
- 数据检查：排序、筛选、分组、冻结列、聚合（计数/求和）快速核对数据。

---

## 2. 技术选型

采用 **@visactor/vtable**（VRender Canvas 引擎，百万级流畅渲染），二次开发整合周边能力。

| 包                       | 用途                                              |
| ------------------------ | ------------------------------------------------- |
| @visactor/vtable         | 核心：ListTable（主表）、PivotTable（透视，可选） |
| @visactor/vtable-editors | 单元格编辑器（输入框、日期选择、下拉、复选）      |
| @visactor/vtable-export  | 导出 Excel / CSV                                  |
| @visactor/vtable-search  | 搜索高亮                                          |
| @visactor/vtable-plugins | 官方插件集（可选：行号、冻结、图标等）            |
| @visactor/react-vtable   | React 封装（可选，见 §7 取舍）                    |

> 优先用 VTable 命令式实例 + React 生命周期封装（与 graph 的 ForceGraph 封装模式一致），不强制依赖 react-vtable，便于精细控制事件与资源释放。

---

## 3. 数据转换适配

### 3.1 fields → columns

每个 DatabaseField 映射为 ListTable 的 ColumnDefine；cellType 由字段类型决定（见下表），其余（width、title、冻结、可见性）来自视图 config。

| DatabaseFieldType | VTable cellType       | 显示值                          | 编辑控件                                       |
| ----------------- | --------------------- | ------------------------------- | ---------------------------------------------- |
| text              | text                  | 原文                            | input                                          |
| number            | text（number 格式化） | 数字/空                         | number input                                   |
| select            | text                  | option.name（按 optionId 解析） | **胶囊 + 选项下拉**（`menus/select-menu.tsx`） |
| multiSelect       | text                  | option.name 逗号拼接            | **胶囊 + 选项下拉（多选不关闭）**              |
| date              | text（ISO 格式化）    | 本地化日期                      | 日期选择器                                     |
| checkbox          | checkbox              | 勾选态                          | 原生 checkbox                                  |
| url               | link                  | 链接（可点击）                  | input（URL 校验）                              |
| relation          | link / text           | 被引节点标题（缺失降级 id）     | 节点选择器（弹层，可选 v1 只读）               |

单选/多选的两列**不挂 `editor`**：`ListTable.getEditor()` 只回落到 `define.editor ?? options.editor`（表里
没有第二套「按 cellType 兜底」的分支，`options.editor` 本视图从不设置），所以 `createTableEditor()` 返回
`undefined` 就等于「双击不进入就地编辑」——这正是想要的：这两种类型的值是一组彩色选项，交给 §5.8 的下拉。

### 3.2 rows → records

```ts
// packages/dataview/src/views/table/core/schema.ts
export function rowsToRecords(
  source: DataViewSource,
): Record<string, unknown>[] {
  return source.rows.map((row) => {
    const rec: Record<string, unknown> = { __rowId: row.id };
    for (const f of source.fields) {
      rec[f.id] = CellResolver.displayScalar(
        row.cells[f.id],
        f,
        resolveNodeTitle,
      );
    }
    return rec;
  });
}

// 单元格编辑回写：table 事件给出 { col, row, value } → 还原 DatabaseCell
export function valueToCell(
  field: DatabaseField,
  value: unknown,
): DatabaseCell {
  switch (field.type) {
    case "text":
      return { type: "text", text: String(value ?? "") };
    case "number":
      return {
        type: "number",
        number: value === "" || value == null ? null : Number(value),
      };
    case "select":
      return { type: "select", optionId: value ? String(value) : null };
    case "multiSelect":
      return { type: "multiSelect", optionIds: (value as string[]) ?? [] };
    case "date":
      return { type: "date", date: value ? String(value) : null };
    case "checkbox":
      return { type: "checkbox", checked: Boolean(value) };
    case "url":
      return { type: "url", url: value ? String(value) : null };
    case "relation":
      return { type: "relation", nodeIds: (value as string[]) ?? [] };
  }
}
```

- 隐藏的 \_\_rowId 列承载 DatabaseRow.id，不参与显示与编辑；排序/筛选/选择都经它回到源行。
- 编辑校验复用 database-node-design.md §4 的字段类型校验规则（number 必须有限数、select optionId 必须命中 options 等）；非法输入不进 store，就地提示。

### 3.3 collection 投影（只读）

collection 场景 rows 来自节点属性投影（见 README §4.2），字段为固定 schema；表格只读（readOnly），relation 类字段（**semantic）显示语义名称，行点击经**rowId → nodeIds 索引触发 onOpenNode。

---

## 4. 配置项（TableViewConfig）

```ts
export interface TableViewConfig {
  // —— 列 ——
  columns: TableColumnConfig[]; // 显式列配置（顺序、可见、宽度、冻结）
  hiddenFieldIds?: string[]; // 快捷隐藏（与 columns 互补，表头右键菜单写这个）
  columnGroups?: TableColumnGroup[]; // 命名的列编组（字段配置 → 创建编组）

  // —— 行为 ——
  editable: boolean; // 是否可编辑（collection 恒 false）
  selectable: boolean; // 是否可多选
  sortable: boolean; // 是否允许点击表头排序
  filterable: boolean; // 是否显示列筛选
  resizable: boolean; // 列宽拖拽
  reorderable: boolean; // 列拖拽排序
  groupable: boolean; // 是否允许拖拽分组

  // —— 呈现 ——
  density: "compact" | "comfortable" | "spacious"; // 行高：低 / 中等 / 高
  frozenColumnCount: number; // 冻结列数（默认 1：主列）
  showRowNumber: boolean; // 行号
  theme: "light" | "dark" | "auto"; // 主题（默认跟随）

  // —— 排序 / 筛选 / 分组 / 填色（工具条菜单直接写回） ——
  sortState?: TableCondition[]; // 多级排序（分组层级排在最前）
  autoSort?: boolean; // 自动排序：数据变化后是否重新应用 sortState
  filterState?: TableFilterCondition[]; // 筛选条件列表（AND）
  groupBy?: string[]; // 分组字段 id（顺序即层级）
  groupOrder?: Record<string, "asc" | "desc">; // 每个分组层级的方向
  colorRules?: TableColorRule[]; // 填色条件
}

export interface TableColumnConfig {
  fieldId: string;
  width?: number;
  visible: boolean;
  frozen?: boolean;
  cellTypeOverride?: VTableCellType; // 覆盖默认 cellType（如把 number 渲染成 progressbar）
  format?: {
    // 显示格式
    dateFormat?: string; // 日期格式
    numberFormat?: string; // 数字格式
    emptyText?: string; // 空值占位
  };
}

export interface TableColumnGroup {
  id: string;
  name: string;
  fieldIds: string[]; // 成员字段（顺序即组内顺序）
}

export interface TableFilterCondition {
  id: string;
  fieldId: string;
  operator: "contains" | "equals" | "empty" | "notEmpty";
  value?: string;
}

export interface TableColorRule {
  id: string;
  target: "cell" | "row" | "column"; // 填色范围
  fieldId: string; // 条件字段（cell 时也是被填色的列）
  operator: "contains" | "equals" | "empty" | "notEmpty";
  value?: string;
  color: string; // 固定色板中的 hex
}
```

默认配置（defaultConfig）规则：columns 按 fields 顺序生成、主列（首个 text 字段）冻结、density comfortable、autoSort true。渲染不再有上限：ListTable 自身虚拟滚动，任何"看不见的行"都只来自筛选或分组。

### 4.1 编组与列序的唯一来源

`config.columns` 仍是**唯一**的顺序来源；`columnGroups` 只是「哪些字段共享一个表头」的声明。
渲染时按 `orderColumnsByGroups` 把每个编组的成员**收拢到该编组首个成员的位置**，形成连续的组头
块；`buildFieldMenuEntries` 也用同一投影生成字段配置列表。因此不存在「列序两处维护」的问题，
拖动列头或拖动字段行后写回的都只有 `config.columns`（外加编组归属）。

编组自愈：字段被删除、或同一字段被两个编组声明（先到先得）、或编组为空时，`validColumnGroups`
直接过滤掉，不写回也不报错。

### 4.2 填色的求值方式

`buildColorLookup(records, colorRules, fields)` 先在渲染前把规则算成三张查找表
（`rowColors` / `cellColors` / `columnColors`），列的 `style` 回调只做一次记录查找 ——
VTable 明确要求 style 回调保持廉价，不能在其中做重计算。

优先级：单元格规则 > 行规则 > 列规则。`target: "column"` 的语义是「该字段列在至少一行命中条件时
整列着色」，即一个由数据驱动的条件列高亮。

被填色的单元格同时会拿到一个**对比色文字**（`contrastTextColor`，按背景亮度选深/浅）：色板是固定
浅色调，而文字色来自主题，二者只有从背景推导才在浅色/深色主题下都可读。

### 4.3 字段变更的单元格 reconcile

`reconcileRowsForFields(rows, nextFields, seed?)` 是 schema 写回的配套纯函数：

- 删除字段 → 丢掉该字段的所有单元格（域对象 `DatabaseContent` 会拒绝孤儿字段键）；
- 改类型 / 缩减选项 → 丢掉类型不符或指向已删选项的单元格（改类型会清空该列，字段编辑器会提示）；
- `seed`（默认值）→ 只补进「该字段还没有值」的行；
- 没有任何变化时返回**同一个数组**，让调用方据此决定是否需要连 rows 一起写回。

---

## 5. 功能点（全功能清单）

### 5.1 基础展示

- 列头：字段名 + 类型图标；主列高亮。
- 单元格按类型渲染（8 种字段类型全覆盖，含 checkbox/url/relation 链接）。
- 行号、斑马纹、悬停高亮、选中高亮。
- 空值占位（默认 —，可配 emptyText）。

### 5.2 行操作

- 添加记录（database：空行追加，主列待填；工具条「添加记录」，即旧称「新增行」）。
- 删除行（单选/多选）：单元格右键菜单 →「删除此行」/「删除选中的 N 行」（第 5 轮起删除入口从
  工具条移到右键菜单：随选中出现的按钮会让功能区的控件跳位）。当前**没有**二次确认。
- 行内编辑：双击进入编辑，Enter 提交、Esc 取消、Tab 横向移动。
- 拖拽行排序（database：写回 rows 顺序）。

### 5.3 列操作

- 列宽拖拽、列拖拽重排、列隐藏/显示、冻结列、列头右键菜单。
- **新增字段 / 编辑字段 / 删除字段**（database 宿主）：
  - 入口一：表格**列末的「+」列**（一个 44px 的合成列，`TABLE_ADD_FIELD_COLUMN_ID`，表头用
    `headerCustomRender` 画一个**裸「+」**——没有底色、没有描边，整个表头格就是热区。它不是真实
    字段，所有列序/导出读取都会跳过它；导出时用 `formatExportOutput` 置空）。点击表头即打开
    **锚定在该「+」上的**新增字段下拉。
  - 入口二：工具条 **字段配置** 下拉底部的「新增字段」。
  - **字段编辑是下拉菜单的内容**（`FieldEditorMenuContent`），标题随场景显示「新增字段 / 编辑字段」，
    内容是 **标题 / 字段类型 / 选项内容 / 默认值**。三个入口都是**真实的 shadcn `DropdownMenu`**，
    面板位置一律由菜单原语（Radix popper）决定，代码里不出现任何坐标计算：
    - 字段行「…」→ **菜单开在按钮右侧**（`side="right" align="start"`，`sideOffset=4`）；
      点「编辑字段」时面板**不关闭**（`onSelect` 里 `preventDefault()`），而是把菜单主体从菜单项
      换成编辑表单 —— 所以表单出现在**刚才那个「选项菜单」的位置**（同一面板、同一锚点）。
    - 字段配置底部「新增字段」→ 自己的 `DropdownMenu`，触发器就是这个按钮（面板贴在按钮下方）。
    - 列末「+」→ 同一个「新增字段」菜单，但触发器是**一个放在画布「+」方格矩形上的隐形元素**
      （`createPortal` 到 body 的 `position: fixed` 空 span）。画布上没有 DOM 节点可以挂菜单，
      所以只有这个触发器需要矩形；**面板本身仍然由菜单原语定位**（`align="end"`，
      `right = 锚点 right`、`top = 锚点 bottom + 4`）。这个矩形必须来自
      `table.getCellRelativeRect(col,row)`（**视口**坐标），不能用 `getCellRect`——后者是表格自身
      未滚动坐标系里的位置，「+」列又只会在横向滚到最右时才可见，于是锚点会整整偏出 `scrollLeft`
      （第 9 轮反馈实测：`scrollLeft=436` 时「+」方格在 x≈890，锚点却报 1317，面板被 Radix 的碰撞
      检测推到窗口右边而不是按钮下方）。
  - 面板打开期间 **字段配置列表保持打开**（下拉菜单是模态层，列表此时不可点、也不被关闭）；
    点「取消」只关编辑、点画布/别处则连「…」菜单一起关。
  - 表单不是菜单：Radix 只在**内容节点自身**获得焦点时才拦截方向键，typeahead 也只在自己的
    `[role=menuitem]` 项之间跳（这个面板里没有），所以输入、Tab、方向键都是正常表单行为。
    打开时用 `onOpenAutoFocus` 阻止菜单抢焦点（该 prop Radix 支持但公开类型里被剥掉了，见
    `KEEP_FORM_FOCUS` 的注释），另有一帧 `requestAnimationFrame` 兜底把光标放回「标题」输入框
    （菜单项被换掉时 `onItemLeave` 会把焦点收回内容节点）。
  - 选项内容支持**拖动改序**、逐项配色（圆形色点 + 固定色板）、删除；select / multiSelect 至少
    需要一个命名选项才能提交（域对象会拒绝空选项表）。
  - 默认值在提交时写入「该字段还没有值」的行（一次 `onFieldsChange(fields, rows)` 原子写回）；
    **当整张表一行都没有时，新增字段会顺带建一条空记录**（否则只有表头、看不见任何可录入的行）。
- **字段配置下拉**（`menus/field-menu.tsx`）：顶部搜索、字段列表、底部新增字段。
  - 字段行：拖动手柄（改序 + 拖到别的字段行/编组头即入组）、类型图标、名称、眼睛（隐藏/显示）、「…」菜单。
  - 「…」菜单：编辑字段 / 创建编组 / 加入编组（已有编组时）/ 移出编组 / 删除字段，
    开在「…」按钮**右侧**（`side="right" align="start"`）—— 字段列表只有 288px 宽，开在左侧会盖住
    它正在描述的那一行。
  - **编组是一个带边框的块**：组头（折叠箭头 + 文件夹图标 + 名称 + 成员数 + 眼睛 + 「…」）在上，
    成员行缩进在块内；折叠箭头可收起整组（搜索命中时自动展开）。
  - 「…」里的 **创建编组会立刻进入命名**：新组创建后直接在块内展开重命名输入框，输入框**自动获得焦点
    并全选默认名**（`createGroupWithField` 同时返回新组），直接打字就改名，不需要再去找「重命名编组」；
    组头「…」里的重命名走同一条路径（同样自动聚焦 + 全选）。命名中回车提交、Esc 只**取消命名**
    （字段配置面板保持打开）；两条路径结束后焦点都回到组头的「…」按钮。
  - 删除是**两次确认**：在字段行下方就地出现一条确认条（「删除「X」？该列数据一并清除。」）。
  - 搜索**过滤**列表（不是置灰）：编组名命中则整组显示，否则只显示命中的成员。
- 写回路径：字段变更由渲染器算好「新 fields（+ 必要时新 rows）」，通过 `onFieldsChange` 冒泡，
  宿主 `database-node-content` 用一次 `NodeService.upsert` 落库。表格自己从不调用 store。

### 5.3.1 视图工具栏布局

设计变更（`docs/propmt/dataview-table-1.md` §toolbar）后，表格的工具条就是**视图工具栏**，
布局契约：**配置靠左、功能靠右**，一律「按钮 + 下拉菜单」。

| 位置       | 控件                                                   |
| ---------- | ------------------------------------------------------ |
| 左（配置） | 添加记录 · 字段配置 · 筛选 · 分组 · 排序 · 行高 · 填色 |
| 右（功能） | 导出 · 搜索 · 更多（设为默认/复制/删除视图）           |

- **视图级操作（更多）在这一行，不在上方的视图页签条里**（第 5 轮设计变更）：页签条只负责导航
  （页签 + 新建视图），「设为默认视图 / 复制视图 / 删除视图」由 `DataViewRoot` 生成、通过
  `toolbar/view-actions.tsx` 的槽位 context 交给**当前渲染器的工具条**渲染。表格的 `TableToolbar`
  与共享 `ViewToolbar` 都会取用，所以六个占位视图（仍用 `ViewToolbar`）也自动带上它，而渲染器
  props 契约不必多一个 ReactNode。宿主不传 `onViewsChange` 时槽位是 `undefined`，菜单不渲染。
- **搜索只剩一个按钮**，输入栏在工具条**下方单独一行**（`TableSearchBar`，`bg-muted/40` 的一条
  窄行）：输入框 + `1/2` 匹配计数 + 上一个/下一个 + 关闭；回车跳下一处、Shift+回车上一处、Esc 关闭。
  关闭会**同时清空查询**，否则高亮会留在表里而没有任何输入框能清掉它。搜索本身仍是
  `@visactor/vtable-search`（`skipHeader`、`autoJump`），查询状态在 `TableDataView`。
- **Esc 属于搜索栏，不属于它所在的弹窗**：表格是在节点编辑器的 `Dialog` 里编辑的，而 Radix 的
  可关闭层是在 `document` 的**捕获阶段**听 `keydown` 并在未被 `preventDefault` 时关掉自己——它比
  这一行先注册，所以输入框上的处理函数（React 的监听器在根容器上，晚于 `document` 捕获）拦不住它
  （第 10 轮反馈实测：Esc 把整个节点编辑器关掉了）。`window` 捕获是链路上唯一更早的位置，因此
  由 `TableSearchBar` 自己挂一个 `window` 捕获监听：只有按键目标是这一行内部时才 `preventDefault`
  并关闭搜索栏，弹窗留在原地（在搜索栏里按第二次 Esc 才关弹窗）。焦点在这一行的按钮上时同样关闭，
  而焦点在别处（比如打开着的菜单里）时按键保持原义。
- **按键不一定到得了页面，所以关闭搜索栏有三条路径**：① `window` 捕获（`keydown` + `keyup`，
  `key` 或 `code` 命中即可）；② 输入框自己的 React `onKeyDown`（捕获监听没跑到时的兜底）；
  ③ **没有落点的失焦**（`focusout` 的 `relatedTarget` 为 `null`，且此前 ~300ms 内没有 `pointerdown`）。
  第 ③ 条不是冗余：第 10 轮实测用户环境里「菜单按 Esc 会关、搜索框按 Esc 我们的 `window` 监听
  一条日志都收不到、只有光标离开了输入框」——这是键盘类浏览器扩展的 insert 模式（Vimium 等）、
  某些输入法或宿主在**文本框聚焦时**吞掉 Escape 的典型特征，页面只观察得到「光标被丢下」。
  点击永远有落点（画布 / 行号列的焦点控件 / 某个按钮），所以点选表格各处仍不会关掉搜索栏。

- 行高是下拉菜单，三档按设计文档的中文命名显示为 **低 / 中等 / 高**（持久化枚举保持
  `compact | comfortable | spacious`，只改文案）。
- **分组 / 排序的触发器与看板一致**（第 6 轮）：中性 outline 按钮，读作 `[图标] 分组 <字段名>`，
  字段名用 `text-foreground`（多级时补一个 `+N`），**不带 primary 高亮、也不带数量徽标** ——
  高亮与徽标只说「设了东西」却不说设了什么，而看板那两个按钮本来就是「图标 + 字段名」。
  图标也用同一套（分组 `Columns3`、排序 `ArrowUpDown`）。
- **四个条件面板有标题行**（本轮补回）：筛选 / 分组 / 排序 / 填色 打开就是 `设置…条件`，
  `清除`（筛选 / 填色是 `清除全部`）放在同一行右侧，排序面板的 **自动排序** 开关在标题与
  `清除` 之间。标题行是「这个面板叫什么」的铬件，不是解释；面板里的 hint 段落仍然不写
  （第 6 轮），只保留空态/禁用态提示（「先添加字段，才能设置条件。」）。行高 / 导出 /
  新建视图仍然没有标题 —— 它们的触发器本身就是标题。
- **排序面板写的是 `config.sortState`，而表格不会因排序重建**（`structureKey` 故意不含排序），
  所以壳里有一个以**序列化后的排序状态**为 key 的 effect 调 `table.updateSortState(next, true)`
  把它推进活的 VTable（顺序无关的等价写入是 no-op；`persistSortState` 会把已经生效的状态记为
  「已应用」，因此表头点击的 `after_sort` 不会被再推回去）。没有这个 effect 时，排序面板看起来
  在写、行序却纹丝不动。
- 排序菜单右上角是 **自动排序** 开关（`config.autoSort`）：关闭后数据变化不再重新应用
  `sortState`，VTable 保留自身排序态。
- 排序/分组菜单里的方向开关**按字段类型取名**：select → 选项顺序/选项倒序，number → 1→9/9→1，
  date → 最早优先/最晚优先，其余 → A→Z/Z→A。
- **没有「视图配置」兜底弹层**：七个配置控件都有专属菜单，表格因此不注册 `configEditor`。
  行为开关（`editable` / `selectable` / …）与 `theme` / `showRowNumber` 保持默认配置，
  隐藏列与冻结列仍可由列头右键菜单写回（`hiddenFieldIds` / `frozenColumnCount`）。
- **工具条永远只有一行**：外层是 `flex`（不换行），左组 `flex-1 min-w-0 flex-wrap`（**内部**换行），
  右组 `h-7 shrink-0`（贴右、顶部对齐）。这样右组按钮的 y 恒定、x 只随宽度单调移动；如果让整条
  `flex-wrap`（早期做法），右组会在线 1 / 线 2 之间来回跳 —— 窗口宽度在阈值附近拖动、或右侧多出
  「删除 N 行」时，右组按钮会**反复跳位**。左组换行时工具条变高，只有表格变矮。
- **这条「左组换行 → 表格变矮」的链路必须只有一个方向**：表格盒子（`flex-1 min-h-0`）的尺寸来自外层，
  而外层（外壳的渲染器盒子）**不能是可滚动的** —— 否则表格自己的 1px 取整溢出会换来 10px 的滚动条、
  再把宽度和高度各吃掉 10px，工具条因此在更窄的宽度下多折一行，形成闭环并把整条工具栏连同表格一起抖起来
  （第 7 轮反馈的根因，见 §8 第 12 条）。
- **右组里每个控件的尺寸都必须是固定的，且不能随瞬时状态出现/消失**（第 5 轮补的硬规则）。
  在一个右对齐的 flex 行里，第 k 个元素的 x 只由**它自己与它右侧**元素的宽度决定
  （`x_k = 右缘 − Σ_{i≥k} w_i − 间隙`），所以：一个宽度会变、或会突然出现的控件，会把它自己
  以及它**左侧**的邻居一起推开。旧版右组里正好有两个这样的控件——「删除 N 行」（随选中行数出现，
  标签宽度还随位数变）和搜索结果框（`w-56` 固定，但里面的匹配计数/上一下一/清除按钮随每次按键
  出现与伸缩，输入文本区一帧内从 200px 跳到 99px、再在 `1/1` 与 `无结果` 之间抖 18px）。
  于是「选中表格元素」和「在搜索框打字」这两个高频动作都会让整条功能区跳位。现在：删除行移入
  单元格右键菜单（见 §6），搜索框移出到下方单独一行，右组只剩 `行数/列数`（最左，宽度变化只
  向左侧空白扩展）、`导出`、`搜索`、`更多` 四个固定尺寸控件。
- 下拉菜单内不放空占位块：没有条件时只显示底部 **添加条件**（分组/排序/筛选/填色一致），
  有条件时才在右上角出现 `清除`（分组/排序）或 `清除全部`（筛选/填色）；四个面板的标题行
  （`设置…条件`）本轮补回 —— 说明性的 hint 段落仍然没有（第 6 轮）。
  字段选择器未选字段时显示 **选择字段**，并在选中前保持该条件不生效。面板本身要显式写 `gap-0`：
  shadcn 的 `PopoverContent` 自带 `gap-4`，会和 `mb-2` / `mt-2` 叠加成一道 24px 的缝。
- 表里**一个字段都没有**时，筛选/分组/排序菜单里不再放一个点不动的「添加条件」（`disabled` 的 ghost
  按钮看起来仍是可点的），而是直接显示「先添加字段，才能设置条件。」。
- 表格最后一列是合成的 **「+」列**（`TABLE_ADD_FIELD_COLUMN_ID`，44px，表头用
  `headerCustomRender` 画一个圆角「+」按钮），点击即从该按钮弹出 **新增字段** 下拉；字段配置菜单底部
  也有同一个入口。只读宿主（collection）不渲染该列。

### 5.4 排序 / 筛选 / 分组 / 聚合

- 点击表头排序（单列切换 asc/desc，可多列叠加），并写回 `config.sortState`。
- **排序面板**（与看板同一个 `shared/condition-menu.tsx`）：`字段 + 方向` 条件行可多级、可拖动
  排优先级，写的是同一个 `config.sortState`。因为 `structureKey` 故意不含排序（排序不该重建表格），
  壳里有一个 effect 以**序列化后的排序状态**为 key 调 `table.updateSortState(next, true)`：配置是
  唯一来源，等价写入是 no-op，`persistSortState` 会把已生效的状态记为「已应用」所以表头点击
  （`after_sort`）不会被立刻推回去。缺了这一步，面板写得进去、行序却不动（本轮修的 bug）。
- 筛选菜单：**条件列表**（字段 + 运算符 + 值，全部 AND），操作符 `包含 / 等于 / 为空 / 不为空`；
  值输入按字段类型切换（select/multiSelect → 选项下拉，checkbox → 是/否，其余 → 文本）。
  `readFilterState` 同时接受旧格式 `{ [fieldId]: { operator, value } }` 并在读取时迁移，
  已存在的视图不会因为改版丢筛选。**`fieldId: ""` 是合法值**：它是「添加条件」刚生成、还没选字段
  的那一行；早期版本把它当"不可用条件"丢掉，于是刚加的行在下次读取时消失 —— 点击「添加条件」
  看起来毫无反应（bug 已修，见 §10 第 4 轮）。
- 多级分组：`groupBy` 顺序即层级，`groupOrder` 给出每层方向；渲染时把分组层级作为
  VTable 排序的前缀（`buildVTableSortState`），这样组头顺序才跟方向一致；回写时再把分组层级
  从 `sortState` 里剔除，避免两处状态互相污染。
- 聚合：数字列底部合计/平均/计数（可选），分组内小计 —— **尚未实现**。
- 搜索高亮（vtable-search）：工具条右侧只有一个「搜索」按钮，按下后**在工具条下方**出现输入栏
  （`TableSearchBar`），输入即高亮并跳到第一处匹配，回车/上一下一在匹配之间跳转。

### 5.5 选择与批量

- 行复选（checkbox 列）、Shift/Ctrl 范围选择。
- 删除：**单元格右键菜单**里的「删除此行」/「删除选中的 N 行」（右键落在选区里就作用整个选区，
  否则只删这一行）。早期入口是工具条上随选中出现的「删除 N 行」按钮，它会让右组跳位，已按第 5 轮
  反馈移除。因此选择本身**不驱动任何 React 状态**：拖动选区时不再有 `setSelectedCount` 之类的重渲染。
- 批量改字段（统一赋值）、导出选中行 —— **尚未实现**。

### 5.6 导出

- 导出当前视图（含排序/筛选/分组后的结果）为 CSV / Excel（vtable-export）。

### 5.7 与图谱联动（collection）

- 点击 relation 单元格 / 行 → onOpenNode 打开图谱节点。
- 行悬停可触发节点高亮（可选，接入 eventHandler）。

### 5.8 单选 / 多选：胶囊与选项下拉（第 8 轮反馈）

值在单元格里是**彩色胶囊**，编辑在**下拉**里完成，两者都不依赖 VTable 的单元格编辑器：

1. **点一下单元格 = 选中它。** 该格的每个胶囊右端出现「×」（点它删掉这一个选项），单元格右端出现
   chevron。这是画布绘制的：`customRender` 在 `isSelectCellActive(fieldId,rowId)` 为真时多画两个
   `icon` 元素，它们的 `name` 分别是 `dv_pill_remove:<optionId>` 与 `dv_pill_open`。
2. **再点一下单元格（或点 chevron）= 打开选项下拉。** 面板锚定在该单元格正下方，顶部是
   `查找或创建选项` 输入框（输入即过滤列表），下面是选项列表——每行就是该选项的胶囊，当前值带勾选标记，
   第一行默认高亮（cmdk 的 roving highlight，鼠标划过即跟随）。
3. **单选选完即关；多选选完保持打开**，并把光标交回搜索框，方便连续多选。`Enter` 选中高亮项、
   `↑/↓` 移动、`Esc` 关闭。
4. **输入一个不存在的名字**会出现 `+ 创建「xxx」` 行：该名字同时写进字段的 `options` 与当前单元格
   （database 宿主；collection 只读没有这一行，占位文案退化成「查找选项」）。

空单元格同样可以点：此时胶囊还没有，只有 `—` 占位和 chevron，点第二下就能选第一个值。

**关闭时面板停在原地淡出**（第 9 轮反馈）：Radix 在退场动画期间仍然挂着内容，而隐形触发器只在
request 存活时渲染——两者一起卸载时 floating-ui 量到的是一个已经脱离文档的节点（四边全 0），面板会先
闪到页面左上角再消失（实测：单选面板从 `588,231` 跳到 `0,0` 停留约 130ms）。两个面板因此都把**最后一次
的锚点矩形留在 ref 里**，让触发器（以及面板）在整段淡出期间待在原处（见 §8 第 16 条）。

---

## 6. 交互与操作方法

| 操作      | 手势/入口                             | 结果                                                                                            |
| --------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 切换排序  | 点击列头 / 列头右键菜单 / 排序菜单    | 单列 asc/desc                                                                                   |
| 多列排序  | Shift+点击列头                        | 追加排序列                                                                                      |
| 进入编辑  | 双击单元格                            | 对应编辑器（单选/多选除外，见下两行）                                                           |
| 提交/取消 | Enter / Esc                           | 写回或放弃                                                                                      |
| 移动编辑  | Tab / Shift+Tab                       | 横向移动                                                                                        |
| 新增记录  | 工具条「添加记录」                    | 追加空行（立即显示；没有渲染上限会隐藏它）                                                      |
| 删除行    | 单元格右键菜单 →「删除此行」          | 删除该行（右键落在选区里则显示「删除选中的 N 行」并删除整个选区）                               |
| 列操作    | 列头右键菜单                          | 隐藏/冻结/排序/显示全部                                                                         |
| 新增字段  | 列末「+」列 / 字段配置「新增字段」    | 从该按钮弹出「新增字段」下拉；表内一行都没有时顺带建一条空记录                                  |
| 编辑字段  | 字段配置 → 字段「…」→ 编辑字段        | 同一个下拉菜单就地换成表单（位置＝刚才的「选项菜单」；改标题/类型/选项/默认值）                 |
| 删除字段  | 字段配置 → 字段「…」→ 删除字段        | 行内二次确认后删除（并清空该列数据）                                                            |
| 字段编组  | 字段配置 → 「…」→ 创建编组 / 加入编组 | 生成 VTable 组头；创建后立刻进入命名；拖动字段行也可入组/出组                                   |
| 字段排序  | 字段配置 → 拖动字段行                 | 改 `config.columns` 顺序                                                                        |
| 字段隐藏  | 字段配置 → 眼睛                       | 写入 `hiddenFieldIds` / `columns[].visible`                                                     |
| 分组      | 工具条「分组」菜单                    | 多级分组（组头 + 计数）                                                                         |
| 筛选      | 工具条「筛选」菜单                    | 条件列表 AND 过滤                                                                               |
| 行高      | 工具条「行高」菜单                    | 低 / 中等 / 高                                                                                  |
| 填色      | 工具条「填色」菜单                    | 条件着色（单元格/行/列）                                                                        |
| 单选/多选 | 点单元格                              | 胶囊出现「×」+ 单元格末端 chevron（进入可编辑态）                                               |
| 单选/多选 | 再点单元格 / 点 chevron               | 打开选项下拉（搜索 + 选项胶囊 + 创建行）；单选选后关闭、多选保持打开（§5.8）                    |
| 单选/多选 | 点胶囊里的「×」                       | 删掉该选项（单选即清空单元格）                                                                  |
| 多选      | 复选框 / Shift 范围                   | 批量操作                                                                                        |
| 搜索      | 工具条「搜索」→ 下方输入栏            | 输入即高亮全部匹配、跳到第一处；回车/上一下一跳转；Esc 或「关闭」清空并收起（弹窗不被连带关闭） |
| 更多      | 工具条「更多」                        | 设为默认视图 / 复制视图 / 删除视图（第 5 轮起位于视图工具条，不再在页签条上）                   |
| 导出      | 工具条「导出」                        | 下载 CSV/Excel（列末「+」列导出时置空）                                                         |
| 打开节点  | 点击 relation/行（collection）        | onOpenNode                                                                                      |

键盘：上下方向键移动行、左右方向键滚动、Space 勾选、Ctrl/Cmd+A 全选。

---

## 7. 生命周期与资源释放

- 挂载：useEffect 中 new ListTable(option)，保存实例 ref。
- 数据更新：records 变化时用 tableInstance.setRecords()（增量更新，不重建实例）。
- 卸载：tableInstance.release() 释放事件与内存（避免 StrictMode 双挂载泄漏）。
- 视图切换：DataViewRoot 不保活 → 卸载即 release；排序/筛选/选择态如需保留，写回 config.sortState/filterState。

---

## 8. 二次开发要点

1. 自建 TableDataView 壳：React 容器 div + 命令式 ListTable 生命周期（勿在 render 里 new）。
2. 编辑事件映射：table.on('change_cell_value') / vtable-editors 回调 → valueToCell → onCellChange。
3. 编辑器注入：只有 text/number/url（input）与 date 用 vtable-editors 的编辑组件；**单选/多选不注入
   编辑器**（返回 `undefined` 即「双击不进入就地编辑」），值由 §5.8 的下拉写回。
4. relation 单元格：显示被引节点标题（用 useDataStore 取 nodes，缓存 title 解析），点击跳节点。
5. 主题映射：themeTokens（浅/深）→ VTable theme（背景/文本/边框/强调色），跟随 next-themes。
6. 分组/筛选/排序态回写 config，保证切换视图回来不丢。
7. 字段级联：删字段 / 改类型由 `reconcileRowsForFields` 在渲染器侧算出新的 rows，随
   `onFieldsChange(fields, rows)` 一次写回（域对象会拒绝孤儿字段键与类型不符的单元格）；
   字段编辑器在改类型时提示「改变类型会清空该列现有数据」。
8. 单选/多选胶囊（`canvas/pill.ts`）：列定义挂 `customRender`，按选项 id 取色画「圆角矩形 + 文字」。
   record 里 select-ish 字段的**显示值仍是选项名**（搜索/导出都按名字工作），原始选项 id
   另存在 `optionIdsKey(field.id)`（`__optionIds_<fieldId>`）下供胶囊取色 —— 不要试图从名字反推 id。
   胶囊宽度用离屏 canvas 测量，字体必须来自 `resolveCanvasFontFamily(tokens)`（`"inherit"` 在 canvas
   里不是合法字体）。**单元格是否处于选中态由 `isSelectCellActive` 回调决定**（shell 的 ref 读取），
   它决定是否多画「×」与 chevron；状态变化时不要重建表格，调 `table.updateCellContent(col,row)` 重画那两格即可。
9. 宿主写回必须是**原子 patch**：一次手势可能产生两次写入（新增字段 = 列配置 + 字段本身），
   若第二次写入用的是渲染闭包里的旧 `content`，第一次写入会被悄悄覆盖（列配置丢失）。
   `database-node-content.tsx` 因此从 store 里取最新节点再合并（`patchContent`）——
   `NodeService.upsert` 的本地更新是同步的，所以第二次 patch 一定能看到第一次。
10. 宿主写回还必须**串行**：PocketBase SDK 会按 `requestKey`（我们的仓储用记录 id）取消"同一条记录
    的上一个未完成请求"，两个并发 `node.update` 会把第一个 abort 掉，客户端回滚 store，
    于是"空表新增字段后新行闪一下又消失"并报
    `TRPCClientError: The request was aborted (most likely autocancelled…)`。
    宿主现在把 patch 排进队列、用一个 microtask 合并、一次只发一个 upsert（顺带把一次手势的两次写入
    合成一次请求）；服务端 `PocketBaseClient` 另外关掉了 `autoCancellation`（单实例被所有并发请求共享，
    按 key 取消在这里只会丢数据）。
11. **菜单里开内联表单（创建编组 → 命名）时，焦点必须自己接管。** 「…」里的 创建编组 / 重命名编组 是
    就地在字段配置面板里展开输入框（不再开第二个浮层）。这条路径上 Radix 有两处会抢光标，且都只能在
    菜单内容 unmount 的清理时刻处理（`menus/field-menu.tsx` 的 `handleMenuCloseAutoFocus`）：
    ① 内容卸载时它会把焦点还原给菜单触发器（`setTimeout(…, 0)`），而 创建编组 之后那个触发器已经被
    搬进新编组、成了另一个 DOM 节点；② 内容在退场动画期间**仍挂着焦点陷阱**，表单的 `autoFocus`
    刚生效就被拽回菜单项（实测：焦点停在「…」菜单项上约 300ms，菜单一卸载就掉到 `<body>`）。
    做法是用 ref 标记「本次关闭是交接」，在该回调里 `preventDefault()` 并**显式聚焦**表单输入框 ——
    这是陷阱已经消失的第一个时刻（不要指望给输入框加个延时重试，那是在赌动画时长）。
    另注：Radix 用**捕获阶段**的 `document` keydown 处理 Esc，输入框自己的 `onKeyDown` 永远晚一步，
    所以「Esc 只撤销命名、不关面板」只能写在 `PopoverContent` 的 `onEscapeKeyDown` 里。
12. **画布视图的盒子必须「不可滚动」——否则渲染器自己的溢出会回流成尺寸抖动。** VTable 会把量到的
    **取整**像素尺寸盖在它创建的 `.vtable` 上（`style.width/height = parentElement.offsetWidth/offsetHeight`），
    因此只要这个父盒子是小数尺寸（浏览器缩放、HiDPI 窗口、`h-[80vh]` 弹窗都会），`.vtable` 就会比盒子大最多 1px。
    `data-view-root.tsx` 的渲染器盒子原本是 `overflow-auto`：这 1px 溢出让它**两条滚动条一起出现**，
    在 DPR=2 的窗口里每条正好 **10px**，于是表格的可用宽高各少 10px（实测 `.vtable` 784×589 → 774×579，
    `offsetWidth - clientWidth` 由 `0,0` 变 `10,10`），变窄又让工具条左组多折一行、容器高度再变、溢出再变 ——
    `.vtable` 的 inline 宽高就在两个相差 10 的固定值之间**无限横跳**（用户报的「抖动」就是这个）。
    现在两层都裁掉，任何一层单独都能断开这个环：
    ① 外壳的渲染器盒子 `overflow-hidden`（渲染器自己管滚动：表格用 VTable 画布滚动，占位视图自带内层 `overflow-auto`）；
    ② 表格视图根 `[data-dataview-table]` 与画布容器 `[data-dataview-table-canvas]` 也 `overflow-hidden`，
    这样即便宿主把它塞进别的 `overflow: auto`（节点编辑器内容区就是），表格也顶不动自己的盒子。
    VTable 自己的 HTML 右键菜单挂在 `.vtable` 里、由它自己约束在表格盒内（`confine: true`），单元格编辑器同样在格内，
    所以这层裁剪切不到它们（实测菜单 10 项完整可见、`menuRect` 完全落在容器内）。**不要把 `overflow-auto` 加回渲染器盒子。**
13. **画布上的小按钮用 `icon` 元素 + `icon_click`，不要拿坐标算命中。** `customRender` 返回的
    `{type:"icon", svg, name, clickable:true}` 会被 VTable 变成 `role: "icon-custom"` 的可拾取图形，
    点击时按 `name` 冒泡 `icon_click`（实测：`dv_pill_remove:opt-todo` / `dv_pill_open` 都能拿到
    `{name, col, row}`）——胶囊里的「×」和单元格末端的 chevron 就靠它，没有一处手写命中矩形。
    两个必须知道的顺序/噪声问题：
    - 落在图标上的那一次点击**先**触发 `click_cell`（其 `args.targetIcon` 已填好），**后**才触发 `icon_click`；
      所以 `click_cell` 里见到 `targetIcon` 必须直接 return，否则「点×删选项」会顺带把下拉打开。
    - `icon_click` 的 `svg` 是**带颜色的字符串**（图标元素不吃 `fill`），颜色得逐个烘焙进 SVG：
      胶囊里的「×」用 `contrastTextColor(选项色)`，chevron 用主题的 `mutedForeground`；拼字符串前照
      `sanitizeSvgColor` 过滤一遍（选项颜色是持久化数据）。
14. **`scroll` 事件分「用户滚动」与「VTable 自己挪」两类，别一概当用户操作。** 写回后 `setRecords` 会
    把同一个滚动位置重新盖一遍，一次冒 10 个 `scroll`（`dx/dy` 全 0、`args.event` 为 `undefined`）；
    用它来关闭选项下拉会让**多选每选一个面板就消失**。判据是 `args.event` 有没有值（滚轮/拖动才有），
    只有用户滚动才关闭面板 —— 因为 Radix 无法跟随 VTable 画布内部的滚动，面板位置会过期。
15. **「创建选项」是两次写，顺序不能反。** 它同时改字段的 `options` 与当前单元格，而宿主会把同一个
    microtask 里的两个 patch 合并成一次 upsert、**后一个 `rows` 覆盖前一个**：所以必须
    `onFieldsChange(fields)` 在前、`onCellChange(...)` 在后（域对象的 `DatabaseContent` 会拒绝
    「引用了字段里没有的 optionId」的单元格，反过来写中间态就是非法的）。
16. **给画布锚点做浮层：矩形要用「视口坐标」，而且触发器必须活过退场动画。** 画布上没有 DOM 节点可挂
    菜单，做法是 `createPortal` 一个 `position: fixed` 的隐形 span 当触发器。两条都是实测踩出来的：
    - **矩形只能取 `getCellRelativeRect`（视口），不要 `getCellRect`（表格未滚动坐标系）。** 后者不减
      `scrollLeft`，而这一类入口（列末「+」、可见的单元格）通常正是**横向滚动之后**才出现在视口里的：
      实测 `scrollLeft=436` 时「+」方格真实位置 x≈890、锚点却报 1317，Radix 的碰撞检测把面板推到了窗口
      边缘。单选/多选面板一直用的是 `getCellRelativeRect`，列末「+」第 9 轮才改正。
    - **触发器不能在 request 清空的那一刻卸载。** Radix 的 `PopoverContent`/`DropdownMenuContent` 带
      `data-closed:animate-out`，关闭后内容还会挂约 100–150ms；此时触发器已经不在文档里，popper 量到
      全 0，面板先闪到左上角（`0,0` / `0,4`）再消失。做法是用一个 ref 记住**最后一次**的锚点，
      渲染条件从「有 request」改成「有锚点」：面板整段淡出都停在原处。代价是关闭后 body 里留一个
      零内容、`aria-hidden` 的固定 span（无视觉、无交互）。

### 8.6 视觉约定（UI 美化落地）

视图工具栏与各下拉菜单**只用 `@workspace/ui` 的 shadcn 组件**，不再出现原生 `<select>` / `<input type="checkbox">` / 手写浮层（**没有侧边配置面板**）：

| 场景                                          | 组件                                                           |
| --------------------------------------------- | -------------------------------------------------------------- |
| 下拉选择（类型/范围/运算符/条件值/分组/主题） | `Select`                                                       |
| 带搜索的字段列表                              | `Popover` + `Command`（cmdk）                                  |
| 布尔设置（行为开关、自动排序）                | `Switch`；列显隐等多选 `Checkbox`                              |
| 2–4 个互斥选项（排序方向）                    | `ToggleGroup`                                                  |
| 计数与状态标签                                | `Badge`                                                        |
| 带内嵌操作的搜索框                            | `InputGroup` + `InputGroupAddon` / `InputGroupButton`          |
| 浮层 / 菜单 / 提示 / 滚动区                   | `Popover` / `DropdownMenu`（含 Sub）/ `Tooltip` / `ScrollArea` |
| 控件分组之间的分隔                            | `Separator`（vertical，`h-4 self-center`）                     |

排布与配色规则：

- 每条 strip 一行控件：strip `min-h-9`、控件统一 `h-7`、图标按钮 `size-7`；组内间距 4px，组间 6–8px。
- **`--primary` 只用于「用户已经施加的状态」**：生效中的筛选/分组、勾选的开关与复选框、选区描边、聚焦环。导航不改色——激活的视图页签是凹陷轨道（`bg-muted/60`）里唯一「抬起」的那一个。
- 字号：标签 12px 句式大小写，提示 11px `text-muted-foreground`，数字 `tabular-nums`；不使用全大写加字距的小标题。
- 空态是「邀请」而非「情绪」：图标 + 缺什么 + 怎么办（`DataViewEmptyState`）。

画布（VTable）侧与 HTML 同源：

- `shared/theme-tokens.ts` 的字面量与 `globals.css` 的 mist 基色 + 暖橙 `--primary` 对齐（深色模式把 accent 提亮，否则 2px 选区描边在近黑背景上看不见）；
- 网格只画**横向发丝线**（`borderLineWidth: [0,0,1,0]`），不再画电子表格式全框线；表头为 muted 底 + muted 文字，行号列是独立窄轨（宽 56，容得下拖拽手柄）；
- `checkboxStyle` 把 VTable 默认的蓝色勾选框改成品牌橙；`functionalIconsStyle` 把排序图标调淡、排序中态用 `--primary`；
- **`fontFamily: "inherit"` 对 canvas 是非法值**（`12px inherit` 不解析，字体会被静默忽略），token 里只作哨兵，`buildTableTheme` 经 `resolveCanvasFontFamily()` 从 `<body>` 的计算样式取真实字体栈。

编组列与「+」列的两个 VTable 细节：

- **编组后表头变成多行**（第 0 行是组头、第 1 行才是字段头），因此「某个视觉列属于哪个字段」
  必须从**最深的一层表头往上找**（`headerFieldIdAt`），否则列头右键菜单、列序回写在编组表上会失准。
- **列末「+」是合成列**（`TABLE_ADD_FIELD_COLUMN_ID`，44px）：它必须被列序读取（`known` 集合）、
  行序探测、编组投影全部跳过；导出时用 `formatExportOutput` 把表头与单元格都置空。表头用
  `headerCustomRender` 只画一个 `text` 元素（裸「+」，`mutedForeground`，居中），没有底也没有描边
  —— 表头带本身是 `muted` 底，先前的圆角按钮（页面底色 + 发丝描边）是"在 muted 上再放一块白"，
  视觉上多出一枚控件，现在整格仍是热区（`headerStyle.cursor: pointer`）。

两个坑（工程侧，跟本视图强相关）：

- **Tailwind 默认不扫描 `packages/dataview/src`**：它以 `node_modules` 软链形式被消费，自动内容探测会跳过，于是「只有本包用到」的类（`text-[11px]`、`w-[4.5rem]`、`min-h-9`…）根本不在样式表里——症状是 DOM 正确但布局离谱（列宽输入框退回 `w-full`，字段名被挤成 0 宽、上移/下移按钮被挤出面板）。修复在 `packages/ui/src/styles/globals.css`：`@source "../../../dataview/src/**/*.{ts,tsx}"`；不要把 glob 放宽到 `apps/**`（会扫进 `.next`，dev 编译卡死）。
- 临时验证页 + headless Chromium（CDP）实测本版：工具栏布局、字段配置（搜索/编组/拖动/隐藏/删除级联）、字段编辑（新增 select + 选项目 + 默认值回填、改类型、重命名）、列末「+」、筛选、多级分组、排序与自动排序、行高、填色（行级，深浅色对比文字）、只读模式（无「+」、字段编辑禁用）、空 schema 引导、导出，均通过。
- 第 2 轮反馈同样逐条实测（浅/深两套主题）：工具栏不再有「视图配置」；`rowLimit` 复现并确认为「新增记录不显示新行」的根因（持久化里能看到 6 条空行，界面只渲染 3 条），去掉后 3→4 行即时可见；四个下拉菜单无空占位块、按钮文案为「添加条件」、字段选择器显示「选择字段」且选中前条件不生效；单选/多选渲染为彩色胶囊（含 `紧急` 这类浅色底自动配深色字）；字段编辑在居中模态框里打开（`role=dialog`，位置不再跟随「…」菜单）；编组块缩进 + 折叠 + 创建后立即出现命名输入框（默认名已全选）；列末「+」按钮点击打开「新增字段」模态框；空节点新增字段后自动建 1 条记录并渲染出表格；只读模式无「添加记录」、无「+」列、`新增字段` 禁用。
- 第 3 轮反馈（本轮）实测（浅/深两套主题，临时页挂**真实** `DatabaseNodeContent`，走真实 tRPC + PocketBase）：
  - 空 database 节点新增字段：**一次** store 写入 / 一次 upsert，落库后 `fields=1, rows=1, views=1, columns=1`，表格渲染 `recordsCount=1`，无任何 console 报错，新行不再闪退；再点「添加记录」同样是 1 次写入、本地与库里都是 2 行。
  - 根因验证：把服务端 `autoCancellation` 临时改回 `true`，两个并发的同节点 `node.update` 立刻复现用户看到的那条 `The request was aborted (most likely autocancelled…)`（一个 `rejected`、一个 `ok`）；改回 `false` 后两个都 `ok`。
  - 缝隙：筛选/分组/排序/填色四个空态下拉里，标题底到「添加条件」顶的距离从 24px 收到 8px（面板高度 92 → 76），根因是 shadcn `PopoverContent` 自带的 `gap-4` 与显式 margin 叠加。
  - 字段编辑下拉：从字段行「…」打开时面板与「…」菜单同一 `align="end"` 锚点、同一个 `sideOffset=4`（锚点即那个 24×24 的「…」按钮，菜单 172px 顶 = 面板 172px 顶，右缘都是 395px）；从列末「+」打开时锚点是画布上那 18×18 的「+」方格（`align="end"` 向左展开，`popover.right = anchor.right`，`popover.top = anchor.bottom + 4`）；面板打开期间字段配置列表保持打开，点回列表只关编辑面板、点画布两个一起关。
- 第 4 轮反馈（本轮）实测，同样是真实 `DatabaseNodeContent` + 真实 tRPC/PocketBase：
  - **筛选「添加条件」无反应**：根因是 `readFilterState` → `readCondition` 用 `!resolvedFieldId` 判断，
    把 `fieldId: ""`（刚添加、还没选字段的那一行）当不可用丢掉 —— 写入成功但下一次读取就消失。
    修好后点击即出现 `选择字段 | 包含` 一行；选「状态 = 未开始」后工具条计数变 `1`、行数变 `1 / 2 行 · 2 列`。
  - **空表**（`fields: []`）：筛选/分组菜单里显示「先添加字段，才能设置条件。」，不再有点不动的按钮。
  - **工具栏抖动**：实测窗口宽度扫描（1600→600，步长 50/10，每档连续采样 40 帧）。修前右组 `top`
    在换行阈值处从 197 跳到 231（宽度 1220/1230 之间），选中一行多出「删除 1 行」时会再次翻转；
    修后右组 `top` 在**所有**宽度下恒为 211、每档只有一个状态（40/40 帧），左组自己换行导致
    工具条高度 37 → 71 → 105 → 241。
  - **字段编辑＝下拉菜单**：字段行「…」菜单 `left = 按钮 right + 4`、`top = 按钮 top`（即开在按钮右侧）；
    点「编辑字段」后面板原地换成表单（同一 `left/top`，宽度 160 → 320），`标题` 输入框获得焦点、
    可输入、`确定` 后字段改名落库（`fields` 与表格列同步）；面板内的 `字段类型` Select 与选项配色
    Popover 都能正常打开且**不会关闭**外层菜单；「取消」只关编辑并保留字段配置列表；新增字段下拉
    贴在「新增字段」按钮下方（`left = 按钮 left`、`top = 按钮 bottom + 4`）；列末「+」方格
    （18×18 @ 1316,263）弹出时 `panel.right = anchor.right = 1334`、`panel.top = anchor.bottom + 4`，
    「标题」自动聚焦；「取消」后隐形触发器一并移除，再点「+」可重新打开。浅/深两套主题下均一致。
- 第 5 轮反馈实测（真实 `DatabaseNodeContent` + 真实 tRPC/PocketBase；React 提交数用
  `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot` 计数）：
  - **更多进工具条**：页签条只剩 `表格 | 看板 | +`（右端没有任何按钮）；表格工具条右组是
    `4 行 · 5 列 | 导出 | 搜索 | 更多`，点「更多」弹出菜单三项（`设为默认视图 / 复制视图 / 删除视图`），
    菜单 `right = 右组 right = 1368`；`复制视图` → 页签变 `表格 | 表格 副本 | +` 且落库
    `views=[表格,表格 副本]`；`设为默认视图` → `isDefault` 移到当前视图；`删除视图` → 当前视图被删、
    剩下的第一个自动补为默认。切到占位视图「看板」后，它的工具条右组同样有「更多」
    （`4 行 · 5 字段 | 占位未实现 | 更多`，右缘 1368），从占位视图复制/删除视图一样生效
    —— 即「更多」是框架级槽位，不是表格私有。
  - **搜索＝按钮 + 下方输入栏**：点「搜索」按钮后按钮进入 `aria-pressed` 高亮态，工具条下方出现
    36px 高的输入栏（输入框 `w-80`、匹配计数、上/下一个、关闭、提示「回车跳到下一处匹配，Esc 关闭」），
    输入 `进行中` → 计数 `1/2`、表格中两处 `状态` 单元格高亮；回车/上一下一在匹配间跳转；
    Esc 与「关闭」都收起输入栏并清空查询（`aria-pressed=false`），高亮一并消失。
  - **右组不再抖动**：修前同一页面里，「删除 N 行」随选中出现（`groupLeft` 1007→911、按钮标签随位数变），
    搜索框内层输入区随按键在 200px / 99px / 81px 之间跳。修后按帧采样（`requestAnimationFrame`）
    右组几何：
    - 在搜索栏里连打 12 个字符（期间发生 **20 次 React 提交**）→ 107 帧**只有一个状态**
      （`1099,211,269,28`，子元素 x 恒为 1099/1157/1227/1236/1306）；
    - 点「下一个匹配」连续跳转 → 85 帧一个状态；
    - 拖动选区跨 4 行 → 145 帧一个状态，且**拖动期间 0 次 React 提交**（选中已不写 React 状态）；
    - 窗口宽度扫描 1600→900（步长 50，每档 31–32 帧）：右组 `top` 恒 211、每档只有一个状态，
      工具条高度 37 → 71（左组自己换行）；空闲 2s 提交数 0。
  - **删除行改由右键菜单**：清空选区后右键第 1 行 → 菜单末尾是「删除此行」，点它 `recordsCount` 4 → 3
    且 `node.getById` 读回 `rows` 只剩 3 条；拖选 2 行后右键落选区内 → 菜单写「删除选中的 2 行」，
    点它 3 → 1，服务端读回 1 条。
- 第 6 轮反馈实测（真实 `DatabaseNodeContent` + 真实 tRPC/PocketBase；焦点用逐帧采样
  `document.activeElement` 记录，而不是只看终态）：
  - **创建编组不进命名**：修前点「创建编组」后编组确实建了出来（字段列表里出现 `编组 1 更多操作`、
    成员行已收进组内），但命名输入框**从未出现**：菜单项的 `onSelect` 先 `setPending(renameGroup)`，
    Radix 紧接着用 `onOpenChange(false)` 关菜单，而那个回调里的 `setPending(null)` 在同一个事件里把它
    清掉了 —— 同一个 bug 也让「删除字段」的就地确认条从来不出现。修好后点「创建编组」：输入框出现，
    `document.activeElement` 就是它，值 `编组 1` 且**全选**（焦点轨迹 t+80ms 落在输入框后保持）；
    「删除字段」的确认条也如期出现。
  - **焦点交接**：从组头「…」点「重命名编组」时，菜单要等退场动画结束（~300ms）才卸载，期间它的
    **焦点陷阱**会把表单的 `autoFocus` 抢回菜单项，卸载后又掉到 `<body>`（逐帧轨迹 `in-menu` →
    `BODY`）。改为在菜单 unmount 回调里显式聚焦输入框后，轨迹变成 `in-menu`（t+0…160）→
    `编组名称`（t+320）并保持，表单可见且全选。
  - **改名落库**：输入 `重要任务` + 回车后，本地 store 与 `node.getById` 读到的
    `views[0].config.columnGroups` 都是 `[{ id: "grp_91200b7f…", name: "重要任务", fieldIds: ["fld_name"] }]`，
    字段列表标签同步变成「重要任务 更多操作」，`renameFormVisible=false` 且焦点回到组头「…」。
  - **Esc 语义**：命名中按 Esc 只取消命名、字段配置面板保持打开（`activeElement` = 该编组的「…」按钮，
    列表内容仍在），不再整块面板一起关掉。
  - **回归**：新增字段下拉的「标题」输入框仍然自动聚焦（`#dv-field-title`）；编辑字段、删除字段两条
    老路径无变化（编辑字段的「取消」仍把焦点还给该字段的「…」）。
- 第 7 轮反馈实测（真实 `DatabaseNodeContent` + 真实节点编辑器 `DialogContent`，窗口 1040×1009、
  `deviceScaleFactor=2`——即用户环境；该 Chromium 的滚动条实测正好 10px）：
  - **复现**：先在表格盒子内注入一个 2px 高的溢出元素（等价于 VTable 取整盖章、或工具条多折一行），
    2.5s 内以 50ms 采样 `.vtable` 的 inline 尺寸，得到**两个状态来回跳**：
    `774px×579px`(28 帧) ↔ `784px×589px`(21 帧)，同时 `offsetWidth - clientWidth` 从 `0,0` 变 `10,10`
    —— 宽高**各自**在两个相差 10 的固定值之间横跳，与用户描述完全一致。
  - **根因**：`data-view-root.tsx` 的渲染器盒子是 `overflow-auto`。VTable 用
    `parentElement.offsetWidth/offsetHeight`（**取整**）回写 `.vtable` 的宽高，盒子是小数尺寸时必然差最多 1px；
    这 1px 溢出让盒子两条滚动条一起出现，各吃掉 10px，表格可用宽高各少 10px，工具条左组在更窄的宽度下
    多折一行，容器高度又变，溢出随之变化 → 环闭合。把渲染器盒子改成 `overflow-hidden`（并让表格自己
    裁掉根/画布容器）后，同一 2px 溢出下 `.vtable` 恒为 `784px×589px`（50/50 帧）、`scrollbar=0,0`。
  - **两层各自足够**：只改外壳盒子（表格不裁）时同样 50/50 帧稳定在 784×589；只裁表格（外壳仍 `overflow-auto`）时
    1px/2px/5px/20px 四种溢出下容器恒为 784×589、`wrapperScrollbar` 恒为 `0,0`。现在两层都保留。
  - **回归**：VTable HTML 右键菜单 10 项完整可见且 `menuRect` 完全在容器内（`inside container: true`）；
    双击单元格的就地编辑器 `INPUT` 在容器内并获得焦点；「字段配置」Popover 正常打开且在视口内
    （`228,257–516,629`）；1600×1000/DPR1、1040×1009/DPR2、900×700/DPR1、1280×820/DPR2 四组窗口下
    连续采样均只有一个 `.vtable` 尺寸状态，内容区无滚动条。
- 第 8 轮反馈实测（临时 `apps/web` 页面挂真实 `NodeEditor` + `DatabaseNodeContent`，一个 database 节点
  含 文本/单选/多选/空单选 四列 × 3 行；headless Chromium over CDP，1040×900 弹窗）：
  - **选中态**：未点过的单选格 scene graph 里只有 `custom-container`；点一下后同一格多出
    `dv_pill_remove:opt-done` 与 `dv_pill_open` 两个 `role: "icon-custom"`、`pickable: true` 的图形
    （位置 273–287 与 375–389，与截图里「胶囊内的 ×」「格右端的 chevron」一致）。
  - **两步手势**：第一次点→`menuOpen=false`（只选中）；第二次点→面板打开，
    输入框 `placeholder="查找或创建选项"` 且 `document.activeElement` 就是它，5 行选项、
    第一行 `data-selected=true`（设计稿里的灰底行）、当前值 `opt-done` 带 `data-checked=true`。
  - **单选**：点 `opt-doing` → 面板关闭，`__optionIds_fld-status` 由 `[opt-done]` 变 `[opt-doing]`
    （值经宿主写回并回流到 record）。键盘同路径：`↓` 把高亮移到 `opt-doing`、`Enter` 选中并关闭。
  - **多选**：点 `opt-done` → 面板**仍然打开**，`[opt-todo,opt-doing]` → `[opt-todo,opt-doing,opt-done]`；
    再点 `opt-todo` → `[opt-doing,opt-done]`；再点回来 → `[opt-doing,opt-done,opt-todo]`（取消/恢复都对）。
    搜索框焦点在每次选后回到输入框。
  - **删除**：点胶囊里的「×」→ 事件序列是 `click_cell:3,1:dv_pill_remove:opt-todo`（带 `targetIcon`，被忽略）
    再 `icon_click:dv_pill_remove:opt-todo:3,1` → `[opt-todo,opt-doing]` → `[opt-doing]`；
    单选格点「×」→ `[]`，该格只剩 `dv_pill_open` 与空占位文本（仍是选中态）。
  - **创建**：空单选格输入「新选项」→ 列表只剩 `创建「新选项」` 一行 → 点它之后单元格变成新 optionId、
    重新打开面板看到**第 6 个选项**且带勾（说明 `onFieldsChange` 已写回字段并回流），
    调色板按序号续到 `#14b8a6`。
  - **移动选中**：点另一列表格后，旧格的「×」/chevron 消失（`["custom-container"]`）、面板关闭、
    新格进入选中态 —— 选中态只属于一个单元格。
  - **回归**：双击文本格仍打开就地编辑器（`INPUT`，值 `整理数据视图文档`）；列末「+」仍打开字段配置下拉
    （`[data-dataview-field-add-request]`）；滚轮滚表格会关掉选项面板（用户滚动）而 `setRecords`
    引发的 10 个无 `event` 的 `scroll` 不会；2s 内监听 `.vtable` 的 style 变更只有 `784px×688px` 一个值
    （第 7 轮的抖动没有回来）。
- 第 9 轮反馈实测（同一套临时页：8 个字段 × 3 行的 database 节点，1040×900 弹窗，headless Chromium over CDP；
  每次都用 `requestAnimationFrame` 逐帧采样面板矩形）：
  - **左上角闪烁（复现）**：`Escape` 关单选面板时，`[data-dataview-select-menu]` 的帧序列是
    `588,231` →（`data-state=closed`）`0,0` → `0,0` → 卸载，即**在左上角停留约 130ms**；
    列末「+」的新增字段面板同理（`579,192` → `0,4`）。根因是两个隐形触发器在 request 清空的那一帧
    就卸载了，而 Radix 的 `data-closed:animate-out` 还把内容挂着。
  - **左上角闪烁（修复后）**：单选面板关闭全程停在 `588,231`（6 帧）后卸载；新增字段面板关闭全程停在
    `579,192` 并原地缩放淡出。作为对照，VTable 自带的 HTML 右键菜单本来就**立即卸载**、不闪
    （关闭帧序列 `254,214` → gone），所以问题只在两个 Radix portal 面板上。
  - **添加字段菜单偏离（复现）**：横向滚到最右（`scrollLeft=436`）后点「+」方格，真实方格中心在
    `890,178`，而锚点 span 却在 `1317,170`（= `getCellRect` 的未滚动坐标），面板因此被推到
    `997,192`（窗口右缘），不在按钮下方。
  - **添加字段菜单偏离（修复后）**：锚点 `881,170`（= 方格真实位置），面板 `579,192`、尺寸 `320×272`，
    `panel.right == anchor.right == 899` 且 `panel.top == anchor.bottom + 4` —— 右对齐、整齐开在「+」
    方格正下方（截图核对一致）。
  - **单选/多选面板位置**：锚点 `588,197`、尺寸 `140×34`（就是 `getCellRelativeRect` 的那一格），
    面板 `588,231` → `panel.left == anchor.left && panel.top == anchor.bottom`，正下方对齐。
  - **回归**：多选仍「选中即保持打开 + 焦点回到搜索框」（勾选 `未开始,已完成`、`__optionIds_fld-tags`
    `[opt-todo]`→`[opt-todo,opt-done]`）；`创建「新选项」`仍写入新 optionId（`opt_<uuid>`）；
    胶囊「×」仍只删一个（`[opt-todo,opt_<uuid>]`→`[opt_<uuid>]`）；双击文本格仍打开就地编辑器
    （`INPUT`，值 `记录 1`）；「字段配置」Popover 仍开在按钮下方（`228,160`）；整个流程
    `Runtime.consoleAPICalled` 里只有既有的 Radix `DialogTitle`/`Description` 无障碍告警，无新增错误。
- 第 10 轮反馈实测（两套临时页：裸 `DatabaseNodeContent` 与**真实 `NodeEditor` 弹窗**，同一个
  5 字段 × 3 行的 database 节点；headless Chromium over CDP，1280×900，Chromium 152）：
  - **列末「+」只剩一个加号**：该表头格的场景图是 `group → custom-container → text("+")`，
    **没有任何 `rect` 元素**（改动前是 18×18 圆角矩形 + 文字）；4× 截图里表头带是一整条 `muted`，
    只有「+」的笔画，无底无描边。热区与锚点没变：点表头仍打开新增字段（面板 `320×272`），隐形锚点
    span 仍是 18×18（`left = 单元格 left + (67-18)/2`、`top = 单元格 top + 9`），
    `panel.right == anchor.right`、`panel.top == anchor.bottom + 4`。
  - **Esc 关掉整个编辑器（复现）**：真实弹窗里在搜索框输入「整理」后按 Esc，
    `[data-dataview-table-search]` 消失的同时 `[role=dialog]` 也没了（`tablePresent: false`）；
    裸页面里同一个按键只关搜索栏 —— 说明是宿主 Radix `Dialog` 的 `document` 捕获监听抢先
    （第 10 轮修的就是这个）。
  - **Esc 只关搜索（修复后，同一弹窗）**：`barPresent: false`、`dialogPresent: true`、
    `data-state="open"`、`tablePresent: true`；搜索栏关掉后**再**按一次 Esc 才关弹窗
    （`dialogPresent: false`），即弹窗本身的 Esc 没有被吞掉。查询也一并清空：重新打开搜索栏后
    `input.value === ""`、无匹配计数、焦点回到输入框。
  - **回归**：输入「视图」→ 计数 `1/2`，`Enter` → `2/2`，`Shift+Enter` → `1/2`；焦点落在
    「上一个匹配」按钮上时按 Esc 同样只关搜索栏；两套页面全程 `Runtime.exceptionThrown` 为 0。
  - **用户环境里的第二层原因（临时日志定位）**：在用户机器上按 Esc，控制台只有模块装载时的
    `armed`，没有任何「收到按键」的日志，而同一个页面里打开下拉菜单按 Esc 却能关闭 —— 说明
    Escape 只在**焦点位于文本框时**被页面之外的东西吞掉（键盘类扩展的 insert 模式最典型；
    用户确认中英输入法都如此，与输入法无关）。为此补了第 ③ 条路径（无落点失焦即关闭）；
    临时页实测：`input.blur()` 复现「无落点失焦」→ 搜索行关闭、弹窗留存；在弹窗空白处真实
    点击 → 搜索行保持打开；正常 Esc → `window` 路径命中并关闭。

---

## 9. 边界与取舍

- 虚拟滚动 vs 分页：ListTable 原生虚拟滚动，v1 不引入分页，也不提供「渲染上限」——渲染上限会
  让新插入的行悄悄不可见（已删除 `TableViewConfig.rowLimit`）。
- 大表整包写：rows 编辑仍走 NodeService 整包 content 替换（沿用现有取舍），数千行时注意写放大，后续再按行级增量。
- 宿主写回**串行 + 合并**而非并发：一次手势（新增字段 = 列配置 + 字段）在同一个 microtask 里合并成一次 upsert，且上一个写完才发下一个。并发写同一条记录会被 PocketBase SDK 按 `requestKey` 取消（丢数据），也会让"最后一个落库的写"决定最终内容，从而可能回退到较旧的一半。
- 字段编辑放在**菜单**里而不是自己的浮层：表单不是菜单语义（`role="menu"` 里放 input 严格说不合规范），
  换来的是位置/碰撞/滚动跟随全部交给 Radix，代码里没有一处坐标计算，也不会再出现「面板飘到画布上某处」。
  实测 Radix 只在内容节点自身聚焦时拦截方向键、typeahead 只在自己 `[role=menuitem]` 项之间跳（本面板没有），
  所以输入/Tab/方向键行为正常；`Select` 与配色 `Popover` 嵌在里面也能用。代价是菜单是模态层：菜单打开期间
  字段配置列表不可点（点它会先关菜单），需要再点一次。
- relation 编辑 v1 降级只读：节点选择器依赖图谱弹层，v1 用「显示 + 点击跳转」替代，v2 再上选择器。
- PivotTable 透视暂缓：透视需要维度/指标语义，与 chart 视图职责重叠，v1 表格只做 ListTable；确有需求再在 table 内加「透视模式」。
- 自愈：column.fieldId 失效（字段被删）时从 config 剔除，不崩溃；编组同理（`validColumnGroups`）。
- 改类型即清列：不做隐式类型转换（text→number 不尝试解析已有值），字段编辑器给出提示，`reconcileRowsForFields` 丢掉不再匹配的单元格。这样写入的数据永远满足域对象校验。
- 填色用固定色板而非自由取色：色板是浅色调 + 从背景推导的对比文字，保证在浅色/深色主题下都可读；自由取色会让「能不能读」变成用户的问题。
- 字段拖动用原生 HTML5 DnD（不加 dnd-kit 依赖）：字段列表是唯一需要拖拽排序的地方，看板视图落地时再统一到 dnd-kit。
- **删除行放进右键菜单，而不是选中态按钮**：选中即出现的按钮有两个代价 —— 它让工具条功能区随选中跳动
  （见 §5.3.1），而且「选中」这个动作本身被绑上了破坏性操作。右键菜单项是常驻的（菜单只在右键时构造），
  既不驱动工具条布局，也保留了批量删除：右键落在多行选区内时菜单写「删除选中的 N 行」。
- **搜索输入栏另起一行**：工具条那一行只放固定尺寸按钮，任何「宽度会变」的控件都不进右组；
  代价是打开搜索会让表格矮一行（36px），这是可以接受的、也是用户点击的直接结果。
- 选中态**不进入 React 状态**：`TableDataView` 不再订阅 `selected_cell` / `selected_changed` 更新计数。
  代价是工具条里无法显示「已选 N 行」——需要时可从 `table.getSelectedCellRanges()` 按需读取，
  但不要把它写进渲染路径。
- 编组不嵌套：v1 只支持一层编组（组头 + 成员），`orderColumnsByGroups` 也只投影一层；嵌套编组等有真实需求再加。
- **视图盒子不滚动，代价是极矮的窗格里工具条多余的行会被裁掉**：外壳的渲染器盒子从 `overflow-auto` 改成
  `overflow-hidden`（见 §8 第 12 条，那个滚动条正是尺寸抖动的放大器）。表格视图本身填满给定空间并自己滚动，
  所以只有「工具条左组折了很多行 + 视口又很矮」时，最后几行会看不见 —— 这种尺寸下表格本身也已不可用，
  用「滚动条偷走 10px 再抖动」来兜底并不划算。真要支持，正确做法是让工具条自己在自己的盒子里滚，
  而不是把整块渲染区变成滚动容器。
- **单选/多选不再有就地编辑器，改由下拉承担（§5.8）**：胶囊是「多值 + 颜色」的载体，输入框表达不了它
  （旧的 multiSelect 复选框列表更是另一套视觉）。代价与随之而来的取舍：
  - **进下拉要多点一下**（第一次点选中、第二次才展开）。这是反馈里明确要的两步手势；顺手点 chevron 也能一步打开。
  - **用户滚动表格时选项面板会关闭**，而不是跟着单元格走：面板是 Radix portal，锚点是一个钉在
    单元格视口矩形上的隐形触发器，画布内部滚动它无从感知（§8 第 14 条只关闭「用户滚动」）。
  - **关闭后那个隐形触发器仍留在 body 里**（§8 第 16 条）：留着它才能让面板在退场动画里停在原地，
    否则会先闪到页面左上角。它没有内容、没有尺寸语义、`aria-hidden`，只在表格自己滚动后才变成
    「过期坐标」——但那时面板本来就已经关了。
  - **创建选项后面板会关闭**：新增 option 属于 schema 变更，会改 `structureKey` → 表格实例重建，
    选中态与面板一起被清掉（单选本来就要关；多选需要再点一次单元格才能继续选）。
  - 面板里的勾选/取值用的是**面板自己的 `ids`**（打开时从 VTable record 读一次，之后每次手势同步更新），
    所以同一帧里连点两次也不会基于宿主还没回显的旧值切换；代价是面板打开期间外部写入不会反映到勾选上。
  - collection（只读）宿主下这一整套都不出现：没有「×」、没有 chevron、点单元格也不会开面板。

---

## 10. 开发任务清单

| #   | 任务                  | 说明                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 状态                                                                                                                                         |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | core/schema.ts        | rowsToRecords / valueToCell / cellType 映射                                                                                                                                                                                                                                                                                                                                                                                                                              | ✅                                                                                                                                           |
| T2  | TableDataView 壳      | ListTable 生命周期 + 容器                                                                                                                                                                                                                                                                                                                                                                                                                                                | ✅                                                                                                                                           |
| T3  | 编辑链路              | vtable-editors 注入 + onCellChange 冒泡                                                                                                                                                                                                                                                                                                                                                                                                                                  | ✅                                                                                                                                           |
| T4  | 排序/筛选/分组/搜索   | 事件 + 状态回写 config                                                                                                                                                                                                                                                                                                                                                                                                                                                   | ✅                                                                                                                                           |
| T5  | 列/字段管理入口       | 列头右键菜单 + 字段编辑菜单                                                                                                                                                                                                                                                                                                                                                                                                                                              | ✅ 列头菜单（排序/隐藏/冻结/显示全部）+ **字段配置菜单（搜索/编组/拖动/隐藏/删除）** + **字段编辑菜单（标题/类型/选项/默认值）** + 列末「+」 |
| T6  | 批量选择与删除/改字段 | 复选 + 批量动作                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 部分：行选择 + 批量删除 + 添加记录已完成；**批量改字段未做**                                                                                 |
| T7  | 导出                  | vtable-export CSV/Excel                                                                                                                                                                                                                                                                                                                                                                                                                                                  | ✅                                                                                                                                           |
| T8  | 主题/空态/自愈        | themeTokens 映射 + EmptyState + config 自愈                                                                                                                                                                                                                                                                                                                                                                                                                              | ✅                                                                                                                                           |
| T9  | collection 只读投影   | 复用投影 + 行点击跳节点                                                                                                                                                                                                                                                                                                                                                                                                                                                  | ✅                                                                                                                                           |
| T10 | 工具栏化 & 菜单化     | 删侧栏，配置并入视图工具栏；筛选/分组/排序/行高/填色菜单                                                                                                                                                                                                                                                                                                                                                                                                                 | ✅                                                                                                                                           |
| T11 | 字段编组与填色        | 列编组（VTable 组头）+ 条件填色                                                                                                                                                                                                                                                                                                                                                                                                                                          | ✅                                                                                                                                           |
| T12 | 反馈修正（第 2 轮）   | 去掉「视图配置」兜底（含 `rowLimit`）、下拉去掉空占位、字段选择器默认「选择字段」、字段编辑改为独立模态框、编组块缩进 + 可折叠 + 创建即命名、单选/多选彩色胶囊、列末「+」列按钮化、空表新增字段自动建首行、宿主改为原子 patch 写回                                                                                                                                                                                                                                       | ✅                                                                                                                                           |
| T13 | 反馈修正（第 3 轮）   | 宿主写回串行化 + 服务端关闭 PocketBase 自动取消（修「新行闪退 + autocancelled」）、空态下拉去掉 24px 缝合到 8px、字段编辑由模态框改为**锚定触发按钮的下拉**（「…」菜单位置 / 列末「+」按钮）                                                                                                                                                                                                                                                                             | ✅                                                                                                                                           |
| T14 | 反馈修正（第 4 轮）   | 字段编辑改用**真实 shadcn `DropdownMenu`**（编辑字段＝同一个「…」菜单就地换主体；新增字段＝各自按钮的下拉；画布「+」只用隐形触发器，不再有 `TableFieldPopover`/坐标面板）；「…」菜单开在按钮右侧；工具栏「左组内部换行 + 右组固定」消除右侧按钮跳位；修 `readFilterState` 丢掉 `fieldId: ""` 导致的「添加条件无反应」                                                                                                                                                    | ✅                                                                                                                                           |
| T15 | 反馈修正（第 5 轮）   | 视图「更多」从页签条移入**视图工具条**的功能区（`toolbar/view-actions.tsx` 槽位，占位视图同样获得）；搜索改为「只留按钮 + 下方输入栏」（`toolbar/search-bar.tsx`）；右组固定尺寸化、去掉随选中出现的「删除 N 行」（删除行改到单元格右键菜单，支持删除整个选区）；选中态不再写 React 状态                                                                                                                                                                                 | ✅                                                                                                                                           |
| T16 | 反馈修正（第 6 轮）   | 修「字段配置里创建编组不进命名」：菜单关闭不再清掉就地表单的待办状态（顺带修好「删除字段」确认条从不出现）；命名输入框的焦点改由菜单 unmount 回调显式交接（Radix 的关闭焦点还原 + 退场动画期间的焦点陷阱都会抢光标）；Esc 只取消命名、不关字段配置面板，命名结束焦点回到组头「…」                                                                                                                                                                                        | ✅                                                                                                                                           |
| T17 | 反馈修正（第 7 轮）   | 修「宽高各自在两个相差 10 的固定值之间无限横跳」：`data-view-root.tsx` 的渲染器盒子 `overflow-auto` → `overflow-hidden`，表格视图根与画布容器补 `overflow-hidden`——VTable 取整盖章造成的 1px 溢出会让盒子同时出现两条 10px 滚动条，各吃掉 10px 并触发工具条重新折行，形成闭环                                                                                                                                                                                            | ✅                                                                                                                                           |
| T18 | 反馈修正（第 8 轮）   | 单选/多选改为「胶囊 + 选项下拉」：点单元格→胶囊出现「×」（画布 `icon` 元素 + `icon_click`）与单元格末端 chevron；再点一下/点 chevron→打开 `查找或创建选项` 下拉（选项以胶囊列出、当前值打勾、第一行高亮），单选选后关闭、多选保持打开并保留搜索框焦点；输入新名字可「创建」选项（先写字段 options 再写单元格）；单选/多选不再注册 VTable 编辑器                                                                                                                          | ✅                                                                                                                                           |
| T19 | 反馈修正（第 9 轮）   | 修「画布浮层关闭时先在页面左上角闪一下」：隐形触发器的锚点改由 ref 记住最后一次的矩形，渲染条件从「有 request」改为「有锚点」，让 Radix 退场动画期间触发器仍在文档里（单选面板实测由 `588,231`→`0,0` 改为全程 `588,231`）；修「列末「+」的添加字段菜单偏离按钮」：锚点矩形由 `getCellRect` 改为 `getCellRelativeRect`（`scrollLeft=436` 时 1317→881），面板右缘重新对齐「+」方格                                                                                         | ✅                                                                                                                                           |
| T20 | 反馈修正（第 10 轮）  | 列末「+」去掉底色与描边，`headerCustomRender` 只画一个居中 `text`（整个表头格仍是热区，`ADD_FIELD_CHIP_SIZE` → `ADD_FIELD_BUTTON_SIZE`）；修「在搜索栏按 Esc 会关掉整个节点编辑器」：`TableSearchBar` 自己挂 `window` **捕获**监听（比 Radix 的 `document` 捕获更早），按键目标在搜索行内时 `preventDefault` 并关闭搜索栏，弹窗与其它层的 Esc 语义不变；再补两条兜底路径（keyup + 输入框 React 处理、以及「无落点失焦」）以覆盖文本框聚焦时 Escape 被宿主/扩展吞掉的机器 | ✅                                                                                                                                           |

补充说明：

- **行拖拽排序**（§5.2）已实现：拖动行号列的手柄重排，经 `onRowReorder` 冒泡。仅在未启用筛选时生效（否则会静默移动用户看不到的行）。
- **`DataViewRendererProps` 的扩展**：渲染器新增 `onConfigChange`（画布上的排序/列宽/列序写回）、`onRowInsert` / `onRowDelete` / `onRowReorder`、`onFieldsChange`、`resolveNodeTitle`。前几项由宿主决定是否提供；`onConfigChange` 仅在宿主传入 `onViewsChange` 时下发，`onFieldsChange` 仅在 database 宿主提供（collection 只读）。
