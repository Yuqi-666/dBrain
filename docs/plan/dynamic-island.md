# 灵动岛执行计划（M4 / M8 / M9）

> 状态：**M4 待测**（前提：M0 已过 G0；M8 另需 M2 已过 G2 —— 两者都已满足）
> 覆盖：M4 = 岛 P0、M8 = 岛 P1（预览面板）、M9 = 岛 P2+P3（搜索与清理）
> 闸门：G4、G8、G9（各自独立过闸，W0 只免串行、不免闸门）
> 契约：设计文档 [../dynamic-island/README.md](../dynamic-island/README.md)（下称「设计 §n」）、执行总纲 [./README.md](./README.md)（下称「总纲 §n」）
> 相关：[gates.md](./gates.md)、[baseline.md](./baseline.md)、[node-content-ui.md](./node-content-ui.md)

---

## 0. 这一章要解决什么

把 `docs/dynamic-island/` 的四阶段落地拆成三个可独立过闸的里程碑：

| 里程碑 | 一句话交付                                                                 | 来源          | 依赖 | 闸门 |
| ------ | -------------------------------------------------------------------------- | ------------- | ---- | ---- |
| M4     | 常驻底部胶囊（四层视觉 + 可打断弹簧形变 + 导航面板）+ `islandPanel` 切片    | 设计 §9 P0    | M0   | G4   |
| M8     | 岛内 `preview` 面板接管节点悬停预览；`ForceGraph` 删浮层与外部点击 effect   | 设计 §9 P1    | M4、M2 | G8   |
| M9     | 岛内 `search` 面板 + 三处入口改向 + `⌘K` 迁移 + 删 quick-panel 与死切片     | 设计 §9 P2/P3 | M8   | G9   |

两条已登记的重排直接决定本章写法：**R1**（`NodePreviewBody` 的抽取已提前到 M2，M8 **只做挂载与删除**）、**R5**（P2 与 P3 合并为 M9，因此「入口改向」与「删 quick-panel」必须在 M9 内收口，不能留一个不挂载的死目录）。

前提与硬约束：

- M4 开工前，主 agent 必须先确认 M0 已解决 registry 可写问题（总纲 §5），否则 `motion` 装不上，G4 第 9 条无法执行。
- M4 与 M2/M3 可在 **并行窗口 W0** 同时进行（总纲 §3.2）；W0 的开启条件与不冲突理由见 §2.6。
- 跨章独占文件（`packages/ui/package.json`、`packages/ui/src/components/index.ts`、`packages/store/src/uiStore.ts`、`packages/store/src/index.ts`、`apps/web/app/(main)/layout.tsx`）在本章内**全部由主 agent 直接改**，不进子 agent 任务包（总纲 §2.2 / §3.1）。

---

## M4 — 灵动岛 P0（壳 + 四层视觉 + 弹簧形变 + 导航）

### M4.1 工作分解（任务包）

| # | 任务 | 文件白名单（新增/修改） | 执行主体 | 验收（编译器可判定） |
| - | ---- | ---------------------- | -------- | -------------------- |
| 1 | 形态常量与降级判定：`IslandPanel` 类型、`ISLAND_SHAPES`（idle/preview/search/agent 的宽高圆角）、`LIQUID_SPRING`/`SNAP_SPRING`/`FADE`、`prefers-reduced-motion` 与 `(hover: none)` 判定函数 | 新增 `packages/ui/src/components/dynamic-island/island-config.ts` | 子 agent | `pnpm --filter=@workspace/ui typecheck` 通过；无 `any` |
| 2 | 四层视觉壳：底色/`backdrop-filter`/`::before` 高光/边缘阴影 + `pointermove` 写 `--light-x/--light-y` + `@supports not (backdrop-filter: blur(1px))` 不透明回退 + 模拟运行中降级为纯色 | 新增 `.../dynamic-island/island-surface.tsx` | 子 agent | 同上；不 import `next/*`、不 import `@workspace/store` |
| 3 | 收起态导航行：图标 + 当前页药丸高亮 + 禁用项 `opacity-40`/`aria-disabled`/原因 tooltip、`aria-current="page"`、`(pointer: coarse)` 下 44×44 命中区 | 新增 `.../dynamic-island/island-nav.tsx` | 子 agent | 同上 |
| 4 | 形态壳与状态机：`motion.div layout layoutRoot`、`AnimatePresence mode="popLayout"` 内容层、`transformOrigin {originX:.5, originY:1}`、半径经 `style` 传入、`Esc` 逐层退回不越界 | 新增 `.../dynamic-island/dynamic-island.tsx` | 子 agent（**类型形状由主 agent 先冻结**，见 §M4.2-7） | 同上；`DynamicIslandProps` 与设计 §5.2 逐字段一致 |
| 5 | 面板容器：`panels/nav-panel.tsx`（宽屏展开标签，触摸端不做）、`panels/agent-panel.tsx`（占位并预留对话/输入容器高度） | 新增 `.../dynamic-island/panels/{nav-panel,agent-panel}.tsx` | 子 agent | 同上 |
| 6 | 导出 `dynamic-island/index.ts`（`DynamicIsland` + 类型） | 新增 `.../dynamic-island/index.ts` | 子 agent | 同上 |
| 7 | `uiStore` 加 `islandPanel`/`lastIslandPanel` 与 `setIslandPanel`/`collapseIsland`/`toggleIslandFromKeyboard` | 修改 `packages/store/src/uiStore.ts`、`packages/store/src/index.ts` | **主 agent**（总纲 §3.1 独占） | `pnpm --filter=@workspace/store typecheck` 通过 |
| 8 | 路由表单一真源：`/graph` enabled、`/dashboard` disabled + 原因 | 新增 `apps/web/components/island-routes.ts` | 子 agent | `pnpm --filter=web typecheck` 通过 |
| 9 | 宿主适配：`usePathname`/`useRouter` → `nav`、订阅 store 的 `islandPanel` 与 `previewBlock`、注入 `navContent/agentContent`、注册 `⌘K`/`⌘⇧K`/`Esc`、写 `--dynamic-island-height` | 新增 `apps/web/components/dynamic-island-host.tsx` | 子 agent | 同上；无 `any` |
| 10 | `(main)/layout.tsx` 在 auth gate 之后挂 `<DynamicIslandHost />` | 修改 `apps/web/app/(main)/layout.tsx` | **主 agent**（总纲 §3.1 独占） | `pnpm --filter=web typecheck` 通过 |
| 11 | `packages/ui` 加 `motion` 依赖 | 修改 `packages/ui/package.json`（+ 根 `pnpm-lock.yaml`） | **主 agent**（总纲 §2.2-3） | 装完立刻 `pnpm --filter=web build` 通过 |
| 12 | 公共出口登记 | 修改 `packages/ui/src/components/index.ts` | **主 agent**（总纲 §3.1 独占） | `pnpm --filter=@workspace/ui typecheck` 通过 |

