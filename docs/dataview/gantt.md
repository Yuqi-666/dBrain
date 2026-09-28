# 甘特图视图（Gantt DataView）设计文档

> 状态：设计稿（未实现）
> 依赖：[README.md](./README.md)、../database-node-design.md

---

## 1. 概述与使用场景

甘特图视图把 rows 里带起止日期的任务/计划画成时间轴条形图，直观展示时间跨度、进度与（可选的）分组。它是「项目排期、任务计划、里程碑」类数据的时间线形态。

使用场景：

- database 节点：字段含 date 起止（开始日 + 结束日）与 number 进度（0–1），做排期管理。
- 计划调整：拖拽条形改起止日期、拖边缘改时长、读进度条。
- 分组概览：按 select 字段（阶段/负责人/分类）分组展开。

> collection 节点（节点属性投影）缺少「起止日期 + 进度」语义，v1 默认不开放 gantt（能力矩阵标记 ⚠️）；若后续需要可用 __createdAt/__updatedAt 近似，但价值有限。

---

## 2. 技术选型

采用 **@visactor/vtable-gantt**（VTable 官方甘特图组件），与表格视图同源（VRender Canvas），主题/交互一致。

| 方案 | 说明 |
| --- | --- |
| 首选：@visactor/vtable-gantt | 官方甘特组件，时间轴 + 分组 + 拖拽内置 |
| 兜底：ListTable + progressbar 单元格 + customLayout JSX | 当 vtable-gantt 功能/稳定性不足时，用 ListTable 自定义布局自绘时间轴条 |

> 优先评估 vtable-gantt 的拖拽写回与分组能力；若其对「行数据 → 甘特任务」的适配成本过高，切换到兜底方案（表格视图已具备 ListTable 封装，可复用）。

---

## 3. 数据转换适配

### 3.1 rows → tasks

~~~ts
// packages/dataview/src/views/gantt/gantt-schema.ts
export function rowsToTasks(source: DataViewSource, config: GanttViewConfig): GanttTask[] {
  return source.rows
    .map((row) => {
      const start = CellResolver.toDate(row.cells[config.startField]);
      const end = CellResolver.toDate(row.cells[config.endField]);
      if (!start) return null;                        // 无开始日期跳过
      return {
        id: row.id,
        name: CellResolver.displayText(row.cells[config.titleField], titleField, resolveNodeTitle) || "未命名",
        startDate: start,
        endDate: end ?? start,                        // 无结束日按单日
        progress: config.progressField
          ? (CellResolver.toNumber(row.cells[config.progressField]) ?? 0)
          : 0,
        group: config.groupByField
          ? CellResolver.displayText(row.cells[config.groupByField], groupField)
          : undefined,
      };
    })
    .filter(Boolean);
}
~~~

- startField（date，必需）、endField（date，可选，无则单日）、titleField（text，默认主列）、progressField（number 0–1，可选）、groupByField（select，可选）。
- 进度超界钳制到 [0, 1]；日期非法/缺失时跳过或按单日降级。

### 3.2 拖拽写回

- 拖动条形平移 → 写回 startField（与 endField，保持时长不变）。
- 拖动条形右边缘 → 写回 endField（改时长）。
- 分组只影响展示层级，不写数据。

---

## 4. 配置项（GanttViewConfig）

~~~ts
export interface GanttViewConfig {
  startField: string;               // 必需：开始日期字段（date）
  endField?: string;                // 可选：结束日期字段（date）
  titleField: string;               // 任务名（text，默认主列）
  progressField?: string;           // 进度字段（number 0–1）
  groupByField?: string;            // 分组字段（select）

  viewMode: "day" | "week" | "month";  // 时间轴粒度
  rowHeight: number;
  showTodayLine: boolean;           // 今日线
  showWeekends: boolean;            // 周末标记
  minDate?: string; maxDate?: string; // 时间轴范围（默认自动）
  editable: boolean;                // 拖拽写回开关（collection 恒 false）
  theme: "light" | "dark" | "auto";
}
~~~

默认配置（defaultConfig）：startField 取首个 date、titleField 取主列、viewMode week、editable = !readOnly。

---

## 5. 功能点

- 时间轴条形：起止跨度 + 进度填充 + 任务名标签。
- 时间粒度切换：日 / 周 / 月。
- 拖拽平移改起止、拖边缘改时长（database 可编辑）。
- 分组折叠/展开（按 select 字段）。
- 今日线、周末标记、当前时间范围标题。
- 点击任务 → onOpenRecord（打开记录详情）。
- 悬浮提示：起止日期、进度、标题。

---

## 6. 交互与操作方法

| 操作 | 手势/入口 | 结果 |
| --- | --- | --- |
| 改起止 | 拖拽条形 | 写回 start/end 字段 |
| 改时长 | 拖右边缘 | 写回 end 字段 |
| 缩放粒度 | 工具条日/周/月 | 切换时间轴 |
| 展开分组 | 分组头点击 | 折叠/展开 |
| 打开记录 | 点击任务 | onOpenRecord |
| 详情 | 悬浮任务 | 起止/进度/标题 |

---

## 7. 二次开发要点

1. 评估 vtable-gantt 的 Option 形状，把 GanttTask 映射为其 task 数据；记录实例引用，卸载 release。
2. 拖拽/缩放事件 → 还原 date 单元格 → onCellChange（start/end 字段）。
3. 分组字段 → vtable-gantt 的分组维度（若无原生分组，用 ListTable 兜底 + customLayout 自绘分组头）。
4. 进度字段 → 条形进度（0–1）；钳制非法值。
5. 主题复用表格视图的 themeTokens 映射。

---

## 8. 边界与取舍

- 无依赖关系（甘特前置任务连线）：rows 之间无「依赖」字段，v1 不做任务间连线；后续可用 relation 字段指向同表行实现。
- 无资源维度：不按人/泳道分（premium 语义），用 groupByField 近似。
- 兜底方案：vtable-gantt 若不满足，回退 ListTable + progressbar + customLayout（自绘时间轴），工作量增大但可控。
- collection 默认关闭：节点投影缺起止/进度字段，价值有限。

---

## 9. 开发任务清单

| # | 任务 | 说明 |
| --- | --- | --- |
| G1 | 评估 vtable-gantt | 验证任务映射/拖拽/分组能力 |
| G2 | gantt-schema.ts | rowsToTasks + 日期/进度钳制 |
| G3 | GanttDataView 壳 | vtable-gantt 实例生命周期 |
| G4 | 拖拽写回 | 平移/缩放 → onCellChange |
| G5 | 分组/粒度/今日线 | 呈现选项 |
| G6 | 兜底方案（如需要） | ListTable + customLayout 自绘 |
