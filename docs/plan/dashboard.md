# dashboard 执行计划（M10 / M11 / M13）

> 状态：**待开工**（M10 未开始；开工前提 = M1 通过 G1）
> 覆盖：M10（dashboard P0）· M11（dashboard P1）· M13（dashboard P2+P3）；闸门 **G10 · G11 · G13**
> 契约：[README.md](./README.md)（执行总纲：§2 执行主体、§3 并行窗口 W3=M10 / W4=M13、§4 迁移账本、§5 依赖账本、§6 闸门规程、§8 基线口径、§9 偏差 R6）＋ [../dashboard/README.md](../dashboard/README.md)（设计契约，执行期间**冻结**，只回填「待验证」）
> 相关：[gates.md](./gates.md)（闸门台账，唯一进度真相源）、[baseline.md](./baseline.md)

---

## 0. 这一章要解决什么

三章一句话：**M10** 用一页内存假数据把 RGL 网格的手感与展示/编辑态跑通，并顺手把 `node-content` 的 10 分支类型表抽成可复用的 `NodeBodyRouter`；**M11** 把页面变成 `dashboard_pages` 实体（唯一动后端的一章）并把 database/collection 以**只读**方式挂进 widget；**M13** 补齐组件库拖入、多页面、「只为动过的断点落库」与性能收尾。

### 0.1 前置（开工前必须成立）

1. **M1 通过 G1**（`nodes` 四列链路已可写）——M10 的依赖项只有 M1。
2. **RGL 不做提前验证**：`pnpm --filter=@workspace/ui add react-grid-layout@^2.3.0` 必须在 M10 第一步落地并提交 lockfile（总纲 §5），装完**立刻**跑 `pnpm --filter=web build`；不通过就触发总纲 §10 的退路（自研网格 + `@dnd-kit`）。本章的每个 G10 判据都以此为前提。
3. **`pb/pb_data` 不得删**（总纲 §4 规矩 1）→ M11 的迁移只能是**新文件名**的追加迁移。
4. 就在 `develop` 上推进，不切分支（总纲 §7）。本章内禁止 `git` 操作与任何包管理命令（除 §0.1-2 那一次）。

### 0.2 本章新定、总纲没写的决策（须回填总纲 §9）

| #   | 决策                                                                                                                                                                                                                     | 理由 / 依据                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | **P0 的页面从哪来**：`dashboard-host.tsx` 在 `dashboardStore` 无页时，用当前 workspace 的前 6 个节点合成一页（`createPreviewPage`）；M11 起被 `DashboardService.listByWorkspace` 取代 | 设计 §7 的 P0 行只写「手写一页假数据能渲染 6 个 widget」，没说假数据放哪。从 `dataStore.nodes` 合成的好处是 `resolveNode` 拿到的是真节点，G10 无需额外造种子数据                                                                                                                |
| D2  | **P0 的 database/collection widget 走只读 preview 层，不挂 `DataViewRoot`**；真实只读挂载是 M11 的交付                                                                                                                    | 设计 §7 把「`readOnly` `DataViewRoot`（含懒挂载与并发上限）」明确写在 P1 行；P0 先渲染 `preview-block/previews/database-preview.tsx` 这类已有只读切片，避免在 P0 就引入 VTable 的并发与冻结问题                                                                                  |
| D3  | `NodeBodyRouter` **单一入口、两张路由表**（`mode: "edit" \| "widget"`），10 个 case 的类型清单不拆成两个文件                                                                                                              | 设计 §4.2 给的 `WidgetBody` 草案是一个**独立的** switch，§6 又说「把那份 switch 抽成 `NodeBodyRouter({node, mode})`」。两处合并为一个文件的双表，才有「类型路由表只有一个真相源」，且 `node-content-editor.tsx` 的行为可逐字对照                                                                  |
| D4  | **不做侧边栏入口**（`main-sidebar.tsx` 不加 dashboard 项）                                                                                                                                                                | 真读 `packages/ui/src/components/sidebar/main-sidebar.tsx`：唯一的路由跳转是 `:1005` 的 `window.location.href = "/login"`，**没有任何指向应用路由的导航项**。给它单开一个 link 会引入一种新范式，且该文件是 M4/M9 的地盘。入口 = 直接 URL + 编辑器头按钮 + M13 的页面菜单                        |
| D5  | 懒挂载与并发上限的载体：`WidgetRuntimeContext` 暴露 `acquire() / release()`，`<Graph/>` 另有一个**独立**的 `graphSlots`（上限 1）                                                                                          | 设计 §0.3-1 的原话是「模块级计数器 + 上下文」；但 dataview 与 graph 是两种不同贵的资源，合成一个额度会让「1 个 graph + 1 个 VTable」把两者一起耗尽                                                                                                                              |
| D6  | `packages/services/src/index.ts`、`packages/services/src/dashboard/index.ts` 的桶改动归**主 agent**                                                                                                                       | 总纲 §2.2-4 只把 `ui/components/index.ts`、`ui/styles/globals.css`、`store/index.ts` 列为独占，services 的两个桶是同类「公共出口」，理由相同（冲突面最大）。真读 `packages/services/src/index.ts`：当前只有一行 `export * from "./graph";`                                                       |
| D7  | W4 **增第五条线 E**（多选 / 删除撤销 / 触摸长按），并把 `dashboard-header.tsx` 收归主 agent 在冻结步写成两个插槽 | W4 的四条线里「多页面管理」与「组件库抽屉」都要动 `dashboard-header.tsx`（一个加页面菜单、一个加抽屉开关），违反「同一文件同一时刻只有一个 owner」。把 header 的接线留在冻结步，A/B 各自只写自己的新文件                                                                          |
| D8  | `sortOrder` 用**稀疏整数 10 / 20 / 30**，重排只改被移动的相邻两条                                                                                                                                                          | 设计 §2.1 只给 `sortOrder?: number` 的语义。连续整数重排要么整页重写（N 次 upsert）要么留小数；稀疏整数让「插到中间」只需改一条                                                                                                            |
| D9  | `mounted && width > 0` 才渲染网格，`useContainerWidth({ debounceTimeout: 100 })` 是**硬判据**而不是建议                                                                                                                    | 设计 §0.3-10 已给方向；本章把它写成可判定项：`width === 0` 时 `dashboard-grid.tsx` 必须 `return null`（否则 RGL 会把所有项压成一列并回灌 layout）                                                                                                                              |