子 agent 任务包模板照抄总纲 §2.3；**禁止触碰**上表第 7/10/11/12 行的四个文件与 `packages/ui/src/components/preview-block/**`。

### M4.2 关键决策与挡路的坑

1. **岛必须挂在 auth gate 之后。** `apps/web/app/(main)/layout.tsx:46-58` 在 `!currentUser` 时 `return null` 或 Loading 占位，只有 `:58` 的 `return children` 才是已登录分支。因此 `<DynamicIslandHost />` 要包在 `return` 里（`<>{children}<DynamicIslandHost /></>` 形态），**不能**与 gate 并列——否则未认证用户也会看到胶囊，且认证确认瞬间会闪一次岛。
2. **宿主是真源，组件是受控壳。** 设计 §5.2 的三条边界（不读 store、不读路由、不注册全局键盘）与 `packages/ui/src/components/index.ts` 现状一致：该包今天不依赖 `@workspace/store` 的路由面，也不含 `next/navigation`。键盘监听只写在宿主里。
3. **`pointer-events` 必须两层。** 外层 fixed 容器 `pointer-events-none`、胶囊本体 `pointer-events-auto`（设计 §0.3-8）。否则底部一条会同时吃掉画布拖拽与 `packages/ui/src/components/layout/main-layout.tsx:87` 那条 `absolute left-0 top-0 z-30 h-full w-3` 的侧边栏唤出热区——这是本章最容易回归的既有交互。
4. **层级起点 `z-40`。** 侧边栏固定态 `z-30`、临时浮层 `z-40`（`main-layout.tsx:87/96/97`），Radix 弹层走 portal。窄屏下若胶囊与 `temp` 侧边栏重叠不好看，抬到 `z-[45]`，仍低于弹层。
5. **`border-radius` 走 `style` 不走 class。** 设计 §0.3-3 第②条：motion 的 `layout` 用 `transform: scale()` 实现，只补偿经 `style` 给出的半径与阴影；写进 Tailwind `rounded-*` 不会被补偿。同理**不要用 `border`**，用父层 `padding` 伪造 1px 边缘。
6. **fixed 容器必须 `layoutRoot`**（设计 §0.3-4），否则测量会掺进页面滚动偏移；岛的内容区自己 `overflow-y: auto` + `overscroll-contain`，外层不滚动（设计 §0.3-10）。
7. **`IslandPanel` 有两份同形定义。** 设计 §6.1 要求 `packages/store/src/uiStore.ts` 导出它，设计 §5.2 要求 `dynamic-island.tsx` 导出它。依赖方向不允许 `packages/ui → @workspace/store`（设计 §0.2-2），所以两边各自用字面量联合、**结构等价**，宿主直接赋值即通过结构类型检查。落地时把这份契约写进两处 JSDoc，并在 G4 自检时用 `grep` 复核两份联合值一致。
8. **`packages/ui` 的 `exports` 只映射 `.tsx`。** `packages/ui/package.json:61` 是 `"./components/*": "./src/components/*.tsx"`，所以 `.../dynamic-island/index.ts` 与 `.../preview-block/index.ts` 都**不是**消费者入口；`apps/web` 必须写显式子路径（现有范式见 `apps/web/app/(main)/graph/page.tsx:16` 与 `packages/graph/src/force/ForceGraph.tsx:78`）。`packages/ui/src/components/index.ts` 的增长是登记性导出（总纲 §3.1 单列该文件的理由），照做但不依赖它做运行时解析。
9. **`backdrop-filter` 的动态降级需要一个「模拟是否在跑」的输入。** `packages/graph` 有 `simulation:stopped`（`ForceGraph.tsx:602`），但它只在 graph 包内消费；`packages/ui` 不能 import graph。P0 的可用实现是「岛上 300ms 无重绘即认为可开 blur」（设计 §3.4 第 3 行给出的等价条件之一），把「跟随 `simulation:stopped`」降为**待验证**项（见文末清单），避免 P0 为一个纯优化项新增跨包事件面。
10. **P0 不注册任何全局键盘。** §M4.1 第 9 行与设计 §5.3-3 都要求宿主注册 `⌘K` / `⌘⇧K` / `Esc`，但设计 §6.3/§6.4 又写死「`⌘K` 在 P2 迁移，**必须与删掉 `quick-panel.tsx` 的全局监听同一次提交**，否则 `⌘K` 触发两次」。P0 的 `quick-panel.tsx:30-49` 仍然挂着，所以宿主**只**注册「局部 Esc」：胶囊根元素上一个 React `onKeyDown`（焦点在岛内才生效，不 `preventDefault`/`stopPropagation`），不碰 `window`。三个全局快捷键留到 M9（P0 的宿主仍然按 §M4.1 第 9 行写 `--dynamic-island-height`）。
11. **P0 的四个面板是「形态」而不是「内容」。** 设计 §5.1 的 `panels/search-panel.tsx` 属于 P2、`node-preview-panel.tsx` 属于 P1，P0 只有 `nav-panel` / `agent-panel` 两个文件（§M4.1 第 5 行）。而 G4 第 2/3/4 条要测的恰恰是**展开态的形态与指针行为**，所以：`previewContent` / `searchContent` / `agentContent` 缺失时，岛在**正确尺寸**的容器里渲染自己的占位（`data-island-placeholder=<panel>`，文案点明属于后续里程碑）。宿主在 P0 不注入任何 `*Content`。这样 P0 的闸门 diff 里没有「半截的搜索/预览」，也不会与 P1/P2 的真实内容抢同一段代码。
12. **P0 宿主不订阅 `previewBlock`。** §M4.1 第 9 行写了「订阅 `islandPanel` 与 `previewBlock`」，但设计 §6.2 的 `previewBlock → preview` 映射是 **P1（M8）** 的触发逻辑，且那天要同时**删掉** `ForceGraph` 的 `<PreviewBlock>` 浮层；P0 若先接，会在「悬停节点」时同时出现旧的跟随浮层与岛内空占位。⇒ P0 只订阅 `islandPanel`，`preview` 形态只能由 `setIslandPanel("preview")` 到达（P0 没有 UI 入口）。
13. **`island-surface` 的「模拟运行中降级」在 P0 只是一个可选 prop。** 设计 §3.4 第三行要求「force 模拟运行中 / 岛上 300ms 无重绘 ⇒ 关掉 `backdrop-filter`」。`packages/ui` 不能 import `packages/graph`（§0.2-2），R10 已把「跟随 `simulation:stopped`」降为待验证项 ⇒ P0 落一个 `blurEnabled?: boolean`（默认 `true`）并写进 JSDoc，接线留给后续章节；G4 不判这一条（设计 §11 的手测项里它是性能项，不在 G4 清单里）。
14. **探针锚点写进 DOM 契约。** `data-island`（胶囊本体）+ `data-island-panel`（当前形态）+ `data-island-content` + `data-island-nav` + `data-island-nav-disabled`：G4 第 1 条原话就是 `document.querySelector('[data-island]')`，这些属性让「量尺寸/判禁用/判形态」不必依赖类名或结构。
15. **收起态导航的分隔线位置**（设计 §7.1 只写「3 个导航图标 + 1px 分隔线」）：分隔线放在**页面导航与搜索图标之间**（前两项是「去哪」，第三项是「打开面板」）。
16. **窄屏只留图标、标签只在 `md:` 以上出现**（设计 §3.4 最后一行 + §7.1「触摸端不做标签展开」）：`panels/nav-panel.tsx` 的标签用 `hidden md:inline`，收窄时不改变图标命中区。

