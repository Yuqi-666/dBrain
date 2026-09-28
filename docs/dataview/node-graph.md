# 节点图视图（Node Graph DataView）设计文档

> 状态：设计稿（未实现）
> 依赖：[README.md](./README.md)、packages/graph/AGENTS.md、../database-node-design.md

---

## 1. 概述与使用场景

节点图视图把 collection 选中的图谱节点直接画成力导向图，复用现有 @workspace/graph 的 <Graph /> 组件。它是 collection 节点的「原生」视图，展示节点之间的真实边关系。

使用场景：

- collection 节点：查看被筛选出的节点及其连边拓扑，拖拽、缩放、悬停预览、点击打开节点。
- 图谱导航：在 collection 内直接浏览子图，不离开 node-content 编辑器。

> **只在 collection 节点出现**（database 的行不是图谱节点，无图可画）。nodeGraph 描述符 nodeTypes 为 ["collection"]。

---

## 2. 技术选型

**复用 @workspace/graph 的 <Graph /> 组件**，不新写图渲染逻辑。

<Graph /> 的路由契约（见 packages/graph/src/graph.tsx）：接收 viewId 或 view（graph 的 View 类型），按 view.viewType 路由到 ForceGraph / FlowGraph，并用 view.filterConfig 过滤 nodes/edges。节点图视图只构造一个临时 View 传给它即可。

~~~tsx
// packages/dataview/src/views/node-graph/node-graph-data-view.tsx
import { Graph } from "@workspace/graph";
import type { View } from "@workspace/interfaces";

export function NodeGraphDataView({ source, config }: Props) {
  const view: View = useMemo(() => ({
    id: `nodegraph:${source.nodeId}`,       // 临时视图 id（不入库）
    name: config.name ?? "节点图",
    viewType: config.viewType,                // 默认 "Force"（Flow 为占位壳）
    visualConfig: config.visualConfig,
    filterConfig: source.filterConfig ?? {},  // ← collection 的 filterConfig
  }), [source, config]);

  return <Graph view={view} className="h-full w-full" />;
}
~~~

---

## 3. 数据转换适配

collection 的 filterConfig 原样作为 graph View 的 filterConfig 传入，<Graph /> 内部用 filterByViewFilterConfig 完成 nodes/edges 过滤：

- selectedNodes → 直接纳入行集。
- ruleGroup → 规则过滤的并集。
- 二者求交（与 collection 投影规则一致，见 README §4.2）。

> 节点图视图不消费 fields/rows，只消费 filterConfig；这是它与其余 6 个视图最大的不同。

---

## 4. 配置项（NodeGraphViewConfig）

~~~ts
export interface NodeGraphViewConfig {
  viewType: "Force" | "Flow";        // 复用 graph 的 ViewType（Flow 为占位壳，默认 Force）
  visualConfig: VisualConfig;        // 复用 graph 的 VisualConfig（背景/网格/小地图/吸附）
  name?: string;                     // 视图名（默认「节点图」）
  showFilterEntry: boolean;          // 是否显示「编辑过滤」入口（跳 collection 过滤编辑）
}
~~~

> 过滤配置本身不在 nodeGraph config 里维护——它由 collection.content.filterConfig 唯一持有，节点图视图只读它；要改过滤，走 collection 的过滤编辑入口，避免同一份 filterConfig 出现两处写点。

---

## 5. 功能点

全部继承自 @workspace/graph（Force 模式）：

- 力导向布局（d3-force in WebWorker + OffscreenCanvas）。
- 平移 / 缩放 / 拖拽节点。
- 悬停预览（PreviewBlock）、单击选中、双击打开节点（onEditNode）。
- 画布右键菜单（新增边等）。
- Alt 拖拽建边、Ctrl 框选、Shift 加选（force 修饰键策略）。
- 背景网格 / 小地图 / 吸附（visualConfig）。
- 节点位置种子读取（跨视图切换不重置布局）。

> Flow 模式目前是占位壳（见 graph/AGENTS.md），nodeGraph 视图默认只暴露 Force；Flow 重建后自动可用。

---

## 6. 交互与操作方法

| 操作 | 手势/入口 | 结果 |
| --- | --- | --- |
| 平移画布 | 空白拖拽 | 移动视口 |
| 缩放 | 滚轮 | 缩放 |
| 拖节点 | 拖节点 | 移动节点 |
| 悬停预览 | 悬停节点 | PreviewBlock |
| 打开节点 | 双击节点 | onEditNode（跳节点编辑器） |
| 选中 | 单击 / Ctrl 框选 / Shift 加选 | 选中态 |
| 建边 | Alt 拖拽 | 创建边 |
| 编辑过滤 | 工具条入口 | 打开 collection 过滤编辑 |

---

## 7. 二次开发要点

1. 仅一行封装：构造临时 View 传给 <Graph />；不触碰 graph 内部（eventHandler / store 由 graph 自管）。
2. 临时 View 的 id 用稳定派生 id（如 nodegraph:<nodeId>），避免每次渲染新建导致 graph 内部 viewId 抖动。
3. 高度自适应：node-content 编辑器给 <Graph /> 一个确定高度的容器（否则 Canvas 尺寸为 0）。
4. 过滤编辑入口：showFilterEntry 时提供按钮，跳转 collection 的 filterConfig 编辑（复用现有 filter 面板）。

---

## 8. 边界与取舍

- 只读 vs 图内编辑：节点图视图内建边/移动等操作走 graph 既有逻辑，写的是图谱节点/边（不是 collection 过滤）；「增删 collection 成员」通过 filterConfig.selectedNodes 编辑完成，不在此视图内做。
- 过滤唯一写点：filterConfig 只由 collection content 持有，nodeGraph 只读，避免双写。
- Flow 占位：v1 只有 Force 可用；Flow 重建后 nodeGraph 自动获益。
- 不缓存图实例：切换视图即卸载 <Graph />（graph 内部清理），不保活。

---

## 9. 开发任务清单

| # | 任务 | 说明 |
| --- | --- | --- |
| N1 | node-graph-data-view.tsx | 临时 View 构造 + <Graph /> 封装 |
| N2 | 注册 nodeGraph 描述符 | nodeTypes: ["collection"] |
| N3 | 过滤编辑入口 | 跳 collection filterConfig 编辑 |
| N4 | 高度容器 | node-content 给足高度 |