### 0.3 与设计文档的硬冲突（**以总纲为准**，设计文档相应句子失效）

1. **迁移文件名**：设计 §5.1 / §10 写 `1700000001_dashboard_pages.js`；总纲 §4 与 R2 定为 **`1700000002_dashboard_pages.js`**（`1700000001` 被 M1 的 `node_extras` 占用）。**本章一律用 `1700000002`。**
2. **P0 的几何**：设计 §7 的 P0 行写「刷新后几何不变（暂用 localStorage 兜底或直连后端）」；**R6** 改为内存 → P0 的此项验收失效，改为「刷新丢几何是**预期**，不判失败」，该判据整体移到 M11/G11。
3. **编辑器头的路径**：总纲 §3.1 把「编辑器头」写在 `packages/ui/src/components/dialog/editor/editor-header/**`；**真实路径是 `packages/ui/src/components/header/editor-header/editor-header.tsx`**（该目录含 `editor-header.tsx` / `options-menu.tsx` / `pin-button.tsx` / `fullscreen-button.tsx` / `node-title.tsx` / `attributes-sidebar.tsx`；`packages/ui/src/components/dialog/editor/node-editor.tsx:7` 就是这么 import 的）。
4. **组件库的「复用 `NodeSelectionList`」是部分不成立**：设计 §0.2-⑤ / §3.2 说直接复用 `packages/ui/src/components/dialog/node-selection-list.tsx:43` 的 `NodeSelectionList`。真读该文件：它的过滤只有**标题 + 语义名**（`:53-62`），既没有标签过滤也没有「显示已添加」开关，而且它是一份带「全选/清空」的多选清单，不是卡片网格。→ 只复用它的**过滤口径**，卡片网格与两个开关在 M13-A 新写。

---

## M10 — dashboard P0（路由 + RGL 网格 + 只读 widget + `NodeBodyRouter`）

### M10.1 工作分解（任务包）

| #   | 任务                                                                                                            | 文件白名单（新增 / 修改）                                                                                                                                                                                                                             | 执行主体                       | 验收（编译器可判定的部分）                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **冻结契约**：`interfaces` 加 dashboard 模型；`store` 加 `dashboardStore` 切片；定死断点表与默认几何              | 新增 `packages/interfaces/src/models/dashboard.ts`、`packages/store/src/dashboardStore.ts`、`packages/ui/src/components/dashboard/dashboard-config.ts`；修改 `packages/interfaces/src/models/index.ts`、`packages/store/src/index.ts`                    | **主 agent**（总纲 §2.2-1/4）  | `pnpm --filter=@workspace/interfaces typecheck` ＋ `pnpm --filter=@workspace/store typecheck` 通过；形状 = 设计 §2.1 逐字段；`dashboard-config.ts` 导出 `DASHBOARD_BREAKPOINTS` / `DASHBOARD_COLS` / `defaultGeometryFor(nodeType)` |
| 2   | 装依赖并立刻验打包                                                                                              | 修改 `packages/ui/package.json`（＋`react-grid-layout ^2.3.0`）＋ lockfile                                                                                                                                                                             | **主 agent**（总纲 §5）        | `pnpm --filter=@workspace/ui typecheck` 通过且能 `import { useContainerWidth } from "react-grid-layout"`；`pnpm --filter=web build` 通过（否则触发 §10 退路） |
| 3   | 抽 `NodeBodyRouter`（**行为零变化**）                                                                            | 新增 `packages/ui/src/components/dashboard/node-body-router.tsx`；修改 `packages/ui/src/components/dialog/editor/content/node-content-editor.tsx`                                                                                                     | **主 agent**（该文件 M10 独占） | `pnpm --filter=@workspace/ui typecheck`＋`lint`；`grep -c 'case "'` 在 router 的 edit 表上仍为 **10**；`dialog/editor/index.ts:2` 的 `NodeContentEditor` 导出不变 |
| 4   | **W3-A（组件线）**：RGL 网格、widget 帧、可见性闸、运行时额度                                                     | 新增 `.../dashboard/dashboard-grid.tsx`、`widget-frame.tsx`、`visibility-gate.tsx`、`widget-runtime-context.tsx`                                                                                                                                        | **子 agent · W3-A**            | `pnpm --filter=@workspace/ui typecheck`＋`lint`；两个 RGL 的 CSS 在 `dashboard-grid.tsx` 里显式 import（先例：`packages/ui/src/components/filter/filter.tsx:15`） |
| 5   | **W3-B（组件线）**：页面壳、头部、widget 体                                                                       | 新增 `.../dashboard/dashboard-page.tsx`、`dashboard-header.tsx`、`widget-body.tsx`                                                                                                                                                                     | **子 agent · W3-B**            | 同上；`dashboard-page.tsx` 的 props 逐字段等于设计 §1.5 的 `DashboardPageProps`（`page`/`mode`/`onModeChange`/`onItemsChange`/`library`/`resolveNode`/`onOpenNode`） |
| 6   | **W3-B（宿主线）**：三条路由 + 宿主适配                                                                           | 新增 `apps/web/app/(main)/dashboard/page.tsx`、`apps/web/app/(main)/dashboard/[pageId]/page.tsx`、`apps/web/components/dashboard-host.tsx`                                                                                                              | **子 agent · W3-B**            | `pnpm --filter=web typecheck`；未改 `apps/web/middleware.ts`（`/dashboard` 已在 `:4` 与 `:58`）                                                          |
| 7   | **合并自检**：两条线交付后由主 agent 跑一次合并后的三包 typecheck/lint，与 `baseline.md` 对比                     | （只读）                                                                                                                                                                                                                                              | **主 agent**                   | `ui` / `store` / `interfaces` / `web` 的 typecheck ＋ lint **无新增失败**                                                                                |

