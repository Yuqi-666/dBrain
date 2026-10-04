# 图表视图（Chart DataView）设计文档

> 状态：**已实现**（`packages/dataview/src/views/chart/`，@visactor/vchart + @visactor/react-vchart 2.1.7）
> 依赖：[README.md](./README.md)、../database-node-design.md
> 相关：gantt.md / calendar.md（同一套「字段即角色」的配置面板）、table.md（同一套工具栏语言）

---

## 0. 实现现状与关键决策

```text
views/chart/
├── chart-data-view.tsx      # 壳：编码解析、数据构建、交互（下钻/打开记录/导出）、空态引导（registry 唯一入口）
├── core/config.ts           # 类型目录（23 种）、字段/度量自愈、色板、CHART_FIXED
├── core/schema.ts           # rows → 序列数据 / 散点 / 层级树 / 桑基链接 / 单值
├── core/spec.ts             # 配置 + 数据 → VChart spec（唯一说 VChart 词汇的模块）
├── core/theme.ts            # tokens → VChart 主题（type/background/fontFamily/padding）
├── board/chart-surface.tsx  # memo 包裹的 <VChart spec>：onReady / onClick / 水波图注册
├── board/chart-readout.tsx  # 单值图（仪表盘/水波/进度）的 DOM 读数
└── toolbar/chart-toolbar.tsx# 图表（类型）/ 字段配置（角色）/ 视图（标题·排序·TopN·交互·样式）
```

**注册表里没有 `configEditor`**：图表 / 字段配置 / 视图 三个面板覆盖了
`ChartViewConfig` 里用户能决定的每一项，所以像表格 / 看板 / 日历 / 甘特图一样省略
兜底的「视图配置」弹层（`views/chart/config-editor.tsx` 已删除）。

**图表视图不写数据。** 它只读 `source`，没有 `onCellChange` / `onRowInsert` /
`onRowReorder` 通路 —— 图表里没有可编辑的图元，`onConfigChange` 是它唯一的写路径
（下钻态是视图内局部状态，不落库）。

### 0.1 范围：为什么是这 23 种，而不是「全类型」

设计稿（§2）列了 VChart 的 34 种类型。真正落地的是一份**能只凭归一化 fields + rows
画出来**的目录（`CHART_TYPES`），按用途分六组：

| 分组 | 类型                                                                                                                                                      |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 比较 | 柱状图 `bar`、条形图 `bar`+`direction:horizontal`、区间柱状图 `rangeColumn`                                                                               |
| 趋势 | 折线图 `line`、面积图 `area`、堆叠面积图 `area`+`stack`、区间面积图 `rangeArea`                                                                           |
| 占比 | 饼图 `pie`、环形图 `pie`+`innerRadius`、玫瑰图 `rose`、漏斗图 `funnel`、词云 `wordCloud`、矩形树图 `treemap`、旭日图 `sunburst`、圆填充图 `circlePacking` |
| 分布 | 散点图 `scatter`、热力图 `heatmap`、雷达图 `radar`                                                                                                        |
| 仪表 | 仪表盘 `gauge`、水波图 `liquid`、环形进度 `circularProgress`、线性进度 `linearProgress`                                                                   |
| 关系 | 桑基图 `sankey`                                                                                                                                           |

**故意不做**（chart.md §8 的取舍，逐条有理由）：3D 变体（`bar3d` / `pie3d` / …）需要额外
注册与视觉校验；`map` 需要地理 JSON 资源；`histogram` / `boxPlot` / `mosaic` /
`correlation` / `venn` 需要另一种统计形状（分箱、四分位、集合）；`sequence` 有自己的
事件 schema。每一种都只是**目录里加一行 + `spec.ts` 加一个分支**，主干不假设这个列表是封闭的。

### 0.2 必须知道的坑（都在浏览器里实测过）

