# 灵动岛（Dynamic Island）设计文档

> 状态：**待实现**（提案见 [../proposal/dynamic-island.md](../proposal/dynamic-island.md)）
> 范围：位于**底部中央**的多功能栏。它接管四件事：**页面导航**（/graph、/dashboard）、**节点预览**（替代 force 图 hover 时的 preview block）、**搜索**（替代 quick-panel 的 search）、**agent**（替代 quick-panel 的 agent）。
> 新增运行时依赖：**`motion`**（唯一新增，见 §4）
> 相关文档：[../proposal/dynamic-island.md](../proposal/dynamic-island.md)、`packages/graph/AGENTS.md`、[../dataview/README.md](../dataview/README.md)（「渲染器不碰 store，向宿主索取」的既有先例）

---

## 0. 实现现状与关键决策

### 0.1 今天的代码是什么样

岛要接管的东西，今天分散在四个地方：

| 现有物                                  | 位置                                                                                       | 现状                                                                                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| QuickPanel（Radix Dialog）              | `packages/ui/src/components/dialog/quick-panel/{quick-panel,search-mode,agent-mode}.tsx`    | 顶部 `top-[15%]` 的模态框，`sm:max-w-2xl`，标题栏两个按钮在 `search` / `agent` 之间切换；挂载点是 `apps/web/app/(main)/graph/page.tsx:85` 的 `<QuickPanel />`                                                              |
| 搜索入口（3 处）                        | `header/toggle-search-command-button.tsx`、`sidebar/main-sidebar.tsx` 的 `SearchButton`     | 都是 `useUIStore().openQuickPanel("search")`；按钮上写死 `⌘K` 提示                                                                                                                                                       |
| 全局键盘：`⌘/Ctrl+K` 切换、`Tab` 切模式 | `packages/ui/src/components/dialog/quick-panel/quick-panel.tsx:30-49`                      | 面板打开时 `preventDefault` 掉 `Tab`（`:40`）来切 search/agent —— 与岛内部的焦点遍历直接冲突（§0.3-1）                                                                                                                   |
| 节点悬停预览浮层 `previewBlock`         | 源：`packages/graph/src/eventHandler.ts`（hover / alt-drag / click 写 store）               | `uiStore.previewBlock: { nodeId, visible, isFocus }`；渲染：`packages/graph/src/force/ForceGraph.tsx:887` 的 `<PreviewBlock>`，内部用 `window.addEventListener("mousemove")` + 边界钳制跟随指针（`preview-block.tsx:36-72`），尺寸常量 `PREVIEW_WIDTH=320 / PREVIEW_MAX_HEIGHT=280 / PREVIEW_MARGIN=12` |

页面壳与路由：

- `apps/web/app/(main)/layout.tsx` **只做 auth gate**（`trpc.auth.me` + 跳登录），直接 `return children`；侧边栏 + 主区由**每个页面自己**用 `@workspace/ui` 的 `MainLayout` 组合（`apps/web/app/(main)/graph/page.tsx:67`）。
- 路由只有 `/graph`。`apps/web/middleware.ts` 已把 `/graph`、`/dashboard`、`/settings` 列入保护路径，但 **`/dashboard` 与 `/settings` 尚不存在页面**。
- `MainLayout`（`packages/ui/src/components/layout/main-layout.tsx`）里 sidebar 的层级是 `z-30`（`fixed` 模式）/`z-40`（`temp` 浮层），左侧 3px 的唤出热区也是 `z-30`；Radix 弹层走 portal，`z-50`。

依赖与配置现状：

- `packages/ui` 与 `apps/web` **都没有**任何动画库（无 `motion` / `framer-motion` / `react-spring`）；只有 shadcn 过渡用的 `tw-animate-css`。
- `packages/ui` 全包**没有任何 `next/navigation` 引用**（只有 `next-themes`），这是 §0.2-2 的事实依据。
- `apps/web/next.config.mjs` 已 `transpilePackages: ["@workspace/ui", …]`，且 **`reactStrictMode: false`**（对 motion 有利，见 §4.6）。
- `uiStore` 里 `quickPanel` 与 `previewBlock` 两个切片是本次要接管的；另有 `commandDialogOpen` / `toggleCommandDialog` 三件套是**死代码**（无任何消费者），可顺手删。
- 设计令牌：`packages/ui/src/styles/globals.css` 的 `--radius: 0.625rem`（`--radius-lg`），暗色 token 在 `.dark`；`@source "../**/*.{ts,tsx}"` 已覆盖 `packages/ui/src/components/**`，新组件的类名会被扫描到。

### 0.2 四条决策

1. **动效引擎用 `motion`（原 Framer Motion）。** 本组件的核心交互是指针驱动、可随时打断的连续形变；View Transitions 是「旧状态快照 → 新状态快照」的整页交叉淡入，**不可中断、动画期间阻塞交互**（motion 官方与浏览器行为的直接对比），因此排除（详见 §4.1–4.3）。
2. **组件在 `packages/ui`，宿主适配在 `apps/web`。** 岛本体只吃 props（当前路由、导航项、面板内容、回调），**不 import `next/navigation`、不 import `@workspace/store`**；`pathname` / `router.push` / store 绑定都由 `apps/web/components/dynamic-island-host.tsx` 注入。这既符合 `packages/ui` 现有的依赖事实，也复刻了 dataview「渲染器不碰 store，需要节点就向宿主索取」的边界。
3. **单实例、跨页常驻，挂在 `apps/web/app/(main)/layout.tsx`。** App Router 的 layout 在 `/graph ↔ /dashboard` 之间不重挂，于是页面切换时**胶囊是同一个 DOM 节点、同一个 motion 实例**，形变不会被路由切换打断；若挂在各页面里，每次导航都会重新挂载并丢动画。
4. **先做壳。** 严格按提案的「开发步骤」分四阶段：P0 样式 + 页面导航（本文件的交付物就是它能被直接施工的依据），P1 节点预览，P2 搜索，P3 agent（§9）。

### 0.3 必须知道的坑