**W3 纪律**：主 agent 的第 1 项（`interfaces` + `store` + `dashboard-config.ts`）是 W3 的开启前提，必须先落地。A/B 的自检命令允许在对方模块尚未落地时报「模块不存在」，此类错误必须在报告里逐条列出「等待哪条线的哪个文件」，由主 agent 在第 7 项统一判定；子 agent 不得为此临时造桩文件（桩会让白名单失真）。

### M10.2 关键决策与挡路的坑

- **R6 是本章的验收改写点**：P0 的几何只活 `dashboardStore` 的内存里。因此 ① P0 **禁止任何 `localStorage` / `sessionStorage` 写入**（可测判据：`grep -rn "localStorage\|sessionStorage" packages/ui/src/components/dashboard apps/web/components/dashboard-host.tsx "apps/web/app/(main)/dashboard"` = 0 命中）；② 「刷新丢几何」在 G10 里写为**预期行为**，不判失败；③ 「刷新后几何不变」整条移到 G11 第 6 项。
- **`width` 必填、0 宽写坏布局**（设计 §0.3-10）：`mounted && width > 0` 之前 `dashboard-grid.tsx` 返回 `null`；`useContainerWidth` 走 2.3.0 的 `debounceTimeout: 100`。这是 D9。
- **两个 CSS 必须显式 import**（设计 §0.3-5）：`react-grid-layout/css/styles.css` 与 `react-resizable/css/styles.css`。它们是普通 CSS，与 Tailwind `@source` 无关；`packages/ui/src/styles/globals.css:10` 的 `@source "../**/*.{ts,tsx}"` 已经覆盖新的 `components/dashboard/`，**globals.css 不改**（设计 §1.4 结论）。
- **只有头部把手可拖**（设计 §0.3-6）：`dragConfig.handle = ".dashboard-widget-handle"`，且编辑态下 widget body 加 `pointer-events-none` + 遮罩；否则平板端 `touchstart.preventDefault` 会吞掉 body 内的滚动与子元素 `onClick`。
- **P0 不挂 `<Graph/>` 也不挂 `DataViewRoot`**（D2）：`ForceGraph.tsx:239` 每实例 `new Worker(...)`、`:270` `transferControlToOffscreen()`；P0 一旦挂上，G10 的「拖拽流畅」就被 VTable/worker 的噪声污染。计数上限（D5）在 M11 才需要。
- **轻类型的只读体从哪来**：`packages/ui/src/components/preview-block/index.ts` 当前只导出 `PreviewBlock` / `NodePreviewCover` / `types`，而十个 `previews/*` 都是 `{ node }` 入参的纯只读组件（真读 `previews/text-preview.tsx:20` 的 `export function TextPreview({ node }: { node: TextNodeData })`）。`PreviewBlock` 本身**不能当 widget 体**——它是 `position: fixed` 的悬停浮层，还有一个模块级的全局 `mousemove` 监听（`preview-block.tsx:20-25`、`:171-184`）。→ **按路径 import `preview-block/previews/*`**（`exports` 的 `./components/*` 通配允许跨段匹配，先例：`packages/dataview/src/shared/card-cover.tsx:26` 就按路径 import 了 `node-preview-cover`）；M2（R1）的 `NodePreviewBody` 落地后替换 import 是纯替换，不阻塞 M10。
- **`NodeBodyRouter` 的零变化口径**：`node-content-editor.tsx:29-62` 的 10 个 case 的 JSX 与传参（`node` / `className`）逐字搬进 router 的 edit 表，`NodeContentEditor` 只留 `useMemo` + `mode="edit"` 调用。该组件的消费者只有两处，真读确认：`packages/ui/src/components/dialog/editor/index.ts:2`（桶导出）与 `packages/ui/src/components/dialog/editor/node-editor.tsx:106`（唯一渲染点，被 `NodeEditorContent` 的 `flex flex-col h-full` 包裹，见 `node-editor.tsx:100-114`）。
- **`dashboardStore` 不进 `dataStore`**：`dataStore` 的 `diff` 是给 graph 订阅图数据用的；布局塞进去会污染 diff（设计 §5.1）。切片形状在冻结步一次定死：`pages: Map<DashboardPageId, DashboardPage>`、`currentPageId`、`editing`，actions `upsertPage` / `deletePage` / `setCurrentPage` / `setEditing`。

### M10.3 提交切分

1. `dashboard 契约：新增 react-grid-layout ^2.3.0，interfaces 加 dashboard 模型，store 加 dashboardStore 切片与断点表`
2. `node-content 重构：抽 NodeBodyRouter 双路由表，NodeContentEditor 变 mode="edit" 调用方（行为不变）`
3. `dashboard P0：/dashboard 重定向与 /dashboard/[pageId] 宿主，RGL 网格 + 只读 widget（几何只存内存，R6）`

### M10.4 闸门 G10 — 用户操作清单