1. **层级图的数据必须是「根的数组」。** 类型上 `IHierarchyDataValues.values` 是单个
   `IHierarchyNodeData`，但运行时 `dataToDataView` 对非数组的 `values` 直接
   `parse([])` 并 warn `values should be array`，而 vlayouts 的 `flattenNodes` 第一行就是
   `nodes.forEach`。传对象 = 白板一张（无报错）。`spec.ts` 因此写 `values: [root]`。
2. **热力图必须显式声明两条 `band` 轴。** heatmap 的 series 把 x/y 都算作*维度*、把
   `valueField` 算作度量，而坐标轴类型是**从绑定到它的字段推断**的：不写 `axes` 时度量会被
   绑到 y 轴，格子变成线性 0–1 轴顶上的一排细条（实测）。`axes: [{orient:'bottom',type:'band'},
{orient:'left',type:'band'}]` 是把它变回网格的那一刀。顺带：连续色带图例的标题默认是
   内部 series key（`heatmap__69`），要给 `legends.title.text` 才显示「金额」。
3. **柱状图的 `seriesField` 默认是「堆叠」而不是「并排」。** VChart 的堆叠是隐式规则
   （同 band、同系列类型即堆叠），官方的分组柱状图靠 `xField: [分类, 系列]`。所以
   `bar` 在有系列拆分时把系列写成 band 的第二维（横向条形则写 `yField`）；堆叠是另一个
   目录项（堆叠面积图），柱状图不兼职。
4. **玫瑰图的 `seriesField` 必须等于维度字段**（库的文档配方）。玫瑰图的**角度**按分类等分、
   **半径**表示度量；不给 `seriesField` 时所有扇区共用一条系列、共用一种颜色，于是「角度相等、
   半径不同」的扇形看起来就是一坨蓝色（实测）。给了之后每个分类各自成系列，颜色与图例才对。
5. **`liquid` 不在 `@visactor/vchart` 主入口的注册表里。** `vchart-all` 注册了除水波图以外的
   所有类型（只有 react-vchart 的 `<LiquidChart>` 会注册它），直接用通用 `<VChart spec>`
   构造 `type: 'liquid'` 会抛 `init chart fail`。`board/chart-surface.tsx` 在模块作用域补了
   一次 `registerLiquidChart`（`useRegisters` 是静态注册函数，别名调用以免被当成 React Hook）。
6. **桑基图的 `nodeKey` 必须命名。** 给了 `nodes` 之后，sankey 布局用 `nodeKey`（**默认是节点
   下标**）建 `nodeMap`，然后丢掉所有端点不在 map 里的 link —— 字符串端点 + 数字 key = 所有
   link 被静默丢弃，白板一张。`nodeKey: "name"` 之后正常。
7. **仪表 / 进度 / 水波图没有 `indicator`。** VChart 只给 `gauge` 与 `pie` 系列配了
   `indicator`，`circularProgress` / `linearProgress` / `liquid` 连文字标记都没有，画布上
   只有一段弧（进度类还默认把值轴钉死在 `0…1`）。因此单值图**统一按 0–1 比例编码**，
   绝对数字由 `board/chart-readout.tsx` 用 DOM 画在画布之上（`pointer-events: none`，
   手势仍然落到画布；配色跟随 `--foreground`/`--muted-foreground`，深浅色都对）。
8. **VChart 内置的 `dark` 主题只是一个色板替换。** 组件颜色都走
   `{ type: "palette", key: … }`，所以 `theme.type` 已经够用；但背景与字体它不知道。
   `core/theme.ts` 只补 `type` / `background`（应用自己的 `bg-background` 字面量）/
   `fontFamily`（`resolveCanvasFontFamily` 取到 next/font 哈希后的真实字体栈）/ `padding`，
   作为 spec 的 `theme` 字段传入 —— 放进 `options` 的话主题切换不会生效（`options` 只在
   构造时读）。
9. **`onReady` 每次渲染都会调用、`onClick` 每次渲染都会重新绑定。** surface 里的回调因此
   全部是稳定引用，壳的活值（config、recordActions）通过 ref 读；`kind` 之外的
   `onReady(instance)` 只是把实例存进 ref，供工具条的「导出图片」调用
   （`chart.exportImg(name)`，名字取 标题 → 节点名 → kind）。
