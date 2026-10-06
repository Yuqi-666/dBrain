# Dashboard（平铺组合页面）设计文档

> 状态：**待实现**（提案见 [../proposal/dashboard.md](../proposal/dashboard.md)；`/dashboard` 今天只有 middleware 保护、没有页面）
> 范围：把 **node-content 当作小组件**拼装成的平铺网格页面。用户可以创建多个页面；在节点编辑页把该节点加入某个页面；从 dashboard 页面的「节点组件库」拖入；调整大小；自动紧凑布局。
> 新增运行时依赖：**`react-grid-layout@^2.3.0`**（唯一新增，含其两个 CSS 文件，见 §1.4）
> 相关文档：[../proposal/dashboard.md](../proposal/dashboard.md)、[../proposal/dynamic-island.md](../proposal/dynamic-island.md)（`/dashboard` 是灵动岛的一个导航目的地）、[../dynamic-island/README.md](../dynamic-island/README.md)、[../dataview/README.md](../dataview/README.md)、`packages/dataview/AGENTS.md`、`packages/graph/AGENTS.md`

---

## 0. 实现现状与关键决策

### 0.1 今天的代码是什么样

| 关注点                   | 位置                                                                                        | 现状                                                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 路由                     | `apps/web/middleware.ts:4`、`:56-62`                                                        | `/dashboard` **已在 `PROTECTED_PATHS` 与 matcher 里**（`/dashboard/:path*`），但 `apps/web/app/(main)/` 下只有 `graph/page.tsx` 一个页面 —— 访问 `/dashboard` 会先过 auth gate 再 404                        |
| 页面壳                   | `apps/web/app/(main)/layout.tsx:46-58`                                                      | **只做 auth gate**（`trpc.auth.me` + 失败跳登录），`return children`；侧边栏与主区由每个页面自己组合                                                                                                                |
| 页面的标准组合方式       | `apps/web/app/(main)/graph/page.tsx:62-87`                                                  | `<MainLayout sidebar={<MainSidebar />}><div className="absolute inset-0 z-0">` + `<Graph/>` + `<NodeEditor/>` + 三个业务 Dialog + `<QuickPanel/>`。dashboard 页要复刻这个骨架（去掉 `<Graph/>`）                 |
| node-content 的宿主与路由表 | `packages/ui/src/components/dialog/editor/content/node-content-editor.tsx:29-62`            | 一个 10 分支的 `switch(nodeType)`：text / image / pdf / video / audio / webpage / website / rich-text / collection / database。**这就是未来 widget 的类型路由表**                                                  |
| node-content 的编辑器壳   | `packages/ui/src/components/dialog/editor/node-editor.tsx:20-31`、`:44-66`、`:101-114`      | `mainViewType` 决定 Dialog（`h-[80vh]`）或全屏；`NodeEditorContent` 是 `flex flex-col h-full`，内容区 `flex-1 overflow-y-auto`。**内容组件假设自己被这个壳包裹**                                                |
| 最重的两类 node-content   | `database-node-content.tsx:63-66`、`collection-node-content.tsx:54-61`                      | 两者都挂 `@workspace/dataview` 的 `<DataViewRoot/>`，其渲染器是 VTable / VChart / FullCalendar / VTable-Gantt（`packages/dataview/package.json` 的依赖表）—— **widget 化后这是最重的一类**                    |
| `DataViewRoot` 的挂载契约 | `packages/dataview/src/data-view-root.tsx:60-63`、`:233`、`:380-397`；`packages/dataview/AGENTS.md`「Host integration」 | 宿主必须 `key={node.id}`（视图状态只在 mount 时 seed）；`readOnly` **只表示数据只读**，视图管理由是否传 `onViewsChange` 决定；renderer box **永远不是滚动容器**（VTable 会 `style.width = parentElement.offsetWidth` 自适应） |
| 记录编辑页                | `database-node-content.tsx:245-281`、`collection-node-content.tsx:186-231`                  | 记录页是**宿主的**、`relative` box 内的 `absolute inset-y-0 right-0` 覆盖列 + scrim（不是 viewport 固定 sheet），因为 node-content 会同时挂在全屏与 dialog 里                                            |
| 图谱                      | `packages/graph/src/graph.tsx:75-135`、`packages/graph/src/force/ForceGraph.tsx:239`、`:270` | `<Graph/>` 每个实例 `new Worker(...)` + `transferControlToOffscreen()`，worker 内 d3-force + PixiJS。**同页多实例 = 多 worker + 多 Pixi 应用**                                                                     |
| 状态                      | `packages/store/src/dataStore.ts:47-53`、`packages/store/src/uiStore.ts:179-187`、`packages/store/src/workspaceStore.ts:4-14` | `dataStore` 只有 nodes / edges / views / 三套语义 / tags + `diff`；`workspaceStore` 只有 `workspaces` + `currentWorkspaceId`。**没有任何 dashboard 切片**                                                       |
| 持久化范式                | `packages/services/src/graph/node.service.ts:18-21`、`:56-88`、`:145-152`；`view.service.ts:129-133` | 乐观写 store → tRPC → 失败回滚；`DebounceScheduler`（默认 500ms）合并同一实体的连续写；`flushPendingUpdate` / `cancelPendingUpdate` 可显式冲掉                                                          |
| 后端链路                  | `backend/domain/src/models/workspace/entities.ts:15-70`、`backend/adapter-front/src/trpc/router/workspace.ts:12-14`、`:31-38` | `Workspace` 只有 `{id, name, ownerId, createdAt, updatedAt}`，唯一写方法是 `updateName`；`workspace.update` 的 input 只接受 `{ name }`。**workspace 上没有可以挂 json 的列**                                |
| 内容型实体的落库范式      | `pb/pb_migrations/1700000000_initial_schema.js:99-116`、`:119-180`；`node-dto.mapper.ts:121-140`、`:152-181`；`node.ts:86-105` | 复杂内容各占**专用列**（`fields` / `rows` / `views` / `filterConfig` 都是 json），DTO 与 zod schema 都必须**逐字段点名**，漏一个就在链路上被静默丢弃                                                        |
| 0 号迁移的陷阱            | `pb/pb_migrations/1700000000_initial_schema.js:170-173`                                     | 「PocketBase 只按**文件名**去重迁移，不比对内容」—— 改 0 号脚本对已存在的 `pb_data` 无效，必须先删库                                                                                                              |
| component library 与「添加到 dashboard」 | `packages/ui/src/components/header/editor-header/editor-header.tsx:17-56`                    | **两者都不存在**：没有任何「可拖入的组件列表」、没有 dashboard 实体、没有布局几何、没有「添加到 dashboard」入口。编辑器头只有 `FullscreenButton` / `ToggleSidebarButton` / `ToggleSearchCommandButton` / `PinButton` / 一个按钮 |

一句话：**dashboard 今天只有一条被保护的 URL，其余全部从零开始。** 好消息是 node-content 的类型路由表、只读渲染层（`preview-block/previews/*`）、`DataViewRoot` 的宿主契约、乐观写回范式都已经存在，本设计主要是「组合已有的东西 + 一层新的页面实体」。

### 0.2 五条决策

#### 决策 ①　dashboard 页面实体的持久化位置：**新建 PocketBase collection `dashboard_pages`**（新迁移文件，不动 0 号）

三条路的取舍：

| 方案                                     | 要改什么                                                                                                                                                                                                                                                       | 优点                                                                                  | 缺点                                                                                                                                                                         | 结论     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **A. 新建 `dashboard_pages` collection** | 新迁移文件（新文件名）＋ `interfaces/models/dashboard.ts` ＋ domain 实体/VO ＋ repository 接口 ＋ infrastructure 的 PB repo+mapper ＋ application 的 command/query ＋ adapter-front 的 `dashboard` 路由 ＋ `DashboardService` ＋ 一个新的 zustand 切片 | 边界干净；每页一行、脏写只碰一行；有独立 id 可深链；与 `views` 表的既有范式完全同构 | 链路最长（6 个后端包 + 迁移）；`pb_data` 需重建以跑新迁移                                                                                                                    | **采用** |
| B. 挂在 workspace 的 json 列             | `workspaces` 表加 `content` json 列（需新迁移）＋ `Workspace` 实体加 content/`withContent` ＋ workspace DTO ＋ `workspace.update` 的 zod input（今天只认 `name`，`workspace.ts:31-38`）                                                                        | 不用新建集合；「布局属于 workspace」在模型上也成立                                    | **每次拖拽都要重写整条 workspace 记录**（含全部页面）；页面没有独立 id，深链只能靠数组下标；`createWorkspace` 的 zod schema 与 `provisionDefault` 都要跟着改                | 排除     |
| C. 每个 dashboard 页做成一个 node 类型   | `NodeDataType` 联合、domain 的 10 个节点工厂与 `NodeDTO` 判别联合、`node.ts` 的 zod 分支、`node-dto.mapper.ts` 的 switch、graph 的过滤/渲染语义、`node-content-editor.tsx` 的 switch（会变成 11 分支）                                                            | 页面天然可被 collection / graph 视图引用，「页面也是知识」的叙事成立                  | 布局（每用户、每屏、每断点）与图谱数据（工作区共享内容）**语义不同**，混在一起后 graph 视图与 collection 投影都要处理一种没有语义的节点；改动面最大                            | 排除     |