| #   | 用户做什么（入口）                                                                                                                                     | 期望                                                                     | 判据或证据                                                                                                        | 失败先看哪                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | 主 agent 已 `pnpm dev:full`；浏览器打开 `http://localhost:3000/dashboard`（地址栏直贴）                                                                 | 302 到 `/dashboard/<pageId>` 并渲染 **6 个** widget                       | DevTools Console 无报错；网格项数 = 6；URL 已带 pageId                                                             | `apps/web/components/dashboard-host.tsx` 的 `createPreviewPage`（D1）；`useContainerWidth` 是否 0 宽 |
| 2   | 点头部「编辑布局」进入编辑态；拖 6 个 widget 的**头部把手**互相换位，松手                                                                               | 立刻垂直紧凑、**无空洞**、无报错                                          | 截图对比；不存在「同列上下两块之间空出 ≥1 行」；Console 无 `Maximum update depth exceeded`                        | `dashboard-grid.tsx` 的垂直 compaction 是否启用；`onLayoutChange` 是否只改本地 state           |
| 3   | 拖任一 widget 的右下把手（◢◣）缩到最小                                                                                                                 | 停在 `minW` / `minH`                                                     | 该项 DOM 的 `data-grid` 有 `minW`/`minH`；宽度不再变小、高度不再变矮                                              | `dashboard-config.ts` 的默认几何与 `minW/minH` 是否落到 `RglLayoutItem`                        |
| 4   | 折叠一个 widget（头部「–」），再拖另一个 widget 压向它                                                                                                  | 折叠项 `h=1`；**不参与位置交换**（拖不动它，它也不被挤走）                 | 折叠项仍是 `react-grid-item` 但 `static`；展开后高度回到折叠前                                                            | 设计 §3.5 的合成规则（`collapsed → h=1 + static:true`，原高进 `expandedH`）落在哪个文件        |
| 5   | 再点一次「编辑布局」（或按 `Esc`）回到展示态；在 widget body 里滚动 / 点预览里的链接                                                                   | 把手与遮罩消失；body 完全可交互                                           | 编辑态 body 上有 `pointer-events-none` 遮罩、展示态没有；拖拽不再可能                                             | `dashboardStore.editing` 是否**页面级单一布尔**（不是每 widget 一个开关，设计 §1.3）           |
| 6   | 打开 `http://localhost:3000/graph`，双击任一节点打开编辑器；再用头部 FullscreenButton 切全屏                                                          | 10 种 nodeType 的内容与抽取前**逐字一致**                                  | 与 G1/G2 记录的同节点内容对照；`pnpm --filter=@workspace/ui typecheck` 通过；`NodeContentEditor` 仍从 `dialog/editor/index.ts` 导出 | `node-body-router.tsx` 的 edit 表与旧 `node-content-editor.tsx:29-62` 的 diff（应只有搬移）    |
| 7   | 在编辑态拖完一个 widget 后**立刻 F5**                                                                                                                  | 几何回到初始（R6：**P0 不落库，丢几何是预期，不判失败**），页仍渲染 6 项   | Console 无报错；`grep` 无 `localStorage` 命中（见 M10.2）                                                          | 是否误加了任何本地持久化（本章禁止）；R6 已登记为偏差                                          |

### M10.5 回归面

1. `/graph` 的节点编辑器（Dialog 与全屏两种模式）内容不变 —— 只搬了 switch 的位置（`node-editor.tsx:100-114` 的壳未动）。
2. editor host 上的 dataview 七个视图不变 —— M10 完全不碰 `packages/dataview/**`（设计 §6 末行）。
3. 未登录访问 `/dashboard` 仍被拦到 `/login` —— `apps/web/middleware.ts:4` 与 `:58` 已在保护清单，M10 不改它。
4. `pnpm --filter=@workspace/ui typecheck` / `lint`、`--filter=web typecheck` 相对 `baseline.md` **无新增失败**。
5. `pnpm --filter=web build` 通过（RGL × React 19 × Next 16 的打包兼容，总纲 §10 风险项）；不通过即触发退路。
6. `packages/ui/src/styles/globals.css` 与 `packages/ui/src/components/index.ts` 未被改动（M10 的白名单里没有它们）。

---

## M11 — dashboard P1（`dashboard_pages` 实体链路 + 只读 DataView + 两条入口）

### M11.1 工作分解（任务包）

| #   | 任务                                                                                       | 文件白名单（新增 / 修改）                                                                                                                                                                                          | 执行主体        | 验收（编译器可判定的部分）                                                                                              |
| --- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | **迁移**：新集合 `dashboard_pages`（照 `views` 的六层范式）                                 | 新增 `pb/pb_migrations/1700000002_dashboard_pages.js`                                                                                                                                                              | **主 agent**    | 文件名 = `1700000002`（总纲 §4/R2）；列 = `name` / `workspaceId` / `items` / `layout` / `isDefault` / `sortOrder`；`up`/`down` 都在 PB 0.40 上真跑一次 |
| 2   | **domain**：不可变实体 + `normalizeDashboardPage` + 仓储端口                                | 新增 `backend/domain/src/models/dashboard/{entities,value-objects}.ts`；修改 `backend/domain/src/repositories/index.ts`、`backend/domain/src/models/index.ts`                                                       | 子 agent        | `cd backend/domain && pnpm typecheck`；`normalizeDashboardPage` 的职责与 `normalizeViews`（`backend/domain/src/models/node/value-objects.ts:345`）同构 |
| 3   | **infra**：PB 仓储 + mapper + adapter-back 工厂                                            | 新增 `backend/infrastructure/src/repositories/pocketbase-dashboard-page.repository.ts`、`backend/infrastructure/src/database/mappers/dashboard-page.mapper.ts`；修改 `backend/adapter-back/src/factory.ts`（＋`dao/**`） | 子 agent        | `cd backend/infrastructure && pnpm typecheck`；`cd backend/adapter-back && pnpm typecheck`；缺失列读作 `[]` / `{}`（照 `views` 列） |
| 4   | **application + tRPC + DI**：命令/查询 + DTO + `z.custom` + 路由注册                       | 新增 `backend/application/src/{commands,queries}/dashboard/**`、`backend/application/src/dto/dashboard.dto.ts`、`backend/adapter-front/src/trpc/router/dashboard.ts`；修改 `dto/index.ts`、`application/src/index.ts`、`router/index.ts`、`adapter-front/src/di/container.ts` | 子 agent        | 四个后端包 typecheck；`router/index.ts` 现有 10 个 router（真读）→ 加 `dashboard` 后为 11；`items`/`layout` 用 `z.custom`（理由见 `router/node.ts:83-104`） |
| 5   | `DashboardService`（乐观 upsert + 500ms 防抖 + flush）与两个桶                             | 新增 `packages/services/src/dashboard/dashboard.service.ts`、`packages/services/src/dashboard/index.ts`；修改 `packages/services/src/index.ts`                                                                     | **主 agent**（D6） | `pnpm --filter=@workspace/services typecheck`；`flushPendingUpdate` / `cancelPendingUpdate` 必须存在（对照 `node.service.ts:145`/`:150`） |
| 6   | database/collection 抽 `readOnly` 体 + widget 只读挂载                                     | 修改 `packages/ui/src/components/dialog/editor/content/database-node-content.tsx`、`collection-node-content.tsx`；新增 `packages/ui/src/components/dashboard/node-widget-data-view.tsx`                              | 子 agent        | `pnpm --filter=@workspace/ui typecheck`；`node-widget-data-view.tsx` 传给 `DataViewRoot` 的 props **不含**任何写回调 |
| 7   | 懒挂载 + 并发上限（D5）接线到帧与网格                                                      | 修改 `.../dashboard/visibility-gate.tsx`、`widget-runtime-context.tsx`、`widget-frame.tsx`                                                                                                                          | 子 agent        | `pnpm --filter=@workspace/ui typecheck`；`acquire/release` 的调用点在挂载/卸载路径上（grep 可判）                     |
| 8   | 编辑器头「添加到 dashboard」+ 折叠 / 移除 / 打开节点；宿主接真实链路                        | 修改 `packages/ui/src/components/header/editor-header/editor-header.tsx`、`.../dashboard/dashboard-header.tsx`、`apps/web/components/dashboard-host.tsx`、`apps/web/app/(main)/dashboard/page.tsx`、`[pageId]/page.tsx` | 子 agent        | `pnpm --filter=@workspace/ui typecheck`、`pnpm --filter=web typecheck`；`editor-header.tsx:46-58` 的动作区新增一个 `DropdownMenu` 触发器 |