10. **结构变了要重挂，数据变了只更新。** surface 的 `key` 是
    `chartType + 编码字段 + 数据形状`（`ChartBundle.structureKey`），所以换类型 / 换字段 /
    换层级会重建实例（跨类型 morph 不是库的承诺），而行变化走 `updateSpecSync`
    的深比较（react-vchart 自己 `isEqual` 后决定是否真的更新）。

### 0.3 数据形状

`core/schema.ts` 是唯一读单元格的地方，按类型的 `shape` 分成五条通路：

| shape                               | 类型                                           | 产出                                                         |
| ----------------------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| `cartesian` / `polar` / `wordCloud` | 柱/条/折线/面积/区间/饼/环/玫瑰/漏斗/雷达/词云 | 长表：`{维度, 系列, 数值}`（区间图是**宽表**：一个度量一列） |
| `heatmap`                           | 热力图                                         | 同上，`yField` 取系列列（= 第二维度）                        |
| `scatter`                           | 散点图                                         | 行级点，不做聚合，缺 x/y 的行丢弃                            |
| `hierarchy`                         | 树图/旭日/圆填充                               | 按 `层级` 顺序真正嵌套的树，叶子带度量聚合值                 |
| `sankey`                            | 桑基图                                         | 按 `来源 → 目标` 聚合的 `{nodes, links}`                     |
| `single`                            | 仪表/水波/进度                                 | 单值 + `niceMax` 自动量程 + 0–1 比例                         |

两条通用规则：

- **系列来源有优先级**：选了 `系列字段` 就按它拆（此时只画第一个度量，第二个度量需要第二条
  数值轴，那是另一种图）；没选系列时，**多个度量自己成为系列**（并排 / 堆叠），这也是
  「金额 + 成本」默认就能并排的原因。
- **排序 / 前 N 条作用在「维度分组」上**，不是数据点：Top-N 的语义是「金额最大的 10 个分类」。
  没有显式排序时，日期维度按时间升序（用单元格里的 ISO 值排序，而不是本地化后的显示文本），
  其它维度保持首次出现顺序，并列时也保持首次出现顺序（避免每次渲染顺序抖动）。

### 0.4 交互

| 操作         | 手势/入口                                                  | 结果                                                                                                          |
| ------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --- | ------------------ |
| 切换类型     | 「图表」面板的类型选择器                                   | 换图并**收敛配置**：新类型读不了的角色会被清掉（饼图不留两个度量、散点不留维度）                              |
| 改编码       | 「字段配置」的 维度 / 系列 / X·Y / 层级 / 来源·目标 / 度量 | 重新聚合渲染（折叠成度的配置项都在这里，字段列表只**标注**角色）                                              |
| 下钻         | `点击行为 = 下钻筛选` 时点图元                             | 图内按该图元的值重新聚合，工具条出现「已完成 · 北京 ×」的 chip；再点同一图元或点 × 清除                       |
| 打开记录     | `点击行为 = 打开记录` 时点图元                             | 走统一的 `useRecordActions().openRecord(rowId, { hiddenFieldIds })`，打开的是**该图元聚合的那些行里的第一行** |
| 悬浮         | 鼠标停在图元上                                             | VChart 自己的 tooltip（「悬浮提示」可关）                                                                     |
| 导出         | 工具条「导出图片」                                         | `chart.exportImg(标题                                                                                         |     | 节点名)`，下载 PNG |
| 排序 / Top-N | 「视图」面板                                               | 按某个度量排序 + 截断到前 N 个分类                                                                            |

**下钻是视图内过滤，不是跨视图联动。** 设计稿（§5）写的是「点击图元 → 过滤源数据，其它视图
同步看到过滤结果」，这需要外壳提供一个「设置行级过滤」的入口；今天 `DataViewRoot` 的
`rowFilter` 只是宿主传进来的静态 prop（README §8），没有 setter，所以本视图把下钻实现为
**自己的数据重聚合**（`ChartDrill` → `buildSeriesData` 只保留命中的分组，聚合值是真的重算的，
不是显示层的遮蔽）。跨视图联动留到外壳给出 `onRowFilterChange` 之后再接。