采用 A，并按既有范式补齐链路（§5.1 给出逐层清单）。**关键约束**：新迁移必须用一个**新的文件名**（例如 `1700000001_dashboard_pages.js`），绝不改 0 号脚本——`pb/pb_migrations/1700000000_initial_schema.js:170-173` 已经把这个坑写在那里了。

#### 决策 ②　widget 渲染：**默认「只读 widget 视图」，database / collection 以 `readOnly` 挂真实 `DataViewRoot`；绝不把 `NodeContentEditor` 当 widget**

| 选项                                 | 为什么不行 / 为什么行                                                                                                                                                                                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **全功能 node-content（`NodeContentEditor`）** | 编辑器壳假设 `flex h-full`（`node-editor.tsx:101-114`），塞进 widget 会塌成 0 高；每个 widget 都是**一份完整编辑器实例**（Tiptap + Yjs、CodeMirror、VTable 全套）；且 node-content 的内部状态（记录页、dirty write）与全屏编辑器重复，会出现同一个节点两套写路径。**排除**            |
| **只读 widget 视图（默认）**         | 复用已存在的只读分发层：`preview-block` 的 `previews/*` 已经按 10 种 nodeType 只读渲染。成本最低、无写路径、可预测。**采用**                                                                                                                                                              |
| **例外：database / collection**      | 这两类的全部价值在数据本身，只读摘要价值低。结论：挂**真实** `<DataViewRoot/>`，但以 `readOnly`（数据只读）且**不传任何写回调**（`onCellChange` / `onViewsChange` / `onRowInsert` / `onFieldsChange` 全不传）的方式挂载 —— 依据 `packages/dataview/AGENTS.md` 规则 3 与 `data-view-toolbar.tsx:60`、`:84-85`：不传 `onViewsChange` ⇒ `canEditViews=false`（不能新建/重命名/删除/改配置），但 `onActiveViewChange` 始终透传 ⇒ **仍可在已有视图间切换**（纯本地状态） |

由此得到一条硬规矩：**dashboard 不承载任何写路径。** `DashboardItem` 只是「引用 + 几何」，要改内容就去节点编辑页（`useUIStore.getState().handleNodeEdit(nodeId)`，与 collection 卡片的既有行为一致）。

#### 决策 ③　布局引擎：**`react-grid-layout@^2.3.0`**，不用 `@dnd-kit` + CSS grid 自研

| 候选                              | 事实（本次调研，2026-10）                                                                                                                                                       | 结论 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| **react-grid-layout (RGL) 2.3.0** | v2 是完整 TS 重写：`useContainerWidth` / `useGridLayout` / `useResponsiveLayout` 三个 hook，子路径导出 `react-grid-layout/core`（纯算法）/`/legacy`（v1 兼容）/`/extras`；**内置外部拖入**（`data-rgl-draggable` + `dropConfig`，2.3.0 起触摸端 iOS Safari / Android Chrome 也走同一条 drop 管线）；内置垂直/水平 compaction（即提案要的「自动布局」）；每断点独立 layout 可序列化；`GridItem` 在 2.3.0 被 `React.memo` 化 | **采用** |
| `@dnd-kit` + CSS grid 自研        | 仓库**已经在用**（`packages/dataview` 的看板，`@dnd-kit/core ^6.3.1`），但它只做「可拖排序」：碰撞解决、紧凑压缩、resize 手柄、断点布局、外部拖入全部要自己写。等于重写 RGL 的核心 | 排除 |
| `gridstack.js` 14.0.0             | 无依赖、纯命令式 DOM API，React 侧要自己写受控包装；与仓库的受控 store 范式不合                                                                                                | 排除 |
| `react-mosaic-component` 7.2.1    | peer `react: "16 - 19"`（明确支持 19），但它是**瓦片窗口管理器**（二叉分割树），不是 dashboard 网格；且拉进整条 react-dnd 栈（`react-dnd-multi-backend` 等）                    | 排除 |
| `@measured/puck` 0.20.2           | 是页面搭建器（自带数据模型与编辑器），与「widget = 已有节点的引用」模型冲突                                                                                                     | 排除 |

**React 19 兼容性（本次调研的核心问题）**：RGL 2.3.0 的 README 兼容表写的是 `>= 2.0.0 → React 18+`，`peerDependencies` 是 `react >= 16.3.0`，**没有把 19 单独列出**。历史上真正的阻塞点是 `react-draggable` 里的 `findDOMNode`（React 19 已移除该 API），我实测下载 `react-draggable@4.7.2` 的产物，**`findDOMNode` 出现 0 次**——阻塞点已消失。因此：**预期可用，但必须实测**（列入 §9 的验证清单，标注「待验证」）。另外 2.2.4 修过一个与目标设备直接相关的 bug：`useContainerWidth` 在**分数缩放**（DevTools 设备工具栏 75%/50%、系统显示缩放）下会 `Maximum update depth exceeded`；2.3.0 又给 `useContainerWidth` 加了 `debounceTimeout`。目标设备是一加平板 + anland 转发显示，缩放不确定，这条要复验。

#### 决策 ④　路由形态：**`/dashboard/[pageId]` + `/dashboard` 重定向到默认页**

- 采用**动态段**而不是 `/dashboard?page=`：middleware 的 matcher 已经是 `/dashboard/:path*`（`apps/web/middleware.ts:58`），动态段零改动即被保护；深链天然可读；查询参数形态会让首屏必须等 `useSearchParams()`，多一层 hydration 时序。
- `/dashboard`（无段）＝ 重定向到默认页：读 `dashboardStore` 取 `isDefault` 的页；一页都没有时由服务端在首次 `sync` 时 provision 一个「首页」（复刻 `WorkspaceService.sync` 的 `provisionDefault` 范式，`packages/services/src/graph/workspace.service.ts:98-103`）。`isDefault` 复用 dataview 已有的语义（`DataView.isDefault`），不发明新概念。

#### 决策 ⑤　组件库（可拖入的节点列表）来源：**`dataStore.nodes` 的投影 + 类型白名单过滤**，不新建注册表实体

- 来源：当前工作区已加载的全部节点（`dataStore.nodes`，`dataStore.ts:50`）。**组件库 = 节点集合的一个视图**，不是新实体。
- 过滤：① nodeType ∈ §4 的 10 种白名单（今天全部 10 种都能渲染，白名单用于将来降级）；② 默认排除**已在当前页**的节点（避免重复引用同一个节点导致 N 个 `<Graph/>` / N 个 VTable，见 §0.3-1、§0.3-2），可用「显示已添加」开关反转；③ 搜索（标题/摘要）；④ 按语义 / 标签过滤 —— 直接复用 `packages/ui/src/components/dialog/node-selection-list.tsx:43` 的 `NodeSelectionList`（它已经是 collection-filter 与 view-dialog 共享的节点多选器）。
- 拖入的实现走 RGL 原生外部 drop（`data-rgl-draggable` 标记卡片 + `dropConfig`），**不引入 dnd-kit 的 DndContext**（两套事件模型叠一起会互相吞事件，见 §0.3-9）。

### 0.3 必须知道的坑