### M4.3 提交切分

1. `dynamic-island 依赖：packages/ui 增 motion ^12，lockfile 一并提交`
2. `dynamic-island 状态：uiStore 增 islandPanel 切片，live 切片保留至 M9`
3. `dynamic-island P0：底部常驻胶囊（四层视觉 + 弹簧形变 + 导航面板）接入 (main) 布局`

（第 3 条内含子 agent 的 1–6/8/9 全部文件；主 agent 在提交前跑 §M4.5 回归面。）

### M4.4 闸门 G4 — 用户操作清单

入口统一：`pnpm --filter=web dev` → `http://localhost:3000/graph`（需已登录；未登录会跳 `/login`）。

> **按本机实测调整的口径（2026-10-07，与 G1–G3 同一套环境）**
>
> 1. **入口走同域**：web `https://dev.yuqi-666.cn/graph`，**每次改完代码必须 F5**（域名的 nginx 不代理 HMR，G2 已实测）。岛是 `(main)/layout.tsx` 的常驻节点，刷新后应在底部中央看到它。
> 2. **P0 的展开内容全是占位**（§M4.2-11）：点搜索图标展开后看到的是「搜索面板将在 M9 接入」这类占位文案 —— 本阶段判的是**形态**（尺寸 / 圆角 / 可打断 / 指针 / 层级），不是内容；`preview` / `agent` 同理（preview 在 P0 没有 UI 入口）。
> 3. **第 8 条（`pnpm --filter=web build`）在 M4 开工前就不通过**，实测证据：`next build` 的**编译阶段 ✓**（`✓ Compiled successfully in 70s`，含新装的 `motion`），随后 TS 阶段停在 `app/(main)/graph/page.tsx(L,C): error TS2322: … 'theme' does not exist on type 'IntrinsicAttributes & GraphProps'` —— 这一条**就在基线里**（[baseline/typecheck-errors.txt:2](./baseline/typecheck-errors.txt)，`GraphProps` 今天只有 `viewId`/`view`/`className`/`style`）。⇒ 第 8 条的判据改成「**编译阶段通过 + TS 阶段只允许停在基线里那一条**」；要不要把 `graph/page.tsx` 的 `theme` 作为**独立前置修复**（会同时解锁 G7/G10 的同名判据）请你定，**M4 不擅自扩大白名单**。
> 4. **第 2 条的三个动作在 P0 只有两个可用**：`/dashboard` 是禁用项（§M4.2-6 有意如此），所以「搜索 → 导航 → 收起」实测走「**搜索 → Esc 收起**」。**Esc 只在焦点位于岛内时生效**（P0 不注册全局键盘，§M4.2-10）：点完搜索图标焦点还在胶囊上，直接按 Esc 即可；若你先点了画布，Esc 不会有反应（那是 M9 的全局语义）。
> 5. **`⌘K` / `⌘⇧K` 在 P0 仍归 QuickPanel**：岛**不抢键**，按 `⌘K` 打开的仍是今天那个顶部对话框（设计 §6.3 的迁移纪律：双触发必须与删掉旧监听同一次提交 = M9）。所以第 9 条只判「触摸端命中区 ≥44×44 + 悬停不再自动展开」。
> 6. **看不到玻璃感/高光时先查这两处**：`(hover: none)`（触摸仿真或平板真机）下指针高光**不跟随**；系统开了「减少动态效果」时高光跟随与漂移**关闭**、形变不做弹簧（尺寸直接切换 + 约 120ms 淡入）。两者都是设计（§3.4 降级矩阵），不是失效。
> 7. **窄屏（≤640px）**：展开宽度收 `calc(100vw - 32px)`、导航只留图标（标签 `hidden md:inline`）。
> 8. **DevTools 量尺寸的锚点**：`document.querySelector('[data-island]')`（胶囊本体）、`[data-island-panel]`（当前形态）、`[data-island-nav]`、`[data-island-nav-disabled]`。收起态 `getBoundingClientRect().height` 应为 **40**。

