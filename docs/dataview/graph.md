# 节点图视图（Graph DataView）设计文档

> 状态：**已实现**（`packages/dataview/src/views/graph/`，直接集成 `@workspace/graph` 的 `<Graph />`）
> 依赖：[README.md](./README.md)、`packages/graph/AGENTS.md`、../database-node-design.md
> 视图类型字面量：`graph`（旧名 `nodeGraph` 由 `normalizeDataViewType` 归一化）

---

## 0. 实现现状与关键决策

```text
views/graph/
├── graph-data-view.tsx        # 壳：合成 View（memo + structureKey）、空态引导（registry 唯一入口）
├── core/config.ts             # 布局模式表、背景样式表、viewType/visualConfig 自愈、hasActiveFilter
├── core/schema.ts             # source + config + tokens → 合成 View；graphStructureKey
├── board/graph-surface.tsx    # memo 包裹的 <Graph view={…} />（library 组件的唯一挂载点）
└── toolbar/graph-toolbar.tsx  # 布局 / 视图 两个面板（功能区只剩外壳的「更多」）
```

**这是唯一一个「消费的不是自己的 fields/rows」的视图。** collection 的行**就是**图谱节点，所以
视图把宿主的 `filterConfig` 原样交给 `<Graph />`，由库自己去过滤数据 store 里的 nodes/edges
（§3）。视图本身只决定「怎么画」：布局 + 背景。

**注册表里没有 `configEditor`**：布局 / 视图 两个面板覆盖了 `GraphViewConfig` 的两个键，所以像
表格 / 看板 / 日历 / 甘特图 / 图表一样省略兜底的「视图配置」弹层
（`views/graph/config-editor.tsx` 已删除）。

**「编辑过滤」不在这个视图里，也不在任何视图里 —— 它是宿主的。** 过滤属于 collection 节点的
content，而且它决定的是**整个投影**：同一个 collection 里表格 / 看板 / 日历 / 节点图画的都是同一份
过滤后的节点集。所以这个入口是**宿主的控件**，通过 `DataViewRoot` 的宿主槽 `tabActions`
钉在**视图页签栏的最右侧**（`packages/ui/.../content/collection-node-content.tsx`：
`tabActions={<Button>编辑过滤</Button>}`，点开 `<CollectionFilterDialog>`，保存走
`patchContent({ filterConfig })`），对所有视图一视同仁 —— 外壳只留位置，不管这个控件是什么。

数据视图这一侧因此**没有**任何过滤入口、也没有 `onEditFilter` 之类的回调：视图只拿到已经过滤好的
`source`（节点图是例外——库自己按 `filterConfig` 过滤 store）。这就是「视图只负责数据的渲染」的
边界：**宿主的 content 怎么写、由宿主自己的 UI 决定**（README §3.4）。

### 0.1 必须知道的坑（都在浏览器里实测过）

1. **筛选变化必须重挂 `<Graph />`，这是本视图最要紧的坑。** `ForceGraph` 只在**视图 id 变化**时
   重新整量同步（`useEffect([viewId, view, performFullSync])` 里判的是 `viewIdChanged`）；同一个
   id 换一个 `View` 对象只更新样式与 diff 谓词，而它的 diff 通道**只能加/更新、不能删**。实测：
   画布上 14 个节点，过滤改成只选 4 个并保存后，画布**仍然画着 14 个**（而 `source.rows` 已经是
   4）。因此壳把 `<GraphSurface>` 用 `graphStructureKey`（`view.id | viewType | JSON(filterConfig)`）
   做 `key` —— 结构变了就重建管线，位置仍从稳定的 view id 里读回，布局不会被打乱。
2. **合成 view id 必须稳定派生。** 库用 `stateData.client.position[viewId]` 读写节点位置：id 每次
   渲染都变会清空布局，并给每个节点的 state 塞进一条新记录。本视图用
   `dataview:graph:<nodeId>`（`core/schema.ts`），并且**故意加 `dataview:` 命名空间**，避免和真正的
   工作区视图 id 撞车。
3. **画布容器必须有确定高度。** `<Graph />` 的 `<canvas>` 用容器尺寸建 `OffscreenCanvas`，容器高度
   为 0 时什么都不画；库自己用 `ResizeObserver` + 150ms 去抖跟尺寸（实测在 1200×80vh 的
   Radix `Dialog` 里也正确：画布 446×530，与对话框一致，不溢出）。