1. **一个 dashboard 页面同时挂多个 `<Graph/>` = 多个 worker + 多张 OffscreenCanvas + 多份 d3 模拟。** `ForceGraph` 每实例 `new Worker(...)`（`ForceGraph.tsx:239`）并 `transferControlToOffscreen()`（`:270`），worker 内跑 d3-force 并用 PixiJS 渲染。而且不只是显式放 graph widget 才算：**collection 的 dataview 若切到 `graph` 视图，也是挂 `<Graph/>`**。对策：全页**至多 1 个活的 `<Graph/>` 实例**（模块级计数器 + 上下文），超出的 widget 渲染占位卡并提示「同一页面只允许一个图谱组件」。
2. **多个 dataview 实例 = 多份 VTable / VChart / FullCalendar。** `DataViewRoot` 的 renderer 是 `React.lazy`（`data-view-root.tsx:398-425`），但一旦挂载就是一份完整库实例（VTable 有自己的 canvas 与 DOM、FullCalendar 有自己的事件系统）。对策：`IntersectionObserver` 懒挂载 + 全页并发上限（默认 2）+ 拖拽/缩放期间冻结（§4.3）。
3. **`DataViewRoot` 必须 `key={node.id}`，记录页必须留在宿主 box 内部。** 视图/激活视图状态只在 mount 时 seed（`data-view-root.tsx:60-63`）；记录页是 `relative` box 内的 `absolute inset-y-0 right-0` 列 + scrim（`database-node-content.tsx:245-281`），**不是** viewport 固定 sheet——因为 node-content 同时挂在全屏与 dialog 里。在 widget 里这条依然成立：widget 容器必须 `relative overflow-hidden`，且**记录页不要在 widget 内打开**（widget 可能只有 300×200，覆盖列会碎），改为「打开节点编辑器」。
4. **node-content 假设自己被 dialog 包裹。** `NodeEditorContent` 是 `flex flex-col h-full`（`node-editor.tsx:101-114`），`database-node-content.tsx:233-238` 的根是 `relative h-full min-h-0 w-full overflow-hidden`，`collection-node-content.tsx:180-186` 同理。任何 widget 容器**必须给出确定高度**（RGL 的 `rowHeight × h` 已经给了），否则 `h-full` 链会塌成 0 高；反过来，别把 `NodeEditor` 的壳（Dialog / 全屏 div）当 widget。
5. **RGL 的两个 CSS 文件必须显式导入**：`react-grid-layout/css/styles.css` 与 `react-resizable/css/styles.css`（`.react-grid-item` / `.react-grid-placeholder` / `.react-resizable-handle` 的定位与尺寸全在里面，不导入就没有把手也没有拖拽占位）。仓库已有「在组件文件里相对导入 CSS」的先例（`packages/ui/src/components/filter/filter.tsx:15` 导入 `../../styles/query-builder.css`）。**注意**：这两个文件是普通 CSS，与 Tailwind 的 `@source` 无关；`@source` 管的是**我们自己的** Tailwind 类——若 dashboard 组件放进一个**新的** workspace 包（不在 `packages/ui/src` 下），必须往 `packages/ui/src/styles/globals.css` 补一行 `@source`（该文件 `:8-16` 是既有列表，`@workspace/dataview` 就是被显式列进去的），否则只在该包出现的类会静默丢失。
6. **触摸设备上拖拽/缩放的仲裁。** RGL 的拖拽基于 mousedown / touchstart；`react-draggable` 默认对 `touchstart` 调 `preventDefault`，会吞掉子元素的 `onClick`（RGL 2.3.0 才为它加了 `dragConfig.allowMobileScroll`，并修了 v1 的 `Responsive` 静默丢这个 prop 的问题）。对策：**只允许通过 widget 头部的把手拖拽**（`dragConfig.handle`），让 body 内的表格滚动、canvas 手势、文本选择都不被吞；平板端**长按头部 300ms 进入编辑态**，避免误拖。
7. **自动布局的持久化时机与防抖。** `onLayoutChange` 在拖拽/缩放过程中会连续触发；把每次回调都写回等于每帧一次 upsert。对策：`onLayoutChange` 只更新本地 state（受控渲染），**只在 `onDragStop` / `onResizeStop` 之后**写一次；写入走 `DashboardService.upsert(pageId, patch, { debounce: 500 })`，即 `NodeService` 的既有 `DebounceScheduler` 范式（`node.service.ts:18-21`、`:66-88`）；页面切换/离开前 `flushPendingUpdate`（`:145-152`）。
8. **断点切换会「伪造」一次 layout 变更。** RGL 的 `Responsive` 在断点变化时按 `cols` 自动生成该断点的 layout，并会通过 `onLayoutChange` 冒出来。**照单全收写回 = 每次窗口缩放都写脏数据。** 对策（也是数据模型的决定）：`layout` **只为用户真正在该断点拖过的页面持久化**；没有自己 layout 的断点由 `lg` 几何自动生成且**不写回**（§2.2）。
9. **别把 dnd-kit 的 `DndContext` 与 RGL 的 drop 管线叠在一起。** RGL 用自己的 HTML5 / touch drop 事件（`dropConfig`），dnd-kit 用它自己的指针事件与传感器；两者同时监听同一片区域会互相抢事件。组件库的拖入**统一用 RGL 的 `data-rgl-draggable`**；若某个交互确实需要 dnd-kit（例如 widget 内排序），把它限制在 widget body 内部并停止事件冒泡。
10. **`width` 是必填，且 0 宽会写坏布局。** RGL v2 要求显式 `width`；官方推荐 `useContainerWidth()`。首帧宽度为 0 时 RGL 会把所有项压成一列并可能回灌 layout。对策：`mounted && width > 0` 才渲染网格（README 的官方写法就是 `{mounted && <Grid/>}`），并在 `useContainerWidth({ debounceTimeout })` 上给一个 100ms 窗口以吸收连续的容器尺寸变化（这是 2.3.0 的新选项，也顺手缓解 #2271 的分数缩放循环）。另外，`--primary` 只用于**用户激活态**（把手、当前选中的 widget、`aria-pressed`），不要用它标「这是新加的组件」这类非激活状态。

---

## 1. 目标、结构与页面形态

### 1.1 目标与验收

| 目标         | 场景                                                                     | 验收                                                                     |
| ------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 平铺组合     | 把任意节点的内容当小组件铺在一个页面上，一屏看到多个节点的局部            | 一页可放 ≥ 6 个不同 nodeType 的 widget，互不遮挡                          |
| 两个入口     | ① 节点编辑页「添加到 dashboard」；② dashboard 的「节点组件库」拖入        | 两条路径都能把节点加进**指定**页面；重复添加有明确反馈（去重/提示）      |
| 调整与自动布局 | 拖拽换位、resize、自动紧凑（垂直压缩）、折叠                          | 拖完松手后布局立刻紧凑、无空洞；刷新后几何不变                            |
| 多页面       | 为不同用途创建多个页面，页面间切换与重命名/删除                         | 至少 5 个页面；深链 `/dashboard/<id>` 直接打开；默认页可设              |
| 展示与编辑分离 | 「展示态」（看）与「编辑态」（改布局）两种模式                        | 展示态下拖拽/resize/删除全部关闭，键盘 Tab 正常遍历                      |

### 1.2 页面形态（ASCII）

```text
┌─────────────────────────────── /dashboard/[pageId] ─────────────────────────────────┐
│  MainLayout:  │  ┌──────────────── DashboardHeader ────────────────────────────────┐  │
│  MainSidebar  │  │ [页面 ▾ 首页]  [+ 新建页面]   [页面名(可改)]  [编辑布局]  [组件库]│  │
│  （固定/浮层）│  └──────────────────────────────────────────────────────────────────┘  │
│               │  ┌─────────────── 组件库抽屉（编辑态 / 手动打开）──────────────────┐  │
│               │  │ 搜索 [____________]   [语义 ▾] [标签 ▾] [ ] 显示已添加          │  │
│               │  │ ┌────────┐┌────────┐┌────────┐  每张卡片 = 一个节点            │  │
│               │  │ │ 节点 A ││ 节点 B ││ 节点 C │  卡片带 data-rgl-draggable       │  │
│               │  │ │ text   ││ image  ││database│  → 原生拖入右侧网格             │  │
│               │  │ └────────┘└────────┘└────────┘                                 │  │
│               │  └──────────────────────────────────────────────────────────────────┘  │
│               │  ┌─────────────────────── RGL 网格（12 列）─────────────────────────┐ │
│               │  │ ┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐    │ │
│               │  │ │⠿ 标题  [⋯][–]  │ │⠿ 标题  [⋯][–]  │ │⠿ 标题  [⋯][–]   │    │ │
│               │  │ │─────────────────│ │─────────────────│ │──────────────────│    │ │
│               │  │ │                 │ │                 │ │                  │    │ │
│               │  │ │   widget body   │ │   widget body   │ │   widget body    │    │ │
│               │  │ │  (只读 / 懒挂)  │ │                 │ │                  │    │ │
│               │  │ │                 │ │                 │ │                  │    │ │
│               │  │ │               ◢◣│ │                 │ │                  │    │ │
│               │  │ └─────────────────┘ └─────────────────┘ └──────────────────┘    │ │
│               │  │         ◢◣ = resize 把手（只在编辑态显示）                       │ │
│               │  └──────────────────────────────────────────────────────────────────┘ │
│               │  NodeEditor（Dialog / 全屏）· 业务 Dialog · QuickPanel  ← 复刻 graph 页 │
└─────────────────────────────────────────────────────────────────────────────────────┘

每个 widget 的三段结构（`WidgetFrame`）：
① 头（固定 32px）：⠿ 把手 · 节点图标 + 标题 · nodeType 徽标 · 动作区
② 体（`flex-1 min-h-0 overflow-hidden relative`）：轻类型挂只读 node 视图 / preview；database·collection 挂 `<DataViewRoot readOnly/>`（懒挂载）；未挂载时是等高占位卡（避免 CLS）
③ 把手（右下 ◢◣，只在编辑态渲染）
```