### M11.2 关键决策与挡路的坑

- **迁移文件名**：`1700000002_dashboard_pages.js`（§0.3-1）。规则照 `pb/pb_migrations/1700000000_initial_schema.js:99-116` 的 `views`：`listRule` / `viewRule` / `createRule` / `updateRule` / `deleteRule` 全为空串，鉴权留在 tRPC。`items` / `layout` 是 json、**不设 required**，mapper 缺列读空。
- **只读验证（本章的核心，逐条引真实行号）**：
  - 不传 `onViewsChange` ⇒ `packages/dataview/src/data-view-root.tsx:233` 的 `canManageViews = Boolean(onViewsChange)` 为 `false`；`packages/dataview/src/toolbar/data-view-toolbar.tsx:60` 的 `canEditViews` 同为 `false`，于是 `:84-86` 不把 `onCreateView` / `onRenameView` 交给 `ViewSwitcher` ⇒ **不能新建 / 重命名 / 删除视图，也没有视图配置入口**。
  - **视图仍能切换**：`onActiveViewChange` 与那个布尔无关（`data-view-root.tsx:253-256` 无条件 `setActiveViewId` 并透传），所以「在已有视图间切换」是纯本地状态，必须仍然可用。
  - **无字段 CRUD**：字段增删改要 `onFieldsChange`，不传即没有 新增字段、也没有列尾的 "+"（`packages/dataview/AGENTS.md` 规则 3）。
  - **数据只读**由 `readOnly` 决定（`data-view-root.tsx:70` 的 prop → `:306` 的 `recordActions.editable = !readOnly`）。
- **记录页不进 widget**：`RecordEditor` 是宿主 `relative` box 里的 `absolute inset-y-0 right-0` 覆盖列 + scrim（`database-node-content.tsx:245-281`），widget 可能只有 300×200。→ widget 里一律转成「打开节点编辑器」（`useUIStore.getState().handleNodeEdit(nodeId)`，真读 `packages/store/src/uiStore.ts:351` 是它的实现处，接口声明在 `:138`），与 collection 卡片既有行为一致。
- **`key` 有两层**：`<DashboardGrid key={page.id}>`（换页必须重挂，RGL 内部持有 drag/resize 瞬态）与 `<DataViewRoot key={item.id}>`（同一节点可被引用两次，`item.id` 才是挂载点身份，设计 §5.3）。**不能用 `node.id`** 当 `DataViewRoot` 的 key。
- **`items` / `layout` 是两个独立半边**：patch 带 `items` 不许动 `layout`（复刻 `filterConfig` / `views` 在 `backend/application/src/commands/node/node-command.service.ts` 的既有约定）。
- **断点脏写的可测判据**（设计 §2.2 / §0.3-8 / §8）：
  1. **唯一写回点**：全仓 `DashboardService.upsert` 的调用点 = **1**（宿主 `dashboard-host.tsx` 的 `onItemsChange`）。
  2. `onLayoutChange` 的 handler 内**不得出现** `onItemsChange` 或 `DashboardService`（grep 可判；它只 `setLocalLayout`）。
  3. 提交函数签名 `commitBreakpoint(bp: DashboardBreakpoint, layout: RglLayoutItem[])` 的调用点 = **2**（`onDragStop`、`onResizeStop`），写回的 `layout` 只含 `bp` **一个**键；`items` 半边（折叠 / 移除 / 抽屉追加）不写 `layout`。
  4. `autoFrom` 派生的断点几何**纯函数化**：其返回值不得作为 `onItemsChange` 的实参（grep 该函数的调用点，全部在渲染路径上）。
  5. 运行时判据见 G11 第 7 项（窗口从宽到窄再回宽，`layout` 键集合不变；在 md 拖一次后 `md` 键才出现）。
  6. 注意这条**无法在 domain 层判定**：`normalizeDashboardPage` 只能校验键名合法性与几何整数，判不出「这一键是不是自动生成的」。所以判据必须落在上面的前端唯一写回点。
- **折叠持久化的是 `collapsed` + `expandedH`，不是折叠后的 `h`**（设计 §3.5）；否则展开无处可知。
- **防抖不手写**：`DebounceScheduler` 在 `packages/utils/src/debounce-scheduler.ts:28`（`flush` `:104` / `cancel` `:130`），默认 500ms 与 `node.service.ts:18`、`view.service.ts:14` 一致。**切页 / 组件卸载前必须 `flushPendingUpdate(pageId)`**（设计 §5.2），否则最后一次拖拽丢。

### M11.3 提交切分

1. `dashboard 后端：dashboard_pages 迁移 1700000002 + domain/infra/application/tRPC 六层链路`
2. `dashboard 服务：DashboardService 乐观 upsert + 500ms 防抖 + flush，宿主接真实链路`
3. `dashboard P1：database/collection 只读挂载（懒挂载 + 并发上限）+ 编辑器头「添加到 dashboard」+ 折叠/删除/打开节点`