4. **`VisualConfig` 上只有三个键真的生效。** force 管线读的是 `backgroundColor` / `gridColor` /
   `backgroundStyle`；`snapToGrid` / `gridSpacing` / `showMinimap` 在 `packages/graph` 里**一次都
   没被读过**（`showMinimap` 只是 `ForceGraphProps` 上的一个未使用 prop）。所以「视图」面板只给
   网格 / 点阵 / 无三项，不给会骗人的开关。
5. **主题只能从 tokens 注入，不能靠 CSS 变量。** canvas / worker 读不了 `var(--token)`，所以
   `core/config.ts` 把 `DataViewThemeTokens` 的 `background` / `border` 翻成字面色（浅色 `#ffffff`
   / `#e3e7e8`，深色 `#090b0c` / `#232a2c`）；配置里已存在的颜色仍然优先，用户手写过的值不会被
   悄悄替换。实测深色与浅色两套都能整幅重画（库的 label 颜色还会跟着背景明暗翻转）。
6. **背景 / 主题变化不能重挂载。** 它们走 `ForceGraph` 的 `updateStyle` 原地推送，所以
   `graphStructureKey` **故意不含 `visualConfig`**：实测切「网格 → 点阵」后配置写回、背景改变，
   而节点位置一个像素都没动（重挂会重启模拟）。
7. **画布上的写入动的是图谱，不是 collection。** 建边（Alt 拖拽）、新增节点、删除、改动语义、拖拽
   后 3s 去抖的位置持久化，全部是 `@workspace/graph` 既有逻辑，写的是图谱节点/边
   （README §8 的取舍）。副作用是：diff 会被当前 `filterConfig` 过滤，所以**筛选之外的变更不会出现
   在画布上**（在一个有过滤的 collection 里新建节点，它要等筛选命中才看得见）。
8. **库的右键菜单 / 悬浮预览挂到 `document.body`**（绝对定位），所以嵌在带 `transform` 的宿主对话窗里
   也不会按宿主坐标偏移。实测在画布坐标 (683, 372) 右键，菜单正好出现在 (683, 372)。
9. **枚举同步会写进「当前工作区视图」。** `NodeService` 在节点创建后会调用
   `syncViewEnumerationOnCreate`，它读的是 `useUIStore.currentViewId` —— 内嵌的节点图用的是一个
   不在 store 里的合成 view，所以「画布上新建节点」这个动作会去改**工作区当前视图**的
   `selectedNodes`（该视图不是全局视图时）。这是库既有行为，本视图不改写它，但要知道。
10. **Flow 仍是占位壳。** 面板里列出「流程图」但**禁用**，并说明原因（与甘特的「周末」在非「日」
    粒度下禁用是同一种做法）；`core/config.ts` 的 `resolveGraphViewType` 把除 `Force` 之外的任何值
    自愈成 `Force`，所以旧配置不会把视图带进占位壳。
11. **视图不保活。** 切走即卸载 `<Graph />`（worker 终止、监听器 dispose），切回来重新按位置种子
    建图（README §3.3）。

---

## 1. 概述与使用场景

节点图视图把 collection 选中的图谱节点直接画成力导向图，复用现有 `@workspace/graph` 的
`<Graph />`。它是 collection 节点的「原生」视图，展示节点之间的真实边关系。

使用场景：

- collection 节点：查看被筛选出的节点及其连边拓扑，拖拽、缩放、悬停预览、点击打开节点。
- 图谱导航：在 collection 内直接浏览子图，不离开 node-content 编辑器。

> **只在 collection 节点出现**（database 的行不是图谱节点，无图可画）。`graph` 描述符的
> `nodeTypes` 为 `["collection"]`；宿主是 database 时 `DataViewRoot` 会在挂载时丢弃它。

---

## 2. 技术选型

**复用 `@workspace/graph` 的 `<Graph />` 组件**，不新写图渲染逻辑，也不新增第三方依赖（这跟其它
六个视图相反：它们各自引入 VTable / FullCalendar / VChart / d3 等）。

`<Graph />` 的路由契约（`packages/graph/src/graph.tsx`）：接收 `viewId` 或 `view`（graph 的 `View`
类型），按 `view.viewType` 路由到 `ForceGraph` / `FlowGraph`，并用 `view.filterConfig` 过滤
store 里的 nodes / edges。节点图视图只构造一个**临时 View** 传给它。