### 1.3 编辑态 vs 展示态

| 维度           | 展示态（默认）                       | 编辑态（`?` 由 store 的 `dashboardEditing` 控制）              |
| -------------- | ------------------------------------ | -------------------------------------------------------------- |
| 进入           | 页面默认                             | 头部「编辑布局」按钮 / 触摸端长按 widget 头部 300ms            |
| 拖拽换位       | 关闭（`dragConfig.enabled=false`）   | 开启，且**只有头部把手**可拖（`dragConfig.handle`）            |
| resize         | 关闭，把手不渲染                     | 开启，右下把手                                                  |
| 删除 / 折叠    | 头部动作区只剩「打开节点」           | 头部动作区 +「折叠」「从本页移除」                              |
| widget body    | 完全可交互（滚动、切视图、点记录）   | body 加 `pointer-events-none` + 半透明遮罩，避免与拖拽抢事件    |
| 组件库抽屉     | 收起（可由头部按钮手动展开为只读浏览）| 默认展开                                                        |
| 键盘 Tab       | 遍历页面头 → 各 widget 头 → body 内控件 | 遍历页面头 → widget 头（把手可聚焦）→ 组件库卡片               |

编辑态是**页面级**状态（不是每个 widget 一个开关），与 `uiStore.mainViewType`（`uiStore.ts:179-181`）同一风格：一个布尔切片，`setDashboardEditing`。

### 1.4 技术选型：布局引擎与依赖

| 依赖                       | 版本        | 为什么                                                                                                                                                                                          |
| -------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react-grid-layout`        | `^2.3.0`    | v2 TS 重写 + hooks API + 内置 compaction（自动布局）+ 每断点 layout + **内置外部拖入（含触摸）**。见 §0.2-③                                                                                    |
| `react-grid-layout/css/styles.css`、`react-resizable/css/styles.css` | 随包 | 网格与把手的定位/尺寸；必须显式 import（§0.3-5）                                                                                                                                                |
| 不新增其它                   | ——          | 懒挂载用原生 `IntersectionObserver`（见 §4.3），不引入 `react-intersection-observer`；深链用 Next 既有路由；状态用既有 zustand 范式                                                  |

落点决定：**dashboard 组件放在 `packages/ui/src/components/dashboard/`**（而不是新建 `packages/dashboard`）。理由：① 它需要 `@workspace/ui` 的 shadcn 原语、`preview-block` 的只读渲染、`NodeSelectionList`，放同包免跨包导入；② `packages/ui/src/styles/globals.css` 的 `@source "../**/*.{ts,tsx}"` 已经覆盖该目录，**零 Tailwind 配置改动**（新包则必须加 `@source`，§0.3-5）；③ `packages/ui/package.json` 的 `exports` 是 `./components/*`，新增目录自动可导入。

### 1.5 组件契约（草案）

```tsx
// packages/ui/src/components/dashboard/dashboard-page.tsx
"use client";

export type DashboardMode = "view" | "edit";

export interface DashboardPageProps {
  /** 当前页（受控）。页面实体的读写都由宿主负责。 */
  page: DashboardPage;
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;

  /** 几何变更的**提交**回调（只在 dragStop / resizeStop / 折叠 / 移除时触发）。 */
  onItemsChange: (items: DashboardItem[], layout: DashboardLayout) => void;

  /** 组件库来源：由宿主投影 dataStore.nodes，组件不读 store。 */
  library: WidgetLibraryEntry[];
  onLibrarySearchChange?: (query: string) => void;

  /** widget 需要的节点解析（与 dataview 的 resolveNode 同一思路：向宿主索取）。 */
  resolveNode: (nodeId: string) => NodeData | undefined;
  /** 「打开节点编辑器」/「打开记录」都交回宿主。 */
  onOpenNode: (nodeId: string) => void;

  className?: string;
}

/** 组件库条目的最小形状（`dataStore.nodes` 的投影结果）。 */
export interface WidgetLibraryEntry {
  nodeId: NodeId;
  title: string;
  nodeType: NodeDataType;
  /** 已在当前页 → 卡片置灰 + 「已添加」 */
  added: boolean;
  semanticId?: string;
  tags?: string[];
}
```

四条边界（写进 JSDoc，与 `@workspace/graph`、`DataViewRoot` 的契约风格一致）：① **不读 store、不读路由** —— 页面、模式、组件库、`resolveNode` 全部由宿主注入（复刻「渲染器不碰 store，需要节点就向宿主索取」的先例，`packages/dataview/src/data-view-root.tsx:107-112`）；② **不写持久化** —— 只通过 `onItemsChange` 报告提交后的新状态，写回是宿主的 `DashboardService`；③ **不承载业务** —— widget body 由 `WidgetBody` 按 `nodeType` 渲染（§4）；④ **不注册全局快捷键**（编辑态切换、删除选中在宿主层）。

---

## 2. 数据模型

### 2.1 TypeScript 草案与落点

```ts
// packages/interfaces/src/models/dashboard.ts（新增，与 data-view.ts 同级）
import type { NodeId } from "./node";

export type DashboardPageId = string;
export type DashboardItemId = string;
/** 与 RGL 的 breakpoints 对齐（§2.2） */
export type DashboardBreakpoint = "lg" | "md" | "sm" | "xs";

export interface DashboardItem {
  /** 条目自己的 id（≠ nodeId：同一节点将来可有多个视图形态） */
  id: DashboardItemId;
  nodeId: NodeId;
  /** 基准断点（lg）的几何；其它断点见 layout */
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  /** 折叠：仍占一行（h=1），展开高度记在 expandedH */
  collapsed?: boolean;
  expandedH?: number;
  /** 渲染形态；缺省 = 由 nodeType 决定（§4） */
  mode?: "auto" | "readonly" | "interactive";
}

/** 只保存「用户在该断点真正拖过」的几何；缺失的断点由 lg 自动生成且不写回（§0.3-8）。 */
export type DashboardLayout = Partial<Record<DashboardBreakpoint, readonly RglLayoutItem[]>>;

