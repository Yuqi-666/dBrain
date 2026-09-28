# 图表视图（Chart DataView）设计文档

> 状态：设计稿（未实现）
> 依赖：[README.md](./README.md)、../database-node-design.md

---

## 1. 概述与使用场景

图表视图把 rows 聚合成统计图表（柱状/折线/饼图/散点/热力/词云/桑基图等），用于发现数据的分布、趋势、占比与关系。它覆盖 **VChart 全部图表类型**。

使用场景：

- database 节点：对 number 字段做聚合（求和/计数/均值），对 select/date 字段做维度切分，生成各类图表。
- collection 节点：对节点属性投影做统计（节点类型分布饼图、按时间趋势折线、标签词云等）。
- 联动分析：点击图表图元 → 过滤源数据（其它视图同步看到过滤结果）。

---

## 2. 技术选型

采用 **@visactor/vchart** + **@visactor/react-vchart**（React 封装），覆盖全部图表类型。

图表类型全集（来自 VChart 2.x，按用途分组，作为「图表类型选择器」的选项）：

| 分组 | 图表类型 |
| --- | --- |
| 比较 | bar、bar3d、rangeColumn、rangeColumn3d、waterfall、histogram、histogram3d、boxPlot、mosaic |
| 趋势 | line、area、rangeArea |
| 占比/构成 | pie、pie3d、rose、funnel、funnel3d、treemap、sunburst、circlePacking、venn、wordCloud、wordCloud3d、liquid |
| 分布/关系 | scatter、correlation、heatmap、radar |
| 仪表/进度 | gauge、circularProgress、linearProgress |
| 其他 | map、sankey、sequence |

> 每种类型的 spec 结构不同，配置面板按「类型分组 + 字段编码」动态生成；map 需要地理数据、sankey 需要 source/target 关系字段、wordCloud 需要 text+weight，这些「特殊数据形状」单独适配（见 §3.2）。

---

## 3. 数据转换适配

### 3.1 通用编码模型

多数图表遵循「维度（分类轴）+ 度量（数值轴）+ 序列（拆分）」模型，据此把 rows 聚合：

~~~ts
// packages/dataview/src/views/chart/chart-schema.ts
export function rowsToChartData(source: DataViewSource, config: ChartViewConfig): ChartDatum[] {
  const groups = groupBy(source.rows, (row) => CellResolver.displayText(row.cells[config.dimensionField], dimField));
  return Array.from(groups, ([key, rows]) => {
    const datum: ChartDatum = { [config.dimensionField]: key };
    for (const m of config.measures) {
      datum[m.fieldId] = aggregate(rows, m.fieldId, m.aggregation);  // count/sum/avg/min/max
    }
    return datum;
  });
}

function aggregate(rows, fieldId, op) {
  const vals = rows.map((r) => CellResolver.toNumber(r.cells[fieldId])).filter((v) => v != null);
  if (op === "count") return rows.length;
  if (op === "sum")   return vals.reduce((a, b) => a + b, 0);
  if (op === "avg")   return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  if (op === "min")   return vals.length ? Math.min(...vals) : 0;
  if (op === "max")   return vals.length ? Math.max(...vals) : 0;
}
~~~

- dimensionField：维度（text/select/date/multiSelect），作分类轴/扇区。
- measures：度量列表，每个 { fieldId, aggregation }（number 字段聚合，或 count 计数）。
- seriesField（可选，select）：拆分系列（多序列/堆叠/图例）。
- sort / limit：按度量排序、Top-N 截断。

### 3.2 特殊数据形状适配

| 图表类型 | 需要的字段编码 | 适配 |
| --- | --- | --- |
| scatter / correlation | x 度量 + y 度量（两 number 字段） | 不做聚合，行级点 |
| heatmap | 两个维度 + 度量（聚合） | 双维度分组 |
| sankey | source 字段 + target 字段 + weight（relation/text + number） | 用 relation 字段做 source/target（或两 text 字段） |
| wordCloud | text 字段 + weight（可选 number） | 按 text 分组计数 |
| map | 地理维度字段 + 度量 | 需引入地图 JSON 资源（可选，v1 视需要） |
| gauge / liquid / progress | 单度量 | 取聚合后的单值 |
| treemap / sunburst / circlePacking | 多级维度（多 select/text 字段层级） | 按字段顺序嵌套分组 |

> 配置面板按图表类型动态展示「需要哪些字段」，并校验字段类型是否匹配；不匹配的图表类型在「类型选择器」里置灰提示。

---

## 4. 配置项（ChartViewConfig）