---

## 1. 概述与使用场景

图表视图把 rows 聚合成统计图表（比较 / 趋势 / 占比 / 分布 / 仪表 / 关系），用于发现数据的
分布、趋势、占比与关系。

- database 节点：对 `number` 字段做聚合（求和/平均/最小/最大/计数），对 select/date/text
  字段做维度切分。
- collection 节点：对节点属性投影做统计（节点类型分布饼图、创建时间趋势折线、负责人词云等）。
- 同一个 database 节点可以同时挂多个图表视图（同一份数据、不同角度），视图之间不共享状态。

---

## 2. 技术选型

`@visactor/vchart` + `@visactor/react-vchart`（2.1.7），与表格 / 甘特图同属 VisActor 栈，
主题语言与 `shared/theme-tokens.ts` 一致。整个依赖只通过 `views/chart/` 的懒加载 chunk
进入应用（`registry.ts` 的 `React.lazy`），只有切到图表视图时才会下载。

---

## 3. 数据转换适配

### 3.1 通用编码模型

维度（分类轴 / 扇区 / 词条）+ 度量（数值）+ 系列（拆分）三件套，聚合算子
`sum / avg / min / max / count`（`count` = 行数，不需要字段；默认配置在没有 number 字段时
就是用 `__count`）。

度量列表是**配置项**（`ChartMeasure[]`：字段 + 聚合 + 别名），不是单值——一个柱状图可以画
「金额求和 + 成本求和」两个系列。

### 3.2 特殊数据形状

见 §0.3 的表格。层级用真正的嵌套（不是把层级字段拼成一个 `"A / B"` 字符串），
桑基用聚合后的 `来源 → 目标` 链接，散点用行级点，单值用 `niceMax` 自动量程。

### 3.3 单元格解析

全部经 `source/cell-resolver.ts`：`displayText` 负责维度文本（select 取选项名、relation 走
宿主的 `resolveNodeTitle`），`toNumber` 负责度量数值（date → epoch、checkbox → 0/1）。
`core/*` 因此不认识字段类型，也不认识 VChart。

---

## 4. 配置项（ChartViewConfig）

```ts
export interface ChartViewConfig {
  chartType: string; // CHART_TYPES 的 id（= VChart type + 少量变体）
  dimensionField?: string; // 维度（分类轴 / 扇区 / 词条 / 层级回退）
  measures: ChartMeasure[]; // 度量列表（字段 + 聚合 + 别名；__count = 计数）
  seriesField?: string; // 系列拆分（heatmap 里是第二维度）

  xMeasure?: string;
  yMeasure?: string; // scatter
  sourceField?: string;
  targetField?: string; // sankey
  hierarchyFields?: string[]; // treemap / sunburst / circlePacking（1–3 层）

  aggregation: ChartAggregation; // 默认聚合（度量的兜底）
  sortBy?: { measureIndex: number; order: "asc" | "desc" };
  limit?: number; // 前 N 条（按维度分组截断）

  title?: string;
  showLegend: boolean;
  showTooltip: boolean;
  showLabel: boolean;
  theme: "light" | "dark" | "auto";
  colorScheme?: string; // 默认 / 明亮 / 柔和 / 冷色 / 暖色 / 大地

  clickAction: "filter" | "open" | "none";
}
```

自愈规则（README §5.1）：字段被删/改类型后，维度回退到「首个单选/多选 → 首个文本 →
首个非数字字段」，度量列表里失效的项被丢弃、全空时回退到「计数」，散点缺 X/Y、热力图缺第二
维度、桑基缺端点、区间图只有一个度量时都走引导空态而不是崩。

