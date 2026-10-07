# 执行总纲：五份设计文档的落地计划

> 状态：**进行中**（G0 / G0.1 / G1 / G2 / G3 / G4 已过闸；M5 已实现、**待测** —— 见 [gates.md](./gates.md)）
> 范围：`docs/proposal/` 的六份提案 → `docs/{dynamic-island,node-content,dashboard}/` 的五份设计文档，共 13 个里程碑
> 依赖：五份设计文档（执行期间视为**冻结契约**）；本机既有 `pb/pb_data`（**不得删库**）
> 相关文档：[gates.md](./gates.md)（闸门台账）、[baseline.md](./baseline.md)（回归基线）、[spine.md](./spine.md)、[node-content-ui.md](./node-content-ui.md)、[annotation.md](./annotation.md)、[media.md](./media.md)、[dynamic-island.md](./dynamic-island.md)、[dashboard.md](./dashboard.md)

---

## 0. 怎么读这份计划

| 我想知道                              | 去哪                                                      |
| ------------------------------------- | --------------------------------------------------------- |
| 谁做什么、做到哪一步停下来            | 本文 §1 里程碑总表                                        |
| 主 agent 和子 agent 怎么分工           | §2（判定规则 + 独占清单 + 任务包模板 + 交付验收口径）      |
| 哪些文件不能被两个任务同时改          | §3 文件所有权与并行窗口                                   |
| 迁移文件叫什么、能不能删库            | §4 迁移编号账本                                           |
| 新依赖什么时候装、版本谁核实          | §5 依赖安装账本                                           |
| 用户怎么验收、验不过怎么办            | §6 闸门规程 + [gates.md](./gates.md)                      |
| 现在做到哪了                          | [gates.md](./gates.md)                                    |
| 设计文档被改动过哪里                  | §9 偏差登记                                               |
| 验证命令为什么和设计文档写的不一样    | §8 回归基线（**五个设计文档里的验证命令今天跑不了**）      |

总纲三句：

1. 设计文档管「做成什么样」，本目录管「谁按什么顺序做、在哪停下来验、验不过怎么退」。
2. **每个里程碑（M*n*）结束必须过一次闸门（G*n*）：由用户实测、主 agent 记录、逐条判定；不通过不进下一章。**
3. **执行期间不回改设计文档**（只回填末尾的「待验证」条目）。发现设计缺陷就地决策，登记到 §9。

---

## 1. 里程碑总表

来源阶段一栏用 `文档:P<阶段>` 标注，便于与设计文档对照。执行主体一栏只标**主导者**；每个里程碑都同时含子 agent 任务包（§2.3）。

| 里程碑 | 交付（一句话）                                                                  | 来源阶段                                       | 依赖        | 闸门 | 后端 | 新依赖              |
| ------ | ------------------------------------------------------------------------------- | ---------------------------------------------- | ----------- | ---- | ---- | ------------------- |
| **M0** | 可用的验证闭环：修 turbo 任务图、修根 `check-types` 脚本、冻结迁移账本、核实版本、记录基线 | ——                                             | ——          | G0   | 否   | 否                  |
| **M0.1** | 浏览器可达性前置：后端地址按 origin 解析（回环不变，代理下走 `/trpc` + `/pb`）+ 宿主 nginx 两条路由（**R37**，§6.3 子章） | G0 实测                                     | M0          | G0.1 | 否   | 否                  |
| **M1** | 数据脊柱：`nodes` 四列 + `NodeIcon`/`NodeCover`/`TimestampNote`/`AnnotationLayerData` 全链路 + 前端共享写者（含属性侧栏整包抹除的修复，R13） | node-content:P0、selectors:P0（字段半）、annotation:P0（字段半） | M0          | G1   | **是** | 否                  |
| **M2** | 图标与封面：两个弹层 + 编辑器头部按钮 + preview/卡片读取 + `FileDropZone` 新 variant + `NodePreviewBody` 抽取 | selectors:P0（UI）、P1、node-content:P0（`file-drop-zone`）、重排 R1 | M1          | G2   | 否   | 否                  |
| **M3** | text 单 block（禅意）+ rich-text 头部挂载 + 旧形状惰性升级                        | node-content:P1                                | M1、M2      | G3   | 否   | 否                  |
| **M4** | 灵动岛 P0：常驻胶囊 + 四层视觉 + 弹簧形变 + 导航面板 + `islandPanel` 切片          | dynamic-island:P0                              | M0          | G4   | 否   | `motion ^12`        |
| **M5** | image 批注：归一化坐标 + Canvas 2D 分层 + 画笔/手指示意分离 + toolbar + 撤销/重做  | annotation:P0（除字段链路）                    | M1          | G5   | 否   | `perfect-freehand`  |
| **M6** | 媒体：自绘音频播放器 + `<VideoPlayer>` 控件外壳 + 共享时间戳笔记 + `Mod-Enter` 跳转 | node-content:P2（audio/video 半）              | M1          | G6   | 否   | 否                  |
| **M7** | PDF：pdfjs 自绘（页盒/翻页/缩放/旋转）+ 多页批注层 + iframe 降级                  | annotation:P1、node-content:P3                 | M5          | G7   | 否   | `pdfjs-dist ^4.10`  |
| **M8** | 灵动岛 P1：预览面板（节点悬停/点击）+ `ForceGraph` 去掉浮层                       | dynamic-island:P1（抽取已移 M2，R1）           | M4、M2      | G8   | 否   | 否                  |
| **M9** | 灵动岛 P2+P3：搜索面板 + 三处入口改向 + 删 `⌘K`/`Tab` 全局监听 + 删 quick-panel 与死切片 | dynamic-island:P2、P3（重排 R5）               | M8          | G9   | 否   | 否                  |
| **M10** | dashboard P0：`/dashboard/[pageId]` + RGL 网格 + 只读 widget + 展示/编辑态 + `NodeBodyRouter` 抽取 | dashboard:P0（几何改用内存，R6）               | M1          | G10  | 否   | `react-grid-layout ^2.3.0` |
| **M11** | dashboard P1：`dashboard_pages` 实体链路 + 两条入口 + 折叠/删除/打开节点           | dashboard:P1                                   | M10         | G11  | **是** | 否                  |
| **M12** | selectors P2 收尾：裁剪 + 最近使用 + Emoji 全量面板 + 语义弹窗接入图标选择器       | selectors:P2                                   | M2          | G12  | 否   | `react-easy-crop`（+`frimousse` 待定） |
| **M13** | dashboard P2+P3：组件库抽屉（含外部拖入）+ 多选/撤销 + 多页面管理 + 断点几何 + 迷你摘要 + 性能收尾 | dashboard:P2、P3                               | M11         | G13  | 否   | 否                  |

**只有两个里程碑动后端**：M1（`nodes` 加列，三份设计文档的字段链路合并，R3）与 M11（`dashboard_pages` 新集合）。其余里程碑一律不碰 `backend/`、`packages/interfaces` 的形状、`pb/pb_migrations`。

**执行顺序**：M0 → M1 是硬串行（M1 是三份文档的共同地基）；M4 是唯一的「可提前」里程碑（不依赖 M1，文件不重叠，见 §3.2 W0）；M5 → M7 硬串行（annotation 文档 §6 明写 P1 会反向改写 P0 的 `geometry.ts` 接口）；M10 → M11 → M13 硬串行。

---

## 2. 执行主体：主 agent 与子 agent

### 2.1 判定规则（四问，自下往上问）

1. **验收标准能否被 `tsc` / `eslint` 判定，且只碰一个目录或一层？** → 可交子 agent。
2. **是否需要同时决定跨包的「类型形状」（写进 `packages/interfaces`）？** → 主 agent 独占：形状必须先冻结，再派发。
3. **是否涉及不可逆动作（PB 迁移、`pb_data`、`pnpm-lock.yaml`、`git` 历史）？** → 主 agent 独占。
4. **产出是否需要用户肉眼 / 真机判断？** → 主 agent 主导；子 agent 至多准备脚手架与可复现步骤。

