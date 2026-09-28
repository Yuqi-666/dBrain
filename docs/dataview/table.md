# 表格视图（Table DataView）设计文档

> 状态：**已实现**（`packages/dataview/src/views/table/`）
> 依赖：[README.md](./README.md)（DataView 组件形态）、../database-node-design.md（fields/rows 数据模型）
> 定位：核心视图，需全功能设计并优先实现

实现落点（与本文的对应关系）：

| 文件 | 职责 |
| --- | --- |
| `table-schema.ts` | fields→columns、rows→records、编辑值→DatabaseCell、列自愈（§3.1/§3.2） |
| `table-editors.ts` | input / date / list 编辑器 + 自研 multiSelect 复选编辑器（§3.1/§8.3） |
| `table-theme.ts` | themeTokens → VTable `ITableThemeDefine`（§8.5） |
| `table-filter.ts` | `config.filterState` 的运行时形状与列快速筛选（§5.4） |
| `table-toolbar.tsx` | 搜索 / 筛选 / 分组 / 密度 / 增删行 / 导出（§5，shadcn 组件，见 §8.6） |
| `table-data-view.tsx` | ListTable 生命周期、事件映射、写回（§7） |
| `config-editor.tsx` | 列可见性 / 列宽 / 列序 / 排序 / 行为开关 / 呈现选项（§4，shadcn 组件，见 §8.6） |

尚未实现（见 §9「边界与取舍」与 §10 任务清单）：以行为单位的 relation 选择器、PivotTable 透视模式、行拖拽之外的批量改字段、`format.dateFormat` / `format.numberFormat`、`cellTypeOverride` 的配置面板入口。

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

| 包 | 用途 |
| --- | --- |
| @visactor/vtable | 核心：ListTable（主表）、PivotTable（透视，可选） |
| @visactor/vtable-editors | 单元格编辑器（输入框、日期选择、下拉、复选） |
| @visactor/vtable-export | 导出 Excel / CSV |
| @visactor/vtable-search | 搜索高亮 |
| @visactor/vtable-plugins | 官方插件集（可选：行号、冻结、图标等） |
| @visactor/react-vtable | React 封装（可选，见 §7 取舍） |

> 优先用 VTable 命令式实例 + React 生命周期封装（与 graph 的 ForceGraph 封装模式一致），不强制依赖 react-vtable，便于精细控制事件与资源释放。

---

## 3. 数据转换适配

### 3.1 fields → columns

每个 DatabaseField 映射为 ListTable 的 ColumnDefine；cellType 由字段类型决定（见下表），其余（width、title、冻结、可见性）来自视图 config。

| DatabaseFieldType | VTable cellType | 显示值 | 编辑控件（vtable-editors） |
| --- | --- | --- | --- |
| text | text | 原文 | input |
| number | text（number 格式化） | 数字/空 | number input |
| select | text | option.name（按 optionId 解析） | select 下拉（options 注入） |
| multiSelect | text | option.name 逗号拼接 | 多选标签 |
| date | text（ISO 格式化） | 本地化日期 | 日期选择器 |
| checkbox | checkbox | 勾选态 | 原生 checkbox |
| url | link | 链接（可点击） | input（URL 校验） |
| relation | link / text | 被引节点标题（缺失降级 id） | 节点选择器（弹层，可选 v1 只读） |

### 3.2 rows → records

~~~ts
// packages/dataview/src/views/table/table-schema.ts
export function rowsToRecords(source: DataViewSource): Record<string, unknown>[] {
  return source.rows.map((row) => {
    const rec: Record<string, unknown> = { __rowId: row.id };
    for (const f of source.fields) {
      rec[f.id] = CellResolver.displayScalar(row.cells[f.id], f, resolveNodeTitle);
    }
    return rec;
  });
}

// 单元格编辑回写：table 事件给出 { col, row, value } → 还原 DatabaseCell
export function valueToCell(field: DatabaseField, value: unknown): DatabaseCell {
  switch (field.type) {
    case "text":    return { type: "text", text: String(value ?? "") };
    case "number":  return { type: "number", number: value === "" || value == null ? null : Number(value) };
    case "select":  return { type: "select", optionId: value ? String(value) : null };
    case "multiSelect": return { type: "multiSelect", optionIds: (value as string[]) ?? [] };
    case "date":    return { type: "date", date: value ? String(value) : null };
    case "checkbox": return { type: "checkbox", checked: Boolean(value) };
    case "url":     return { type: "url", url: value ? String(value) : null };
    case "relation": return { type: "relation", nodeIds: (value as string[]) ?? [] };
  }
}
~~~

- 隐藏的 __rowId 列承载 DatabaseRow.id，不参与显示与编辑；排序/筛选/选择都经它回到源行。
- 编辑校验复用 database-node-design.md §4 的字段类型校验规则（number 必须有限数、select optionId 必须命中 options 等）；非法输入不进 store，就地提示。

### 3.3 collection 投影（只读）

collection 场景 rows 来自节点属性投影（见 README §4.2），字段为固定 schema；表格只读（readOnly），relation 类字段（__semantic）显示语义名称，行点击经 __rowId → nodeIds 索引触发 onOpenNode。