```tsx
// packages/dataview/src/views/graph/board/graph-surface.tsx（示意）
export const GraphSurface = memo(function GraphSurface({
  view,
  className,
}: Props) {
  return <Graph view={view} className={className} />;
});
```

`@workspace/graph` 因此成为 `@workspace/dataview` 的依赖，但它只经由**懒加载的渲染器**
（`registry.ts` 的 `React.lazy`）可达，所以 d3-force / comlink / pixi 那一坨只有在真的切到节点图
时才进入 bundle。

---

## 3. 数据转换适配

`core/schema.ts` 的 `resolveGraphView(source, config, tokens)`：

```ts
{
  id: `dataview:graph:${source.nodeId}`,   // 稳定派生，位置持久化的键（§0.1 第 2 条）
  name: source.nodeTitle?.trim() || "节点图",
  viewType: resolveGraphViewType(config.viewType),
  visualConfig: resolveGraphVisualConfig(config.visualConfig, tokens),
  filterConfig: source.filterConfig ?? {},
}
```

- **`filterConfig` 原样透传**，`<Graph />` 内部用 `filterByViewFilterConfig` 完成 nodes/edges 过滤，
  与 collection 投影用的是同一个函数、同一份配置，所以画布上的子图与其它视图的行集**必然一致**。
- **`fields` / `rows` 一概不读**：`rows` 只用来判断「有没有东西可画」（空态引导，§6）。
- 视图没有自己的记录模型，所以 `core/schema.ts` 里也没有其它视图那种 rows→records 映射。

---

## 4. 配置项（GraphViewConfig）

```ts
export interface GraphViewConfig {
  viewType: ViewType; // 复用 graph 的 ViewType；非 Force 一律自愈成 Force
  visualConfig: VisualConfig; // 复用 graph 的 VisualConfig（实际生效的只有 backgroundStyle 等三键）
}
```

设计稿里的另外两个键**被删掉了**，理由与其它视图删键一致（「一个键只有一个正确答案」）：