| # | 用户做什么（具体入口） | 期望 | 判据或证据 | 失败先看哪 |
| - | ---------------------- | ---- | ---------- | ---------- |
| 1 | 打开 `/graph`，看屏幕底部中央 | 常驻胶囊：3 个图标（graph / dashboard / 搜索），当前页高亮；高度 ≤ 40px、宽度 ≤ 180px | 截图；`document.querySelector('[data-island]')` 的 `getBoundingClientRect()` 高 ≤ 40 | 岛的 `ISLAND_SHAPES.idle` 与 `island-nav.tsx` |
| 2 | 收起态快速连点「搜索 → 导航 → 收起」（设计 §11-1） | 胶囊跟随最新目标，无跳变、无动画排队；动画中再次点击能立刻改向 | 录屏或连续截图；无「必须等上一个动画播完」的观感 | `dynamic-island.tsx` 的 `layout` + `AnimatePresence`；是否有多层 `transition` 争抢 |
| 3 | 同上，盯住形变的起始边（设计 §11-2） | 从**底部**向上长出来（`originY: 1`），不是从上方垂下来 | 录屏逐帧看底边是否保持不动 | `transformOrigin` 是否被照抄成 `originY: 0` |
| 4 | 展开态（搜索面板）出现后看画布（设计 §11-3） | 岛不覆盖画布上「常用区域」的节点；底部 64px 安全边成立；岛两侧的底部空白**仍可拖动画布** | 展开态下按住胶囊左右两侧空白拖动，画布仍平移 | 外层容器是否误用了 `pointer-events-auto` |
| 5 | 在底部左侧 3px 热区向内划、打开侧边栏；再打开节点右键菜单 / NodeEditor（设计 §11-4） | 侧边栏热区仍可唤出；右键菜单与 NodeEditor 弹层**盖在岛之上**；岛不抢指针 | 逐项操作；弹层与岛的 `z-index` 关系 | `z-40`/`z-[45]` 与 Radix portal；胶囊是否超出 `max-width` 压到热区 |
| 6 | 展开态点岛内某个导航图标 → `/dashboard` | 该图标为禁用态（`opacity-40` + `aria-disabled` + 「页面尚未实现」tooltip），**点了不跳 404**；点 `/graph` 图标不产生重挂载 | 悬停看 tooltip 文案；点禁用项 URL 不变；从 `/dashboard` 返回时胶囊 DOM 节点未重建（DevTools 看元素是否闪烁） | `apps/web/components/island-routes.ts` 的 `enabled: false`；`(main)/layout.tsx` 是否真的没被路由切换重挂 |
| 7 | 系统开启「减少动态效果」，刷新 `/graph`（设计 §11-6） | 尺寸直接切换 + 约 120ms 淡入；高光跟随与漂移关闭；岛仍可用 | 手测；`matchMedia('(prefers-reduced-motion: reduce)').matches` 为 true | `island-config.ts` 的降级分支；高光 `pointermove` 是否漏判 |
| 8 | `pnpm --filter=web build`（设计 §11-9） | **编译阶段**通过（`✓ Compiled successfully`），说明 `motion` 与 React 19 / Next 16 一起打包无碍；TS 阶段**只**允许停在基线里已有的 `graph/page.tsx` `theme` 一条 | 构建输出尾部 + 与 [baseline/typecheck-errors.txt](./baseline/typecheck-errors.txt) 的比对（前置说明 3） | 若编译阶段报 `motion` / peer / Turbopack 错误 ⇒ 触发总纲 §10 退路（岛退回 CSS transition）；若 TS 阶段多出**别的**行 ⇒ 真回归 |
| 9 | DevTools 打开触摸仿真（`(hover: none)` / coarse pointer），刷新（设计 §11-6 后半段） | 悬停不再自动展开预览；导航图标命中区 ≥ 44×44 | 触摸仿真下点图标一次命中率；量命中框 | `island-nav.tsx` 的 coarse 分支（预览一侧在 G8 验） |

**G4 与 G2/G3 必须各测一轮**（总纲 §6.4 / 并行窗口 W0 纪律），不许合并成一次「都过了」。

### M4.5 回归面

1. `/graph` 画布：拖拽平移、滚轮缩放、双指捏合、节点拖拽与命中——岛不得吃掉底部区域的指针事件（岛外层 `pointer-events-none`、只有胶囊本体 `auto`；胶囊两侧的底部空白仍应命中画布）。
2. 侧边栏：左侧 3px 唤出热区、`temp` 浮层模式、固定/关闭切换。
3. `/graph` 现有弹层：`NodeEditor`、节点右键菜单、`NodeSemanticDialog`/`EdgeSemanticDialog`、`CreateWorkspaceDialog`、`ViewDialog` 全部仍可打开且层级正确。
4. `apps/web/app/editor/page.tsx` 与 `(auth)` 路由**不应**出现岛（它们不在 `(main)` 布局内）；确认没有把宿主挂到根 `apps/web/app/layout.tsx`。
5. `packages/ui` 新增依赖后，`@workspace/dataview`、`@workspace/editor` 等既有消费方的 typecheck/lint 不新增失败（对 baseline 比较）。

---

## M8 — 灵动岛 P1：预览面板

### M8.1 工作分解（任务包）