1. **`Tab` 不能再被全局劫持。** 现有 quick-panel 在打开时吃掉 `Tab` 来切模式；岛展开后有输入框、结果列表、分段按钮，`Tab` 必须归还给浏览器的焦点遍历，模式切换改用**显式分段按钮**（另给 `⌘/Ctrl+K` = 搜索、`⌘/Ctrl+Shift+K` = agent）。迁移时必须同时删掉 `quick-panel.tsx` 里的这段监听，否则 island 与遗留 dialog 会同时抢键。
2. **`backdrop-filter` 叠在每帧重绘的 canvas 上会持续重采样。** force 图在模拟未停止时，worker 每帧 `postMessage` 一帧 `ImageBitmap`（`__FRAME__` 通道），主线程每帧 `drawImage`。岛若用实时 `backdrop-filter: blur()`，GPU 每帧都要重新模糊背后画布一次；目标设备是一加平板（Droidspaces 容器 + anland 转发显示，ARM），这是真实开销。**对策**：模拟运行中降级为不透明/低透明度纯色，`simulation:stopped` 之后（或岛展开后 300ms 无重绘）再打 `blur()`；且**永远不把 `backdrop-filter` 的半径放进动画**（只动 `transform` / `opacity` / 尺寸）。
3. **`layout` 动画是用 `transform: scale()` 实现的。** 三个必须记住的后果（motion 官方文档原文）：① 直接子元素若也参与形变，需要自己带 `layout`，motion 才会给它反向缩放；② `borderRadius` / `boxShadow` 会自动补偿，**但必须通过 `style` 给出**（写进 Tailwind `rounded-*` 类不会被补偿）；③ 元素带 `border` 时会被拉伸（1px 有渲染下限），要用「父层 padding 充当边框」的写法。
4. **固定的单实例要 `layoutRoot`。** 岛是 `position: fixed`，内部布局又随内容变化；motion 需要在 fixed 容器上标 `layoutRoot`，否则测量里会掺进页面滚动偏移（`layoutScroll` 是滚动容器的对应项，岛不需要）。
5. **导航项必须由宿主注入。** `/dashboard`、`/settings` 目前只有 middleware 保护、没有 page；把路由表写死在 `packages/ui` 里必然 404。宿主传 `{ key, label, icon, href, active, enabled }`，未实现的项渲染为禁用态（带原因 tooltip）。
6. **两个想用的新 CSS 特性都还不是 Baseline。** `corner-shape`（`superellipse()`，Chromium 139+ 支持，Safari / Firefox 未支持）与 `interpolate-size: allow-keywords`（同样非 Baseline）在 MDN 上都标注为 *Limited availability / Experimental*。因此：**默认形状走 `border-radius`**，苹果式连续圆角（squircle）只作为 `@supports (corner-shape: squircle)` 的渐进增强；不引入 `@squircle-js/react` 这类 SVG clip-path 兜底（它要求形状尺寸可枚举，而岛的尺寸是内容驱动的）。
7. **触摸设备没有 hover。** 目标设备是平板：`(hover: none)` 下要整体关闭「悬停节点 → 自动展开预览」，改为**点击节点 → 岛内预览**（点画布空白 / 再点节点收起）。桌面端保留 hover 自动展开，但只在岛处于 `idle` 时生效。
8. **层级与指针。** 岛取 `z-40`（高于 sidebar 的 `z-30`；与 `temp` 侧边栏同为 `z-40`，靠 DOM 顺序取胜——岛挂在 `(main)/layout.tsx` 的 `children` **之后**，若窄屏上与浮层侧边栏重叠不好看，抬到 `z-[45]`，仍低于 Radix 弹层的 `z-50`）；外层容器 `pointer-events-none`，只有胶囊本体 `pointer-events-auto`，否则底部一条会吃掉画布拖拽 / 侧边栏热区。
9. **减少动效。** `prefers-reduced-motion: reduce` 下：不做形变（尺寸直接切换 + 120ms 淡入），关闭高光跟随与呼吸动画（WCAG 2.2 §2.3.3）。
10. **不要把岛放进滚动容器。** 内容区自己 `overflow-y: auto` + `overscroll-contain`；外层不滚动，从而不触发 `layoutScroll` 相关的测量问题。

---

## 1. 目标与使用场景

| 目标         | 场景                                                                                                                                     | 替代关系                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **页面导航** | 在 `/graph` 与 `/dashboard` 之间切换，不必回到侧边栏；胶囊始终显示当前页                                                                 | 新增（今天是 middleware 里的路径，没有 UI）       |
| **节点预览** | 画布上悬停 / 点击节点时，预览在**屏幕底部**展开，不再遮挡节点图                                                                          | 替代 force 图 hover 的 `previewBlock` 浮层        |
| **搜索**     | `⌘K` / 侧边栏 Search / 顶栏搜索按钮：在岛内展开搜索面板（节点、命令、语义类型、过滤器）                                                  | 替代 quick-panel 的 `search` 模式                 |
| **agent**    | 同一面板内切到 agent（今日是占位）                                                                                                       | 替代 quick-panel 的 `agent` 模式                  |
| **形态**     | 一个常驻的底部胶囊：**收起时是导航栏**（3 个图标 + 当前页高亮），**展开时**按功能切换为节点预览 / 搜索 / agent，尺寸、圆角、内容平滑形变 | ——                                                |

成功标准（可验收）：

1. 收起态高度 ≤ 40px、宽度 ≤ 180px，不遮挡画布上任何节点的常用区域（画布可视区底部保留 64px 以上安全边）。
2. 收起 → 展开的形变可被打断：连续点击不同功能按钮时胶囊跟随最新目标，不出现「动画排队 / 跳变」。
3. 展开态可键盘完全操作：`⌘K` 进入搜索 → `Tab` 在输入框/结果/分段按钮间正常遍历 → `Esc` 逐层退回直到收起。
4. 模拟运行中展开岛，`requestAnimationFrame` 的帧时长不出现持续劣化（§11 有观测方法）。

---

## 2. 形态与状态机

### 2.1 形态常量

建议值（**待浏览器调参**，落地时集中放 `island-config.ts`）：