---

## 4. 配置项（TableViewConfig）

~~~ts
export interface TableViewConfig {
  // —— 列 ——
  columns: TableColumnConfig[];        // 显式列配置（顺序、可见、宽度、冻结）
  hiddenFieldIds?: string[];           // 快捷隐藏（与 columns 互补）

  // —— 行为 ——
  editable: boolean;                   // 是否可编辑（collection 恒 false）
  selectable: boolean;                 // 是否可多选
  sortable: boolean;                   // 是否允许点击表头排序
  filterable: boolean;                 // 是否显示列筛选
  resizable: boolean;                  // 列宽拖拽
  reorderable: boolean;                // 列拖拽排序
  groupable: boolean;                  // 是否允许拖拽分组

  // —— 呈现 ——
  density: "compact" | "comfortable" | "spacious";  // 行高
  frozenColumnCount: number;           // 冻结列数（默认 1：主列）
  showRowNumber: boolean;              // 行号
  rowLimit: number;                    // 渲染上限（默认全量，虚拟滚动兜底）
  theme: "light" | "dark" | "auto";    // 主题

  // —— 排序 / 筛选 / 分组 初始态（可写回） ——
  sortState?: { fieldId: string; order: "asc" | "desc" }[];
  filterState?: Record<string, unknown>;   // 列筛选值
  groupBy?: string[];                       // 分组字段 id（顺序即层级）
}

export interface TableColumnConfig {
  fieldId: string;
  width?: number;
  visible: boolean;
  frozen?: boolean;
  cellTypeOverride?: VTableCellType;   // 覆盖默认 cellType（如把 number 渲染成 progressbar）
  format?: {                            // 显示格式
    dateFormat?: string;                // 日期格式
    numberFormat?: string;              // 数字格式
    emptyText?: string;                 // 空值占位
  };
}
~~~

默认配置（defaultConfig）规则：columns 按 fields 顺序生成、主列（首个 text 字段）冻结、density comfortable、rowLimit 不设上限。

---

## 5. 功能点（全功能清单）

### 5.1 基础展示

- 列头：字段名 + 类型图标；主列高亮。
- 单元格按类型渲染（8 种字段类型全覆盖，含 checkbox/url/relation 链接）。
- 行号、斑马纹、悬停高亮、选中高亮。
- 空值占位（默认 —，可配 emptyText）。

### 5.2 行操作

- 新增行（database：空行追加，主列待填）。
- 删除行（单选/多选，二次确认）。
- 行内编辑：双击进入编辑，Enter 提交、Esc 取消、Tab 横向移动。
- 拖拽行排序（database：写回 rows 顺序）。

### 5.3 列操作

- 列宽拖拽、列拖拽重排、列隐藏/显示、冻结列、列头右键菜单。
- 新增字段 / 编辑字段（改类型/改选项/删除字段）——复用 database 节点已就位的领域操作（addField / setFieldType / setFieldOptions / removeField，见 database-node-design.md §5.2），表格只做入口与级联提示。

### 5.4 排序 / 筛选 / 分组 / 聚合

- 点击表头排序（单列切换 asc/desc，可多列叠加）。
- 列筛选：text 包含匹配、select/multiSelect 多选、number 区间、date 区间、checkbox 布尔。
- 拖拽分组：多级分组头（groupBy 字段顺序即层级），组头显示计数。
- 聚合：数字列底部合计/平均/计数（可选），分组内小计。
- 搜索高亮（vtable-search）。

### 5.5 选择与批量

- 行复选（checkbox 列）、Shift/Ctrl 范围选择。
- 批量：删除、改字段（统一赋值）、导出选中行。

### 5.6 导出

- 导出当前视图（含排序/筛选/分组后的结果）为 CSV / Excel（vtable-export）。

### 5.7 与图谱联动（collection）

- 点击 relation 单元格 / 行 → onOpenNode 打开图谱节点。
- 行悬停可触发节点高亮（可选，接入 eventHandler）。

---

## 6. 交互与操作方法

| 操作 | 手势/入口 | 结果 |
| --- | --- | --- |
| 切换排序 | 点击列头 | 单列 asc/desc |
| 多列排序 | Shift+点击列头 | 追加排序列 |
| 进入编辑 | 双击单元格 | 对应编辑器 |
| 提交/取消 | Enter / Esc | 写回或放弃 |
| 移动编辑 | Tab / Shift+Tab | 横向移动 |
| 新增行 | 工具条「+ 行」或末行快捷 | 追加空行并聚焦主列 |
| 删除行 | 选中后工具条「删除」/ Del | 二次确认后删除 |
| 列操作 | 列头右键菜单 | 隐藏/冻结/排序/筛选 |
| 改字段 | 列头右键「编辑字段」 | 打开字段配置弹层 |
| 分组 | 拖列头到分组区 | 按字段分组 |
| 筛选 | 列头筛选图标 | 条件过滤 |
| 多选 | 复选框 / Shift 范围 | 批量操作 |
| 导出 | 工具条「导出」 | 下载 CSV/Excel |
| 打开节点 | 点击 relation/行（collection） | onOpenNode |

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
3. 编辑器注入：select/multiSelect/date 用 vtable-editors 的编辑组件，options 从字段 options 派生。
4. relation 单元格：显示被引节点标题（用 useDataStore 取 nodes，缓存 title 解析），点击跳节点。
5. 主题映射：themeTokens（浅/深）→ VTable theme（背景/文本/边框/强调色），跟随 next-themes。
6. 分组/筛选/排序态回写 config，保证切换视图回来不丢。
7. 字段级联：删除字段/改类型由聚合级联（removeField 删整列、setFieldType 清整列），表格只提示「将清空该列 N 个值」。