~~~ts
export interface ChartViewConfig {
  chartType: VChartType;            // 见 §2 类型全集
  dimensionField?: string;          // 维度（分类轴/扇区/分组）
  measures: ChartMeasure[];         // 度量列表
  seriesField?: string;             // 系列拆分字段（select）
  // 特殊形状扩展
  xMeasure?: string; yMeasure?: string;      // scatter/correlation
  sourceField?: string; targetField?: string; // sankey
  hierarchyFields?: string[];                // treemap/sunburst/circlePacking 层级

  aggregation: "sum" | "avg" | "count" | "min" | "max"; // 默认聚合
  sortBy?: { measureIndex: number; order: "asc" | "desc" };
  limit?: number;                   // Top-N

  // 样式
  title?: string;
  showLegend: boolean;
  showTooltip: boolean;
  showLabel: boolean;
  theme: "light" | "dark" | "auto";
  colorScheme?: string;             // VChart 色板

  // 交互
  clickAction: "filter" | "open" | "none";   // 点击图元：联动过滤 / 打开记录 / 无
}

export interface ChartMeasure {
  fieldId: string;                  // number 字段，或 "__count" 表示计数
  aggregation?: "sum" | "avg" | "min" | "max";  // 缺省用 config.aggregation
  alias?: string;                   // 图例/轴别名
}
~~~

默认配置（defaultConfig）：chartType bar、dimensionField 取首个 select/text 字段、measures 取首个 number 字段求和（无 number 则 count）、clickAction filter。

---

## 5. 功能点

- 覆盖 VChart 全部图表类型（§2 列表），类型选择器按分组 + 字段可用性过滤。
- 维度/度量/系列字段编码 + 聚合（count/sum/avg/min/max）。
- 排序 + Top-N 截断。
- 样式：标题、图例、tooltip、数据标签、色板、浅/深主题。
- 点击联动：点击图元 → 按维度值过滤源 rows（经 DataViewRoot 的 use-row-filter，其它视图同步），再次点击清除。
- 悬浮 tooltip、图例开关（隐藏系列）。
- 导出 PNG（vchart 导出 API）。
- 空态/字段缺失引导。

---

## 6. 交互与操作方法

| 操作 | 手势/入口 | 结果 |
| --- | --- | --- |
| 选择类型 | 类型选择器 | 切换图表类型（按需重配字段） |
| 改字段编码 | 配置面板维度/度量/系列 | 重新聚合渲染 |
| 联动过滤 | 点击图元 | 过滤源数据（其它视图同步） |
| 清除过滤 | 再次点击/清除按钮 | 恢复全量 |
| 图例开关 | 点击图例项 | 隐藏/显示系列 |
| 导出 | 工具条「导出图片」 | 下载 PNG |
| 详情 | 悬浮图元 | tooltip |

---

## 7. 二次开发要点

1. 用 react-vchart 的 <VChart spec={spec} /> 声明式渲染；spec 由 ChartViewConfig + rowsToChartData 动态生成。
2. 类型选择器：维护「图表类型 → 字段需求」的元数据表，驱动配置面板动态表单与校验。
3. 聚合/分组集中在 chart-schema.ts，避免各图表重复写。
4. 点击联动：监听 VChart click 事件，取图元对应的维度值，调用 DataViewRoot 的行级过滤（use-row-filter）。
5. 导出：调 vchart 实例的导出 API（getImageBuffer 或内置 toolbar 导出）。
6. 主题：themeTokens → VChart 的 theme（light/dark）。

---

## 8. 边界与取舍

- 全类型但按需：34 种类型都注册可选，但字段不匹配的置灰（不做「万能适配」）；特殊形状（map/sankey 等）单独走 §3.2 适配。
- map 需地理数据资源：v1 可选引入地图 JSON，非必需。
- 聚合在内存：行级聚合在前端做（rows 全量在内存），超大表（数万行）聚合可能有延迟，后续可下推。
- 联动过滤是只读过滤：不改数据，只改「当前视图看到哪些行」。

---

## 9. 开发任务清单

| # | 任务 | 说明 |
| --- | --- | --- |
| H1 | chart-schema.ts | rowsToChartData + aggregate + 特殊形状适配 |
| H2 | 类型元数据表 | 34 类型 → 字段需求映射 |
| H3 | spec 生成器 | ChartViewConfig → VChart spec |
| H4 | 类型选择器 + 配置面板 | 动态表单 + 校验 |
| H5 | 点击联动 | 图元 → use-row-filter |
| H6 | 导出 + 主题 | PNG 导出 + themeTokens |