| 形态                  | 宽                                             | 高                                    | 圆角                          | 说明                                     |
| --------------------- | ---------------------------------------------- | ------------------------------------- | ----------------------------- | ---------------------------------------- |
| `idle`（收起）        | `fit-content`（≈ 132–176px）                   | 40px                                  | 9999px（全圆 pill）           | 3 个导航图标 + 1px 分隔线                |
| `preview`（节点预览） | 360px                                          | `min(340px, 44vh)`，按内容自适应      | 28px                          | 内容复用 `preview-block` 的 body（§8）   |
| `search`              | 560px（`max(100vw - 32px)` 收缩）              | `min(440px, 52vh)`                    | 28px                          | 输入行 + 结果列表（可滚动）              |
| `agent`               | 与 `search` 相同                               | 与 `search` 相同                      | 28px                          | 今日只有占位文案                         |
| 定位                  | 水平居中                                       | 距底 `16px + env(safe-area-inset-bottom)` | ——                            | 固定定位、单实例                         |

> **尺寸来源**：搜索宽度向 quick-panel 的 `sm:max-w-2xl`(672px) 收敛（岛是常驻条，太宽会显得像模态框），高度复用其 `max-h` 直觉；节点预览宽度向既有 `PREVIEW_WIDTH=320` + 40px 内边距收敛，从而**预览内容本身不需要重新排版**。

### 2.2 状态表

| 状态           | 进入                                                                     | 退出                                                                                | 内容                                                                 | 抢占规则                                                     |
| -------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| `idle`         | 初始、`Esc` 逐层退回、点击外部                                           | 任一功能入口                                                                        | 导航图标（当前页高亮）+ 搜索图标                                     | ——                                                           |
| `preview`      | ① 桌面：节点 hover（`previewBlock.visible`）② 触摸：点击节点             | 指针离开节点且 200ms 无新 hover；点击画布空白；`Esc`；节点被删除                     | 节点预览 body + 「打开节点 / 打开记录」动作                          | **不抢占** `search` / `agent`：搜索打开时忽略预览意图        |
| `search`       | `⌘K`、侧边栏 Search、顶栏搜索按钮、岛内搜索图标                          | `Esc`、`⌘K` 再按、点击岛外                                                          | `SearchSurface`（tabs + 输入 + 结果 + 过滤器）                       | 最高（用户显式意图）                                         |
| `agent`        | 分段按钮、`⌘⇧K`                                                          | 同 `search`                                                                         | agent 占位                                                          | 次高                                                         |
| `nav-hover`    | 桌面指针进入 `idle` 胶囊（可选）                                          | 指针离开                                                                            | 图标旁浮出标签（tooltip 或横向展开）                                 | 最低；展开态不触发                                           |

**优先级**：`search` > `agent` > `preview` > `idle`。`preview` 是「被动状态」，任何显式状态（search/agent）都能覆盖它；覆盖结束后**不自动回到 preview**（避免刚关掉搜索又被悬停重新撑开），而是回到 `idle`，等下一次 hover 再进。

### 2.3 尺寸与内容的解耦

容易做错的一点：**内容切换和尺寸形变要分开控制**。

- 尺寸/圆角/位置由外层 `motion.div`（`layout`）负责，它只关心「目标形态」；
- 内容是 `AnimatePresence` 的 `mode="popLayout"` 子节点，靠 `opacity` + 40ms 交错淡出/淡入，**不做内容自身的位移**（否则会和外层 `layout` 的缩放叠加出抖动）；
- 内容里任何**宽高比会变**的东西（封面图、视频缩略图）用 `layout="position"` 或干脆不参与 `layout`（motion 官方的建议），让它自己跳变而不要被反向缩放。

### 2.4 键盘与手势

| 输入                              | 行为                                                                       |
| --------------------------------- | -------------------------------------------------------------------------- |
| `⌘/Ctrl+K`                        | `idle`/`preview` → `search` 并聚焦输入框；`search` → `idle`                 |
| `⌘/Ctrl+Shift+K`                  | `idle`/`preview` → `agent`；`agent` → `idle`                               |
| `Esc`                             | 逐层退回：面板内有「取消」语义时先执行它（如搜索的过滤器弹层），再退到 `idle` |
| `Tab` / `Shift+Tab`               | 浏览器默认焦点遍历（**不劫持**）                                           |
| `↑`/`↓`、`Enter`、`⌘+Enter`       | 结果列表内的既有语义（沿用 `SearchMode` 今天的实现）                       |
| 点击岛外                          | 展开态 → `idle`（`preview` 且 `isFocus` 时同样收起）                       |
| 指针进入胶囊（桌面、`(hover: hover)`） | 可选：`nav-hover` 浮出标签                                              |

触摸端补充：胶囊本体在 `(pointer: coarse)` 下用大触控面积（图标 44×44 命中区）；节点预览不再依赖 hover，改为画布 `node:click` → `preview`，再点同一节点或空白处退回。

---

## 3. 视觉与动效规范

### 3.1 液态感的四层