| # | 任务 | 文件白名单（新增/修改） | 执行主体 | 验收（编译器可判定） |
| - | ---- | ---------------------- | -------- | -------------------- |
| 1 | 岛内预览面板：`<NodePreviewBody node={node} />` + 固定尺寸容器（`360px` × `min(340px,44vh)`，溢出滚动）+ 「打开节点 / 打开记录」动作行；**不含** `calculatePosition`、`PREVIEW_MARGIN` 跟随、`PREVIEW_MAX_HEIGHT` 钳制 | 新增 `packages/ui/src/components/dynamic-island/panels/node-preview-panel.tsx` | 子 agent | `pnpm --filter=@workspace/ui typecheck` 通过；不 import `@workspace/graph` |
| 2 | 面板装配：`dynamic-island.tsx` 增 `previewContent` 分支并接进 `ISLAND_SHAPES.preview` | 修改 `.../dynamic-island/dynamic-island.tsx`、`.../dynamic-island/island-config.ts`、`.../dynamic-island/index.ts`（如需再导出） | 子 agent | 同上 |
| 3 | 宿主内容注入与 `previewBlock` 映射：桌面 `(hover: hover)` 且 `islandPanel === "idle"` 且 `visible` → `preview`；`isFocus` 语义保持；`lastIslandPanel` 不因预览改写 | 修改 `apps/web/components/dynamic-island-host.tsx` | 子 agent | `pnpm --filter=web typecheck` 通过 |
| 4 | 预览动作的宿主实现：`打开节点` → `useUIStore.getState().handleNodeEdit(nodeId)`（判据：`packages/store/src/uiStore.ts:351` 有实现）；`打开记录` 仅对 database/collection 节点给按钮 | 新增 `apps/web/components/island-node-preview.tsx`（包装 `NodePreviewBody` 并注入动作），由 `dynamic-island-host.tsx` 引用 | 子 agent | `pnpm --filter=web typecheck` 通过 |
| 5 | `ForceGraph` 删浮层：移除 `<PreviewBlock>` 渲染块、`PreviewBlock` import、以及 now-unused 的 store 选择器 | 修改 `packages/graph/src/force/ForceGraph.tsx` | 子 agent | `pnpm --filter=@workspace/graph typecheck` + `lint` 通过（无 unused import 警告） |
| 6 | `ForceGraph` 删 `isFocus` 外部点击 effect，并把该职责交给宿主（`pointerdown` 落在岛外才 `closePreviewBlock`） | 修改 `packages/graph/src/force/ForceGraph.tsx`、`apps/web/components/dynamic-island-host.tsx` | 子 agent（两个文件同一任务包，避免双 owner） | 同上两包 typecheck 通过 |
| 7 | 触摸端点击触发：`(hover: none)` 下节点点击进 `preview` 并置 `isFocus`，再点同一节点或画布空白收起；桌面端 hover 语义不变 | 修改 `packages/graph/src/eventHandler.ts`（hover/click 分支按 `(hover: none)` 分流） | **主 agent**（跨包语义决策 + 该文件是 graph 的单一事件出口，总纲 §2.1-2 口径） | `pnpm --filter=@workspace/graph typecheck` 通过 |
| 8 | `(main)/layout.tsx` 若需为岛让出高度（`--dynamic-island-height` 的消费）则在此收口 | 修改 `apps/web/app/(main)/layout.tsx`（仅当需要） | **主 agent** | `pnpm --filter=web typecheck` 通过 |

**M8 明确不做**（R1）：不新建 `packages/ui/src/components/preview-block/node-preview-body.tsx`，不改 `preview-block.tsx`/`preview-header.tsx`/`node-preview-cover.tsx`——那些是 M2 的交付物。M8 开工的前置检查就是 `grep -rn "NodePreviewBody" packages/ui/src` 有命中（今天为空，见文末清单）。

### M8.2 关键决策与挡路的坑

1. **抽出去掉的跟随逻辑必须真的不要。** `preview-block.tsx:36-65` 的 `calculatePosition` 依赖 `PREVIEW_MARGIN` 与容器边界（`types.ts` 里 `PREVIEW_MARGIN = 12`），固定面板没有这些语义（设计 §7.2 末段）。只搬「header + previews 分发」。
2. **`isFocus` 的语义不能在搬迁中漂移。** 今天 `isFocus === true` 表示「点节点钉住」，并且 `eventHandler.ts:182`、`:193`、`:257`、`:323` 四处用它来拒绝 hover 覆盖已钉住的预览。M8 只改「谁渲染」，不改这些判定。另注意 `uiStore.ts:255-259` 的 `setPreviewBlock` 会**顺带写 `isNodeFocus`**——这是 `previewBlock` 的既有耦合，M8 不要顺手拆（拆它会牵动 `node-editor` 之类的消费者）。
3. **外部点击 effect 删除后会出现职责真空。** `ForceGraph.tsx:818-829` 今天的判定是「点不在 canvas 容器内、也不在 `[data-preview-block]` 内 → 关闭」。浮层删除后 `[data-preview-block]` 不存在了，宿主要接管的正是这条：`pointerdown` 目标不在 `[data-island]` 内 → `closePreviewBlock()`。**画布内**的空白点击仍由 worker 的 `canvas:click` → `closePreviewBlock` 处理（`ForceGraph.tsx:817` 的注释即是此意），不要重复实现。
4. **`(hover: none)` 下不能靠 `previewBlock.visible` 驱动。** 桌面是「hover 写 store → 宿主映射成 `preview`」；触摸端没有 hover，必须由 `eventHandler` 在节点点击时进 `preview` 态（设计 §0.3-7、§2.4 触摸补充）。这一条是 M8 唯一需要动 `packages/graph` 语义的地方，因此按总纲 §2.1-2 归主 agent。
5. **岛内预览的滚动链。** 预览面板内容高度自适应但上限 `min(340px,44vh)`，溢出要在**面板内部**滚动；同时 `packages/graph/src/force/ForceGraph.tsx:849` 的 canvas 是 `touchAction: "none"`，触摸端在岛上滑动不应被画布抢走——确认岛不在 canvas 的祖先链上（它挂在 `(main)/layout.tsx`，与 canvas 是兄弟）。
6. **`打开记录` 只在 database/collection 上有意义。** 今天的统一入口是 dataview 的 record surface（`useRecordActions().openRecord`），宿主侧能拿到的最小形态是 `NodePreviewBody` + 一个条件按钮。P1 若收敛不了这条，允许降级为「只给 `打开节点`」并记入遗留——**不要**在岛里新建一套自己的记录弹窗。

### M8.3 提交切分

1. `dynamic-island P1：岛内预览面板接管节点悬停预览，宿主注入 NodePreviewBody`
2. `force-graph 瘦身：删除 PreviewBlock 浮层与 isFocus 外部点击 effect`
3. `force-graph 触摸：无 hover 设备下节点点击进岛预览，isFocus 语义保持不变`

### M8.4 闸门 G8 — 用户操作清单

入口：`pnpm --filter=web dev` → `http://localhost:3000/graph`。