### M11.4 闸门 G11 — 用户操作清单

| #   | 用户做什么（入口）                                                                                                                                              | 期望                                                                    | 判据或证据                                                                                                                            | 失败先看哪                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | 入口一：`http://localhost:3000/graph` → 双击节点开编辑器 → 头部动作区点新按钮 → 「新建页面并添加」                                                                | toast「已添加到『首页』」并可点「去 dashboard」跳到 `/dashboard/<pageId>` | PB Admin `http://localhost:8090/_/` 的 `dashboard_pages` 多一行；`items[0].nodeId` = 该节点 id                                        | DI 是否注册了 dashboard 仓储与两个 service；tRPC `dashboard.add` 是否 400（zod 收窄）    |
| 2   | 入口二：在该 dashboard 页点头部「组件库」→ 键盘 Tab 到某卡片 → `Enter`（追加页尾）                                                                              | 第二个 widget 出现并**持久化**                                          | F5 后两个 widget 仍在；`dashboard_pages` 该行 `items.length = 2`                                                                     | `DashboardService.upsert` 的 debounce 是否在切页/卸载前 flush（设计 §5.2）              |
| 3   | 深链直开：新开无痕窗口（已登录）直贴 `http://localhost:3000/dashboard/<pageId>`                                                                                 | 直接打开该页，URL 不被改写、不经过 `/dashboard` 重定向                   | 页面名与目标页一致                                                                                                                    | `[pageId]/page.tsx` 是否按 id `getById`；store 是否先 `listByWorkspace` 再 `setCurrentPage` |
| 4   | **只读核心**：页上放一个 database widget → 点视图 tab 切换；再试着新建 / 重命名 / 删除视图；双击单元格；找 新增字段 / 列尾 "+"                                    | 视图**能切**；不能新建/重命名/删除视图；单元格不可编辑；**无字段 CRUD** | `canManageViews=false`（`data-view-root.tsx:233`）与 `canEditViews=false`（`data-view-toolbar.tsx:60`）；`node-widget-data-view.tsx` 传给 `DataViewRoot` 的 props 无 `onViewsChange`/`onCellChange`/`onFieldsChange` | 是否误传了 `onViewsChange` —— 一旦传了，`data-view-root.tsx:233` 立刻让它可写            |
| 5   | 删除条目：widget 头部「⋯」→ 从本页移除 → 确认；再去 `/graph` 找该节点                                                                                            | widget 消失，**节点仍在**                                              | `dataStore.nodes` 仍含该 id；`dashboard_pages` 的 `items` 少一条而 `nodes` 表行数不变                                                  | 移除路径是否误调了 `NodeService.delete`                                                 |
| 6   | **刷新后几何不变（这次必须不变）**：编辑态拖 3 个 + resize 1 个 + 折叠 1 个 → 等 ≥1s → F5                                                                       | 几何与折叠态**全部保留**                                                | 刷新前后 store 快照一致；PB 该行 `items` / `layout` 已更新                                                                            | `onItemsChange` 是否只在 stop 里调；切页/卸载是否 flush                                 |
| 7   | 断点：窗口从 ≥1200 拖到 <768 再拖回；然后在 md 宽度下拖一个 widget                                                                                               | 第一次往返后 `layout` **只有 lg**；md 拖过后**才**出现 `md` 键          | 写回前后 store 快照 / PB 该行 `layout` 的键集合                                                                                       | `onLayoutChange` 是否被当成了提交点（§0.3-8）                                           |
| 8   | 上限：同页放 2 个 database widget + 1 个 collection widget 并把后者切到 `graph` 视图，滚到第三个                               | 第三个渲染占位卡或「点此加载」；**Workers = 1**                          | DevTools → Sources → Workers 计数 = 1（`ForceGraph.tsx:239` 每实例一个 worker）                                                       | `widget-runtime-context.tsx` 是否按**挂载数**而非可见数计数                              |

### M11.5 回归面

1. 编辑器里的 database 节点仍**可写**：抽 `readOnly` 体后，`database-node-content.tsx:249-264` 的写回调（`onViewsChange` / `onCellChange` / `onRowInsert` / `onRowDelete` / `onRowReorder` / `onFieldsChange`）一个都不能少。
2. collection 的编辑页行为不变：`collection-node-content.tsx:198` 的 `readOnly`、`:207-218` 的 `tabActions`（编辑过滤）仍在编辑页出现，记录页仍是 `editable={false}`（`:226`）。
3. `nodes` 的 `views` 列链路（M1 之前就在）不受影响；M11 只新增集合，不改 `nodes` 的任何列。
4. 既有 `pb_data` 未被删；`/graph` 的节点、视图、图数据仍可读（迁移是追加文件名）。
5. 四个后端包 + `ui` / `store` / `services` / `web` 的 typecheck、lint 相对 `baseline.md` 无新增失败。

---

## M13 — dashboard P2+P3（组件库拖入 · 多页面 · 断点几何 · 性能收尾）

### M13.1 工作分解（任务包）

W4 的开启前提：**主 agent 先冻结页面 CRUD 与多选/撤销的回调**——`dashboard-header.tsx` 写成两个插槽（引 A/B 各自的新文件）、`dashboardStore.ts` 加页面 CRUD actions、`dashboard.service.ts` 加 `createPage` / `removePage` / `duplicatePage` / `setDefaultPage` / `reorderPages`、`dashboard-page.tsx` 的 props 加 `selection` / `onSelectionChange` / `onUndoRemove`。冻结提交落地后 A–E 才开工。