export interface RglLayoutItem {
  i: DashboardItemId; // RGL 用 i 作 key，这里等于 item.id
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export interface DashboardPage {
  id: DashboardPageId;
  /** 所属工作区（数据隔离口径与 nodes/views 一致） */
  workspaceId: string;
  name: string;
  /** 页面成员与语义 */
  items: DashboardItem[];
  /** 断点几何 */
  layout: DashboardLayout;
  /** 默认页（`/dashboard` 重定向目标），复刻 DataView.isDefault 的语义 */
  isDefault?: boolean;
  /** 页面排序（头部「页面 ▾」的顺序；不依赖 PB 的 created） */
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}
```

**落在哪一层**：与 `DataView` 完全同构 —— 类型在 `packages/interfaces`，**不在** `packages/ui`。`DashboardItem.nodeId` 只存 id 不存节点快照：节点被删时由**读取侧**处理（`resolveNode` 返回 `undefined` → 渲染「节点已删除」占位并提示移除），而不是级联删除页面条目。

### 2.2 断点与响应式如何存

| 断点 | 容器宽 | cols | 说明                                     |
| ---- | ------ | ---- | ---------------------------------------- |
| lg   | ≥1200  | 12   | **基准断点**，`DashboardItem.x/y/w/h` 就是它 |
| md   | ≥996   | 10   | 只为「用户手动调过」的情况落库            |
| sm   | ≥768   | 6    | 同上                                     |
| xs   | ≥0     | 2    | 平板竖屏；默认由 lg 生成，自动单列        |

规则（三条，缺一不可）：

1. 渲染时把 `items`（语义）+ `layout[activeBreakpoint] ?? autoFrom(lg几何)` 合成 RGL 的 `layout`。
2. `onLayoutChange` **只改本地 state**；写回时只在 `onDragStop` / `onResizeStop` 后判断「当前断点是否被用户动过」，只写那一个断点的键。
3. `autoFrom` 生成的结果**永不写回**——否则窗口缩放会持续产生脏 layout（§0.3-8）。

---

## 3. 交互详设

### 3.1 入口一：节点编辑页「添加到 dashboard」

| 位置                                            | 行为                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `editor-header.tsx:17-56` 的动作区新增一个按钮  | 打开「添加到页面」下拉（`DropdownMenu` + 页面列表 + 「新建页面并添加」）                              |
| 未登录/无页面                                   | 列表为空时显示「新建页面并添加」，一键创建「首页」+ 加入                                              |
| 已在某页                                        | 该项显示 `Check` + 「已在『首页』」（可点）                                                            |
| 反馈                                            | 成功后 `toast`「已添加到『首页』」，并提供「去 dashboard」链接（`/dashboard/<pageId>`）               |
| 数据流                                          | 宿主 → `DashboardService.addItem(pageId, { nodeId, ...默认几何 })`；默认几何由 nodeType 决定（§4.1）    |

### 3.2 入口二：组件库拖入

| 步骤         | 交互                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| 打开抽屉     | 头部「组件库」按钮（展示态也可打开，此时只读浏览）                                                         |
| 筛选         | 搜索框 + 语义/标签 `Select` + 「显示已添加」`Switch`（复用 `NodeSelectionList` 的过滤语义）                |
| 拖入         | 卡片标 `data-rgl-draggable`；RGL 的 `dropConfig` 接管（**触摸端 2.3.0 起同样可用**，`dragConfig.allowMobileScroll` 打开） |
| 落点         | 拖到网格空白 → 按落点插入；拖到已有 widget 上 → **不替换**（避免误覆盖），改为「在其下方插入」（`y: Infinity` + compaction） |
| 键盘替代路径 | 卡片可聚焦，`Enter` = 追加到页尾（**必须提供**：拖拽不可键盘操作，WCAG 2.1 §2.1.1）                          |
| 去重         | 卡片已在页内时置灰并 `aria-disabled`，但可以用键盘激活（提示「已添加」）                                    |

### 3.3 网格内手势

| 手势                    | 展示态       | 编辑态                                   | 备注                                                                     |
| ----------------------- | ------------ | ---------------------------------------- | ------------------------------------------------------------------------ |
| 拖头部把手              | ——           | 换位（碰撞时推挤 + 垂直压缩）            | `dragConfig.handle = ".dashboard-widget-handle"`；平板长按 300ms 进入编辑态 |
| 拖右下把手              | ——           | resize（受 `minW/minH` 约束）            | `react-grid-resizable-handle`                                          |
| 头部「–」               | ——           | 折叠（`h:1`，展开高度记 `expandedH`）    | 折叠态不挂 body（省一次 VTable）                                        |
| 头部「⋯」→ 从本页移除   | ——           | 删除条目（**不删节点**）                 | 二次确认 + `toast` 提供「撤销」                                          |
| 头部标题                | 打开节点编辑 | 同左                                     | `onOpenNode` → `handleNodeEdit`                                          |
| widget body 内交互      | 全部可用     | `pointer-events-none` + 遮罩             | 见 §1.3                                                                  |
| 网格空白右键            | 页面菜单     | 页面菜单（+ 新建页面/切默认页）          | 用 `ContextMenu`（shadcn 已具备）                                        |

### 3.4 多选、撤销与键盘可达性

- **多选**：编辑态下 `Shift + 点击头部` 区间选、`Ctrl/Cmd + 点击头部` 加选（与 gallery 的 roving-tabindex 语义对齐）；多选后可整体拖动（RGL 支持多 item 同时拖）与批量移除。
- **撤销与键盘**：撤销只做**删除的最后一步**（`toast` + 5s 窗口，本地持有上一条目与其几何），完整历史栈列入「不做」（§8）。头部是 `button`（可聚焦）：`Enter` 打开节点、`Delete` 移除、`Alt+↑/↓/←/→` 按格移动/改尺寸（`1` 格步进，仅编辑态）、`Esc` 退出编辑态 —— 所有动作都有非拖拽路径，这正是「触摸端长按进入编辑」的同一套替身方案。

### 3.5 折叠与几何语义

折叠不是 RGL 概念，需要自己表达：`collapsed: true` ⇒ 渲染时把该条目的 `h` 换成 `1`、`static: true`（禁止与折叠条交换位置），`expandedH` 保存原高度。展开时恢复 `expandedH`。**持久化的是 `collapsed` 与 `expandedH`，不是「折叠后的 h」**，否则展开无处可知。

---

## 4. widget 内容策略

### 4.1 按 nodeType 的渲染表

| nodeType   | widget 渲染组件（首选）                                        | 只读 | 默认几何 (w×h / 12 列) | 性能预算（目标设备）                     | 可见才挂载 |
| ---------- | -------------------------------------------------------------- | ---- | ---------------------- | ---------------------------------------- | ---------- |
| text       | `preview-block` 的只读预览层（非 Tiptap）                      | 是   | 4×4                    | < 8ms mount，无第三方库                   | 否         |
| image      | `preview-block` 预览（`<img>` + 比例）                         | 是   | 4×4                    | 一张图解码；`loading="lazy"`             | 是（图片） |
| pdf        | `preview-block` 预览（封面 + 页数）；**不嵌 PDF 渲染器**       | 是   | 4×5                    | 封面图 → 同 image                        | 是         |
| video      | `preview-block` 封面 + 「播放」；点开才进编辑页的 `VideoPlayer` | 是   | 4×3（按 16:9）         | **不同时播放**；hls.js 只在播放时加载     | 是         |
| audio      | `preview-block` 预览（原 `AudioNodeContent` 的只读切片）       | 是   | 6×2                    | 同 video；全页至多 1 个在播              | 是         |
| webpage    | `preview-block` 预览（源码摘要 / 语言徽标）                    | 是   | 4×4                    | 短代码块；**不挂 CodeMirror**            | 是         |
| website    | `preview-block` 预览（favicon + URL）                          | 是   | 4×2                    | 极小                                     | 否         |
| rich-text  | `preview-block` 预览（docs → 只读渲染）                        | 是   | 6×5                    | 中；长文档只渲染前若干块                  | 是         |
| collection | `<DataViewRoot readOnly/>`（无写回调）                         | 是   | 6×6                    | **重**（VTable/FullCalendar/VChart/Graph）| 是，且受并发上限 |
| database   | `<DataViewRoot readOnly/>`（无写回调）                         | 是   | 6×6                    | **重**，同上                              | 是，且受并发上限 |

三条全局规则：

1. **dashboard 上的 widget 一律 `readOnly`**，且**不传** `onViewsChange` / `onCellChange` / `onRowInsert` / `onRowDelete` / `onRowReorder` / `onFieldsChange`。依据 `data-view-toolbar.tsx:60`、`:84-85`：不传 `onViewsChange` ⇒ 不能新建/重命名/删除/改配置；`onActiveViewChange` 始终透传 ⇒ **已有视图间切换仍可用**。
2. **未知/已删节点**：`resolveNode` 返回 `undefined` ⇒ 渲染「节点已删除」占位（保留几何），头部动作区给「移除条目」。
3. **同一个 node 可以在同一页出现两次**（两个 id），但这会让同一节点被挂两份重渲染器——由 §4.3 的并发上限与「同 nodeId 只允许一个 `interactive` 实例」规则兜住；重复添加默认被 §0.2-⑤ 的过滤挡住。

### 4.2 `WidgetBody` 路由（复用 node-content 的类型表）

新增一个薄路由组件，**复用 `node-content-editor.tsx` 的 10 分支表**，但把「编辑器壳」换成「widget 壳」：

```tsx
// packages/ui/src/components/dashboard/widget-body.tsx（草案）
export function WidgetBody({ node, mode }: { node: NodeData; mode: "readonly" | "interactive" }) {
  switch (node.nodeType) {
    case "text": /* → <NodePreviewBody kind="text" .../> */
    case "image": /* ... */
    case "database":
    case "collection":
      return mode === "interactive" ? <NodeWidgetDataView node={node} /> : <NodeWidgetSummary node={node} />;
    default:
      return <NodeWidgetSummary node={node} />; // preview-block 的只读层
  }
}
```

`node-content-editor.tsx` 的改动方式（§6）：把那份 `switch` 抽成 `NodeBodyRouter({ node, mode })`，`NodeContentEditor` 用 `mode="edit"`（现状不变），`WidgetBody` 用 `mode="widget"`。**不是**让 widget 去调 `NodeContentEditor`。

### 4.3 三个重 widget 的隔离策略

```text
<WidgetFrame> → <VisibilityGate>（IntersectionObserver，rootMargin 200px）
   ├ 未进入视口 → <WidgetSkeleton/>（等高占位，0 依赖）
   └ 进入视口 且 并发额度可用 → 挂真实渲染器；额度不足 → <WidgetDeferred/>（“点此加载”）
```

| 机制                     | 规则                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 懒挂载                   | 原生 `IntersectionObserver`，`rootMargin: "200px"`，**首次可见后不再卸载**（卸载重挂 VTable 比留着更贵），但折叠/切页会卸载 |
| 全页并发上限             | 重渲染器（database/collection 的 dataview、graph）**同时挂载 ≤ 2**；由 `WidgetRuntimeContext` 计数与排队                  |
| `<Graph/>` 的硬上限      | **全页 1 个**（§0.3-1）。第二个 graph 类 widget 渲染占位卡 + 说明文案，不静默失败                                            |
| 拖拽/缩放期间冻结        | `onDragStart` / `onResizeStart` 时把所有重渲染器切到 `frozen`（渲染占位，保留 key），`onDragStop` 后 100ms 再恢复 —— VTable 在连续尺寸变化下会重新测量并可能抖动（`data-view-root.tsx:380-397` 记录了这类闪烁） |
| 迷你形态（`readonly`）   | database/collection 的默认形态是**纯 DOM 摘要**（前 N 行 × 前 M 列 / 前 N 张卡片），不进 VTable；用户点「展开为数据视图」才升级到 `interactive` |
| 卸载                   | 记录页 scrim / 折叠 / 切页时卸载；`DataViewRoot` 的 `key` 用 `item.id`（不是 `node.id`，见 §5.3）                            |

---

## 5. 持久化与写回

### 5.1 逐层链路（新建 `dashboard_pages`，复刻 `views` 的六层）

| 层       | 位置                                                                        | 内容                                                                                                                    |
| -------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 迁移     | `pb/pb_migrations/1700000001_dashboard_pages.js`（**新文件名**）             | `name`(text)、`workspaceId`(text)、`items`(json)、`layout`(json)、`isDefault`(bool)、`sortOrder`(number)；规则与 nodes 一致（`listRule: ""`，鉴权在 tRPC） |
| 类型     | `packages/interfaces/src/models/dashboard.ts`                                | §2.1 的形状                                                                                                             |
| domain   | `backend/domain/src/models/dashboard/{entities,value-objects}.ts`            | `DashboardPage` 不可变实体 + `normalizeDashboardPage`（唯一校验边界：id 非空、name 非空、items 的 id 唯一、几何为整数且 `w≥minW`）。**照搬 `normalizeViews` 的位置与职责**（`backend/domain/src/models/node/value-objects.ts:345`） |
| 仓储     | domain 的 `IDashboardPageRepository` + `backend/infrastructure` 的 PB repo + mapper | `items`/`layout` 列 ↔ 实体字段（缺失列读成 `[]` / `{}`，与 `views` 列的处理一致）                                         |
| 应用     | `backend/application/src/{commands,queries}/dashboard/` + DTO + mapper      | `items` 与 `layout` 是**两个独立的半边**：只改其中一个的 patch 不许动另一个（复刻 `filterConfig` / `views` 的既有约定）   |
| API      | `backend/adapter-front/src/trpc/router/dashboard.ts` + `router/index.ts` 注册 | `add` / `update` / `delete` / `listByWorkspace` / `getById` / `setDefault`。**items 必须用 `z.custom` 而不是 `z.object`**（`z.object` 会剥掉 `config`/几何里的未知键；`.passthrough()` 也不可用，其 index signature 会让解析类型不可赋值 —— 这套理由在 `node.ts:86-98` 已写死） |
| 前端服务 | `packages/services/src/dashboard/dashboard.service.ts`                        | 乐观 upsert + 回滚 + `DebounceScheduler`（500ms）+ `flushPendingUpdate`，与 `node.service.ts:18-21`、`:56-88`、`:145-152` 同构 |
| 前端状态 | `packages/store/src/dashboardStore.ts`                                        | `pages: Map<DashboardPageId, DashboardPage>`、`currentPageId`、`editing`、`upsertPage` / `deletePage` / `setCurrentPage` / `setEditing`。**不进 `dataStore`**：`dataStore` 的 `diff` 是给 graph 订阅图数据用的（`dataStore.ts:54-55`、`graph.tsx:117-132`），塞布局进去会污染 diff |

### 5.2 乐观更新 + 防抖的具体时序

```text
用户拖完松手 → onDragStop（本地 state 已是新几何，受控渲染无闪烁）
  └─ DashboardService.upsert(pageId, { items, layout }, { debounce: 500 })
       ├─ 1) store.upsertPage(merged)         // 同步、乐观
       └─ 2) DebounceScheduler.schedule(...)  // 500ms 内的连续拖拽合并成一次 tRPC；失败则回滚 + toast