| # | 用户做什么（具体入口） | 期望 | 判据或证据 | 失败先看哪 |
| - | ---------------------- | ---- | ---------- | ---------- |
| 1 | 鼠标悬停画布上任意节点（桌面），停 250ms | 屏幕底部岛展开 `preview` 面板，显示该节点标题/语义/摘要/类型正文 | 截图；面板宽度 360px、高度 ≤ `min(340px,44vh)` | 宿主映射分支；`NodePreviewBody` 是否拿到了 node |
| 2 | 悬停后**盯住被悬停的节点本身及其邻居**（设计 §11-3） | 预览不再遮挡节点图：没有任何浮层跟随指针盖在画布上 | 与迁移前对比截图；`document.querySelectorAll('[data-preview-block]').length === 0` | `ForceGraph.tsx:887-895` 是否真的删干净 |
| 3 | 点击某节点（钉住），把鼠标移到别处，再悬停另一个节点 | 钉住期间 hover 不覆盖预览；`isFocus` 语义与今天一致 | 面板内容不随指针切换；对照迁移前同一串操作 | `eventHandler.ts:182/193/257/323` 四处判定是否被改动 |
| 4 | 钉住后点画布空白；再钉住后点岛外（如侧边栏空白） | 两种都收起岛回到 `idle`；桌面再 hover 才会重新展开 | 逐项操作两次 | 宿主新增的 `pointerdown`；`[data-island]` 标记是否打在岛根 |
| 5 | 点面板里的「打开节点」 | NodeEditor 打开且是该节点；岛不残留展开态或与弹层打架 | NodeEditor 标题 = 节点标题 | `handleNodeEdit`（`uiStore.ts:351`）接线 |
| 6 | 打开 DevTools 触摸仿真（`(hover: none)`），点画布上一个节点（设计 §0.3-7 / §11-6） | **不是** hover 触发，而是**点击触发**预览；再点同一节点或点空白处收起 | 触摸仿真下依次点击；对比桌面端不点不展开 | `eventHandler.ts` 的 `(hover: none)` 分流 |
| 7 | 展开 `preview` 时按 `⌘K` | 搜索面板覆盖 preview（设计 §2.2 优先级 `search` > `preview`）；关掉搜索后回 `idle`，**不自动回到 preview** | 操作后看面板形态 | 宿主的优先级映射是否写成了「关搜索回 preview」 |
| 8 | 删除当前预览中的节点（右键菜单删除） | 岛收起或在下一个合法事件里退出 `preview`，不显示空白面板/报错 | 操作后看控制台与面板 | 预览面板对 `node === undefined` 的处理 |
| 9 | `pnpm --filter=@workspace/graph typecheck` 与 `pnpm --filter=web typecheck` | 无新增失败 | 输出尾部 | 删 import 时是否留下未使用符号 |

### M8.5 回归面

1. `/graph` 节点编辑（双击进 NodeEditor）、节点右键菜单、`alt` 拖拽建边、`ctrl` 套索选择全部不变。
2. `previewBlock` 的四个写入点（`eventHandler.ts` 的 hover/leave/click 路径）语义不变——只有「谁来渲染」变了。
3. 侧边栏热区与画布底部指针穿透仍成立（岛现在会因预览而变大，扩大了遮挡面，必须重测）。
4. `packages/ui` 的 `NodePreviewCover` 消费者（dataview gallery）不受影响——M8 不碰 `preview-block/**`。
5. `packages/graph` 的 worker/渲染管线不受影响：只删主线程编排器里的一个浮层与一个 effect，`applyDiff`/`setViewport` 路径不动。

---

## M9 — 灵动岛 P2+P3：搜索面板与清理（R5 合并）

### M9.1 工作分解（任务包）

| # | 任务 | 文件白名单（新增/修改） | 执行主体 | 验收（编译器可判定） |
| - | ---- | ---------------------- | -------- | -------------------- |
| 1 | 抽 `SearchSurface`：从 `search-mode.tsx` 去掉 Dialog 耦合与 `flex-1`/`autoFocus` 假设，显式给出高度与 `overflow-y-auto`；结果列表与 `QUICK_TABS`/`stripSlashPrefix`/`FilterQueryBuilder` 逻辑**原样搬移**；旧文件薄壳化 | 新增 `packages/ui/src/components/dynamic-island/search/search-surface.tsx`；修改 `packages/ui/src/components/dialog/quick-panel/search-mode.tsx` | 子 agent | `pnpm --filter=@workspace/ui typecheck` 通过；两份实现的匹配函数签名一致 |
| 2 | 岛 `search` 面板：输入焦点在 `setIslandPanel("search")` 后由 `requestAnimationFrame` 接管；`Esc` 先关过滤器弹层再退回；显式分段按钮（search/agent） | 新增 `.../dynamic-island/panels/search-panel.tsx`；修改 `dynamic-island.tsx`、`island-config.ts` | 子 agent | 同上 |
| 3 | 三处入口改向：header 按钮、侧栏 `SearchButton` | 修改 `packages/ui/src/components/header/toggle-search-command-button.tsx`、`packages/ui/src/components/sidebar/main-sidebar.tsx` | 子 agent | `pnpm --filter=@workspace/ui typecheck` 通过；两文件不再引用 `openQuickPanel` |
| 4 | 删除 `<QuickPanel />` 挂载与 import | 修改 `apps/web/app/(main)/graph/page.tsx` | 子 agent | `pnpm --filter=web typecheck` 通过 |
| 5 | 删 `⌘K` + `Tab` 全局监听（与 1–4 **同一提交**，否则 `⌘K` 双触发、`Tab` 被抢） | 修改 `packages/ui/src/components/dialog/quick-panel/quick-panel.tsx` | 子 agent | 同任务 4；文件内不再有 `window.addEventListener("keydown"` |
| 6 | 宿主注册 `⌘K`/`⌘⇧K`/`Esc`，`⌘K` 复用 `lastIslandPanel` | 修改 `apps/web/components/dynamic-island-host.tsx` | 子 agent | `pnpm --filter=web typecheck` 通过 |
| 7 | P3：删 `dialog/quick-panel/` 整个目录（含 `agent-mode.tsx`、`quick-panel.type.ts`） | 删除 `packages/ui/src/components/dialog/quick-panel/**` | 子 agent（删除动作前先 `grep` 复核零引用） | 目录不存在；全仓无 `quick-panel` 命中 |
| 8 | P3：`uiStore` 删 `quickPanel` 切片与 `commandDialogOpen*` 死切片、`QuickPanelMode` 类型；`store/index.ts` 去掉对应导出 | 修改 `packages/store/src/uiStore.ts`、`packages/store/src/index.ts` | **主 agent**（总纲 §3.1 独占） | `pnpm --filter=@workspace/store typecheck` 通过；`grep commandDialogOpen` 零命中 |
| 9 | P3：`packages/ui/src/components/index.ts` 去掉 `QuickPanel` 导出 | 修改 `packages/ui/src/components/index.ts` | **主 agent**（总纲 §3.1 独占） | `pnpm --filter=@workspace/ui typecheck` 通过 |
| 10 | P3：`agent` 面板内容收口（分段按钮 + `⌘⇧K` 直达 + 占位） | 修改 `.../dynamic-island/panels/agent-panel.tsx`（如需） | 子 agent | 同上 |