### 8.6 视觉约定（UI 美化落地）

工具条与配置面板**只用 `@workspace/ui` 的 shadcn 组件**，不再出现原生 `<select>` / `<input type="checkbox">` / 手写浮层：

| 场景 | 组件 |
| --- | --- |
| 下拉选择（筛选条件/筛选值/分组/主题） | `Select` |
| 布尔设置（行为开关） | `Switch`；列显隐等多选 `Checkbox` |
| 2–4 个互斥选项（行密度） | `ToggleGroup`（+ `Tooltip` 说明） |
| 计数与状态标签 | `Badge` |
| 带内嵌操作的搜索框 | `InputGroup` + `InputGroupAddon` / `InputGroupButton` |
| 浮层 / 菜单 / 提示 / 滚动区 | `Popover` / `DropdownMenu` / `Tooltip` / `ScrollArea` |
| 控件分组之间的分隔 | `Separator`（vertical，`h-4 self-center`） |

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

两个坑（工程侧，跟本视图强相关）：

- **Tailwind 默认不扫描 `packages/dataview/src`**：它以 `node_modules` 软链形式被消费，自动内容探测会跳过，于是「只有本包用到」的类（`text-[11px]`、`w-[4.5rem]`、`min-h-9`…）根本不在样式表里——症状是 DOM 正确但布局离谱（列宽输入框退回 `w-full`，字段名被挤成 0 宽、上移/下移按钮被挤出面板）。修复在 `packages/ui/src/styles/globals.css`：`@source "../../../dataview/src/**/*.{ts,tsx}"`；不要把 glob 放宽到 `apps/**`（会扫进 `.next`，dev 编译卡死）。
- 临时验证页 + headless Chromium（CDP）实测：筛选/分组/密度/配置面板/只读/深浅色共 9 项断言通过，画布 9 列 12 行、中文与「Mist + 橙」配色正常。

---

## 9. 边界与取舍

- 虚拟滚动 vs 分页：ListTable 原生虚拟滚动，v1 不引入分页；rowLimit 仅用于超大表降载提示。
- 大表整包写：rows 编辑仍走 NodeService 整包 content 替换（沿用现有取舍），数千行时注意写放大，后续再按行级增量。
- relation 编辑 v1 降级只读：节点选择器依赖图谱弹层，v1 用「显示 + 点击跳转」替代，v2 再上选择器。
- PivotTable 透视暂缓：透视需要维度/指标语义，与 chart 视图职责重叠，v1 表格只做 ListTable；确有需求再在 table 内加「透视模式」。
- 自愈：column.fieldId 失效（字段被删）时从 config 剔除，不崩溃。

---

## 10. 开发任务清单

| # | 任务 | 说明 | 状态 |
| --- | --- | --- | --- |
| T1 | table-schema.ts | rowsToRecords / valueToCell / cellType 映射 | ✅ |
| T2 | TableDataView 壳 | ListTable 生命周期 + 容器 | ✅ |
| T3 | 编辑链路 | vtable-editors 注入 + onCellChange 冒泡 | ✅ |
| T4 | 排序/筛选/分组/搜索 | 事件 + 状态回写 config | ✅ |
| T5 | 列/字段管理入口 | 列头右键菜单 + 字段编辑弹层 | 部分：列头菜单（排序/隐藏/冻结/显示全部）+ 配置面板列管理已完成；**新增/改字段弹层未做**（前端没有可调用的字段领域操作入口） |
| T6 | 批量选择与删除/改字段 | 复选 + 批量动作 | 部分：行选择 + 批量删除 + 新增行已完成；**批量改字段未做** |
| T7 | 导出 | vtable-export CSV/Excel | ✅ |
| T8 | 主题/空态/自愈 | themeTokens 映射 + EmptyState + config 自愈 | ✅ |
| T9 | collection 只读投影 | 复用投影 + 行点击跳节点 | ✅ |

补充说明：

- **行拖拽排序**（§5.2）已实现：拖动行号列的手柄重排，经 `onRowReorder` 冒泡。仅在未启用筛选/渲染上限时生效（否则会静默移动用户看不到的行）。
- **`DataViewRendererProps` 的扩展**：渲染器新增 `onConfigChange`（画布上的排序/列宽/列序写回）、`onRowInsert` / `onRowDelete` / `onRowReorder`、`resolveNodeTitle`。前四项由宿主决定是否提供；`onConfigChange` 仅在宿主传入 `onViewsChange` 时下发。