切页 / 组件卸载 → DashboardService.flushPendingUpdate(pageId)  // 不让最后一次拖拽丢掉
```

**为什么是 500ms**：与 `DEFAULT_NODE_UPDATE_DEBOUNCE_MS`（`node.service.ts:18`）和 `DEFAULT_VIEW_UPDATE_DEBOUNCE_MS`（`view.service.ts:14`）一致；不引入第二套节流语言。

**不要 `debounce: true` 之外的手写 `setTimeout`**：`DebounceScheduler` 已带 flush/cancel，手写定时器在切页时会丢最后一次写。

### 5.3 页面切换与 `key` 的作用

| 位置                          | key                     | 为什么                                                                                                       |
| ----------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `<DashboardGrid key={page.id}>` | 页面 id               | RGL 内部持有 drag/resize 的瞬态；换页必须重挂，否则会把上一页的瞬态几何带过来                                |
| `<DataViewRoot key={item.id}>` | **item id**（不是 node.id） | 沿用「宿主必须 `key={node.id}`」的契约（`data-view-root.tsx:60-63`），但在 dashboard 上一个 node 可能被引用两次，**item.id 才是这个挂载点的身份** |
| `<WidgetBody key={node.updatedAt}>` | 内容版本            | 编辑页改了节点内容后 dashboard 要刷新（同一 store 订阅即可，通常不需要显式 key）                              |

同一个 node 在两个 widget 里 = 两份 `DataViewRoot` = 两份 VTable。§4.1 的「同 nodeId 只允许一个 interactive 实例」规则即为此。

---

## 6. 复用与重构清单

| 文件 / 位置                                                                    | 动作                                                                                                    | 阶段 |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ---- |
| `packages/ui/src/components/dialog/editor/content/node-content-editor.tsx:29-62` | 把 10 分支 `switch` 抽成 `NodeBodyRouter({ node, mode: "edit" \| "widget" })`；`NodeContentEditor` 变成 `mode="edit"` 的调用方（行为零变化） | P0   |
| `packages/ui/src/components/dialog/editor/content/database-node-content.tsx`    | 抽出 `DatabaseNodeBody({ node, readOnly })`：写回调变可选；`readOnly` 时不构造 drain 队列（`liveContent` / `pendingPatches` 那套只在可写时启用） | P1   |
| `packages/ui/src/components/dialog/editor/content/collection-node-content.tsx`  | 抽出 `CollectionNodeBody({ node, readOnly })`，同理；`tabActions` 的「编辑过滤」只在编辑页传                              | P1   |
| `packages/ui/src/components/preview-block/**`                                   | 只读预览层被 widget 复用（首版直接 import，不搬文件）；若发现 dialog/浮层耦合，抽出 `NodePreviewBody`（与 dynamic-island 的 §8 计划同一处） | P0   |
| `packages/ui/src/components/header/editor-header/editor-header.tsx:17-56`       | 动作区加「添加到 dashboard」（`DropdownMenu`：页面列表 + 新建页面并添加）                                | P1   |
| `packages/ui/src/components/dialog/node-selection-list.tsx:43`                  | 组件库抽屉的筛选与卡片列表复用它（或抽其过滤逻辑为 `useNodeLibraryEntries`）                             | P2   |
| `packages/ui/src/components/layout/main-layout.tsx` + `sidebar/main-sidebar.tsx` | dashboard 页复刻 graph 页的骨架；侧边栏若无 dashboard 入口则加一个 `LayoutDashboard` 图标项（图标已在 `view-select-dropdown-menu.tsx:16` 用过） | P0   |
| `apps/web/app/(main)/dashboard/page.tsx`                                        | 新增：`redirect` 到默认页                                                                                | P0   |
| `apps/web/app/(main)/dashboard/[pageId]/page.tsx`                               | 新增：宿主适配（store / services / 组件契约注入）                                                        | P0   |
| `apps/web/components/dashboard-host.tsx`                                        | 新增：`dataStore.nodes` → `library` 投影、`resolveNode`、`onOpenNode`、`DashboardService` 绑定、快捷键    | P0   |
| `packages/store/src/dashboardStore.ts`                                          | 新增切片（§5.1）                                                                                         | P0   |
| `packages/dataview/**` · `packages/graph/**` · `apps/web/middleware.ts`           | **都不改**。dataview 只通过既有 props 挂 `<DataViewRoot/>`（「迷你摘要」放 dashboard 侧，避免污染 dataview 的视图注册表）；graph 的实例上限在 dashboard 侧计数、不动 worker 协议；`/dashboard` 已在 `PROTECTED_PATHS` 与 matcher | ——   |
| `packages/ui/package.json`                                                      | `+ react-grid-layout ^2.3.0`（唯一新增依赖）                                                              | P0   |
| `packages/ui/src/styles/globals.css:8-16`                                       | **无需改**（`@source "../**/*.{ts,tsx}"` 覆盖新的 `components/dashboard/`）；仅当组件最终落在别的包时才要加行 | ——   |