**顺序硬约束**：1 → 2 → 3/4/5（同一提交）→ 6 → 7/8/9。先删监听再改入口会让入口在中间态指向一个不存在的对话框；先改入口再删监听会让 `⌘K` 同时开岛与 dialog。

### M9.2 关键决策与挡路的坑

1. **`SearchSurface` 的 `flex-1`/高度假设是本阶段最大的回归点。** 今天 `search-mode.tsx:234` 是 `cn("flex flex-col", className)`，结果区 `:288` 用 `max-h-80 overflow-y-auto`，而它今天是靠 Dialog 的 `flex flex-col`（`quick-panel.tsx:56`）撑出高度。抽到岛里必须显式给 `h-[min(440px,52vh)]`（设计 §7.3、§2.1 的 search 形态），否则会塌成 0 高。
2. **`autoFocus` 要摘掉。** `search-mode.tsx:243` 的 `autoFocus` 在 Dialog 里成立；岛是常驻 DOM，`autoFocus` 会在挂载时就抢焦点（甚至在收起态）。改为面板在进入 `search` 后由 rAF 聚焦。
3. **`Tab` 的归还是一次「减法」，但要同时确认没有新增拦截。** 今天的拦截在 `quick-panel.tsx:40-43`（`event.key === "Tab" && panelOpenRef.current` → `preventDefault()`）。删掉它即可；岛内**不许**再引入 `Tab` 的 `preventDefault`，模式切换一律走显式分段按钮（设计 §0.3-1）。
4. **`⌘K` 的迁移必须与「三处入口改向」同批。** `quick-panel.tsx:35-38` 是今天**唯一**的 `⌘K` 监听——已用 `grep -rn "event.key.toLowerCase() === \"k\"" --include=*.ts --include=*.tsx packages apps` 核实（只此一处命中）。宿主的监听与它并存即双触发。`addEventListener("keydown"` 的全量清单已核实（实测 11 处 = `window` 6 + `document` 1 + 元素级 4），其中落在 `packages/ui` / `apps/web` 的全局监听只有这四处，不得误伤：`packages/ui/src/components/ui/sidebar.tsx:107`（`⌘B`，shadcn 基座，**不改**）、`apps/web/components/theme-provider.tsx:61`（`⌘/Ctrl+D`）、`packages/ui/src/components/preview-block/preview-block.tsx:165`（`Esc`，随 M9 删除目录一起消失）、`packages/ui/src/components/dialog/quick-panel/quick-panel.tsx:45`（本任务要删的那个）。另有两处 `window` 捕获阶段的 `Esc`：`packages/dataview/src/views/table/toolbar/search-bar.tsx:104` 与 `packages/dataview/src/shared/record-editor.tsx:188`——作用域在自己组件内、不绑 `⌘K`，不在改动面内。余下 5 处在 `packages/editor/**`（1 处 `document` + 4 处元素级），与 M9 无关。
5. **搜索面板不是纯函数组件，它直接读 `useDataStore`**（`search-mode.tsx:32-35` 的 `nodes`/`edges`/`nodeSemantics`/`edgeSemantics`）。抽 `SearchSurface` 时**不要顺便改成 props 注入**——那是 dataview「渲染器不碰 store」的边界，不适用于 `packages/ui` 内的搜索面板；改了会牵动 `packages/graph` 之外的调用面并扩大回归面。这条与设计 §5.2 第 2 条的「内容由宿主注入」不冲突：注入的是 `searchContent` 这个节点，面板内部照旧读 store。
6. **`commandDialogOpen` 死切片在哪一节删。** 设计 §6.3 与 §12 把它写在 P3 行，执行总纲 §3.1 也把「M9（−`quickPanel`/死切片）」并列。因此**M4 不动它**（M4 只加 `islandPanel`），统一在 M9 任务 8 删；这样 M9 的 diff 才是「一次收口」，也避免 M4 阶段闸门里混进无关删除。
7. **`QuickPanelMode` 的删除面比想象的大。** 它在 `packages/store/src/uiStore.ts:27` 定义，被 `uiStore.ts` 内部签名引用 4 处（`:201/204/206/208`），被 `packages/store/src/index.ts:11` 再导出，被 `packages/ui/src/components/dialog/quick-panel/quick-panel.type.ts:3,5` 转口导出。删切片时要一次清干净（`grep -rn "QuickPanelMode"` 必须零命中），否则 `store/index.ts` 会引到不存在的类型。
8. **`previewBlock → hoverPreview` 重命名建议不做。** 设计 §8 把它记为「P3 后可选」。改名要动 store 字段 + `eventHandler.ts` 四处 `s.previewBlock` 判定 + `ForceGraph` 余下的选择器，纯收益是命名；R5 的合并已经把 M9 撑得很宽，改为登记为后续独立小改（见文末清单）。
9. **「全仓无 quick-panel 引用」必须用命令证明，不许口头断言**（总纲 §2.4-3）。验证命令与期望输出见 G9 第 9 条。

### M9.3 提交切分

1. `dynamic-island P2：抽出 SearchSurface，岛内搜索面板接管 ⌘K 与三处入口`
2. `quick-panel 退场：删全局 ⌘K/Tab 监听与 <QuickPanel /> 挂载`
3. `dynamic-island P3：删 quick-panel 目录、quickPanel 与 commandDialogOpen 死切片、QuickPanel 导出`

### M9.4 闸门 G9 — 用户操作清单

入口：`pnpm --filter=web dev` → `http://localhost:3000/graph`。