| 删掉的键          | 理由                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`            | 合成 View 的名字跟随 collection 节点的标题（`DataViewSource.nodeTitle`，与甘特的表头同一条规则），页签本身也已经给视图命名了，第二份名字没人看           |
| `showFilterEntry` | 「有没有编辑过滤入口」既不是这个视图能决定的，也不是这个视图该渲染的 —— 入口在宿主节点内容的工具条上，与视图的配置无关（与甘特删掉 `editable` 开关同理） |

`filterConfig` 依旧**不在**这里：它由 `collection.content` 唯一持有，视图只读。

---

## 5. 功能点

全部继承自 `@workspace/graph`（Force 模式）：

- 力导向布局（d3-force in WebWorker + OffscreenCanvas）。
- 平移 / 缩放 / 拖拽节点。
- 悬停预览（`PreviewBlock`）、单击选中、双击打开节点（`onEditNode`）。
- 画布右键菜单（新增节点 / 建边 / 删除等）。
- Alt 拖拽建边、Ctrl 框选、Shift 加选（force 修饰键策略）。
- 背景与主题（本视图把 tokens 翻成 `visualConfig`，见 §0.1 第 5 条）。
- 节点位置种子读取与回写（跨视图/跨会话不重置布局）。

> Flow 模式目前是占位壳（见 graph/AGENTS.md），节点图视图默认只暴露 Force；Flow 重建后把
> `IMPLEMENTED_LAYOUTS` 放开即可，配置与面板都不用改。

---

## 6. 交互与操作方法

| 操作     | 手势/入口                            | 结果                                                            |
| -------- | ------------------------------------ | --------------------------------------------------------------- |
| 平移画布 | 空白拖拽                             | 移动视口                                                        |
| 缩放     | 滚轮                                 | 缩放                                                            |
| 拖节点   | 拖节点                               | 移动节点（停稳 3s 后写回 `stateData.client.position`）          |
| 悬停预览 | 悬停节点                             | `PreviewBlock`                                                  |
| 打开节点 | 双击节点                             | `onEditNode`（跳节点编辑器）                                    |
| 选中     | 单击 / Ctrl 框选 / Shift 加选        | 选中态                                                          |
| 建边     | Alt 拖拽                             | 创建边                                                          |
| 画布菜单 | 右键                                 | 库自己的画布菜单（新增节点等）                                  |
| 改布局   | 工具条「布局」                       | Force（流程图待实现，禁用）                                     |
| 改背景   | 工具条「视图」                       | 网格 / 点阵 / 无                                                |
| 改过滤   | **宿主控件**：页签栏最右「编辑过滤」 | 宿主打开 collection 过滤编辑（节点多选 + 条件），保存后画布重建 |

**空态有两种说法**（`hasActiveFilter` 区分），因为「工作区没有节点」和「筛掉了全部节点」是两件事：

- collection 有过滤且投影为空 → 「没有节点匹配当前的过滤条件」；
- 没有过滤（全局 collection）且投影为空 → 「这个工作区还没有节点」。

两种空态都**保留视图工具条**；而「编辑过滤」入口在它上面的**页签栏**里（宿主的 `tabActions` 槽），
本来就不属于视图内容，所以空态里照样点得到（旧版本是本视图在空态里放一个「编辑过滤」按钮，那是把宿主的
动作塞进视图，已删除）。

---

## 7. 二次开发要点

1. 只做一层封装：构造合成 `View` 交给 `<Graph />`，不触碰 graph 内部（eventHandler / store 由
   graph 自管）。视图里**没有** `onCellChange` / `onRow*` / `onFieldsChange` —— 它不写
   collection 的任何字段。
2. 合成 View 的 `useMemo` 依赖只放「会影响画布」的值（`nodeId` / `nodeTitle` / `filterConfig` /
   `viewType` / `visualConfig` / tokens），**不要**放 `source` 本身：宿主每次重建 source 都会换
   对象，会把库的管线整条重启。
3. 结构变化（过滤、布局）改 `graphStructureKey` 让 `<GraphSurface>` 重挂；展示变化（背景、主题）
   交给 `visualConfig` 的原地推送（§0.1 第 1、6 条）。
4. **视图只渲染数据。** 视图不 import store / service，也不提供「帮我编辑宿主 content」的回调：
   collection 的过滤编辑是宿主自己的控件，由外壳的 `tabActions` 宿主槽摆在页签栏最右侧（§0、§8）。
   视图与宿主之间只有渲染契约（source / config / 那几个写回回调），宿主 chrome 不进视图。

---

## 8. 边界与取舍

- **过滤唯一写点**：`filterConfig` 只由 collection content 持有，节点图只读、宿主写；过滤编辑入口
  不是视图的配置面板，而是**宿主节点内容自己的控件 + 对话框**，借外壳的页签栏宿主槽落位
  （`collection-node-content.tsx` 的 `tabActions`）。
- **视图内的写入是图谱写入**：建边 / 移动 / 改语义 / 位置持久化写的是图谱节点与边，不是 collection
  过滤；「增删 collection 成员」要通过过滤编辑完成，不在此视图内做。副作用见 §0.1 第 7、9 条。
- **Flow 占位**：面板里列出但禁用，配置值自愈成 Force；Flow 重建后自动获益。
- **不缓存图实例**：切换视图即卸载 `<Graph />`，不保活（README §3.3）。
- **不提供图谱侧工具栏**：小地图 / 吸附 / 网格间距在库里都还没有真实实现，本视图不为它们造开关。

---

## 9. 开发任务清单

| #   | 任务                       | 说明                                                                                                                           | 状态      |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------- |
| N1  | `graph-data-view.tsx`      | 合成 View 构造 + `<Graph />` 封装 + 空态引导                                                                                   | ✅ 已实现 |
| N2  | 注册 `graph` 描述符        | `nodeTypes: ["collection"]`、无 `configEditor`                                                                                 | ✅ 已实现 |
| N3  | 过滤编辑入口               | **宿主** `collection-node-content` 的「编辑过滤」经外壳 `tabActions` 槽落在页签栏最右 → `<CollectionFilterDialog>`，视图不参与 | ✅ 已实现 |
| N4  | 高度容器                   | 壳给画布一个 `relative min-h-0 flex-1` 的确定高度盒子                                                                          | ✅ 已实现 |
| N5  | `graphStructureKey` 重挂载 | 过滤变化后重建管线（否则画布不会删除被筛掉的节点，见 §0.1 第 1 条）                                                            | ✅ 已实现 |
| N6  | 旧 `nodeGraph` 类型归一化  | `normalizeDataViewType`：domain 校验边界接受并改写别名，registry 对未知键退化为「不允许」                                      | ✅ 已实现 |
| N7  | Flow 布局                  | 等 `@workspace/graph` 的 FlowGraph 重建（占位壳）                                                                              | ⏳ 依赖库 |