一条推论：**子 agent 永远不做「验收」，只做「实现 + 自检」**。类型能过不等于功能对；闸门只能由主 agent 起服务、用户实测。

### 2.2 主 agent 独占清单（不可委派，子 agent 任务包中必须写明「禁止触碰」）

| # | 独占面                              | 理由                                                             |
| - | ----------------------------------- | ---------------------------------------------------------------- |
| 1 | `packages/interfaces/src/**` 的类型形状 | 所有包的编译基准，形状变更必须单点决策                            |
| 2 | `pb/pb_migrations/**`、任何 `pb/pb_data` 操作 | 不可逆；PB 按**文件名**去重迁移（[1700000000_initial_schema.js:170-173](../../pb/pb_migrations/1700000000_initial_schema.js)） |
| 3 | 根 `package.json`、`turbo.json`、`pnpm-lock.yaml`、任何包的依赖增删 | 并发写 lockfile 必冲突；版本核实归主 agent                        |
| 4 | `packages/ui/src/components/index.ts`、`packages/ui/src/styles/globals.css`、`packages/store/src/index.ts`、`packages/services/src/index.ts` | 公共出口与 Tailwind `@source` 白名单，冲突面最大（`packages/interfaces/src/**` 见第 1 行） |
| 5 | dev server（3000 / 3001 / 8090）与一切闸门会话 | 端口唯一；闸门结果必须单一来源                                    |
| 6 | `git commit` / `git revert` / 分支操作 | 提交粒度 = 章节粒度（§7）                                        |
| 7 | 五份设计文档的「待验证」回填与 [§9 偏差登记](#9-与设计文档的偏差登记) | 设计文档的唯一合法改动窗口                                        |

### 2.3 子 agent 任务包模板

派发时把下列骨架填满再发；空着的地方就是子 agent 猜的地方，也就是返工的地方。

```text
任务：<一句话，动词开头>
只读：docs/<...>.md §<n>（设计契约）、docs/plan/README.md §2–§3
允许改动的文件（白名单，越界先停下来问）：
  - <path>
  - <path>
禁止：git commit / pnpm add / 启动 dev server / 改白名单外任何文件 /
      在报告里写没读过的 path:line / 触碰 packages/interfaces 或 pb/**
自检命令（必须贴输出尾部）：
  pnpm --filter=<pkg> typecheck ；pnpm --filter=<pkg> lint
报告格式：
  1) 改动文件清单（path + 一句话 + 关键行号）
  2) 两条自检命令的输出尾部
  3) 未做 / 未验证项（逐条，不许写「应该没问题」）
  4) 需要主 agent 决策的阻塞点
```

**子 agent 不做的事**：不判断「功能是否可用」（看不到浏览器）、不决定类型形状、不动依赖、不提交。

### 2.4 主 agent 对子 agent 交付的验收口径（收到即做，四步）

1. 跑一次该范围的 `typecheck` + `lint`，与 [baseline.md](./baseline.md) 对比，确认**无新增错误**。
2. `git diff --stat` 确认文件集**未越界**；越界即 `git checkout --` 回退该文件并重新派发。
3. **抽查 ≥3 处 `path:line` / API 断言**（上一轮并行产出曾出现 4 类伪造：不存在的文件名、不存在的导出、计数错误、把 `flush/cancel` 说成不存在）。计数类与「全仓没有 X」类断言必查。
4. 四条都过才 `git commit`（§7）；否则把缺口写回任务包重派，不自己顺手改（顺手改会让白名单失真）。

---

## 3. 文件所有权与并行窗口

### 3.1 跨里程碑的高冲突文件（任何时候只有一个 owner）

| 文件                                                                     | 会被哪些里程碑碰                  | 处置                                                                 |
| ------------------------------------------------------------------------ | --------------------------------- | -------------------------------------------------------------------- |
| `packages/ui/package.json`                                               | M2、M4、M5、M7、M10、M12          | **主 agent 在每章开工时一次装完**（§5），子 agent 禁止改               |
| `packages/ui/src/components/index.ts`                                    | M4（+导出）、M9（−QuickPanel 导出） | 主 agent 独占                                                       |
| `packages/ui/src/styles/globals.css`                                     | M5（`--annotation-*`）等          | 主 agent 独占                                                       |
| `packages/store/src/uiStore.ts`                                          | M4（+`islandPanel`）、M9（−`quickPanel`/死切片） | 主 agent 独占                                          |
| `packages/store/src/index.ts`                                            | M4、M10（+`dashboardStore`）      | 主 agent 独占                                                       |
| `packages/ui/src/components/preview-block/**`                            | M2（`preview-header`、`node-preview-cover`、+`node-preview-body`）、M8（+预览面板挂载） | **M2 一次做完（R1）**，M8 只读 |
| `packages/ui/src/components/dialog/editor/content/file-drop-zone.tsx`    | M1（半边合并）、M2（新 variant）  | **M2 一次做完（R4）**                                               |
| `packages/ui/src/components/dialog/editor/content/node-content-editor.tsx` | M10（抽 `NodeBodyRouter`）        | M10 独占；M1 不动它                                                  |
| `packages/ui/src/components/header/editor-header/attributes-sidebar.tsx`  | M1（修「整包 content 抹除」，R13） | M1 独占（M2 只加新按钮文件，M11 只改 `editor-header.tsx`）            |
| `packages/ui/src/components/header/editor-header/**`（其余）              | M2（图标/封面按钮）、M11（添加到 dashboard） | M2 先、M11 后（可叠加，无冲突）                            |
| `apps/web/app/(main)/layout.tsx`                                         | M4                                | 主 agent 独占                                                       |
| `pb/pb_migrations/**`                                                    | M1、M11                           | 主 agent 独占（§4）                                                  |

### 3.2 并行窗口（必须由主 agent 显式开启并登记到 gates.md）

并行只发生在**同章内部**（文件集互不相交），跨章并行只有一个例外 W0。

| 窗口 | 章 | 可并行的任务包（文件集互不相交）                                                                 | 前提                     |
| ---- | -- | ------------------------------------------------------------------------------------------------ | ------------------------ |
| W0   | M4 ∥ M2/M3 | 灵动岛 P0（`packages/ui/src/components/dynamic-island/**`、`apps/web/components/dynamic-island-*`、`(main)/layout.tsx`）与 M2/M3 完全不相交 | 主 agent 先装完 `motion`；两章的闸门**分别**过（G2/G3 与 G4 各测一轮） |
| W1   | M2 | 4 包：`node-media/**` 骨架（不含两个 popover）∥ `file-drop-zone` 新 variant ∥ `preview-block/**`（含 `NodePreviewBody` 抽取）∥ `IconSelectorPopover` | 主 agent 先冻结四样：`NodePreviewBody` 的 `PreviewBodyProps`、`node-media/media/**` 五个原子件签名、`NodeIconViewProps`、**以及 `file-drop-zone.tsx` 的 `Variant` 两行**（否则 `media-drop-pane` 用 `variant="cover"` 编不过，R36）。`CoverSelectorPopover` 与头部按钮在 W1 关闭后串行 |
| W2   | M5 | `draw.ts` + `geometry.ts`（纯函数，无 React）∥ `annotation-toolbar.tsx` ∥ `annotation-canvas.tsx` + `use-annotation-input.ts` | 主 agent 先冻结 `annotation/types.ts` 与 `geometry.ts` 的签名 |
| W3   | M10 | dashboard 六个组件文件 ∥ 路由宿主与 store                                              | 主 agent 先冻结 `DashboardItem`/`DashboardLayout` 与 `dashboardStore` 切片 |
| W4   | M13 | 组件库抽屉 ∥ 多页面管理 ∥ 迷你摘要 ∥ 性能收尾                                          | 主 agent 先冻结 `dashboard_pages` 的 tRPC 契约（M11 已落） |
| W5   | M6 | `media/audio-player.tsx` ∥ `media/timestamp-notes.tsx` ∥ `video-player.tsx` 的 `onMediaController` 出口 | 主 agent 先冻结 `media/types.ts`（`MediaController` / `TimestampNoteMarks` / `formatTimeMs`）；该文件零 React 依赖，消费者不许反向 import 生产者 |

**不为并行开窗的章（明确登记，避免「看着像能并行」）**：**M7**（pdfjs 渲染 / 批注坐标链 / toolbar 三面都改 `geometry.ts` 或 `annotation-canvas.tsx`，文件集相交）；**M3**（`packages/editor` 的编辑器与渲染器共享同一 schema 文件）。

**并行窗口的三条纪律**：① 同一文件同一时刻只有一个 owner；② 子 agent 发现需要改白名单外的文件 → 停下来问，不许自行扩权；③ 并行期间禁止任何 `pnpm add` / `pnpm install`（会重写 lockfile 与 `node_modules`，让另一条线的 `typecheck` 结果不可信）。

---

## 4. 迁移编号账本

现状：`pb/pb_migrations/` 只有 `1700000000_initial_schema.js`；`pb/pb_data/` 已存在。PocketBase **只按文件名去重**，改 0 号脚本对既有库无效（[1700000000_initial_schema.js:170-176](../../pb/pb_migrations/1700000000_initial_schema.js)）。

> **M0 实测更正（2026-10-06）：`pb/pb_data/data.db` 里没有真实数据。** 直读 sqlite：`nodes` / `users` / `workspaces` / `workspace_members` / `edges` **全部 0 行**；`nodes` 集合已有 32 个字段（含 `views`/`fields`/`rows`/`filterConfig`）但无记录。初稿「有真实数据，删库会毁掉回归面」的**前提不成立**，删库的代价只有「重建 schema + 重新初始化 PB」。本轮仍**不删库**，理由改为下面第 1 条。另：PB 的超级管理员安装**从未完成**（`_superusers` 里只有 PocketBase 自己的 `__pbinstaller@example.com` 占位账号，带一个已打印到终端的 install token）——M0 已用 `pocketbase superuser upsert` 完成安装并删掉占位账号，账号 `admin@dbrain.dev`，密码落在 gitignored 的 `pb/pb_data/.superuser-credentials.txt`。

本轮**只新增两个**迁移文件：

| 序号         | 文件名                              | 内容                                                                     | 章   | 回滚（`down`）                        |
| ------------ | ----------------------------------- | ------------------------------------------------------------------------ | ---- | ------------------------------------- |
| `1700000001` | `1700000001_node_extras.js`         | `nodes` 加 `annotations` / `timestampNotes` / `icon` / `cover` 四个 json 列 | M1   | 对四个名字 `fields.removeByName` → save |
| `1700000002` | `1700000002_dashboard_pages.js`     | 新集合 `dashboard_pages`（`{ workspaceId, name, isDefault, items, layout }`） | M11  | `app.delete(findCollectionByNameOrId("dashboard_pages"))` |

三条硬规矩：

1. **不得改 `1700000000_initial_schema.js`。** 设计文档里 selectors.md §8 留了「或改 0 号 + 删 `pb_data`」这个选项 —— **本轮不采用**。初稿理由是「既有 `data.db` 有真实数据」，该前提已被 M0 实测推翻（见上）；现在的理由是：① 空库上「改 0 号 + 删库」与「新增迁移」得到的 schema **等价**，而后者对将来任何有数据的库都正确，没有理由选更脆的那条；② 删库会连带清掉刚装好的 superuser 与 workspace，每次都要重新初始化；③ 新增迁移在空库上跑一次就等于验证了迁移本身，正好是 G1 第 1/2 条的验收对象。
2. **新列一律可选、不设 required；mapper 缺列读作 `undefined`**（照 `views` 的既有写法），旧记录天然读作空。
3. **`down` 必须真能跑**（PB 0.40 的 `FieldsList` 只有 `removeById` / `removeByName`，见 [types.d.ts:12473](../../pb/pb_data/types.d.ts)）；迁移里禁止用 `new TextField(...)` 之类的具体字段构造器（0 号脚本 `:209-210` 记录了 `FileField` 被静默丢弃的坑），统一 `new Field({ name, type: "json" })` —— 已核实 `Field` 的签名是 `constructor(data?: Partial<core.Field>)`，且 `core.Field` 带 `[key:string]: any`（[types.d.ts:441](../../pb/pb_data/types.d.ts)、[:10129](../../pb/pb_data/types.d.ts)），null 号脚本 §4.5 的「待验证」由此**结案**。

---

## 5. 依赖安装账本

全部装在 `packages/ui`（唯一不新建 workspace 包的取舍，见 dashboard 设计文档 §0.2-⑤）。

| 章   | 依赖                  | 版本（设计文档给的） | 用途                             | 备注                                                            |
| ---- | --------------------- | -------------------- | -------------------------------- | --------------------------------------------------------------- |
| M2   | **+0**                | ——                   | 图标/封面选择器                  | `lucide-react@^0.577.0` 已在 `packages/ui`；P0 的 Emoji 是**内置精选集**，无网络无依赖 |
| M4   | `motion`              | `^12`                | 岛的 `layout` 形变               | 必须确认 React 19 peer 与 Next 16 打包                            |
| M5   | `perfect-freehand`    | `^1.2`               | 笔迹轮廓数学（唯一绘制依赖）      | **已在 store**：`@excalidraw/excalidraw@^0.18.1`（`packages/editor/package.json:11`）的传递依赖，`pnpm-lock.yaml:6703/:8532` 已锁 `1.2.0` → 不需要新下载，但 `packages/ui` 仍必须**显式声明**（否则是隐式依赖） |
| M7   | `pdfjs-dist`          | `^4.10`              | 客户端自绘 PDF + worker          | **store 已有 `4.10.38`**（见下），但 `packages/ui` 必须显式声明。**同 major 硬约束**：`backend/infrastructure/package.json:13` 锁 `^4.10.38`，不同 major 会出现两份 pdfjs。worker 主路径用 `GlobalWorkerOptions.workerPort`；**兜底需要 `apps/web/public/`，该目录今天不存在**（属跨包改动 → 主 agent 决策） |
| M10  | `react-grid-layout`   | `^2.3.0`             | dashboard 网格                   | v2 才是 React 18+ 兼容线；需要 `useContainerWidth` / `verticalCompactor` |
| M12  | `react-easy-crop`     | 未定                 | 封面/图标裁剪                     | 需先确认与 `radix-ui` 弹层的指针事件不互斥                        |
| M12  | `frimousse`           | 未定（可能不用）      | Emoji 全量面板（懒加载）          | 若不用则用内置精选集收尾                                          |

**安装纪律**：每章开工第一步，主 agent 用 `pnpm --filter=@workspace/ui add ...` 一次装完并立即提交 lockfile；该章内不再动依赖。子 agent 禁止任何包管理命令。

**版本核实是 M0 的阻塞项，但面比设计文档小。** 实测 pnpm store（`ls node_modules/.pnpm/`，1356 个条目）：

| 包                 | store 现状                                   | 结论                                    |
| ------------------ | -------------------------------------------- | --------------------------------------- |
| `perfect-freehand` | **已有 `1.2.0`**（`@excalidraw/excalidraw@^0.18.1` 的传递依赖，`pnpm-lock.yaml:6703/:8532`） | M5 无需新下载，但 `packages/ui` 仍须**显式声明** |
| `pdfjs-dist`       | **已有 `4.10.38`**（后端在用，`backend/infrastructure/package.json:13`） | M7 无需新下载，但 `packages/ui` 仍须显式声明，且版本必须同 major |
| `motion`           | **不在 store**                                | M0 必须联网核实 `^12` 是否存在            |
| `react-grid-layout` / `react-resizable` | **不在 store**            | M0 必须联网核实 `^2.3.0`                  |
| `react-easy-crop` / `frimousse` | **不在 store**                   | 到 M12 再核实（M12 若改用内置方案则不需要） |

**版本核实已在 M0 完成**（结果见 [spine.md §附](./spine.md#待验证-3-的结案依赖版本核实2026-10-06)）：初稿记的「本机 `npm`/`pnpm` registry 访问不可用（`EROFS ... /home/lyq/.npm/_cacache/tmp`）」**实测不成立** —— 该缓存目录可写，`npm view` 直接可用，无需改 `npm_config_cache` / `store-dir`。五个版本范围全部存在（`motion` 最高 `12.43.0`、`perfect-freehand` `1.2.3`、`pdfjs-dist` `4.10.38` 与后端同 major、`react-grid-layout` `2.3.0`、`react-easy-crop` `6.2.4` / `frimousse` `0.4.0`）。**M4 的天花板随之降低**：`motion` 装得上，剩下的风险是 React 19 + Next 16 的**打包**（每章装完立刻跑 `pnpm --filter=web build`），不是「装不上」。

---

## 6. 闸门规程（用户介入）

### 6.1 一个闸门的生命周期

```text
1. 主 agent 在 gates.md 写条目（状态：待测），并给出「用户操作清单」
   —— 每条 = 动作 + 期望 + 判据/证据（可复制的 URL、要点哪个按钮、要看哪一行）
2. 主 agent 起 pnpm dev:full（后台 job），确认 PB 迁移已跑、typecheck/lint 无新增错误，
   并先用 agent-browser 技能把可自动化的部分预跑一遍（截图 + 控制台错误）当作「自检证据」
3. 用户按清单实测；可自动化的部分以主 agent 的预跑结果为底稿，用户只需看结论 + 测手感/真机
4. 有失败项 → gates.md 记「不通过（第 n 轮）」+ 归因（设计 / 实现 / 环境）+ 迭代编号 G<n>-r<m>
   → 修复 → 回到第 3 步（同一闸门重测，不算新章节）
5. 全部通过 → 状态改「通过（日期 · 轮次）」+ 记「遗留不阻塞项」→ 才允许开下一个里程碑
```

### 6.2 通过判据（三条同时满足）

1. 该章「用户操作清单」全部通过，或用户显式把某条判为「已知不符，记入遗留」（要写进 gates.md 的遗留列，不能口头放过）。
2. `typecheck` / `lint` 相对 [baseline.md](./baseline.md) **无新增失败**（不是「干净」——见 §8）。
3. 该章登记的「回归面」手测无退化（每章的回归面写在对应章文件里）。

### 6.3 不通过时的处置

- 归因三选一，写进 gates.md：
  - **实现缺陷** → 回改，同一闸门重测。
  - **设计缺陷** → **不改设计文档**；就地决策，记入 §9 偏差登记（含「为什么这样改」与「设计文档哪一句失效」）。
  - **环境问题**（secure context、真机不可用、PB 版本差异）→ 记录复现条件与绕过方式，判定该条为「环境受限，降级验收」。
- **禁止**「先跳到下一章，回头再补」。失败面很大时，允许把该章拆出 `M<n>.1` 子章并单独过闸，但不得跳过。

### 6.4 章节推进规则

- 不得跳过闸门；`gates.md` 里上一行不是「通过」，下一行不得开工。
- 并行窗口 W0 的两章可以一次用户会话测完，但结果**必须分别记录、分别判定**。
- 每章的开工前提写在各章文件里（含「必须先合并/冻结什么」）。

---

## 7. 提交与回滚规约

- 分支：**就在当前 `develop` 上推进**。理由：本机的 `pb/pb_data` 与运行中的 dev server 都绑在这个 checkout 上，切分支会让 PB 数据与端口状态错位；收益不抵成本。
- 提交粒度 = **章节粒度**：一个里程碑一个提交序列，提交信息沿用仓库既有风格（`<范围> <动作>：<细节>`，例：`node-extras 落库：nodes 增四列，icon/cover/timestampNotes/annotations 全链路打通`）。
- 每个提交只包含该章的源码 + 该章的 `docs/plan/*` 更新（`gates.md` 的记录、§9 偏差）。**不把两章混进一个提交。**
- 闸门未通过的修复提交：`<范围> 修：<失败项>`，与上一提交同章。
- 回滚以提交为单位 `git revert <sha>`。**唯一不可逆项**：`docs` 落成 Tiptap 单 block 后再回退前端，旧 `Textarea` 会把 `docs` 读成 `"[object Object]"`（node-content 设计文档 §4.3-5）—— 因此 M3 的回滚必须连同前端一起。
- `pb/pb_data/` 已被 `.gitignore` 忽略，迁移文件才是唯一入库真相。

---

## 8. 回归基线（**为什么验证命令和设计文档不一样**）

M0 实测发现两个既有缺陷，**五个设计文档里写的 `pnpm check-types` / `pnpm lint` 今天都跑不了**（M1 又补了一个噪声源）：

| 缺陷                                                | 证据                                                                 | 影响                                                     |
| --------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------- |
| `turbo.json` 的 `lint`/`check-types` 声明了 `dependsOn: ["^lint"]`，而 workspace 存在真实环（`interfaces ⇄ utils`、`services ⇄ api-client`、`ui ⇄ editor ⇄ dataview`） | `pnpm lint` / `pnpm check-types` 直接 `x Cyclic dependency detected` 退出 1 | 全仓 lint/typecheck 一条命令都跑不了                      |
| 根 `check-types` 脚本是 `turbo run check-types`，而**没有一个包**定义 `check-types` 脚本（包里的名字是 `typecheck`） | 去掉 `dependsOn` 后 turbo 报 `No tasks were executed as part of this run. Tasks: 0 successful, 0 total` | 即使修了环，`pnpm check-types` 仍然是**空跑**             |
| **`apps/server/tsconfig.json` 缺 `@workspace/interfaces` / `@workspace/utils` 的 `paths`**（M1 修） | 那 46 条 `server:` 前缀错误全部是 `Cannot find module '@workspace/interfaces...'` 及其次生 TS7006/TS2322；补上两条 path 后 `pnpm --filter=server typecheck` **零诊断**，全仓 `Tasks: 14 successful` → **`15 successful`**，`server` 从「失败」变「通过」 | 基线里最大的一块噪声把「后端改动」的信号淹掉：M1 只改 12 行就换来 12 条假新增 |

环本身是**真实的源码环**（`packages/interfaces/src/models/filter.ts:1` ← `@workspace/utils`；`packages/utils/src/filter.ts:7` ← `@workspace/interfaces`），拆环是一次独立重构，**不在本轮范围**。M0 采用最小修法：让 turbo 的任务图不含 `^` 边、任务名与包脚本名对齐（详见 [spine.md §M0](./spine.md#1-m0--基线与验证闭环)）。修完 `pnpm lint` 会真正跑到 22 个包，其中 `desktop#lint` 基线即失败 —— 所以：

> **闸门的判据是「相对基线无新增失败」，不是「干净」。** 基线快照与逐包结果见 [baseline.md](./baseline.md)；重跑脚本 `docs/plan/baseline.sh`。

---

## 9. 与设计文档的偏差登记

执行期间对设计文档的阶段/文件名/命令做出的重排，以及**使设计文档某句失效、或改变闸门验收方式**的项，一律登记在此。**设计文档正文不改**（只回填「待验证」）。纯实现选择（命名、内部结构、等价条件）见各章 §「本章新定决策」，不在此重复登记。

| #   | 偏差                                                                                                   | 理由                                                                                                                                                                                                 | 影响的设计文档                                   |
| --- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| R1  | `NodePreviewBody` 的抽取从「岛 P1」**提前到 M2**                                                        | M2 本来就必须改 `preview-header.tsx`（删本地 `nodeTypeIcons`）与 `node-preview-cover.tsx`（读 `cover`），同一目录同一批语义。不合并的话 `preview-block/**` 会被两章各改一遍，M8 的抽取还会与 M2 冲突 | dynamic-island §8（P1 行）、§12                 |
| R2  | `nodes` 的四列合并为一个迁移 `1700000001_node_extras.js`；dashboard 集合迁移顺延为 `1700000002_dashboard_pages.js` | ① 设计文档里 annotation 的 `1700000001_node_annotations.js` 与 dashboard 的 `1700000001_dashboard_pages.js` 前缀相同（文件名不同所以都能跑，但顺序不确定，且两份文档各自假设「自己是第一个附加迁移」）；② 四列都是 `nodes` 的 json 列，都由 M1 一次做完，拆三个文件只会让「迁移跑没跑」的排查变成三处 | annotation §9、node-content §4.5、selectors §8、dashboard §10 |
| R3  | M1 **一次性**做齐后端全链路（含 image/pdf 的 `annotations`、audio/video 的 `timestampNotes`、base 的 `icon`/`cover`） | 三份文档把各自的字段链路放在各自的 P0，但改的是**同一批文件**：`entities.ts` / `value-objects.ts` / `node-command.service.ts` / `node-dto.mapper.ts` / `node.mapper.ts` / `router/node.ts`。分三章做等于同一文件改三遍、每遍都要重跑后端 typecheck + 迁移实测。合并后后端在 M1 冻结，M2–M13 不再有 `backend/**` 改动（M11 的新集合除外） | node-content §4.2、selectors §8、annotation §9    |
| R4  | `file-drop-zone.tsx` 的「新 `Variant`」与「读活 content + 合并半边」**合并到 M2 一次做完**              | 两件事改的是同一个 `buildNodeUpdates`（`file-drop-zone.tsx:165-186`）；拆开会让 M1 先改一遍 `:197-260`、M2 再改一遍 `:53-79`                                                                          | node-content §8（P0 行）、selectors §8            |
| R5  | 灵动岛的 P2 与 P3 **合并为 M9**                                                                          | P2 的「三处入口改向 + 删 `⌘K`/`Tab` 全局监听」与 P3 的「删 quick-panel 文件/切片/`index.ts` 导出」是同一件事的两半；留着 quick-panel 文件而不挂载只会留下一个可被误引用的死组件                     | dynamic-island §9                                 |
| R6  | dashboard P0 的几何**用内存，不落 localStorage**（P0/P1 仍分两章）                                       | 设计文档 P0 的验收写了「暂用 localStorage 兜底或直连后端」；localStorage 会在 P1 变成必须删掉的第二真相源，并给「断点脏键」埋雷。P0 的目的只是验证 RGL 交互手感，内存足够                             | dashboard §7（P0 验收列）                         |
| R7  | M0 修 `turbo.json` 任务图 + 根 `check-types` 脚本；闸门判据由「干净」改为「无新增失败」                  | §8 实测证据。不修则所有章节的验证命令都是空话                                                                                         | 五份设计文档的「验证方法」章节                    |
| R8  | `--annotation-*` 色板令牌与 tailwind `@source`：若批注落在 `packages/ui` 内则**不加** `@source`（设计文档已如此写） | 与 annotation §9 一致，登记为「已核对，非偏差」                                                                                                                                                        | ——                                               |
| R9  | 灵动岛「删死切片 `commandDialogOpen*`」**从 P0 挪到 M9**                                                | 设计 §8/§12 把「删死代码」写在 P0 行，总纲 §3.1 写在 M9（−`quickPanel`/死切片）。M4 保持**纯新增**（`uiStore` 只加 `islandPanel`），删除统一在 M9 收口——这样 M4 的闸门 diff 里不混无关删除            | dynamic-island §8、§12                            |
| R10 | `backdrop-filter` **不**做与 `simulation:stopped` 的联动，改用设计自给的等价条件「岛上 300ms 无重绘」   | `simulation:stopped` 只在 `packages/graph` 内消费，而设计 §0.2-2 的依赖方向不允许 `packages/ui → packages/graph`。为一个纯优化项新增跨包事件面不划算                                                     | dynamic-island §3.4、§11-7                        |
| R11 | `previewBlock → hoverPreview` 重命名**不做**（设计已标为「P3 后可选」）                                  | 纯命名收益，但要动 store 字段 + `eventHandler.ts` 四处 `previewBlock` 判定 + `ForceGraph` 余下的选择器；M9 因 R5 已经很宽                                                                             | dynamic-island §8                                 |
| R12 | 新增 `apps/web/components/island-node-preview.tsx`（设计的文件清单里没有）                              | 预览面板的动作注入（打开节点 / 打开记录）需要一个宿主侧包装文件，否则 `dynamic-island-host.tsx` 会同时承担路由、store、键盘、内容注入与动作实现五件事                                                  | dynamic-island §12                                |
| R13 | **`attributes-sidebar.tsx` 的「整包 content 抹除」修复并入 M1**（设计文档里没有这个文件）                | 实测 `:216-223` 用**本次 render 的快照**拼整包 content + `debounce: true`，而 `showContentUrl` 覆盖 video/audio/image/pdf/website（`:274-279`）。M1 一加上 `annotations`/`timestampNotes`，在属性侧栏改一次「内容链接」就会抹掉批注与笔记 —— 它同时威胁 M5/M6/M7。放在 M1 一次修好，好过让三章各自打补丁（也避免它成为三章共同的写入面冲突源）。详见 [spine.md 坑 7](./spine.md) | node-content §4.2（原文只提「共享写者」）、selectors §8 |
| R14 | 新增 `packages/ui/src/components/media/types.ts` 第三个文件                                              | 设计 §8 只列 `audio-player.tsx` + `timestamp-notes.tsx`。`MediaController` / `TimestampNoteMarks` / `formatTimeMs` 需要一个 audio 生产、video 消费、笔记组件共用的中立落点，否则消费者要反向 import 生产者                     | node-content §8（audio/video 行）                 |
| R15 | `<VideoPlayer>` **只加 `onMediaController?`**，不加 overlay / children 插槽                              | 设计 §1.4 原文是「children/overlay 插槽**或** onTimeUpdate 回调」。加插槽必须包一层 div，而 `className` 今天落在 `<video>` 上（`video-node-content.tsx:89` 的 `w-full object-contain` 与 `hidden` 切换依赖它）—— 会改既有 DOM 契约 | node-content §1.4                                 |
| R16 | 设计 §1.4 称 `<VideoPlayer>` 是 `forwardRef` 风格 —— **实测不是**                                        | `video-player.tsx:60` 是内部 `useRef<HTMLVideoElement>`；`video-player/` 与两个 node-content 全仓 `forwardRef` / `useImperativeHandle` **零命中**。因此这是**新增出口**，不是「扩展既有出口」，工作量与改法都不同 | node-content §1.4                                 |
| R17 | video 的 `Space` / `←` / `→` **不自绘**；`Mod-Enter` 挂媒体内容根盒，不做 document 级全局监听              | ① video 用原生 `controls`（`video-node-content.tsx:88`），浏览器已实现，再挂一套会双重 seek/toggle；② 全局监听会与弹层抢键，且 `node-editor.tsx:53` 的 `autoFocus={false}` 表明仓库有意不抢焦点 | node-content §1.4 交互表                          |
| R18 | pdfjs 视图落 `content/pdf-document-view.tsx`，**不新建** `packages/ui/src/components/pdf/`               | 设计 annotation §9 与 node-content §8 给了两个落点，会立刻产生「哪个是真入口」的问题；而 `node-content-editor.tsx:29-62` 只认 `content/` 下的组件                          | annotation §9、node-content §8                    |
| R19 | 批注写回用 M1 的共享写者 `patchContent({ annotations })`，**不照抄**设计 §5.1 的裸 `NodeService.upsert(..., { debounce: 2_000 })` | 总纲 R3 要求 M1 之后不再有 backend 改动；设计 §5.1 那条 upsert 视为该链路的**内部实现**，对外只暴露「一次手势一笔写」的语义。兜底 flush 原语已存在：`NodeService.flushPendingUpdate`（`node.service.ts:145`） | annotation §5.1                                   |
| R20 | 「M7 承担 toolbar 工具扩展 + `annotation-text-layer.tsx`」作为口径澄清                                   | 设计 §6 把「toolbar 扩展到荧光笔/套索/文本/箭头/形状」放在 P1（即 M7），而总纲 §1 的 M5 行没点名工具集范围                                                                 | annotation §6（P1 行）、annotation §9             |
| R21 | W2 的装配点 owner 定为**主 agent**；`geometry.ts` 的「冻结」**只对 W2 期间有效**，G5 通过后解冻给 M7        | ① W2 三条线都要消费宿主契约（`items`/`onItemsChange`/`tool`/`getBaseRect()`），必须有唯一 owner 才谈得上「先冻结再派发」；② 若把冻结理解成跨章永久，就与设计 §6「P1 的反向改写」直接冲突                                | annotation §6、本 README §3.2                     |
| R22 | `readOnly` 时隐藏批注 toolbar 的**链路本轮不建、G5 不测**                                                | `node-content-editor.tsx:26-34` 只传 `node` + `className`，宿主没有可传的 `readOnly`；只保留可选 prop 并记为后续                                                              | annotation §2.4                                   |
| R23 | G5 的 secure context 结论：**用 `http://localhost:3000` 从平板访问**，不做 https                         | 容器与安卓同网络命名空间（容器 netns = 初始 netns；可见 `wlan0 10.21.239.179` / `vgate0`），平板上的 `localhost` 就是同一个监听，而 localhost 是浏览器**引擎级**可信源 ⇒ 天然 secure context。佐证：仓库自己的 PB baseUrl 也硬编码 localhost（`apps/web/app/providers.tsx:15`）。`next dev --experimental-https` 因本机无 `mkcert` 排除。**须在 G5 第一步实测确认**。**M0 补注（2026-10-06）：这条推理有问题，G5 前必须先解决。** 平板的 `localhost` 是**平板自己**，不是这台机器（容器 netns 只影响本机的 `localhost`，管不到另一台设备的解析）。而应用**浏览器侧的两个后端地址都是硬编码**：`ws://localhost:3001`（[client.ts:32](../../packages/api-client/src/trpc/client.ts)）与 `http://localhost:8090`（[providers.tsx:15](../../apps/web/app/providers.tsx)）。⇒ 从任何**别的**设备打开 `http://<本机地址>:3000` 只会得到一个连不上后端的外壳；唯二出路是「在客户端设备上做 SSH 本地转发」或「把这两个地址改成跟随 `window.location.hostname`」（后者要动 `packages/api-client` + `apps/web`，不在本计划范围内）。见 §10 风险表 | annotation §8.2（原文按「非 secure context」给出告警） |
| R24 | dashboard P0 的假数据来源 = 当前 workspace 的**前 6 个节点**合成一页（`createPreviewPage`），M11 起被 `listByWorkspace` 取代 | 设计 §7 只写「手写一页假数据」，没说假数据放哪。从 `dataStore.nodes` 合成能让 `resolveNode` 拿到真节点，G10 不必额外造种子数据 —— 代价是**该 workspace 需已有 ≥6 个节点**，已写进 G10 前提 | dashboard §7（P0 行）                             |
| R25 | `NodeBodyRouter` **单一入口、两张路由表**（`mode: "edit" \| "widget"`），不拆成两个文件                  | 设计 §4.2 给的 `WidgetBody` 是独立 switch，§6 又说抽 `NodeBodyRouter` —— 合并为一个文件的双表，才有「类型路由表只有一个真相源」                                                          | dashboard §4.2、§6                                |
| R26 | **不做侧边栏 dashboard 导航项**                                                                         | 设计 §10 把它标为「可选」。真读 `main-sidebar.tsx`：唯一路由跳转是 `:1005` 的 `location.href = "/login"`，没有任何指向应用路由的导航项；给它单开一种范式不划算，且该文件是 M4/M9 的地盘 | dashboard §10（修改表）                           |
| R27 | 设计 §0.2-⑤ / §3.2 的「组件库直接复用 `NodeSelectionList`」**部分失效**                                  | 真读 `node-selection-list.tsx`：过滤只有标题 + 语义名（`:53-62`），既无标签过滤也无「显示已添加」，且它是带全选/清空的多选清单而非卡片网格 → 只复用**过滤口径**，卡片网格与两个开关新写 | dashboard §0.2-⑤、§3.2                            |
| R28 | W4 增第五条线 E（多选 / 删除撤销 / 触摸长按）；`dashboard-header.tsx` 收归主 agent 在冻结步写成两个插槽    | W4 的「多页面管理」与「组件库抽屉」本来都要改 `dashboard-header.tsx`，违反 §3.2 纪律①（同一文件单 owner）                                                                         | 本 README §3.2                                    |
| R29 | **`{ icon: undefined }` 表达不了「清空」——selectors §7 的「移除」行失效**；M1 必须在 command 层定哨兵（`null` 或显式 flag） | 链路每一环都有据：客户端发的是**整份合并节点**（`node.service.ts:50` `{...oldNode, ...updates}` → `:58`/`:76` `mutate({updates: merged})`）；superjson 会把 `undefined` **原样送达**；服务端是**值判定**（`node-command.service.ts:290-292` 的 `if (cmd.isPinned !== undefined)`）⇒ 收到 `undefined` 就什么都不做。详见 [spine.md 坑 8](./spine.md) | selectors §7、§11-2                              |
| R30 | selectors §11-2 的抓包判据改写为「`updates.icon` 是新值 **且** `updates.content` 与操作前逐字段一致（PB `nodes.content` 未变）」 | 同 R29 的根因：线上 payload 是整份节点，**永远看不到**「`updates` 里只有 `icon`」                                                                                                          | selectors §11-2                                   |
| R29-定 | **M1-T1 已定哨兵 = `null`**：`NodeBase.icon?: NodeIcon \| null`、`cover?: NodeCover \| null`；`{ icon: null }` / `{ cover: null }` 表示「本次写请求要求清空」。读路径永不返回 `null`（缺省即 `undefined`），消费方一律写 `node.icon ?? fallback`。落地链：zod 放行 `null` → `updateNode` 里 `cmd.icon === null → clearIcon()` → DTO / infra mapper 把清空读回成缺省 | 选 `null` 而非显式 flag：一个字段说清一件事，与「一次写一个键」的既有模型（`isPinned` 那套值判定）同形；flag 方案要多一个字段 + 多一条 zod 白名单 + 多一处 DTO 分支 | selectors §7、§11-2（M2 的 `onRemove` 与 G2 第 7 条按此写） |
| R31 | `packages/editor` **不进** Tailwind `@source` 白名单；禅意样式落 `packages/ui` 侧，editor 侧只写结构 + 自己的 SCSS | `globals.css` 的 `@source` 只有四行（`:8` apps、`:9` components、`:10` `../**` = `ui/src`、`:16` dataview），**没有一条指向 editor**——它只被 `:4-5` 两条 **SCSS `@import`** 引用。旁证：editor 独有的 `z-[101]`/`w-[500px]` 等在既有 dev CSS 产物里一个都没有。只有真把 Tailwind 类写进 editor 时才由主 agent 补一行 `@source` 并**重跑 `pnpm --filter=web build`** | node-content §0.3-11（原暗示要补）                |
| R32 | 只读渲染用 `@tiptap/core` 已导出的 `generateHTML`，**不装** `@tiptap/static-renderer`                    | `@tiptap/core@3.22.4` 已导出该 API（`packages/editor/node_modules/@tiptap/core/dist/index.d.ts:1986`），而 `@tiptap/static-renderer` **全仓未安装** → 避免一次 §5 账本外的依赖增删 | node-content §8（`single-block-renderer` 行）      |
| R33 | 事实修正：nc §4.3-5 说回退后旧前端显示 `"[object Object]"` —— 实测显示的是字符串 **`"doc"`**              | `text-node-content.tsx:20-25` 的 `getValue()` 取 `Object.keys(docs)[0]`；对 `{type:"doc",content:[…]}` 第一个键是 `type` → 显示 `"doc"`。**结论不变**（旧前端看到的是垃圾文本，回滚必须连同前端），但闸门与遗留记录里引用的现场文案要按实测写 | node-content §4.3-5                               |
| R34 | M2 **不登记** `packages/ui/src/components/index.ts`（公共出口不导出新组件）                              | dataview 消费 `NodePreviewCover` 本来就是按路径 import（`packages/dataview/src/shared/card-cover.tsx:26`）→ M2 沿用按路径 import，就不占用主 agent 的独占面                     | selectors §12                                     |
| R35 | rich-text 会出现**两套**图标/封面入口（sel §4 的 `EditorHeader` 按钮 + nc §1.6/§2 的内容区头部），必须显式收口 | 两份设计文档各要求一套，且渲染的是同一份 `node.icon`/`node.cover`。方案 A（M2 预置「该类型是否有内容自带头部」集合，M3 只加 `"rich-text"`）/ 方案 B（M3 改 `editor-header.tsx`）——**由 G3 第 6 条判定，不许留成「看情况」** | selectors §4、node-content §1.6/§2                |
| R36 | W1 的冻结清单具体化：**先落 `file-drop-zone.tsx` 的 `Variant` 两行**（否则 W1-A 的 `media-drop-pane` 用 `variant="cover"` 编不过）；M3 **不开**并行窗口，编辑器与只读渲染器同 owner | 总纲 §3.2 原话只说「先冻结 `node-media/` 导出」，粒度不够：`Variant` 是 W1-A 的编译前提；editor 侧两个文件共享同一份 schema/扩展集，拆开必然漂移 | 本 README §3.2                                    |
| R37 | **新增 M0.1 子章**：浏览器侧后端地址改为**按 origin 解析**（回环仍走 `localhost:3001`/`localhost:8090`，非回环走同域 `/trpc` 与 `/pb`）；宿主 nginx 负责把这两条路由到本机端口 | M0/G0 实测发现应用**在反向代理下不可用**：`ws://localhost:3001`（`packages/api-client/src/trpc/client.ts:32`）与 `http://localhost:8090`（`apps/web/app/providers.tsx:15`）是**硬编码回环**，而用户浏览器是从 `https://dev.yuqi-666.cn`（宿主 openresty → 容器 `:3000`）访问的 ⇒ 浏览器里的 `localhost` 是用户自己的机器。这不是本轮功能需求，而是**所有浏览器闸门（G1–G13）的前置**：不修则每个闸门都只能由主 agent 用 curl 代验，用户无法实测手感。按 §6.3「允许把该章拆出 `M<n>.1` 子章并单独过闸」处理 | [§10 风险表](#10-风险登记)、dynamic-island/media/annotation 等**所有**需要用户肉眼的闸门 |
| R38 | **M1 顺手修 `apps/server/tsconfig.json`**：补 `@workspace/interfaces` / `@workspace/utils` 的 `paths`；`baseline.sh` 加**第三类归一化**（抹掉 `(line,col)`、保留出现次数，快照改成 `N× <错误>`）；`baseline.md` 与基线快照随 M1 收口重采 | ① M1 只改 12 行代码，`server:` 段就涌出 12 条「新增」——全是 `apps/server` 解析不到 `@workspace/interfaces`（它的 `paths` 里有 domain/application/infrastructure/adapter-*，**唯独漏了 interfaces/utils**）造成的次生错误；补上后该段**一次归零**（46 条消失、`server` 任务转绿），`server` 从此是**真哨兵**。② 里程碑编辑一个本身带基线错误的文件时行号必然漂移（M1 实测 9 删 10 增），属纯位置噪声 | [baseline.md §0 缺陷 4 / §1.1 类③](./baseline.md#0-为什么需要基线三个既存缺陷1-个-m1-顺手修掉的噪声源) |
| R39 | **M3 的两处口径落地**：① nc §2 表格第 1 行的「cover 空则不占位」实现为**标题行右端的 compact「添加封面」按钮**（不画灰块，但不留成"没有入口"——方案 A 已把对话框头部的封面按钮对 rich-text 隐藏，若严格不占位则该类型永远加不了封面）；② §M3.2-2 方案 A 的范围**只覆盖图标/封面**，rich-text 的 `title` 仍在对话框头部保留（`editor-header.tsx` 只对 `CONTENT_OWNED_HEADER_TYPES` 隐藏 icon/cover 按钮），因此 rich-text 会出现两个标题输入框、写同一份 `nodes.title` —— 是否也收口由 **G3 第 6 条**判定后再回填本行 | ① 设计文档只写了「空则不占位」，没说入口放哪；把入口塞进封面段会造出一个空灰块，塞进 title 行是唯一不增加新段落位置的做法。② M3.5-3 的回归面明写 `NodeTitle`（`node-title.tsx:21-30`）行为照旧，M3 不擅自扩大收口范围 | node-content §2（表格第 1 行）、本 README §3.2 |

---

## 10. 风险登记

| 风险                                                                 | 触发条件                                   | 处置                                                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 迁移在既有 `pb_data` 上失败（`unknown field`）                        | M1/G1 写第一批新字段                       | 迁移**先跑通再写码**；失败即停，检查 `_migrations` 表与文件名去重。**默认仍不用「删库重建」绕**，但注意爆炸半径已比初稿小得多：M0 实测库里 0 条业务数据，最坏代价是重建 schema + 重新 `superuser upsert` 一次 |
| 属性侧栏抹掉批注/笔记（整包 content 覆盖）                            | M5/M6/M7 在属性侧栏改「内容链接」           | **已由 R13 在 M1 消除**（改用活值 + 半边合并）；G1 第 8/9 条就是它的回归验收。若 G1 时发现改不动，M5/M6/M7 开工前必须先解决 |
| 真机（一加平板 + 手写笔）不可用，批注手感无法验收                      | M5/G5                                      | 先按 R23 用 `http://localhost:3000` 试（同 netns ⇒ 平板 localhost = 容器监听 = secure context）；仍不行则降级为「DevTools 指针伪造（annotation §8.2 的 getter 覆写）+ 鼠标」，并把 P95 延迟标为「环境受限，未验收」 |
| `motion` / RGL 与 React 19 + Next 16 打包不兼容                        | M4/G4、M10/G10                             | 每章装完依赖立刻跑一次 `pnpm --filter=web build`，不通过就换方案（岛退回 CSS transition + `linear()`；网格退回自研 + `@dnd-kit`） |
| `react-grid-layout@^2.3.0` 的 `useContainerWidth` 不是 named export     | M10 第一步                                 | **M0 已解除**（`npm pack` 读 `dist/index.d.ts`：`useContainerWidth` / `verticalCompactor` 都是具名导出，见 [spine.md §附](./spine.md#待验证-6-的结案)）。剩余风险只在**打包**：M10 装完立刻跑 `pnpm --filter=web build`；不通过就退回「不装 RGL 自研网格 + `@dnd-kit`」这条已登记的退路 |
| `packages/ui` 的 `exports` 通配（`./components/*` → `./src/components/*.tsx`）**跨两级目录**匹配无先例 | M8/M10 按路径 import `preview-block/previews/*`、`dynamic-island/panels/*` | 已有同级先例（`packages/dataview/src/shared/card-cover.tsx:26`）。M10 第一次 typecheck 就是它的判定点；失败则在 `exports` 里补一条具体子路径（主 agent 独占文件） |
| `NodePreviewBody` 的**文件名与导出名尚未冻结**（M2 的交付物）           | M8、M10 都要 import 它                     | 两章都写成「先按路径 import `preview-block/previews/*`，M2 的 `NodePreviewBody` 落地后替换是纯替换」。**M2 的 G2 通过时应把最终文件名写进本表**，否则 M8/M10 的 import 会各写一个 |
| HLS 打包后的时间轴与原始文件不一致                                     | M6/G6 的笔记跳转                           | 已给可执行取数步骤（PB 后台临时删/恢复 `hlsUrl`，两次 `Mod-Enter` 读数比 `\|t1−t2\|`，本机 `ffprobe` 交叉验证）。>1s 且归因到打包参数（`-copyts` / `-start_at_zero` / `HLS_SEGMENT_SECONDS`）即**挑战 R3**：停手报主 agent，不许顺手改 `backend/` |
| `pdfjs-dist` 客户端 worker 在 Turbopack 下 404                         | M7/G7                                      | 主路径 `GlobalWorkerOptions.workerPort`（`worker_options.d.ts:8`）；兜底是静态资源，但**需要新建 `apps/web/public/`**（今天不存在，属跨包改动 → 主 agent 决策）；再兜底 iframe |
| 子 agent 伪造引用 / 越界改文件                                        | 任意并行窗口                               | §2.4 四步验收，逐条跑，不跳步                                                                             |
| 后端在 M1 一次做完，改动面大（10 个 entity 子类 + 10 份 `baseProps` + 3 处白名单）导致 review 困难 | M1                                    | M1 内部按「interfaces → domain → application/DTO → infra」四段提交（同一章内的分段提交），每段 `typecheck` 过再进下一段；G1 仍是唯一的用户闸门 |
| 五份设计文档的「待验证」项在真机/浏览器上被证伪                        | 各闸门                                     | 就地决策 + 登记 §9；不改设计文档正文                                                                      |
| **浏览器侧后端地址曾硬编码 `localhost`**（`ws://localhost:3001`、`http://localhost:8090`） | 任何**非本机**浏览器的使用 | **M0.1 已修**（R37）：改为按 origin 解析 —— 回环保持原样，非回环走同域 `/trpc` 与 `/pb`。**剩余依赖是宿主配置**：nginx 必须加下面两条 location，否则闸门仍只能由主 agent 用 curl 代验。SSH 本地转发降为备选（仍可行，且对改动前的老代码也有效） |
| **可清空的 json 列在 PB 的 `update`（部分更新）下写 `undefined` = 保留旧值** | 任何「清空某个可空字段」的写路径 | **M1 已修一处、并立成规矩**：`toRecord` 里 `icon` / `cover` 必须写 `node.icon ?? null` / `node.cover ?? null`（实测：写 `undefined` 时 PB 保留旧值，`{icon:null}` 清不掉）。反向规矩同样重要：`annotations` / `timestampNotes` 的 `undefined` 反而是**期望**（半边合并：缺键保留旧值），不许顺手改成 `?? null`。**待验证**：既有的 `filterConfig: node.content.filterConfig ? … : undefined`、`stateData: node.stateData` 是否也需要显式 null —— M1 未碰（`CollectionNode.clearFilter` 目前无 UI 入口） |
| **活动库的 `nodes` 表没有 `created` / `updated` 列**（`pb/pb_migrations/1700000000_initial_schema.js` 的 nodes 定义里本来就没有；只有 `files` 定义了 autodate） | 任何按时间排序 / 显示时间的路径 | M1 实测（直读 sqlite + PB API 双向确认）：`record.created` / `record.updated` 恒为 `undefined`，而 domain 的 `create()` 用 `props.createdAt ?? new Date().toISOString()` 兜底 ⇒ **节点时间戳每次读取都变成「现在」**，`sort=-updated` 与「最近使用」没有真实语义。**不是 M1 引入的，本轮不修**（修它要给 `nodes` 加两个 autodate 列，等于改 schema 语义 + 需要新迁移号，超出 §4 账本）。登记在此，M12「最近使用」开工前必须解决 |

---

### 10.1 宿主 nginx 路由（M0.1 的配套配置，**由用户执行**）

容器内的服务监听 `:3000`（web）/ `:3001`（tRPC WS）/ `:8090`（PocketBase）。宿主的 openresty 目前只把 `dev.yuqi-666.cn` 转到 `:3000`，所以浏览器能打开页面却连不上后端。在 `dev.yuqi-666.cn` 的 server 块里加两条：

```nginx
    # tRPC WebSocket → 容器 3001
    # 不加尾斜杠 = 保留 /trpc 前缀。ws 服务是 new WebSocketServer({ port })，
    # 不校验路径，所以保留前缀即可（容器内已实测 101 升级成功）。
    location /trpc {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host       $host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # PocketBase REST + /api/files + 后台 → 容器 8090
    # 加尾斜杠 = 剥掉 /pb 前缀，PB 仍然看到 /api/...（容器内已实测）
    location /pb/ {
        proxy_pass http://127.0.0.1:8090/;
        proxy_set_header Host       $host;
        proxy_set_header X-Real-IP  $remote_addr;
        client_max_body_size 1024m;   # 上传是「浏览器 → PB」直连，默认 1m 会挡大文件
    }
```

`nginx -t && nginx -s reload` 之后：

- 应用：`https://dev.yuqi-666.cn/register` → 注册 → 登录 → `/graph`
- **PB 后台：`https://dev.yuqi-666.cn/pb/_/`**，账号 `admin@dbrain.dev`（密码在 gitignored 的 `pb/pb_data/.superuser-credentials.txt`）—— 顺带解决「PB 后台在你的机器上不可达」，G1 起所有「在 PB 后台核对」的条目你都能自己看
- `client_max_body_size` 是必需的：上传不走 tRPC，是浏览器直接 `XMLHttpRequest` 打 PB（[upload.ts:194](../../packages/api-client/src/upload.ts)）

**已在容器内用等价代理实测**（`/pb/api/health` → 200 且前缀已剥、`/pb/_/` → 200、`/trpc` → 101 且 tRPC 服务端打印 `Client connected`）。唯一未验的是宿主 nginx 本身（它在我的沙箱外，无 sudo）。

---

## 11. 本轮不做的范围

1. **不拆 workspace 循环依赖**（§8）。修 turbo 任务图就够，不重构包边界。
2. **不引入测试框架**（仓库无 vitest/jest，`packages/*/AGENTS.md` 与根 `AGENTS.md` 都把它列为 anti-pattern）。验证 = typecheck + lint + 浏览器/真机手测。
3. **不做旧数据批量迁移脚本**（text 走惰性升级；新列对旧记录天然读作空）。
4. **不动 `FlowGraph`**（`@workspace/graph` 的 flow 模式仍是占位壳，本轮无需求）。
5. **不改 `docs/proposal/**` 与五份设计文档正文**，除「待验证」回填。

---

## 12. 章节文件索引

| 文件                                       | 覆盖里程碑 | 闸门   |
| ------------------------------------------ | ---------- | ------ |
| [spine.md](./spine.md)                     | M0、M1     | G0、G1 |
| [node-content-ui.md](./node-content-ui.md) | M2、M3     | G2、G3 |
| [annotation.md](./annotation.md)           | M5、M7     | G5、G7 |
| [media.md](./media.md)                     | M6         | G6     |
| [dynamic-island.md](./dynamic-island.md)   | M4、M8、M9 | G4、G8、G9 |
| [dashboard.md](./dashboard.md)             | M10、M11、M13 | G10、G11、G13 |
| [baseline.md](./baseline.md)               | M0 产出（回归基线快照与重跑脚本） | ——     |
| [gates.md](./gates.md)                     | 闸门台账（**唯一的进度真相源**）  | 全部   |