**默认配置的差异**：`defaults.ts` 的 `clickAction` 是 `"none"`（不是设计稿的 `"filter"`）。
点一下图就把图过滤掉、尤其在用户还不知道有这个行为时，更像 bug 而不是功能；下钻仍然可选，
选中后工具条的 chip 会明确说出当前过滤了什么。

---

## 5. 功能点

- 23 种图表类型，按六组分类选择（§0.1），字段不匹配时有引导。
- 维度 / 度量（多度量）/ 系列 / 层级 / X·Y / 来源·目标 六种编码角色，按类型动态出现。
- 聚合（count/sum/avg/min/max）+ 排序 + 前 N 条。
- 样式：标题、图例、数据标签、悬浮提示、浅/深色主题、六套色板。
- 下钻筛选（视图内重聚合）、打开记录、导出 PNG。
- 空态 / 字段缺失引导（每一类缺什么就说要选哪个字段，见 §0.1 的 `chartGuidance`）。
- 字段增删改：共享的字段列表（新增字段 / 编辑字段 / 删除字段），删字段会同步清掉它占的角色。

---

## 6. 交互与操作方法

见 §0.4。

---

## 7. 二次开发要点

1. `spec.ts` 是唯一说 VChart spec 的模块，返回 `Record<string, unknown>`（`ISpec` 是
   多种 spec 的联合，逐字面量写会撞上判别属性检查）。新增类型：`CHART_TYPES` 加一行 +
   `buildChartSpec` 加一个分支。
2. 类型元数据（`roles` / `maxMeasures` / `shape` / `variant`）驱动三件事：数据构建走哪条通路、
   `字段配置` 面板显示哪些角色、切换类型时收敛哪些配置。不要在各处再写第二份 switch。
3. 主题只补 VChart 不知道的三件事（背景 / 字体 / padding），其余交给库的 light/dark 色板
   （§0.2 第 8 条）；色板（`CHART_PALETTES`）通过 spec 顶层的 `color` 数组覆盖。
4. 单值图（仪表 / 水波 / 进度）的比例与读数是分开的：画布只画 0–1，数字是 DOM。

---

## 8. 边界与取舍

- **按需而非全类型**：§0.1 的清单与理由。
- **聚合在内存**：rows 全量在前端聚合（与其它视图一致），数万行会有可感知延迟，后续可下推。
- **下钻是视图内过滤**：跨视图联动需要外壳的 `onRowFilterChange`（§0.4），今天没有。
- **`打开记录` 对聚合图元取的是该组的第一行**：图元对应一组行而不是一行，
  「打开记录」只能挑一条；散点图是行级的，所以它天然准确。
- **单值图的量程是自动取整的**（`niceMax`：≤1 → 1，≤100 → 100，否则 10% 余量取整）：
  仪表 / 进度的语义是 KPI 读数，而不是「相对某个配置上限的百分比」。
- **`ChartViewConfig.aggregation` 只作为兜底**：每个度量行有自己的聚合，全局值只在度量没有
  显式聚合时生效（旧配置兼容）。

## 9. 开发任务清单

| #   | 任务                                               | 状态                                   |
| --- | -------------------------------------------------- | -------------------------------------- |
| H1  | `core/schema.ts`：聚合 + 五种数据形状 + 排序/Top-N | ✅                                     |
| H2  | 类型目录（23 种 → 角色 / 形状 / 变体）             | ✅                                     |
| H3  | `core/spec.ts`：配置 + 数据 → VChart spec          | ✅                                     |
| H4  | 类型选择器 + 字段配置 / 视图 面板（动态角色）      | ✅                                     |
| H5  | 点击联动（下钻 / 打开记录）                        | ✅（视图内下钻；跨视图联动待外壳支持） |
| H6  | 导出 PNG + 浅/深主题 + 色板                        | ✅                                     |
| H7  | 跨视图行级过滤（外壳 `onRowFilterChange`）         | ⬜ 未做                                |
| H8  | map / 3D / 统计形状（histogram、boxPlot、…）       | ⬜ 未做                                |