| 线  | 任务                                                                  | 文件白名单（新增 / 修改）                                                                                                                       | 执行主体                | 验收（编译器可判定的部分）                                                                                     |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| 0   | **冻结**：页面 CRUD 契约 + header 两插槽 + 多选/撤销 props             | 修改 `.../dashboard/dashboard-header.tsx`、`dashboard-page.tsx`、`packages/store/src/dashboardStore.ts`、`packages/services/src/dashboard/dashboard.service.ts`、两个 services 桶 | **主 agent**（D6/D7）   | `pnpm --filter=@workspace/store typecheck`、`--filter=@workspace/services typecheck`、`--filter=@workspace/ui typecheck` |
| A   | 组件库抽屉：搜索 / 语义 / 标签过滤、`data-rgl-draggable`、键盘追加     | 新增 `.../dashboard/widget-library-drawer.tsx`、`.../dashboard/library-entries.ts`                                                                | 子 agent · W4-A         | `pnpm --filter=@workspace/ui typecheck`＋`lint`；`library-entries.ts` 纯函数（无 React 导入）                    |
| B   | 多页面管理：新建 / 重命名 / 复制 / 删除 / 设默认 / 排序                | 新增 `.../dashboard/dashboard-page-menu.tsx`                                                                                                      | 子 agent · W4-B         | 同上；不 import `dashboard-header.tsx`（它已由主 agent 接线）                                                    |
| C   | 迷你摘要形态 + 「展开为数据视图」                                     | 新增 `.../dashboard/node-widget-summary.tsx`；修改 `node-widget-data-view.tsx`                                                                    | 子 agent · W4-C         | 同上；摘要不进 VTable（`node-widget-summary.tsx` 不 import `@workspace/dataview` 的任何渲染器）                |
| D   | 断点几何 + 性能收尾：只为动过的断点落库、拖拽冻结、可见性闸参数化      | 修改 `.../dashboard/dashboard-grid.tsx`、`widget-runtime-context.tsx`、`visibility-gate.tsx`                                                      | 子 agent · W4-D         | 同上；`commitBreakpoint` 的调用点 = 2（`onDragStop`/`onResizeStop`），`onLayoutChange` 里无提交调用              |
| E   | 多选 + 删除撤销 + 触摸长按 300ms 进入编辑（**D7 新增线**）             | 修改 `.../dashboard/widget-frame.tsx`；新增 `.../dashboard/dashboard-selection.ts`                                                                | 子 agent · W4-E         | 同上；撤销必须同时恢复 `items` 与 `layout`（几何不能只回半个）                                                  |

### M13.2 关键决策与挡路的坑

- **绝不叠 dnd-kit**：抽屉拖入统一走 RGL 原生外部 drop（`data-rgl-draggable` 标在卡片根 + `dropConfig`，设计 §0.2-⑤ / §0.3-9）。仓库里 `@dnd-kit/core` 已存在（dataview 看板在用），两者同监听一片区域会互相抢事件。
- **落点是「下方插入」，不是替换**：拖到已有 widget 上 → 不替换（避免误覆盖），在其下方插入（`y: Infinity` + compaction，设计 §3.2）。
- **键盘等价路径是硬要求**：卡片 `Enter` = 追加页尾（WCAG 2.1 §2.1.1；拖拽不可键盘操作）。
- **触摸端**：`dragConfig.handle = ".dashboard-widget-handle"` + `dragConfig.allowMobileScroll`；长按 300ms 进编辑（设计 §0.3-6 / §1.3）。**只允许头部把手拖**是这一整条的前提。
- **`--primary` 只用于用户激活态**（把手、选中 widget、`aria-pressed`），不用于标「这是新加的组件」（设计 §0.3-10）。
- **性能收尾必须逐条对照设计 §9 的四个观测点表**（`docs/dashboard/README.md:531-536`）：
  1. **帧时长 / 宽度抖动** —— DevTools Performance 录 10s（3 widget，其中 1 个 database），判据：rAF 无持续劣化、无 **> 50ms** 长任务、不出现 `Maximum update depth exceeded`；缩放窗口时观察 `useContainerWidth` 是否反复重算（RGL 2.2.4 修过的分数缩放死循环）。
  2. **worker 数量** —— DevTools → Sources → Workers / `chrome://inspect`，判据：存在 `graph` widget 时 **= 1**。
  3. **内存** —— 堆快照 → 拖拽 + 切页 20 次 → 再快照，判据：增量**收敛**（无线性增长），重点看 VTable/canvas 是否随切页释放（`release()`）。
  4. **拖拽流畅度** —— 判据：拖拽期间重渲染器处于 `frozen`（占位而非重排，无 VTable 重测量），松手 100ms 后恢复（设计 §4.3）。
- **断点几何**（设计 §2.2 / §8）：只为「用户在该断点真正拖过」的断点落库；`autoFrom` 的结果永不写回。判据同 M11.2，落在**唯一写回点**上（D 线的验收列就是它）。
- **多页面复制不新增后端方法**：客户端读页 → 去 id/时间戳 → `DashboardService.createPage`；`name` 加「副本」后缀、`isDefault` 一律置 `false`（默认页唯一）。
- **`sortOrder` 稀疏整数**（D8）：10 / 20 / 30；插到中间只改被移动的相邻两条，避免整页重排 N 次 upsert。
- **撤销只有一步**（设计 §8-5）：本地持有上一条目**与其几何**，5s 窗口；多步历史栈明确不做。

### M13.3 提交切分

1. `dashboard 组件库：抽屉（搜索/语义/标签过滤 + data-rgl-draggable 拖入 + 键盘追加）`
2. `dashboard 页面管理：新建/重命名/复制/删除/设默认/排序，断点几何按断点落库`
3. `dashboard 收尾：多选与删除撤销、拖拽冻结重渲染器、迷你摘要与「展开为数据视图」`

### M13.4 闸门 G13 — 用户操作清单