参考社区对 iOS「Liquid Glass / Dynamic Island」的拆解（[empire-ui 的层叠写法](https://empire-ui.com/blog/liquid-glass-css)、[therobbiedavis 的 CSS 复刻](https://therobbiedavis.com/how-to-recreate-the-ios-26-glassy-effect-with-css/)），一层做不到「液态」，靠四层叠加：

1. **底色**：`bg-popover/85`（浅色）/ `bg-popover/80`（暗色），tokening 自 `--popover`，与 NodeEditor 等既有一致（避免在浅色主题里出现一块突兀的纯黑）。
2. **背景折射**：`backdrop-filter: blur(20px) saturate(180%)`，**仅在允许时开启**（§0.3-2 的降级规则）；`blur < 12px` 会读成「脏」而不是「玻璃」。
3. **高光**：`::before` 的 `radial-gradient(circle at var(--light-x,30%) var(--light-y,20%), rgb(255 255 255/.35), transparent 60%)`，桌面端由 `pointermove` 写 `--light-x/--light-y`；`pointer-events: none`。
4. **边缘**：`inset 0 1px 0 rgb(255 255 255/.28)`（上缘一条 1px 高光）+ 外阴影 `0 8px 24px rgb(0 0 0/.18)`；可选 1px 冷/暖色差（`box-shadow: -1px 0 0 rgb(255 100 100/.10), 1px 0 0 rgb(100 150 255/.10)`）——这是「真玻璃」与「磨砂卡片」的差别所在，但**弱到几乎看不见**才有质感。

> 明确不做：`feTurbulence` + `feDisplacementMap` 的实时扰动。它会给整个元素（含文字）加一圈相位噪声，且在本项目里等于对一个每帧重绘的 canvas 再加一次全屏滤镜；视觉收益不抵成本。

### 3.2 形状：pill ⇄ squircle 的形变

- **目标形状**：收起态是全圆 pill；展开态是「连续圆角矩形」（苹果式 squircle 观感）。
- **实现分层**（按能力递进）：
  1. 基线：`border-radius: 9999px → 28px`，由 motion 的 `layout` 自动补间（注意 §0.3-3：半径必须写在 `style` 里才享受自动补偿）。
  2. 增强：`@supports (corner-shape: squircle) { .island { corner-shape: squircle } }`（Chromium 139+ / [MDN 标注 Limited availability](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/corner-shape)，故只做增强）。
  3. 不用 SVG clip-path / `@squircle-js/react` 兜底：岛的尺寸是内容驱动的，clip-path 需要可枚举的宽高比。

### 3.3 弹簧参数（起点值，落地时在浏览器里调）

参照社区对 Dynamic Island 的复刻（[amelie-schlueter 的实现](https://www.amelieschlueter.com/interactions/dynamic-island)：`motion.div` + `layout` + `transformOrigin: { originX: .5, originY: 0 }` + `spring { stiffness: 110, damping: 12, duration: .3 }`）：

| 预设            | 用途                                       | 建议值                                                  |
| --------------- | ------------------------------------------ | ------------------------------------------------------- |
| `LIQUID_SPRING` | `idle ⇄ 展开` 的尺寸/圆角形变（要有弹性）  | `{ type: "spring", stiffness: 110, damping: 12, mass: 1 }` |
| `SNAP_SPRING`   | 展开态内部（内容高度变化、面板切换）       | `{ type: "spring", stiffness: 320, damping: 30, mass: 0.9 }` |
| `FADE`          | 内容淡入淡出                               | `{ duration: 0.14, ease: [0.32, 0.72, 0, 1] }`          |

- **形变原点**：岛在**底部中央**，故 `transformOrigin: { originX: 0.5, originY: 1 }`（社区样例是顶部岛，用 `originY: 0`；照抄会让岛「从上方长出来」，与底部锚点不符——这是最容易照抄错的一处）。
- **呼吸/高光动画**：`2.4s` 的极缓 `--light-*` 漂移即可；超过 4s 的「液体形变」循环在常驻组件上会变成干扰（用户会盯着它看）。
- 全部动效只碰 `transform` / `opacity` / `width` / `height`（由 motion 的 `layout` 转成 transform）与 `--light-*`；**不碰** `backdrop-filter` 半径、`box-shadow` 模糊半径。

### 3.4 降级矩阵

| 条件                                         | 行为                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `prefers-reduced-motion: reduce`             | 尺寸直接切换 + 120ms 淡入；关闭高光跟随与漂移；其余功能不变（**不是**禁用岛）          |
| `backdrop-filter` 不支持                     | 底色改为不透明 `bg-popover`，其余不变（`@supports not (backdrop-filter: blur(1px))`）  |
| force 模拟运行中 / 岛上 300ms 内无重绘       | 关闭 `backdrop-filter`，用 `bg-popover/90`；`simulation:stopped` 后恢复                |
| `(hover: none)`                               | 关闭悬停预览与 `nav-hover`；节点预览改点击触发                                        |
| `(max-width: 640px)`                          | 展开宽度收到 `calc(100vw - 32px)`；导航只留图标                                        |

---

## 4. 技术选型

### 4.1 候选对比

| 方案                        | 可中断          | 动画期间交互          | 形状/内容形变能力                    | 代价                                        | 结论 |
| --------------------------- | --------------- | --------------------- | ------------------------------------ | ------------------------------------------- | ---- |
| CSS `transition`（宽高/圆角） | 是（但无弹簧） | 不阻断                | 需给每态写死宽高；`height: auto` 要 `interpolate-size`（非 Baseline） | 0 依赖；`width/height` 过渡会触发布局       | 备选（极简兜底） |
| **`motion` 的 `layout`**    | **是**          | **不阻断指针事件**    | 内容/子元素自动测量并补间；有弹簧    | +1 依赖（~32KB gz，可 tree-shake）          | **选用** |
| View Transitions API        | **否**          | **快照期间阻塞交互**  | 跨 DOM 共享元素 morph 很强           | 0 依赖，但 React 集成依赖 transition types（Chromium 125+），Safari 表现有差异 | 排除 |
| 自写 WAAPI + ResizeObserver | 是              | 不阻断                | 需要自己实现 FLIP + 弹簧             | 0 依赖，但等于重写 motion 的核心            | 排除 |
| `react-spring`              | 是              | 不阻断                | 有弹簧，无自动布局测量（要手写 FLIP）| 体积更小                                    | 排除（缺少 layout 测量） |

### 4.2 为什么是 `motion`

- **可中断 + 不阻断交互**是硬需求：岛会在「悬停节点 → 立刻按 ⌘K → 立刻点导航」这种连续意图下被反复改目标，动画必须能被打断并接管速度。motion 官方对两者的对比写得很直白：Motion 用 transform 动画真实元素，*interruptible, doesn't block pointer events*；View Transitions 截屏交叉淡入，*can't be interrupted, blocks interaction, less performant when animating many elements*。
- **`layout` / `layoutId` 免测量**：岛的内容高度是内容驱动的（预览 body 的图片比例、搜索结果条数都不同），手写 FLIP 需要自己 `ResizeObserver` + 记录旧矩形，motion 内建。
- **生态与维护**：`motion` v12 即 Framer Motion 的独立包（`motion/react` 导入路径），社区里 Dynamic Island 类复刻几乎都基于它，参数与坑有公开参照。
- 包体：官方给了 [减小体积](https://motion.dev/docs/react-reduce-bundle-size) 的做法；首版直接用 `motion/react`，若 bundle 告警再上 `LazyMotion` + `domAnimation`。

### 4.3 为什么不用 View Transitions

- 同文档 View Transitions 在 2026 已是跨浏览器特性（Chrome 111+ / Firefox 133+ / Safari 18+），Next.js App Router 也能「零配置」用 React 的 `<ViewTransition name>`（[Next.js 官方指南](https://nextjs.org/docs/app/guides/view-transitions)，需要 React canary 的 `ViewTransition`，且只在 `startTransition` / 路由导航 / Suspense 触发，普通 `setState` **不**触发）。
- 但它是**快照式**的：过渡期间浏览器接管渲染、交互被阻塞，并且一次过渡不可中途改向。岛的形态变化恰恰是「指针/按键驱动的连续意图」，用它会出现「刚点 A 又点 B，A 的过渡必须播完」的观感缺陷。
- 另一个现实约束：要在岛内部用 `<ViewTransition>` 就得把状态变更包进 `startTransition`，而 `previewBlock` 是由 `packages/graph` 的 eventHandler 直接写 zustand 的（同步、非 React transition），打通成本高。

> 交叉观察：页面级路由切换（`/graph ↔ /dashboard`）倒是 View Transitions 的舒适区；但 P0 不做路由过渡（岛自身常驻，不需要过渡来掩盖重挂载）。

### 4.4 `layout` 的正确写法（照抄这三条）

```tsx
// 1) 需要形变的外层：layout + fixed 容器上的 layoutRoot
<div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center">
  <motion.div
    layout
    layoutRoot
    style={{ borderRadius: radius }}   // 2) 半径走 style，motion 才会做 scale 补偿
    transition={{ layout: LIQUID_SPRING }}
    className="pointer-events-auto relative overflow-hidden"
  >
    {/* 3) 参与形变的子层也带 layout；边框用父层 padding 伪造，别用 border */}
    <motion.div layout className="p-px">
      <div className="rounded-[inherit] bg-popover/85">{children}</div>
    </motion.div>
  </motion.div>
</div>
```

- 会改变宽高比的媒体内容：`layout="position"`（只补位置、尺寸跳变）或干脆不标 `layout`。
- 展开态高度上限用 `max-height` + 内部 `overflow-y: auto`，避免「内容撑破岛」。

### 4.5 纯 CSS 的渐进增强（可选，不影响主路径）

| 特性                                            | 支持情况（2026 年中，MDN/caniuse 口径）                | 用法                                              |
| ----------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `corner-shape: squircle`                        | Chromium 139+；Safari / Firefox 未支持（非 Baseline）   | 苹果式连续圆角，`@supports` 内增强                |
| `interpolate-size: allow-keywords`              | 非 Baseline（Chromium 优先）                            | 无 JS 时也能 `width: 0 → auto`；本设计不依赖       |
| `linear()` 弹簧缓动                             | Chrome 113+ / Safari 17.2+ / Firefox 112+               | 给纯 CSS 的微交互（高光漂移）当弹簧曲线           |
| `@property` 注册自定义属性                      | Baseline                                                | 让 `--light-x/--light-y`、渐变角度可被 CSS 动画插值 |

### 4.6 依赖与配置

- `packages/ui/package.json` 的 `dependencies` 加 `"motion": "^12"`；导入用 `import { motion, AnimatePresence, LayoutGroup } from "motion/react"`。
- **无需**改 `transpilePackages`（`@workspace/ui` 已在列）与 Tailwind `@source`（`../**/*.{ts,tsx}` 已覆盖）。
- `reactStrictMode: false` 已是现状，motion 在 StrictMode 下的历史问题（issue #2668，2024）不复现；但**升级/安装后仍需按 §11 的清单复验**。
- `motion` 是 `packages/ui` 的第一个动画依赖，属公共包体积；若后续有第二个消费方（如 dataview 的动画），保持同一版本。

---

## 5. 组件结构与接口

### 5.1 目录

```text
packages/ui/src/components/dynamic-island/
├── dynamic-island.tsx        # 唯一对外入口：<DynamicIsland />（形态壳 + 状态机 + motion）
├── island-config.ts          # 形态常量（尺寸/半径/弹簧/时长）、状态优先级、降级判定
├── island-nav.tsx            # 收起态：导航图标行（含当前页高亮、禁用态 tooltip）
├── island-surface.tsx        # 四层视觉（底色/模糊/高光/边缘）+ 指针高光跟随
├── panels/
│   ├── nav-panel.tsx         # 展开态的导航（可选：宽屏时显示标签）
│   ├── node-preview-panel.tsx# 节点预览：包住 <NodePreviewBody />（§8 从 preview-block 抽出）
│   ├── search-panel.tsx      # 搜索：包住 <SearchSurface />（§8 从 search-mode 抽出）
│   └── agent-panel.tsx       # agent 占位
└── index.ts

apps/web/components/
├── dynamic-island-host.tsx   # 宿主适配：pathname/router/store/导航表 → <DynamicIsland /> 的 props
└── island-routes.ts          # 路由表单一真源（enabled 标记 /dashboard 未实现）
```

### 5.2 组件契约

```tsx
// packages/ui/src/components/dynamic-island/dynamic-island.tsx
"use client";

export type IslandPanel = "idle" | "preview" | "search" | "agent";

export interface IslandNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  /** 未实现的路由渲染为禁用态（/dashboard、/settings 今天只有 middleware 保护） */
  enabled: boolean;
  onSelect: () => void;
  disabledReason?: string;
}

export interface DynamicIslandProps {
  /** 受控：宿主持有状态（store），组件不做业务判断 */
  panel: IslandPanel;
  onPanelChange: (panel: IslandPanel) => void;

  nav: IslandNavItem[];

  /** 节点预览面板（宿主决定渲染什么，组件只提供容器与动效） */
  previewContent?: React.ReactNode;
  /** 搜索面板 */
  searchContent?: React.ReactNode;
  /** agent 面板 */
  agentContent?: React.ReactNode;

  /** 展开态底部/右侧的自定义动作（如预览面板的「打开节点」） */
  actions?: React.ReactNode;

  className?: string;
}

export function DynamicIsland(props: DynamicIslandProps): React.ReactNode;
```

三条边界（写进 JSDoc，与 graph 包的 JSDoc 契约风格一致）：

1. **组件不读 store、不读路由**：`panel` 受控，导航是 props；
2. **组件不做业务**：预览 / 搜索 / agent 的内容都是 `ReactNode`，由宿主注入（搜索面板的输入焦点由面板自己管，宿主只提供 `searchContent`）；
3. **组件不注册全局键盘**：快捷键在宿主适配层注册（它知道当前面板与 `currentEditingNodeId` 等上下文），组件只暴露 `onPanelChange`。

### 5.3 宿主适配（`apps/web/components/dynamic-island-host.tsx`）

职责：

1. `usePathname()` → 计算 `nav[].active`；`useRouter().push()` → `onSelect`；未实现路由 `enabled: false`。
2. 订阅 `useUIStore` 的 `island.panel`（§6.1）与 `previewBlock`，把 store 状态映射成受控 `panel`。
3. 注册 `⌘K` / `⌘⇧K` / `Esc`（只在这里，别在组件里）。
4. 注入内容：`previewContent={<NodePreviewBody nodeId={…} />}`、`searchContent={<SearchSurface />}`、`agentContent={<AgentPanel />}`。
5. 把岛的高度写进 `document.documentElement.style.setProperty("--dynamic-island-height", …)`，供需要避让的宿主（dashboard 网格、未来的编辑器）读取。

---

## 6. 状态与数据流

### 6.1 `uiStore` 的 island 切片

新增切片（保留 `previewBlock` 作为「悬停意图」源，见 §6.2）：

```ts
// packages/store/src/uiStore.ts
export type IslandPanel = "idle" | "preview" | "search" | "agent";

// in UIStore interface
/** 灵动岛当前面板（受控状态；idle 即收起） */
islandPanel: IslandPanel;
/** 打开某个面板（等价于「展开岛」），idle 即收起 */
setIslandPanel: (panel: IslandPanel) => void;
/** 收起岛（保留面板记录，供 ⌘K 复用） */
collapseIsland: () => void;
/** ⌘K：未展开则以 lastIslandPanel 打开，已展开则收起 */
toggleIslandFromKeyboard: () => void;
```

实现上复用 `quickPanel` 切片「关闭时保留 mode」的既有语义（`quickPanel.mode` 在关闭后仍保留，`⌘K` 复用它）——即 `lastIslandPanel`：

```ts
islandPanel: "idle",
lastIslandPanel: "search",
setIslandPanel: (panel) =>
  set({ islandPanel: panel, ...(panel === "idle" ? {} : { lastIslandPanel: panel }) }),
collapseIsland: () => set({ islandPanel: "idle" }),
toggleIslandFromKeyboard: () =>
  set((s) =>
    s.islandPanel === "idle"
      ? { islandPanel: s.lastIslandPanel }
      : { islandPanel: "idle" },
  ),
```

### 6.2 与 `previewBlock` 的关系

`previewBlock` 保持**原样作为「悬停意图」的写入通道**：`packages/graph/src/eventHandler.ts` 是唯一知道「鼠标悬停在哪个节点」的地方，它继续写 `{ nodeId, visible, isFocus }`。变化只有两处：

1. `ForceGraph.tsx` **不再渲染** `<PreviewBlock>` 浮层（连带删掉 `calculatePosition` + `window mousemove` 跟随 + `[data-preview-block]` 的外部点击判定，见 `preview-block.tsx:36-72`、`ForceGraph.tsx:814-829`）；
2. `island` 侧订阅 `previewBlock`：
   - 桌面 `(hover: hover)` 且 `islandPanel === "idle"` 且 `previewBlock.visible` → `setIslandPanel("preview")`；
   - `previewBlock.isFocus`（点击节点后的「钉住」语义）→ 预览保持展开，直到 `closePreviewBlock`。

这正好落实提案里的一句话：**「解决其遮挡节点图的问题」**——浮层跟随指针必然遮挡，固定在屏幕底部则不会。

> 语义命名注意：`previewBlock` 这个名字在迁移后指的是「悬停意图」而不是「浮层」。首版不改名以免牵连 graph 包（`eventHandler.ts` 有 4 处 `s.previewBlock` 判定：`182/193/257/323`，判定的是「不要用 hover 覆盖已钉住的预览」；`ForceGraph.tsx` 另有 6 处，其中 `887-892` 的渲染点会随浮层一起删掉）；在 §8 的重构清单里记为「P3 后可选重命名 `hoverPreview`」。

### 6.3 与 `quickPanel` 的关系

| 阶段 | `quickPanel` 切片                            | `<QuickPanel />` 组件          | 入口                                            |
| ---- | -------------------------------------------- | ------------------------------ | ----------------------------------------------- |
| P0–P1 | 保留（岛不碰它）                            | 保留（照旧可用）               | 照旧                                            |
| P2   | 岛接管；`⌘K` 从 quick-panel 监听迁到岛宿主    | 保留但**不再挂载**             | 3 处入口改为 `setIslandPanel("search")`         |
| P3   | **删除** `quickPanel` 切片与 `commandDialogOpen` 死切片 | 删除目录 `dialog/quick-panel/` | ——                                              |

迁移期风险：`quick-panel.tsx` 的 `window keydown`（⌘K + Tab）与岛宿主的键盘监听会同时存在，**必须在 P2 同一次提交里删掉前者**，否则 `⌘K` 触发两次（一次开岛、一次开 dialog），且 `Tab` 被抢。

### 6.4 快捷键对照表

| 快捷键        | 今天                       | 迁移后                                |
| ------------- | -------------------------- | ------------------------------------- |
| `⌘/Ctrl+K`    | 开/关 QuickPanel（search） | 开/关岛 search                        |
| `Tab`         | 面板打开时切 search/agent  | **交还浏览器**（焦点遍历）            |
| `⌘/Ctrl+⇧K`   | ——                         | 开/关岛 agent                         |
| `Esc`         | 关闭 QuickPanel            | 逐层退回（面板内弹层 → idle）         |

---

## 7. 面板详设

### 7.1 导航（P0 交付）

- 收起态：3 个图标（`/graph` 用 `Waypoints`/`Network`、`/dashboard` 用 `LayoutDashboard`、搜索用 `Search`），当前页 `text-foreground` + `bg-accent` 药丸背景，其余 `text-muted-foreground`。
- 禁用项：`/dashboard` 今天没有页面 → `enabled: false`，渲染 `opacity-40` + `aria-disabled` + tooltip「页面尚未实现」。**不做**「点了跳 404」这种事。
- 展开态（可选，宽屏）：`idle` 悬停横向展开标签；触摸端不做。
- 无障碍：外层 `<nav aria-label="主导航">`；`aria-current="page"` 标当前页。

### 7.2 节点预览（P1 交付）

- 内容 = 从 `preview-block.tsx` 抽出的 `<NodePreviewBody node={node} />`：`PreviewHeader`（标题 / 语义 / 摘要）+ `previews/*` 按 `nodeType` 分发（text / image / video / pdf / audio / webpage / website / collection / rich-text / database 共 10 种，逻辑原样搬移）。
- **不搬**：`calculatePosition`、`PREVIEW_MARGIN` 跟随、`PREVIEW_MAX_HEIGHT` 钳制（固定面板里没有这些语义）；`PREVIEW_WIDTH=320` 变成 Panel 的内容宽度。
- 动作行：`打开节点`（`useUIStore.getState().handleNodeEdit(nodeId)`，与 collection 卡片一致）、`打开记录`（database/collection 记录走 `record-actions` 的语义，见 dataview §3.5）。
- 高度：内容自适应，`max-height: min(340px, 44vh)`，溢出滚动；图片/视频缩略图不参与 `layout`（§2.3）。
- 触发（桌面）：hover 进入 `250ms` 后才展开（避免扫过画布时狂闪）；离开 `200ms` 后收起（防抖）。
- 触发（触摸）：点击节点 → 展开；点击空白 → 收起（复用 `node:click` / `canvas:click` 事件，落 `previewBlock.isFocus`）。

### 7.3 搜索（P2 交付）

- 内容 = 从 `search-mode.tsx` 抽出的 `<SearchSurface />`：tabs（`QUICK_TABS`）、`/` 命令前缀（`stripSlashPrefix`）、过滤器（`FilterQueryBuilder`）、结果列表与激活路径**全部原样复用**，只是容器从 Dialog 变成岛的展开面板。
- 布局差异（需在抽取时处理）：`SearchMode` 今天靠 Dialog 的 `flex-col` 撑满高度（`py-12` 的空态、`flex-1` 的列表），抽取后要显式给出 `h-[min(440px,52vh)]` 与 `overflow-y-auto`，否则会塌成 0 高（这是本阶段最容易踩的回归点）。
- 输入焦点：`setIslandPanel("search")` 之后 `requestAnimationFrame` 聚焦输入框（Dialog 今天由 Radix 代管，岛要自己做）。
- 关闭：`Esc`（若过滤器弹层打开，先关它）、`⌘K`、点击岛外。
- 回归面：命令（`COMMANDS`）、节点语义/边语义列表、过滤器 builder 的键盘可达性。

### 7.4 agent（P3 交付）

- 今日 `AgentMode` 只有一句占位文案；岛内提供同一语义的占位，并把「对话区 / 输入区」的容器高度先留好（避免以后加内容时岛的高度形态再变一次）。
- 与搜索共用分段按钮（`search` / `agent` 两个 tab），键盘 `⌘K` / `⌘⇧K` 直达。

---

## 8. 与既有组件的重构清单

| 文件                                                                       | 动作                                                                                                 | 阶段 |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---- |
| `packages/ui/src/components/preview-block/preview-block.tsx`               | 抽出 `NodePreviewBody`（header + previews 分发）并导出；保留旧组件至 P3 后删除                         | P1   |
| `packages/graph/src/force/ForceGraph.tsx`                                  | 删除 `<PreviewBlock>` 浮层渲染 + `isFocus` 的外部点击 effect（`814-829`）                             | P1   |
| `packages/ui/src/components/dialog/quick-panel/search-mode.tsx`            | 抽出 `SearchSurface`（去掉 Dialog 耦合与 `flex-1` 假设），旧文件薄壳化                                 | P2   |
| `packages/ui/src/components/dialog/quick-panel/quick-panel.tsx`            | P2 起不再挂载；**同时删掉 ⌘K + Tab 的全局监听**；P3 删除文件                                          | P2/P3 |
| `packages/ui/src/components/header/toggle-search-command-button.tsx`       | `openQuickPanel("search")` → `setIslandPanel("search")`                                               | P2   |
| `packages/ui/src/components/sidebar/main-sidebar.tsx` `SearchButton`（:415） | 同上；`⌘K` 提示保留                                                                                  | P2   |
| `apps/web/app/(main)/graph/page.tsx`                                        | 移除 `<QuickPanel />`；页面本身不再需要知道岛的存在                                                   | P2   |
| `packages/store/src/uiStore.ts`                                             | 加 `islandPanel` 切片；删死代码 `commandDialogOpen*`；P3 删 `quickPanel` 切片                          | P0/P3 |
| `apps/web/app/(main)/layout.tsx`                                            | 挂 `<DynamicIslandHost />`（auth gate 之后）                                                          | P0   |
| `packages/ui/src/components/index.ts`                                       | 导出 `<DynamicIsland />` 与其类型                                                                     | P0   |

---

## 9. 分阶段路线图

| 阶段   | 交付                                                                                                                       | 验收                                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **P0** | `packages/ui/.../dynamic-island/`（壳 + 四层视觉 + 弹簧形变）、`islandPanel` 切片、`dynamic-island-host.tsx`、`(main)/layout.tsx` 挂载、导航项（`/graph` 可用、`/dashboard` 禁用）、`motion` 依赖 | 胶囊常驻底部中央；点击导航切页且 capsule 不重挂；收起 ⇄ 展开形变可打断；`prefers-reduced-motion` 下降级正确；`pnpm --filter=@workspace/ui typecheck/lint` 通过 |
| **P1** | 抽出 `NodePreviewBody`；岛 `preview` 面板；`ForceGraph` 去掉浮层；触摸端点击触发                                            | 悬停/点击节点 → 底部预览；不再遮挡节点图；`isFocus` 语义（点节点钉住、点空白收起）与今天一致               |
| **P2** | 抽出 `SearchSurface`；岛 `search` 面板；3 处入口改向；删 quick-panel 的键盘监听；`⌘K` 迁移                                 | `⌘K` 开岛搜索、输入/结果/过滤器全可用；`Tab` 能正常遍历；`⌘K` 再按收起；无双重触发                         |
| **P3** | 岛 `agent` 面板；删 `quick-panel/`、`quickPanel` 切片、死切片；可选重命名 `previewBlock → hoverPreview`                      | 全仓无 quick-panel 引用；`pnpm lint` / `pnpm check-types` 干净                                            |

---

## 10. 边界与取舍

**不做**（本设计明确排除）：

1. **拖拽胶囊 / 自定义位置**：固定底部中央是「常驻条」的心智模型；可拖动会引入与侧边栏热区、画布手势的冲突。
2. **迷你播放器 / Live Activity 语义**：岛上不承载「正在播放的音频」这类后台活动的实时刷新（那需要另一套事件源，且与节点预览抢位置）。
3. **多实例 / 每个视图一个岛**：单实例是跨页常驻与形变连续性的前提。
4. **实时 SVG 扰动（`feTurbulence`+`feDisplacementMap`）**：性能与可读性都不划算（§3.1）。
5. **View Transitions 做路由切换动画**：P0 不做，避免在岛之外再引入一套时序。
6. **`/dashboard` 页面的实现**：本文件只负责导航项与禁用态；dashboard 自己的设计在 `docs/proposal/dashboard.md`。

**已知取舍**：

- 展开宽度 560px < quick-panel 的 672px：结果列表每行更早截断；换来的是「不像模态框」。
- `backdrop-filter` 的动态降级意味着「玻璃感」在模拟运行时缺席：优先流畅度。
- 岛占用了底部 40–56px 的视觉空间：画布底部节点可能被压住，靠「半透明 + 不拦截指针（`pointer-events-none` 外层）」缓解，但**不做**画布自适应内缩（会让 `ForceGraph` 的尺寸/命中测试再增加一个输入）。

---

## 11. 验证方法

项目**没有测试基础设施**（无 vitest/jest），验证 = 类型 + lint + 浏览器手测（本环境可用 `agent-browser` 技能驱动）。

```bash
pnpm --filter=@workspace/ui typecheck     # 组件与类型
pnpm --filter=@workspace/ui lint
pnpm --filter=@workspace/store typecheck
pnpm --filter=web dev                     # http://localhost:3000
```

手测清单（P0 起逐阶段累加）：

1. **形变可打断**：在收起态快速连点「搜索 → 导航 → 收起」，胶囊跟随最新目标、无跳变、无动画排队。
2. **原点正确**：形变从**底部**展开（`originY: 1`），不是从上方长出来。
3. **不遮挡**：悬停画布底部的节点，预览不覆盖该节点及其邻居。
4. **层级/指针**：胶囊两侧的底部空白仍可拖动画布；Radix 弹层（NodeEditor、右键菜单）打开时在岛之上。
5. **键盘**：`⌘K` → 聚焦输入；`Tab` 遍历不再被劫持；`Esc` 逐层退回；`⌘⇧K` 切 agent。
6. **降级**：系统开启「减少动态效果」后无弹簧形变；`(hover: none)` 模拟（DevTools 触摸仿真）下预览改为点击触发。
7. **性能**：模拟运行中展开岛，DevTools Performance 录制 5s——关注 `Composite Layers` / GPU 时间是否随 `backdrop-filter` 开启而抬升；确认模拟停止后 blur 才恢复。
8. **回归面**：quick-panel 的搜索在 P2 前仍可用；P2 后 `⌘K` 只触发岛；`/graph` 的节点编辑、右键菜单、侧边栏热区不受影响。
9. **依赖**：`motion` 安装后 `pnpm --filter=web build` 通过（确认 React 19 peer 与 Next 16 打包无碍）。

---

## 12. 文件与依赖清单

**新增**

| 路径                                                          | 说明                                       |
| ------------------------------------------------------------- | ------------------------------------------ |
| `packages/ui/src/components/dynamic-island/*`                 | 岛本体（§5.1 目录）                        |
| `apps/web/components/dynamic-island-host.tsx`                 | 宿主适配（路由 / store / 键盘 / 内容注入） |
| `apps/web/components/island-routes.ts`                        | 路由表单一真源（含 `enabled`）             |
| `packages/ui/src/components/preview-block/node-preview-body.tsx` | 从 `preview-block.tsx` 抽出的内容体       |
| `packages/ui/src/components/dynamic-island/panels/search-panel.tsx` | 内含/包住从 `search-mode.tsx` 抽出的 `SearchSurface` |

**修改**

| 路径                                                                    | 改动                                              | 阶段 |
| ----------------------------------------------------------------------- | ------------------------------------------------- | ---- |
| `packages/ui/package.json`                                              | `+ motion ^12`                                    | P0   |
| `packages/store/src/uiStore.ts`                                         | `+ islandPanel` 切片；删 `commandDialogOpen*`     | P0   |
| `apps/web/app/(main)/layout.tsx`                                        | `+ <DynamicIslandHost />`                         | P0   |
| `packages/ui/src/components/index.ts`                                   | `+ DynamicIsland` 导出                            | P0   |
| `packages/graph/src/force/ForceGraph.tsx`                               | `- <PreviewBlock>` 浮层与外部点击 effect          | P1   |
| `packages/ui/src/components/header/toggle-search-command-button.tsx`    | 入口改向                                          | P2   |
| `packages/ui/src/components/sidebar/main-sidebar.tsx`                   | `SearchButton` 入口改向                            | P2   |
| `apps/web/app/(main)/graph/page.tsx`                                    | `- <QuickPanel />`                                | P2   |
| `packages/ui/src/components/dialog/quick-panel/**`                      | P2 停用 → P3 删除                                 | P2/P3 |

---

## 参考

- 苹果 HIG · Live Activities（Dynamic Island 的尺寸与放置规范）：<https://developer.apple.com/design/human-interface-guidelines/live-activities>
- Motion · Layout animations（`layout`/`layoutId`/`layoutRoot`、scale 补偿、`border` 拉伸、与 View Transitions 的对比）：<https://motion.dev/docs/react-layout-animations>
- Next.js · Designing view transitions（React `<ViewTransition>` 与 App Router 的集成边界）：<https://nextjs.org/docs/app/guides/view-transitions>
- Dynamic Island 的 Web 复刻与参数（React + Framer Motion）：<https://www.amelieschlueter.com/interactions/dynamic-island>
- Liquid Glass 的 CSS 层叠写法（`backdrop-filter` / 高光 / 形状呼吸 / 性能与无障碍建议）：<https://empire-ui.com/blog/liquid-glass-css>
- MDN · `corner-shape`（Limited availability）：<https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/corner-shape>
- MDN · `interpolate-size`（Limited availability）：<https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/interpolate-size>
- CSS `linear()` 弹簧缓动：<https://developer.chrome.com/docs/css-ui/css-linear-easing-function>