| # | 用户做什么（具体入口） | 期望 | 判据或证据 | 失败先看哪 |
| - | ---------------------- | ---- | ---------- | ---------- |
| 1 | 按 `⌘K`（Windows/Linux 为 `Ctrl+K`） | 岛展开 `search`，输入框**已聚焦**，光标在框内 | 直接打字，字进输入框 | 宿主的 rAF 聚焦；`autoFocus` 是否已摘 |
| 2 | 输入关键词，或输入 `/` 前缀 | 节点/命令/类型分组结果正常；输入 `/` 时 tab 自动切到「命令」 | 逐项操作；与 P2 之前的 quick-panel 结果对比 | `SearchSurface` 的高度是否塌成 0（`h-[min(440px,52vh)]`） |
| 3 | 点筛选按钮，用 `FilterQueryBuilder` 加一条条件；按 `Esc`（设计 §2.4 `Esc` 行） | 过滤器能开、能加条件、能改结果集；`Esc` 先关过滤器弹层，再按一次才退回 `idle` | 两次 `Esc` 的逐层行为 | 过滤器弹层在岛内是否被裁剪；`Esc` 处理顺序 |
| 4 | 在搜索结果列表里按 `↑`/`↓`/`Enter`、`⌘+Enter`（设计 §2.4） | 沿用 `SearchMode` 今天的结果语义（打开节点/执行命令） | 逐键操作 | 命令执行链 `COMMANDS` |
| 5 | 面板打开时反复按 `Tab` / `Shift+Tab`（设计 §11-5） | 焦点在输入框、tab 按钮、筛选按钮、结果条目间**浏览器默认遍历**；不再被劫持去切 search/agent | 观察焦点环移动方向；`Tab` 必须能离开面板 | 是否有残留的 `Tab` `preventDefault`（全局或岛内） |
| 6 | `⌘K` 打开后再按一次 `⌘K`（设计 §9 P2 验收） | 岛收起回 `idle`；**不出现两个面板**、不闪烁、不双触发 | 连按两次看形态与 DOM | 宿主监听与遗留言监听是否并存（双触发） |
| 7 | `⌘⇧K` | 岛切到 `agent` 占位面板；再按一次收起 | 操作两次 | 宿主快捷键分支 |
| 8 | 点侧栏 `Search` 按钮（含 `⌘K` 提示）；再点 `/graph` 顶栏的搜索图标按钮（`GraphHeader` 内） | 两处都展开岛 `search`，**不再**弹出顶部模态框 | 两处各点一次 | `main-sidebar.tsx:415` 与 `toggle-search-command-button.tsx:17` 是否已改向 |
| 9 | 在仓库根执行：`grep -rn "quick-panel\|QuickPanel\|openQuickPanel" --include=*.ts --include=*.tsx . \| grep -v node_modules \| grep -v "\.next"` | **零命中** | 贴出完整输出（空即通过） | 漏改的入口；`store/index.ts` 与 `components/index.ts` 的残留导出 |
| 10 | 打开 NodeEditor 对话框（双击节点），在对话框内点搜索按钮 | 岛在 NodeEditor 弹层**之下**被打开时仍可用；或按设计判定为「弹层优先、岛退到后面」并记录 | 观察层级与可用性 | `apps/web/app/(main)/graph/page.tsx:74` 的 NodeEditor 与岛的 `z` 关系 |
| 11 | `pnpm --filter=@workspace/store typecheck`、`pnpm --filter=@workspace/ui typecheck`、`pnpm --filter=web typecheck`、`pnpm --filter=web build` | 全部无新增失败 | 输出尾部 | `QuickPanelMode` 残留引用；未使用 import |

### M9.5 回归面

1. **P2 之前**（M4/M8 阶段）quick-panel 的搜索仍可用：`⌘K` 开对话框、三处入口、`Tab` 切模式——这是验证 M9 之前没被提前破坏的基线。
2. `/graph` 的节点编辑、右键菜单、侧边栏热区、画布手势（M4/M8 的回归面在 M9 后必须再跑一遍）。
3. 搜索自身的可达性：命令（`COMMANDS`）、节点语义/边语义列表、过滤器 builder 的键盘可达性（设计 §7.3 末行）。
4. `pnpm --filter=@workspace/ui typecheck` 与 `@workspace/graph` 的 typecheck：删导出不得留下悬空引用。
5. `packages/store` 的其余切片（`previewBlock`、`nodeSemanticDialog`、`viewConfigPanelOpen`、`optionsMenuOpen`）不受删除影响。

---

## 附：本章「待验证」回填清单

按总纲 §2.2-7 / §6.3，下列条目在执行期确认后回填到设计文档的「待验证」区或 §9 偏差登记（**不回改正文**）：

1. **`backdrop-filter` 的 `simulation:stopped` 联动**（设计 §3.4 第 3 行）：P0 先用「300ms 无重绘」等价实现；是否值得为它新增 `packages/graph → packages/ui` 的事件面，待 G4 第 9 条与性能手测后决定。
2. **`IslandPanel` 双定义的结构等价性**（设计 §5.2 / §6.1）：两份字面量联合是否真的可互相赋值（宿主赋值处 `tsc` 实测），以及将来若要单真源该放哪一层。
3. **`originY: 1` 的观感**（设计 §3.3 最易照抄错处）：G4 第 3 条通过后回填「已确认」。
4. **`z-40` vs `z-[45]`**（设计 §0.3-8）：窄屏 + `temp` 侧边栏重叠时的最终取值，G4 第 5/6 条确定。
5. **`--dynamic-island-height` 的消费方**（设计 §5.3-5）：本章只写入变量，dashboard 网格是否真的避让由 M10 决定；若 M10 不消费，回填为「无消费方」。
6. **`previewBlock → hoverPreview` 重命名**（设计 §8 / §6.2 末）：本章不做，登记为后续独立小改。
7. **`打开记录` 动作**（设计 §7.2）：P1 是否收敛出统一的 record surface 入口；若未收敛，按遗留处理并写进 `gates.md` 遗留列。
8. **`corner-shape: squircle` 渐进增强**（设计 §0.3-6 / §3.2）：只在支持它的浏览器上生效，回填实际观测到的渲染差异。
9. **`stale 检查`**：`grep -rn "NodePreviewBody" packages/ui/src` 在 M8 开工时**必须有命中**（今天为空，已核实）；若 M2 未按 R1 交付，M8 就地停并回派 M2。