---

## 7. 分阶段路线图

| 阶段   | 交付                                                                                                                                                                       | 验收                                                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **P0** | 路由（`/dashboard` 重定向 + `/dashboard/[pageId]`）＋ `DashboardHeader` ＋ RGL 网格（静态 `items`）＋ 只读 widget（轻类型走 preview 层）＋ `dashboardStore` ＋ 展示/编辑态切换 ＋ `NodeBodyRouter` 抽取 | 手写一页假数据能渲染 6 个 widget；拖拽换位 + resize + 自动紧凑可用；刷新后几何不变（暂用 localStorage 兜底或直连后端）；`pnpm --filter=@workspace/ui typecheck/lint` 通过 |
| **P1** | 实体链路（迁移 + domain + repo + app + tRPC + `DashboardService`）＋ database/collection 的 `readOnly` `DataViewRoot`（含懒挂载与并发上限）＋ 编辑器头「添加到 dashboard」＋ 折叠/删除/打开节点 | 两条入口都能持久化；`/dashboard/<id>` 深链直接打开；database widget 能切视图但不能编辑数据；删除条目不影响节点            |
| **P2** | 组件库抽屉（搜索/语义/标签过滤 + `data-rgl-draggable` 拖入 + 键盘追加）＋ 多选 + 删除撤销 ＋ 拖拽期间冻结重渲染器 | 从抽屉拖入成功且落点正确；触摸端长按进入编辑后拖入可用；编辑态下 body 不抢事件                                             |
| **P3** | 多页面管理（新建/重命名/复制/删除/设默认/排序）＋ 断点几何（md/sm/xs 按需落库）＋ 迷你摘要形态与「展开为数据视图」＋ 性能收尾 | 5 个页面可切换可深链；窗口缩放不产生脏 layout；多 widget 的 rAF 不再持续劣化（§9）                                        |

---

## 8. 边界与取舍

**不做**（本设计明确排除）：

1. **自由画布定位**（绝对坐标、叠加、z-index 分层）。RGL 是**紧凑网格**：一切皆格子、自动压缩。自由画布会立刻需要「网格对齐/吸附/碰撞策略」一整套，且与「自动布局」互斥。
2. **widget 间联动**（点 A 图的某个切片 → B 表跟着筛）。这需要一个跨 widget 的筛选总线；dataview 今天连 shell 内的跨视图 `rowFilter` setter 都没暴露（见 `docs/dataview/README.md` 的图表下钻说明），先在 dashboard 上打开这个口子会过早锁死语义。
3. **分享与权限**。`dashboard_pages` 的 PB 规则与 nodes/views 一致（`listRule: ""`，鉴权在 tRPC），因此**页面属于工作区**而非个人；按用户私有的布局、公开只读分享页、嵌入 iframe 都不做。
4. **在 dashboard 上写数据**。§0.2-② 的结论，写入一律回节点编辑页。
5. **多步撤销栈，以及 widget 内的记录编辑页**。撤销只保留「删除条目」的单步；记录页是 `absolute` 覆盖列 + scrim（`database-node-content.tsx:245-281`），在 300×200 的 widget 里没有意义，一律「打开节点编辑器」。
6. **移动端专门的窄屏手势层**。平板端只做「长按进入编辑 + 只读浏览」，不做双击缩放/两指布局等。

**已知取舍**：

- **每页至多 2 个重 widget、至多 1 个 `<Graph/>`**：这是算力换稳定性的明确取舍（目标是一加平板 + anland 转发显示）。超限不是静默降级，而是显式占位卡 + 说明。
- **只为动过的断点落库**：省写入、避免脏 layout，代价是「在 md 上手调过、之后又改了 lg」不会自动传播到 md（用户可手动重置该断点）。
- **widget 一律只读**：牺牲了「在 dashboard 上快速改一个单元格」的便利，换来 dashboard 完全没有写路径（无 drain 队列、无 requestKey 竞态、无乐观回滚），第一版复杂度显著下降。
- **不新建 `packages/dashboard`**：组件放 `packages/ui` 换来零 Tailwind 配置改动，代价是 `packages/ui` 再增一个中等体积目录（与 `dialog/editor/` 同量级）。

---

## 9. 验证方法

项目**没有测试基础设施**（无 vitest/jest，见根 `AGENTS.md` 的 anti-patterns），验证 = 类型 + lint + 浏览器手测。

```bash
pnpm --filter=@workspace/ui typecheck        # 组件 + RGL 类型
pnpm --filter=@workspace/ui lint
pnpm --filter=@workspace/store typecheck
pnpm --filter=@workspace/interfaces typecheck
pnpm --filter=@workspace/services typecheck
pnpm --filter=web dev                        # http://localhost:3000/dashboard
# 后端（改动 dashboard 实体/路由时）
cd backend/domain && pnpm typecheck && cd ../application && pnpm typecheck \
  && cd ../infrastructure && pnpm typecheck && cd ../adapter-front && pnpm typecheck
```

数据库：**新增迁移必须用新文件名**；若本地 `pb_data` 已存在，先删库重建（`pb/pb_migrations/1700000000_initial_schema.js:170-173` 的原因说明）。

手测清单（P0 起逐阶段累加）：

1. **网格基线**：≥6 个 widget 拖拽换位、resize、松手后自动紧凑无空洞；`minW/minH` 生效；折叠后不参与位置交换；拖完立即刷新（不等 debounce）几何不丢（验证 `flushPendingUpdate`）。
2. **多 widget 隔离**：放 2 个 database widget，确认同一时刻只有 ≤2 个重渲染器挂载；滚动到第三个进入视口才挂载；折叠后卸载。
3. **graph 上限**：放 2 个 collection widget 并把都切到 `graph` 视图 → 第二个渲染占位卡而不是再起一个 worker；DevTools 的 Sources → Workers 里 worker 数量 = 1。
4. **记录页与 `key`**：在 database widget 上点记录 → 打开节点编辑器（而不是在 widget 内弹出）；切页来回后视图 tab 的激活视图没有被上一页污染。
5. **只读验证**：dashboard 上的 database widget 里点单元格不可编辑；视图能切换但不能新建/重命名/删除（`canEditViews=false`），也看不到字段 CRUD。
6. **触摸**：DevTools 触摸仿真下长按 widget 头部 300ms 进入编辑态、拖动、松手；widget body 内滚动不触发拖拽；子元素 `onClick` 不被吞（`allowMobileScroll`）。
7. **断点**：把窗口从宽拖到窄再拖回，`layout` 不能出现自动生成的脏键（对比写回前后的 store 快照）；在 md 手动拖一次后 md 键才出现。
8. **回归面**：`/graph` 的节点编辑、dataview 的七个视图、`NodeEditor` 的 dialog/全屏两种模式都不受影响；`/dashboard` 的 middleware 保护对未登录用户仍然生效；`prefers-reduced-motion` 与断网（tRPC 失败 → 回滚 + toast）下布局操作仍可完成。