| #   | 用户做什么（入口）                                                                                                          | 期望                                                                     | 判据或证据                                                                                          | 失败先看哪                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | 编辑态 → 头部「组件库」→ 把一张卡片**拖到网格右下空白**，松手                                                                | 落点即插入位（不是固定页尾）                                              | 新 widget 的 `x`/`y` 与松手位置对应                                                                  | `data-rgl-draggable` 是否在卡片根；`dropConfig` 是否传；`onDrop` 是否算了 `y`  |
| 2   | 再拖一张卡片**盖到已有 widget 上**                                                                                          | 出现在该 widget **下方**，不替换它                                        | 被覆盖的条目的 `nodeId` 未变                                                                        | 是否走了「替换」分支（设计 §3.2 明确不替换）                                   |
| 3   | 触摸端：DevTools 设备工具栏开触摸仿真（含 75% 分数缩放）→ **长按**某 widget 头部 300ms → 进编辑态 → 从抽屉拖入一张卡片        | 长按进编辑；拖入成功；body 内滚动**不触发拖拽**；子元素 `onClick` 不被吞   | 长按前后 `dashboardStore.editing` 翻转；拖入后页上多一项                                            | `dragConfig.handle` / `allowMobileScroll`；长按计时是否用了 `touchstart` 路径   |
| 4   | 多页面：新建 4 页（共 5 页）→ 用页面菜单逐一切换、重命名、复制、设默认、上下排序、删掉一页                                   | 5 个页面各自可切、可深链、默认页唯一                                     | 5 个 `/dashboard/<id>` 深链直开且内容互异；`/dashboard` 重定向到刚设的默认页；PB 行数与操作一致      | `setDefault` 是否把旧默认页的 `isDefault` 置了 `false`（唯一性）                |
| 5   | 脏 layout：只在 lg 拖过 → 把窗口从 ≥1200 缩到 <768 再拖回                                                                   | `layout` 键集合**仍只有 lg**                                             | 写回前后的 store 快照 / PB 该行 `layout`                                                            | `onLayoutChange` 是否被当提交点（§0.3-8）                                       |
| 6   | 观测点「**worker 数量**」：同页放 2 个 collection widget 并都切到 `graph` 视图                                              | 第二个渲染占位卡；**Workers = 1**                                        | DevTools → Sources → Workers 计数                                                                   | `widget-runtime-context.tsx` 的 `graphSlots`（D5）；`ForceGraph.tsx:239`/`:270` |
| 7   | 观测点「**帧时长 / 宽度抖动**」：Performance 录 10s（3 widget，其中 1 个 database，期间拖一次、并缩放一次窗口）              | rAF 无持续劣化；无 **> 50ms** 长任务                                     | Performance 面板 Long Tasks；Console 无 `Maximum update depth exceeded`                             | `useContainerWidth` 的 `debounceTimeout`；是否每帧都重算 layout                 |
| 8   | 观测点「**内存**」：Memory 堆快照 → 拖拽 + 切页 20 次 → 再快照                                                               | 增量**收敛**（无线性增长）                                              | 两次快照的 retained size 对比；VTable/canvas 随切页释放                                              | 切页是否卸载 renderer（`release()`）；`key` 是否用错（§5.3）                   |
| 9   | 观测点「**拖拽流畅度**」：拖一个 database widget 期间看它的形态                                                              | 拖拽中它是 `frozen` 占位；松手约 100ms 后恢复                            | 拖拽中无 VTable 重测量；松手后内容回来                                                              | `widget-runtime-context.tsx` 的 frozen 状态是否由 `onDragStart`/`onResizeStart` 驱动 |
| 10  | 多选与撤销：编辑态 `Shift`/`Ctrl` 点 widget 头部多选 → 批量移除 → 5s 内点 toast 的「撤销」                                  | 多选可整体拖动与批量移除；撤销把条目**与几何**一起恢复                    | 撤销后 `items` 与 `layout` 都回到移除前                                                              | 撤销是否只存了 item 没存它的几何                                               |

### M13.5 回归面

1. M11 的四条只读结论（G11 第 4 项）与两条入口仍成立；widget 内仍**不可写**。
2. 编辑器里 database / collection 的编辑页仍可写（M13 不碰这两个文件的写路径，只碰 widget 侧的挂载点）。
3. `/graph` 的节点编辑器、dataview 七个视图、`NodeEditor` 的 Dialog / 全屏两种模式都不受影响。
4. 断网（tRPC 失败）下：布局操作仍能完成，乐观写回滚 + toast（设计 §9 手测清单第 8 项）。
5. `prefers-reduced-motion` 下不依赖动画（编辑态切换、抽屉开合都不得靠动画完成语义）。
6. `pnpm --filter=web build` 仍通过（RGL × React 19 × Next 16 的打包兼容，总纲 §10 风险项）。
7. `packages/ui/src/styles/globals.css`、`packages/ui/src/components/index.ts` 未被改动（三章白名单都没有它们）。

---

## 附：本章「待验证」回填清单

执行完后逐条回填到 [../dashboard/README.md](../dashboard/README.md) 末节的「待验证」列表（**不改设计文档正文**），并同步 [gates.md](./gates.md)。

1. RGL 2.3.0 在 React 19.2.4 上的实际运行（设计 §0.2-③、「待验证」1）→ 由 **G10 第 1/2/3 项**的预跑结果回填。
2. `useContainerWidth` 在一加平板 + anland 转发显示的缩放环境下是否反复测量（「待验证」2）→ 由 **G10 第 2 项**与 **G13 第 3/7 项**回填。
3. `dropConfig` + `data-rgl-draggable` 在触摸端 + Next 16 App Router 下的行为（「待验证」3）→ 由 **G13 第 1/2/3 项**回填。
4. 2 个 VTable 类渲染器同页并存的内存与帧率（「待验证」4）→ 由 **G13 第 8 项**回填。
5. **本章新提**：`dashboard_pages.isDefault` 的唯一性由前端（`setDefault` 时清旧）还是后端保证？→ M11 落地后回填（当前口径：前端清旧 + G13 第 4 项判定）。
6. **本章新提**：`sortOrder` 的稀疏整数（10/20/30）在「反复插到同两位之间」时是否够用 → 由 **G13 第 4 项**回填。
7. **本章新提**：迷你摘要的「前 N 行 × 前 M 列 / 前 N 张卡片」取值 → 由 **G13 第 9 项**的手感回填。
8. **本章新提**：P0 的 `createPreviewPage`（D1）在前 6 个节点里混入 `database` / `collection` 时，preview 层是否够用 → 由 **G10 第 1 项**回填；不够则把 D2 的边界提前到 M10。