性能观测点（P1 起，每阶段回归一次）：

| 观测项        | 方法                                                                                                            | 判据                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 帧时长 / 宽度抖动 | DevTools Performance 录制 10s（3 个 widget，其中 1 个 database），看 Frames 与 Long Tasks；缩放窗口观察是否反复 re-render（#2271 的分数缩放循环） | rAF 无持续劣化；无 > 50ms 长任务；不出现 `Maximum update depth exceeded` |
| worker 数量   | DevTools → Sources → Workers / `chrome://inspect`                                                               | `graph` widget 存在时 = 1                                        |
| 内存          | DevTools Memory：先堆快照 → 拖拽 + 切页 20 次 → 再快照                                                          | 增量收敛（无线性增长即无泄漏）；重点看 VTable/canvas 是否随切页释放（`release()` 调用） |
| 拖拽流畅度    | 拖拽时重渲染器应处于 `frozen`（占位而不是重排）                                                                  | 拖拽期间无 VTable 重测量                                        |

---

## 10. 文件与依赖清单

**新增**

| 路径                                                                       | 说明                                                       | 阶段 |
| -------------------------------------------------------------------------- | ---------------------------------------------------------- | ---- |
| `docs/dashboard/README.md`                                                 | 本文件                                                     | ——   |
| `packages/interfaces/src/models/dashboard.ts`                              | `DashboardPage` / `DashboardItem` / `DashboardLayout`       | P0   |
| `packages/store/src/dashboardStore.ts`                                     | 页面 Map + currentPageId + editing                          | P0   |
| `packages/ui/src/components/dashboard/*`                                   | `dashboard-page.tsx`（壳）、`dashboard-grid.tsx`（RGL）、`dashboard-header.tsx`、`widget-frame.tsx`、`widget-body.tsx`、`widget-library-drawer.tsx`、`visibility-gate.tsx`、`widget-runtime-context.tsx`、`dashboard-config.ts`（列数/断点/默认几何） | P0–P2 |
| `packages/ui/src/components/dashboard/node-body-router.tsx`                | 从 `node-content-editor.tsx:29-62` 抽出的 10 分支表（`mode: edit \| widget`） | P0   |
| `packages/ui/src/components/dashboard/node-widget-data-view.tsx`           | database/collection 的 `readOnly` `<DataViewRoot/>` 挂载点（不传写回调）  | P1   |
| `packages/ui/src/components/dashboard/node-widget-summary.tsx`             | 纯 DOM 迷你摘要（前 N 行 / 前 N 张卡片），不进 VTable        | P3   |
| `apps/web/app/(main)/dashboard/page.tsx`                                   | 重定向到默认页                                              | P0   |
| `apps/web/app/(main)/dashboard/[pageId]/page.tsx`                          | 页面宿主                                                    | P0   |
| `apps/web/components/dashboard-host.tsx`                                   | store / services / 组件库投影 / 快捷键绑定                   | P0   |
| `packages/services/src/dashboard/dashboard.service.ts`                     | 乐观 upsert + 防抖 + flush                                  | P1   |
| `backend/domain/src/models/dashboard/{entities,value-objects}.ts`          | 实体 + `normalizeDashboardPage` 校验边界                    | P1   |
| `backend/infrastructure/src/.../dashboard-page.{mapper,repository}.ts`     | PB 列 ↔ 实体                                                | P1   |
| `backend/application/src/{commands,queries}/dashboard/**` + `dto/dashboard.dto.ts` | 命令/查询 + DTO（`items` 与 `layout` 是两个独立半边）        | P1   |
| `backend/adapter-front/src/trpc/router/dashboard.ts`                       | `add` / `update` / `delete` / `listByWorkspace` / `getById` / `setDefault`（items 用 `z.custom`） | P1   |
| `pb/pb_migrations/1700000001_dashboard_pages.js`                           | **新文件名**的迁移（不动 0 号）                              | P1   |

**修改**

| 路径                                                                     | 改动                                                                     | 阶段 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ---- |
| `packages/ui/package.json`                                              | `+ react-grid-layout ^2.3.0`                                             | P0   |
| `packages/ui/src/components/dialog/editor/content/node-content-editor.tsx` | `switch` 抽成 `NodeBodyRouter`，自身变成 `mode="edit"` 调用方（行为不变） | P0   |
| `packages/ui/src/components/header/editor-header/editor-header.tsx`      | 动作区加「添加到 dashboard」                                             | P1   |
| `packages/ui/src/components/sidebar/main-sidebar.tsx`                    | 可选：加 dashboard 导航项                                                | P0   |
| `packages/interfaces/src/models/index.ts`                               | 导出 dashboard 模型                                                      | P0   |
| `packages/services/src/index.ts` / `graph/index.ts`                     | 导出 `DashboardService`                                                  | P1   |
| `packages/store/src/index.ts`                                           | 导出 `useDashboardStore`                                                 | P0   |
| `backend/adapter-front/src/trpc/router/index.ts`                        | 注册 `dashboard: dashboardRouter`                                        | P1   |
| `backend/domain/src/repositories/index.ts`                              | 加 `IDashboardPageRepository`                                            | P1   |
| `backend/adapter-front/src/di/container.ts`                             | 注册 repo + 两个 service                                                 | P1   |
| `packages/ui/src/styles/globals.css`                                    | **仅当**组件最终落在 `packages/ui` 之外的包时才需加 `@source`（见 §0.3-5） | 视情况 |

---

## 参考

- react-grid-layout（仓库、v2 hooks API、`data-rgl-draggable` 外部拖入、React 兼容表 `>= 2.0.0 → React 18+`、CSS 导入说明）：<https://github.com/react-grid-layout/react-grid-layout>
- react-grid-layout CHANGELOG（2.3.0 的外部拖入触摸支持 / `dragConfig.allowMobileScroll` / `GridItem` memo 化 / 2.2.4 的分数缩放死循环修复）：<https://github.com/react-grid-layout/react-grid-layout/blob/master/CHANGELOG.md>
- react-grid-layout v2 RFC（破坏性变更清单：`width` 必填、`onDragStart` 阈值、不可变回调参数、`data-grid` 仅 legacy）：<https://github.com/react-grid-layout/react-grid-layout/blob/master/rfcs/0001-v2-typescript-rewrite.md>
- npm · react-grid-layout（latest 2.3.0，`peerDependencies: react >= 16.3.0`）：<https://www.npmjs.com/package/react-grid-layout>
- dnd-kit · 「Can DND do the react-grid-layout showcase?」（为什么 dnd-kit 本身不是网格布局库）：<https://github.com/clauderic/dnd-kit/discussions/1560>
- gridstack.js（无依赖、命令式 API，对比参考）：<https://github.com/gridstack/gridstack.js>
- react-mosaic（瓦片窗口管理器；peer `react: "16 - 19"`）：<https://github.com/nomcopter/react-mosaic>
- Puck（React 可视化搭建器，对比参考）：<https://puckeditor.com/>
- Dashboard 设计模式（编辑态/展示态的既有惯例参考）：<https://dashboarddesignpatterns.github.io/>
- IntersectionObserver 懒挂载重组件与预留空间（CLS）实践：<https://blog-website-navy-one.vercel.app/blog/lazy-mounting-heavy-embeds-in-your-react-blog-with-intersection-observer>

**待验证（本文件标注为不确定的项）**：

1. RGL 2.3.0 在 **React 19.2.4** 上的实际运行（README 只声明 `React 18+`；`findDOMNode` 阻塞点已实测消失，但拖拽/缩放/resize 手柄需在浏览器里逐项复验）。
2. `useContainerWidth` 在**一加平板 + anland 转发显示**的缩放环境下是否仍会触发反复测量（2.2.4 修过分数缩放循环，2.3.0 新增 `debounceTimeout`，需实测）。
3. RGL 的 `dropConfig` 外部拖入与 `data-rgl-draggable` 在**触摸端 + Next 16 App Router** 组合下的行为（2.3.0 的新特性，社区样本少）。
4. 2 个 VTable 类渲染器同页并存的实际内存与帧率（未见公开基准，需按 §9 自测）。
