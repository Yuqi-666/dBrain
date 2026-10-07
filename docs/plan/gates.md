# 闸门台账

> 这是本批次的**唯一进度真相源**。里程碑进度以本文件的「状态」列为准，不以提交历史或口头约定为准。
> 规程见 [README.md §6](./README.md#6-闸门规程用户介入)。用户操作清单在**各章文件**里（本文件只记结论与迭代）。

**状态图例**

| 状态            | 含义                                                                       |
| --------------- | -------------------------------------------------------------------------- |
| `未开工`        | 该章代码尚未开始                                                            |
| `开发中`        | 主 agent / 子 agent 正在实现，闸门尚未提交给用户                            |
| `待测`          | 已实现、自检（typecheck + lint diff + `agent-browser` 预跑）通过，等用户实测 |
| `不通过 (n)`    | 用户实测有失败项，迭代轮次 n；失败项与归因见该条目                          |
| `通过`          | 三条通过判据全部满足（[README.md §6.2](./README.md#62-通过判据三条同时满足)） |
| `环境受限`      | 该条部分项目在本机无法验收（如真机、secure context），已记录降级验收方式      |

---

## 1. 总表

| 闸门 | 里程碑                     | 章文件                                     | 状态   | 轮次 | 日期 | 遗留 |
| ---- | -------------------------- | ------------------------------------------ | ------ | ---- | ---- | ---- |
| G0   | M0 基线与验证闭环          | [spine.md](./spine.md#m04-闸门-g0--用户操作清单) | 通过 | 1    | 2026-10-06 | 见 §5 |
| G0.1 | M0.1 浏览器可达性前置      | [README.md §10.1](./README.md#101-宿主-nginx-路由m01-的配套配置由用户执行) | 通过 | 1 | 2026-10-06 | 见 §5 |
| G1   | M1 数据脊柱                | [spine.md](./spine.md#m14-闸门-g1--用户操作清单) | 通过 | 1    | 2026-10-06 | 见 §5 |
| G2   | M2 图标与封面              | [node-content-ui.md](./node-content-ui.md) | 通过 | 3    | 2026-10-06 | 见 §5 |
| G3   | M3 text 单块 + rich-text 头部 | [node-content-ui.md](./node-content-ui.md) | 通过 | 2    | 2026-10-07 | 见 §5 |
| G4   | M4 灵动岛 P0               | [dynamic-island.md](./dynamic-island.md)   | 待测 | 1    | 2026-10-07 | 见 §5 |
| G5   | M5 image 批注              | [annotation.md](./annotation.md)           | 未开工 | —    | —    | —    |
| G6   | M6 媒体与时间戳笔记        | [media.md](./media.md)                     | 未开工 | —    | —    | —    |
| G7   | M7 PDF 自绘与批注          | [annotation.md](./annotation.md)           | 未开工 | —    | —    | —    |
| G8   | M8 灵动岛 P1 预览面板      | [dynamic-island.md](./dynamic-island.md)   | 未开工 | —    | —    | —    |
| G9   | M9 灵动岛 P2+P3 搜索与清理 | [dynamic-island.md](./dynamic-island.md)   | 未开工 | —    | —    | —    |
| G10  | M10 dashboard P0           | [dashboard.md](./dashboard.md)             | 未开工 | —    | —    | —    |
| G11  | M11 dashboard P1           | [dashboard.md](./dashboard.md)             | 未开工 | —    | —    | —    |
| G12  | M12 selectors P2 收尾      | [node-content-ui.md](./node-content-ui.md) | 未开工 | —    | —    | —    |
| G13  | M13 dashboard P2+P3        | [dashboard.md](./dashboard.md)             | 未开工 | —    | —    | —    |

**并行窗口登记**（[README.md §3.2](./README.md#32-并行窗口必须由主-agent-显式开启并登记到-gatesmd)）：**W1 已开启并已关闭**（2026-10-06：四路全部交付、复核通过、四条提交落地，见 §5 G2）；其余未开启。开工时在此登记一行，写明该窗口的 owner、文件白名单与「相交面为空」的依据。

| 窗口 | 章        | 开启前提（必须已落地）                                                        | 登记状态 |
| ---- | --------- | ----------------------------------------------------------------------------- | -------- |
| W0   | M4 ∥ M2/M3 | M0 过 G0（registry 可写，`motion` 装得上）                                     | **不再需要**（2026-10-07：M2/M3 已过 G2/G3，M4 串行开工；`motion` 已装 `12.43.0`） |
| W1   | M2        | **✅ 已满足**：G1 通过 + 主 agent 冻结提交（`NodeIconViewProps` / `media/**` 五个原子件 / `FileDropZone` 的 `icon`+`cover` variant / `NodePreviewBody`+`PreviewBodyProps`） | **已关闭**（2026-10-06；四路交付 + 四条提交） |
| W2   | M5        | 主 agent 冻结 `annotation/types.ts` 与 `geometry.ts` 签名（另独占 `annotation-layer.tsx`） | 未开启   |
| W3   | M10       | 主 agent 冻结 `DashboardItem`/`DashboardLayout`、`dashboardStore` 切片、`dashboard-config.ts` | 未开启   |
| W4   | M13       | M11 已落 `dashboard_pages` 的 tRPC 契约；`dashboard-header.tsx` 由主 agent 先写成两个插槽 | 未开启   |
| W5   | M6        | 主 agent 冻结 `media/types.ts`（`MediaController` / `TimestampNoteMarks` / `formatTimeMs`） | 未开启   |

**W1 的四路白名单与「相交面为空」的依据**（owner 均为子 agent，主 agent 只持有冻结面）：

| 路 | 文件白名单 | 与另三路的相交面 |
| -- | ---------- | ---------------- |
| W1-A | 新增 `node-media/**`（`node-icon-view.tsx` 的**函数体**、`node-type-icons.ts`、`emoji-set.ts`、`media/**` 五个原子件的**函数体**）；**不含**两个 `*-selector-popover.tsx` | 只改自己目录下的文件体；冻结的 props 签名不得改 |
| W1-B | `dialog/editor/content/file-drop-zone.tsx`（`buildNodeUpdates` 两个新分支、`DisplayFieldDropZone` 函数体、`UploadDropZone` 的 `onUploaded` 透传） | 唯一副本；与 A 只通过 `variant="cover"` 的**类型**相交（冻结已定） |
| W1-C | `preview-block/**`（`node-preview-body.tsx` 函数体、`preview-block.tsx`、`preview-header.tsx`、`node-preview-cover.tsx`、`index.ts`） | A 提供 `node-type-icons.ts`；冻结已钉死 `NODE_TYPE_ICONS` 的**导入路径**，A 只负责让该文件存在 |
| W1-D | 新增 `node-media/icon-selector-popover.tsx` | 只用 A 的原子件与冻结签名；与 A 的文件集不相交 |

**明确不开窗的章**：M7（pdfjs 渲染 / 批注坐标链 / toolbar 三面都改 `geometry.ts` 或 `annotation-canvas.tsx`）、M3（编辑器与只读渲染器共享同一 schema 文件）。

---

## 2. 单条闸门的记录格式

复制下面这段填。**「用户结论」一栏必须是用户的原话或明确判定**，不能由主 agent 代写。

```markdown
### G<n> — <里程碑名>

- 状态：待测 / 不通过 (n) / 通过 / 环境受限
- 提交：`<sha>`（该章的提交序列）
- 自检：typecheck diff = <新增 0 / 消失 n>；lint diff = <…>；`agent-browser` 预跑 = <截图路径 / 未做>
- 用户操作清单：见 <章文件> §<n>
- 用户实测结果：
  | # | 结果 | 证据 | 备注 |
  | - | ---- | ---- | ---- |
  | 1 | ✅ / ❌ | | |
- 失败项与归因：（实现缺陷 / 设计缺陷 → 已登记 README §9 Rn / 环境受限 → 降级方式）
- 迭代：
  - G<n>-r1：<改了什么> → 重测结果
- 遗留不阻塞项：（逐条，含「谁在什么时候补」）
- 用户结论：（原话）
```

---

## 3. 迭代记录规则

1. **同一闸门重测不算新章节**，只加一条 `G<n>-r<m>`。轮次从 1 开始，`不通过 (n)` 的 n = 当前轮次。
2. 每次迭代都要在**同一条目**里记「改了什么」——不要新开条目，否则历史会散。
3. 失败归因只有三种（[README.md §6.3](./README.md#63-不通过时的处置)）：实现缺陷 → 回改；设计缺陷 → 登记 [README.md §9](./README.md#9-与设计文档的偏差登记) 后就地决策；环境受限 → 记降级方式并标 `环境受限`。
4. **禁止**在闸门未通过时开工下一个里程碑（W0 这类已登记的并行窗口除外，且仍需分别判定）。
5. 每轮重测前都要跑一次 `bash docs/plan/baseline.sh`，把 diff 贴进条目——否则「无新增错误」这条判据没有证据。

---

## 4. 用户操作清单的位置索引

| 闸门 | 清单所在节                                                          | 特别说明                                                     |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| G0   | [spine.md §M0.4](./spine.md)                                         | 第 4 条（起服务）可并入 G1                                    |
| G1   | [spine.md §M1.4](./spine.md)                                         | 第 4/5 条在 **PB 后台**验写路径，不依赖前端 UI                 |
| G2   | [node-content-ui.md](./node-content-ui.md)                           | 图标/封面的四种来源 + 键盘可达性 + 不碰 `content` 的抓包证据   |
| G3   | [node-content-ui.md](./node-content-ui.md)                           | text 旧形状惰性升级 + 头部与正文不互相覆盖                     |
| G4   | [dynamic-island.md](./dynamic-island.md)                             | 形变可打断 / 原点从底部 / `prefers-reduced-motion` 降级        |
| G5   | [annotation.md](./annotation.md)                                     | **真机笔测试**是主闸门；第一步先实测 `http://localhost:3000` 能否从平板访问（R23：同 netns 下它就是 secure context） |
| G6   | [media.md](./media.md)                                               | 时间戳跳转 ±0.5s + HLS 时间轴偏移 + 并发写者不互相抹除         |
| G7   | [annotation.md](./annotation.md)                                     | 第 3 页的圈在缩放/翻页/旋转后仍贴合 + worker 不 404 + iframe 降级 |
| G8   | [dynamic-island.md](./dynamic-island.md)                             | `isFocus` 语义与今天一致 + 触摸端点击触发                      |
| G9   | [dynamic-island.md](./dynamic-island.md)                             | `Tab` 能正常遍历 + 全仓无 `quick-panel` 引用                   |
| G10  | [dashboard.md](./dashboard.md)                                       | RGL 交互手感；**刷新丢几何是预期**（R6），不判失败              |
| G11  | [dashboard.md](./dashboard.md)                                       | 只读 widget（`canEditViews=false`）+ 刷新后几何不变            |
| G12  | [node-content-ui.md](./node-content-ui.md)                           | 裁剪不改原 blob + 离线时 P0 的 tab 不受影响                    |
| G13  | [dashboard.md](./dashboard.md)                                       | 抽屉拖入落点 + 多页面深链 + worker 数量 = 1

---

## 5. 闸门记录

### G0 — M0 基线与验证闭环

- 状态：**通过**（2026-10-06 · 第 1 轮）
- 提交：`578f4e5`（turbo 任务图 + 根脚本）、`ac6a0f0`（interfaces 死 re-export）
- 自检：
  - `pnpm check-types` → `Tasks: 14 successful, 19 total`，无 `Cyclic dependency detected`，非 `0 total` ✅
  - `pnpm lint` → `Tasks: 11 successful, 20 total`，`Failed:` 9 个包与 [baseline.md §3](./baseline.md#3-lint-基线20-任务11-通过--9-失败) 逐条一致 ✅
  - `bash docs/plan/baseline.sh` → 两段都打印 `✓ 与基线一致（0 新增，0 消失）` ✅（M0 重采时的基线：typecheck 213 行 / lint 26 行；**M1 又为「行号漂移」加了第三类归一化并重采为 `N× <错误>` 计数格式 → typecheck 183 条 / lint 26 条**，见 [baseline.md §1.1](./baseline.md#11-归一化里必须抹掉的三类假差异m0-两类--m1-一类)）
  - `pnpm dev:full` 起三方：PB `127.0.0.1:8090` / web `:3000`（Next 16.1.6 + Turbopack）/ tRPC `:3001` 均在监听 ✅
  - `_migrations`（直读 `pb/pb_data/data.db`）：应用迁移只有 `1700000000_initial_schema.js`，另有 8 条 PB 自带迁移，无多余条目 ✅
  - `agent-browser` 预跑：**未做**（G0 无手感项；`/graph` 在登录墙后，主 agent 无凭据）
- 用户操作清单：见 [spine.md §M0.4](./spine.md#m04-闸门-g0--用户操作清单)
- 用户实测结果：

  | # | 结果 | 证据 | 备注 |
  | - | ---- | ---- | ---- |
  | 1 | ✅ | `Tasks: 14 successful, 19 total` | 主 agent 已跑；用户复核 `pnpm check-types` 无 `Cyclic dependency detected`、非 `0 total` |
  | 2 | ✅ | `Tasks: 11 successful, 20 total`，`Failed:` 9 个包 | 与 [baseline.md §3](./baseline.md#3-lint-基线20-任务11-通过--9-失败) 逐条一致 |
  | 3 | ✅ | 两段 `✓ 与基线一致（0 新增，0 消失）` | —— |
  | 4 | ✅ | 用户 `pnpm dev:full` 实测：应用能起、`/graph` 路由能渲染 | 库 0 节点 ⇒ **空图不算失败**（见下方「期望按实测改」）；第 4 条只判「应用能起、路由能渲染、控制台无 `unknown field`」 |
  | 5 | ✅ | `_migrations` 应用迁移只有 `1700000000_initial_schema.js` | 主 agent 直读 sqlite；迁移未跑前用户浏览器侧连不上后端（→ M0.1/R37） |

- 失败项与归因：暂无
- 迭代：
  - G0-r0（开工前的工具修正，不是失败轮次）：`baseline.sh` 的归一化补了两条**假差异**规则 —— ① pnpm 的 `exit code N` 数字（`apps/web` 的 `tsc --noEmit` 冷跑 2 / 热跑 1）；② TS 对象字面量成员顺序（`server:` 的 `edge-semantic.ts(31,80)` TS2345）。证据见 [baseline.md §1.1](./baseline.md#11-归一化里必须抹掉的两类假差异m0-实测补充)。**这不是实现缺陷，是采集工具的噪声**，不改变任何错误集。
- 遗留不阻塞项：
  1. 「M0 可选修复」（7 个包补 flat config、`desktop` 的 `next lint`、拆包环、editor 的 67 个 lint error）按 [baseline.md §4](./baseline.md#4-m0-可选修复默认不做需要时单独开章) **不做**。
  2. [spine.md §附](./spine.md#附本章待验证回填清单) 的待验证 1 / 2 / 5（`new Field({type:"json"})`、`removeByName` 的 `down`、PB 版本一致性）**名义上归 M1 实跑**，不是 G0 的验收面。
- 用户实测结果补充（2026-10-06）：用户报告**「无法初始化数据库，初始注册链接从我的机器访问不了」**。归因：**环境**（不是实现缺陷）—— ① PB 的超级管理员安装确实**从未完成**（`_superusers` 只有 PB 自己的 `__pbinstaller@example.com` 占位账号 + 一个已打印到终端的 install token）；② PB 只绑 `127.0.0.1:8090`，用户浏览器在另一台机器（经宿主 openresty 访问 `dev.yuqi-666.cn` → 容器 `:3000`）。**处置**：主 agent 用 `./pb/pocketbase superuser upsert` 完成安装（`admin@dbrain.dev`，密码落 gitignored 的 `pb/pb_data/.superuser-credentials.txt`，REST 实测 200），并删除带泄漏 token 的占位账号。**install 链接从此不再需要。**
  - ⚠️ **G0 第 4 条的期望要按实测改**：库里 `nodes` **0 行**（原计划假定有真实数据），所以 `/graph` 打开后是**空图**——空图不算失败；第 4 条只判「应用能起、路由能渲染、控制台无 `unknown field`」。另：G1 第 3/8/9 条需要「既有 text/image/audio 节点」，**这些节点不存在**，需用户在注册登录后先造几个（记入 G1 前提）。
  - 该报告直接推出 **M0.1（R37）**：浏览器侧后端地址硬编码回环 ⇒ 用户浏览器连不上后端。见下条。
- 用户结论：**「M0已验证」**（2026-10-06）。据此判定 `通过`；三条通过判据：① 清单 5 条全过（第 4 条按上面「期望按实测改」的口径判）；② `baseline.sh` diff 两段均为 0 新增；③ 回归面（`/graph` 可用性）无退化。

### G0.1 — M0.1 浏览器可达性前置

- 状态：**通过**（2026-10-06 · 第 1 轮）
- 提交：`4bc4609`
- 自检：
  - 代码：新增 `packages/api-client/src/backend-urls.ts`（`resolveBackendUrls()`），`trpc/client.ts:32` 与 `apps/web/app/providers.tsx:15` 改为消费它；从 `@workspace/api-client` 导出
  - 分支实测（`node` 直跑，5 个上下文）：`https://dev.yuqi-666.cn` → `wss://dev.yuqi-666.cn/trpc` + `https://dev.yuqi-666.cn/pb`；`http://<host>:8080` → `ws://…:8080/trpc` + `http://…:8080/pb`；`localhost` / `127.0.0.1` → **原样** `ws://localhost:3001` + `http://localhost:8090`（本地开发路径不变）；无 `window`（SSR）→ 回环默认值 ✅
  - 路由语义：容器内起等价代理（`/trpc` 保前缀、`/pb/` 剥前缀），实测 `/pb/api/health` → `200 {"message":"API is healthy."}`、`/pb/_/` → `200`（**PB 后台也可达**）、`/trpc` → **`101 Switching Protocols`** 且 tRPC 服务端日志出现 `Client connected from ::ffff:127.0.0.1` ✅
  - `pnpm --filter=@workspace/api-client typecheck` 通过；`lint` 仅剩既有的 1 条 `TOKEN_COOKIE` 警告 ✅
  - 全仓 `bash docs/plan/baseline.sh` → 两段都 `✓ 与基线一致（0 新增，0 消失）` ✅
  - **未做**：宿主 nginx 本身（在主 agent 沙箱外、无 sudo）；真实浏览器加载（无浏览器工具）
- 用户操作清单：
  1. 在 `dev.yuqi-666.cn` 的 nginx server 块加 [README §10.1](./README.md#101-宿主-nginx-路由m01-的配套配置由用户执行) 的两条 `location`，`nginx -t && nginx -s reload`
  2. 浏览器开 `https://dev.yuqi-666.cn/register` → 注册一个账号 → 登录
  3. 期望：不再卡在登录/注册（改前会转圈或报错，因为 `localhost:3001` 指向你自己的机器）；登录后 `/graph` 可渲染（空图，因为库里 0 节点）
  4. 顺手核一下 PB 后台：`https://dev.yuqi-666.cn/pb/_/`，账号 `admin@dbrain.dev`
- 用户实测结果：

  | # | 结果 | 证据 | 备注 |
  | - | ---- | ---- | ---- |
  | 1 | ✅ | 宿主 nginx 已加 `/trpc` 与 `/pb/` 两条路由 | 用户执行（`nginx -t && nginx -s reload`） |
  | 2 | ✅ | `https://dev.yuqi-666.cn/register` 注册登录正常 | 不再转圈/报连不上；tRPC WS 与 PB REST 都已透过反代可达 |
  | 3 | ✅ | 登录后 `/graph` 可渲染 | 空图（库 0 节点），符合预期 |
  | 4 | ✅ | PB 后台可达 | 与第 2 条同一条反代路径 |

- 失败项与归因：暂无
- 迭代：——
- 遗留不阻塞项：
  1. 上传大文件的 `client_max_body_size` 若漏配，表现为「上传到 100% 后失败」——属 nginx 配置，不是代码
  2. 老数据若在 content 里存了**绝对** `http://localhost:8090/api/files/…`，`resolveFileUrl` 会原样返回（该分支刻意保留）。当前库是空的 ⇒ 无影响；将来导入老数据时要注意
- 用户结论：**「已加路由，注册登录正常，G0.1 通过」**（2026-10-06）。⇒ G0、G0.1 均为 `通过`，**M1 开工前提已满足**；G1 起所有闸门用户都能在浏览器里实测。

### G1 — M1 数据脊柱

- 状态：**待测**（第 1 轮；自检 + 三条真机探针全绿）
- 提交：`2b6bbf7`（interfaces 形状 + `null` 哨兵）→ `3a9b5ee`（domain）→ `357f59a`（迁移 + 基线第三类归一化）→ `4aec001` + `35af438`（application/DTO/tRPC + infra mapper）→ `153e6cf`（共享写者 + doc-normalize）→ `22fb180`（attributes-sidebar 修）→ `3d8c1a4`（清空哨兵写显式 `null`）→ `1d67b4d`（doc-normalize 空串）→ `b70eaaf`（apps/server paths + 基线重采）
- 自检：
  - **typecheck diff**：`bash docs/plan/baseline.sh` → **0 新增 / 47 消失** ✅。消失的 47 条全是 `server:` 段噪声，根因是 `apps/server/tsconfig.json` 漏了 `@workspace/interfaces` / `@workspace/utils` 的 `paths`（见 R38）；补上后 `pnpm --filter=server typecheck` **零诊断**，全仓 `Tasks: 15 successful, 19 total`（`Failed:` 只剩 editor / interfaces / ui / web）。
  - **lint diff**：`bash docs/plan/baseline.sh` → **0 新增 / 3 消失** ✅（`@workspace/ui` 31 → 28，attributes-sidebar 去掉 2 条 `no-explicit-any` + 1 条 unused directive）。
  - **四个后端层 typecheck 全绿** ✅（domain / application / infrastructure / adapter-back / adapter-front；这是 M1 唯一的硬判据）。
  - **`@workspace/interfaces` 仍只剩环的那 1 条** ✅（M1 新增两个文件 + 若干 barrel 导出后未增）。
  - **迁移**：`./pb/pocketbase migrate up` → `Applied 1700000001_node_extras.js`，`nodes` 字段 32 → 36；`printf 'y\n' | ./pb/pocketbase migrate down 1` → `Reverted …`，字段回到 32；再 `up` 回到 36 ✅（`down` 用的是 `removeByName`，真的能跑）。
  - **`agent-browser` 预跑**：未做（无浏览器工具）。替代物是四条**真机探针**（`tsx` 起真 `AppContainer` + 真 PocketBase，不是 mock），全绿 —— 明细见「主 agent 预跑证据」：① 写路径/哨兵 6/6；② **既有 27 条数据的读路径 168/168**（覆盖库里现存的 9 种节点类型，正是 G1 第 3/7 条用户要打开的那批数据）；③ **半边合并 8/8**（拿 `database` / `rich-text` 两条**活**记录做同值写，证明另一半不被抹除，且落库快照零漂移）；④ **tRPC 路由层 24/24**（`appRouter.createCaller` 直打浏览器真正走的那条链：`protectedProcedure` 鉴权 + zod 白名单 + command service + PB 落库，跑完把两条探针节点原样恢复）。
  - **G1 第 3 条因此提前拿到硬证据**：`nodeQueryService.listByWorkspace` → `NodeMapper.toDomain` → `toNodeDTO` 对现有 `image ×6 / audio ×4 / website ×4 / text ×4 / pdf ×3 / video ×3 / database ×1 / rich-text ×1 / webpage ×1` 全部无抛错、无 `null` 哨兵泄漏、`getById` 与 `list` 逐字段一致（时间戳除外，见遗留 2）。
  - **G1 第 4/5/8/9/10 条也提前在「浏览器真正走的层」验过**：`node.update` 的 content 是 `z.any()`（不是会剥键的 `z.object`）⇒ 批注/笔记半边合并、`icon: null` 哨兵、非法 icon 被拒，全部在 router 层成立；`getById` / `listByWorkspace` 的输出也没有被剥键。
- 用户操作清单：见 [spine.md §M1.4](./spine.md#m14-闸门-g1--用户操作清单)。**按实测调整四处**：
  1. 第 1/2 条**已经由主 agent 代跑并留证**（迁移已应用、四列已在）；你只需在 PB 后台复核一眼。
  2. 第 3/8/9 条**不要用 text 节点**：库里的 25 条是 `packages/dev` 的演示数据，其中 `text` 节点的 `docs` 是 `null`、正文被 seeder 塞在 `content` 的**字符串**里，打开会显示 `{` —— 这是 seeder 的形状，不是 M1 引入的；M3 的 `normalizeDoc` 才会修它。请改用 **image / audio / pdf** 节点（它们的数据是好的）。
  3. 第 4/5/8/9 条的「既有节点」直接用主 agent 造的两条探针节点（在你的工作区里，标题以 `M1 自检 ·` 开头，可删）：`M1 自检 · image（可删）` 已经带了一层 `annotations`，`M1 自检 · audio（可删）` 已经带了一条 `timestampNotes`。
  4. 第 7 条的 **collection 半条跳过**：实测库里没有 `collection` 节点（只有 1 个 `database`：`Component Inventory`），「切两个视图」没有现场对象；database 那半条照验。探针 #3 已在后端侧代跑过这条的写路径。
- 主 agent 端到端预跑证据（`apps/server/src/__m1-probe.ts`，跑完即删；真 `AppContainer` + 真 PocketBase，不是 mock）：
  ```
  1) createNode(image) → DTO icon/cover = {"icon":{"kind":"emoji","value":"🧠"},"cover":{"kind":"image","url":"…"}}
     record after create = {"icon":{…},"cover":{…},"content":"…/m1-probe.png","annotations":null}
  2) after annotations-only patch (url must survive) = {"content":"…/m1-probe.png","annotations":{"version":1,"items":[{"kind":"stroke",…}]}}
  3) after url-only patch (annotations must survive)   = {"content":"…/m1-probe-2.png","annotations":{…}}      ← 坑 1 / R13 的回归点
     DTO content = {"url":"…","annotations":{…}}
  4) after {icon:null} (icon cleared, content untouched) = {"icon":null,"cover":{…},"annotations":{…}}         ← 坑 8 哨兵
     DTO icon = undefined
  5) audio after notes-only patch (url must survive) = {"content":"…/m1-probe.mp3","timestampNotes":[{…,"timeMs":3000}]}
     DTO content = {"url":"…","timestampNotes":[…]}
  6) read-path DTO keys = {"hasIcon":true,"hasCover":true,"hasAnnotations":true}
  ```
  第 4 步第一次跑时**失败**（`icon` 没清掉）：domain 的 `clearIcon()` 是正确的，但 `toRecord` 写的是 `icon: node.icon`（清空后为 `undefined`），PB 的 `update` 是**部分更新** ⇒ 缺键 = 保留旧值。修法是 `icon: node.icon ?? null` / `cover: node.cover ?? null`（提交 `3d8c1a4`），并立了反向规矩：`annotations` / `timestampNotes` **不许**改成 `?? null`（半边合并依赖「缺键保留」）。已登记 [README §10 风险表](./README.md#10-风险登记)。

  探针 #2（`apps/server/src/__m1-readpath.ts`，跑完即删）—— **既有数据的读路径**，喂的是真库里的 27 条：
  ```
  每条节点断言：id/title/permission、tags[]/isPinned、时间戳可解析、
                icon/cover 无 null 哨兵、该类型的 content 键齐全、getById ≡ list（不含时间戳）
  类型分布：audio 4 · database 1 · image 6 · pdf 3 · rich-text 1 · text 4 · video 3 · webpage 1 · website 4
  === 结果：168 通过 / 0 失败 ===
  [已知缺陷·不计失败] 时间戳跨读取漂移：27/27 个节点两次读取的 createdAt/updatedAt 不同
  ```
  探针 #3（`apps/server/src/__m1-halfmerge.ts`，跑完即删）—— **半边合并在活数据上**（同值写 = 无副作用；先 REST 拍快照，有漂移就原样恢复）：
  ```
  ✓ database(Component Inventory) · 前置：views 非空 / fields·rows 非空
  ✓ database · 单元格写（**故意不带 views**）后 views 仍在        ← 第 7 条「表格改单元格」的后端面
  ✓ database · 单元格写后 fields/rows 长度不变
  ✓ rich-text(Frontend Architecture) · 只写 docs 后 referencedNodes 仍在   ← 半边拆分的回归点
  ✓ database · 改标题（同值）后 content 未变
  ✓ database / rich-text · 落库快照零漂移（moved=∅，无需恢复）
  === 结果：8 通过 / 0 失败 ===
  ```
  探针 #4（`apps/server/src/__m1-router.ts`，跑完即删）—— **tRPC 路由层**，`appRouter.createCaller({ userId })` 直打浏览器那条链（探针 #1/#2 都是直连 `nodeCommandService`，绕过了 zod 白名单与 `protectedProcedure`，所以这一层必须单独验）：
  ```
  ✓ 未登录 caller 被拒（protectedProcedure 生效）
  ✓ getById 返回 image / content.url 在 / annotations 未被 zod 剥掉 / icon 不是 null 哨兵 / cover 仍在
  ✓ listByWorkspace 返回 27 条（与直连一致）
  ✓ annotations-only 补丁（经 router）后 items = 2，且 content（url）未被清空     ← 第 4/8 条
  ✓ url-only 补丁后 content 是新值，annotations 仍在（2 条）                      ← 第 8 条反向
  ✓ audio notes-only 补丁后 notes = 2，content（url）未变                        ← 第 5/9 条
  ✓ icon 写入落库 → {icon:null} 落库为 null → DTO 读回 undefined               ← 第 10 条
  ✓ 清空 icon 没动 cover / annotations / content
  ✓ 非法 icon 被 zod 拒绝（校验器真的在生效，不是被绕过）
  ✓ 遗留 1 复核：add 路径的 annotations 确实被 `addSchema` 剥掉（content 只剩 url）
  ✓ 除被测字段外零漂移（image / audio）
  恢复两条探针节点原状… ✓ image 已恢复 ✓ audio 已恢复
  === 结果：24 通过 / 0 失败 ===
  ```
  关键事实：`update` 的 `content` 是 **`z.any()`**（`node.ts:305`），不是会剥键的 `z.object` —— 这正是批注 / 笔记半边合并能在浏览器里成立的前提；而 `add` 的 content 是各类 `z.object` 字面量，`annotations` / `timestampNotes` 不在其中，故 **遗留 1 是真实缺口**（新建时带批注会被静默剥掉），已在 [spine.md](./spine.md) / 下方遗留 1 登记。
- 失败项与归因：暂无
- 迭代：——
- 用户实测结果（2026-10-06）：用户在浏览器里实测后**一次性判定通过**（原话见下）；**未逐条留下截图或控制台证据**，因此下表按「用户整体判定」记，不虚构逐项证据。10 条清单的实际执行口径以本条上方「按实测调整四处」为准（第 1/2/4/5/6/10 条的后端面已由主 agent 用四条真机探针代验并留证；第 3/7/8/9 条为浏览器实测）。

  | # | 结果 | 证据 | 备注 |
  | - | ---- | ---- | ---- |
  | 1–10 | ✅（整体判定） | 用户原话「g1通过」，无逐条证据 | 后端面另有主 agent 的四条探针证据（6/6、168/168、8/8、24/24） |
- 遗留不阻塞项：
  1. **create 路径不支持 content 级新字段**：`addSchema` 的 image/pdf/audio/video content schema 仍只声明原有键（`imageContentSchema = z.object({ url })` 等），`createNode` 也不透传 `annotations` / `timestampNotes`；探针 #4 已实测确认这个缺口是真的（经 router `add` 一条带 `annotations` 的 image，落库后 `annotations` 为 `null`）。计划里没要求（M5/M6/M7 都走 update 半边），但「新建时就带批注」这条链路今天是断的。谁需要谁在 M5/M6 开工时补。
  2. **`nodes` 表没有 `created` / `updated` 列**（0 号迁移的 nodes 定义里本来就没有），domain 的 `create()` 用 `?? new Date()` 兜底 ⇒ 节点时间戳每次读取都变成「现在」。M1 未引入、未修，已登记为风险；**M12「最近使用」开工前必须解决**。探针 #2 给出实测口径：**27/27 条节点的两次读取时间戳都不同**（同一进程内相隔 10ms 的 `list` 与 `getById`），所以「按更新时间排序」今天恒等于「随机序」；这条不是 G1 的失败项，但它是 M12 的硬前提。
  3. `CollectionNode.clearFilter` 走 `filterConfig: undefined`，与遗留 1/风险表同族（PB 部分更新下清不掉）。当前没有 UI 入口，M1 未碰。
  4. 属性侧栏去掉 `debounce: true` 后写变成「下一个微任务」，比原先的 500ms 防抖更即时；`handleContentUrlChange` 的 `if (!node.content) return;` 守卫也一并去掉（content 恒存在，实测无差）。G1 第 8/9 条会实测其行为。
- 用户结论：**「g1通过」**（2026-10-06）。据此判定 `通过`；三条通过判据：① 10 条清单由用户整体判定通过（后端 6 条另有主 agent 探针证据）；② `bash docs/plan/baseline.sh` 两段均 0 新增；③ 回归面（`/graph` 可用性、dataview 七视图、四后端层 typecheck）无退化。⇒ **M2 开工前提已满足**，W1 窗口随之开启（见 §1 并行窗口登记）。

### G2 — M2 图标与封面

- 状态：**通过**（第 3 轮；第 1 轮实测报 3 条 → **G2-r1** 回改；第 2 轮报 2 条 → **G2-r2** 回改并做真浏览器探针 13/13；第 3 轮用户回复「G2 全通过」）
- 提交：`17ab977`（主 agent 冻结：`NodeIconViewProps` / `media/**` 五原子件 / `FileDropZone` 的 `icon`+`cover` variant / `NodePreviewBody` / `NODE_TYPE_ICONS` 单一真源）→ `f4801bd`（§M2.3-3 preview-block 抽取）→ `18fbcfc`（§M2.3-2 file-drop-zone 变体 + R4 半边合并）→ `a3dc123`（§M2.3-1 node-media 骨架 + `IconSelectorPopover`）→ `92229f7`（§M2.3-4 `CoverSelectorPopover` + 编辑器头部两按钮）
- 自检：
  - **typecheck diff**：`bash docs/plan/baseline.sh` → **0 新增 / 0 消失** ✅；`pnpm --filter=@workspace/ui typecheck` = **76 error**，与基线同数，且全部仍落在 `../editor/**`（非 editor 命中 **0**）。
  - **lint diff**：`bash docs/plan/baseline.sh` → **0 新增 / 0 消失** ✅；`pnpm --filter=@workspace/ui lint` = **28 problems / 0 error / 28 warning**，与基线同数。
  - **验收 grep**：`grep -rn "NodePreviewBody" packages/ui/src` = **5 命中**（定义 / JSDoc / index 导出 / preview-block 的 import+使用）；`grep -rn "nodeTypeIcons" packages/ui/src` = **0 命中**（本地表已删净）；`grep -c "lucide-react" icon-selector-popover.tsx` = **1**（只剩 UI 用的 `Ban`/`SmilePlus`，无第二份图标名表）。
  - **越界检查**：`git status --short` 全程只有 §M2.1 白名单内的文件（`node-media/**`、`preview-block/**`、`file-drop-zone.tsx`、`editor-header/*`）；`ui/**`、`backend/**`、`packages/interfaces`、`packages/graph`、`packages/dataview`、`package.json` 均未触碰，**零新依赖**。
  - **格式化**：三个新/改文件（`cover-selector-popover.tsx` / `node-icon-view.tsx` / `media-url-row.tsx`）已过 `prettier --check`。既有文件 `attributes-sidebar.tsx` / `options-menu.tsx` / `pin-button.tsx` 有 prettier 漂移，但它们在 HEAD 里就这样（M2 未碰）。
  - **写路径探针**（`apps/server/src/__m2-probe.ts`，跑完即删；真 `AppContainer` + 真 tRPC router + 真 PocketBase，动过的探针节点已从 REST 快照恢复）：**13/13 通过**
    ```
    ✓ cover {kind:"image"} 落库，且没动 content / annotations      ← 第 6 条
    ✓ cover {kind:"node"} 落库；DTO 读回仍是 {kind:"node"}（未被 zod / mapper 改写）  ← 第 7 条②
    ✓ icon 三键（kind/value/color）落库
    ✓ 上传替换 kind/value 后 color 仍在（「换图但保留底色」）        ← 第 5 条
    ✓ 写 icon 没动 cover / content
    ✓ {cover:null} 落库为 null；DTO 读回 undefined                 ← 第 7 条①
    ✓ 恢复后快照零漂移
    ```
- 并行窗口 **W1**（已关闭，四路 owner 与白名单见 §1）：

  | 路 | 交付 | 主 agent 复核 |
  | -- | ---- | ------------- |
  | W1-A | `node-icon-view.tsx`（四段回落链 + 168 条精选 Lucide 表 `LUCIDE_ICON_ENTRIES`/`LUCIDE_ICON_SET`）、`emoji-set.ts`（8 类 × 46 = 368）、`media/**` 五原子件；`MediaGrid` 的 roving tabindex 用 `useCommandState(search)` 重同步“唯一 tab stop” | 通过。**决策**：精选表留在 `node-icon-view.tsx`（不另拆 `lucide-set.ts`，纯搬运无收益）；`className` 定盒不定字形的约定由 `preview-header`/`node-icon-button` 的传参遵守 |
  | W1-B | `file-drop-zone.tsx`：`DisplayFieldDropZone` 真实现（只写顶层字段）、三 helper 退化为纯 patch、`writeContentPatch` 在 **await 之后**读活 content 再合并 | 通过，**但修掉一个缺陷**：icon 上传会重置已有 `color`，改为 `{ ...liveIcon, kind:"image", value }`（sel §7「换图但保留底色」是不变式）；`cover` 侧不合并（`{kind:"image"}` 无其他字段，展入 `{kind:"node"}` 会造出非法联合成员） |
  | W1-C | R1 抽取 `NodePreviewBody`（十路 dispatch 原样搬移）；`preview-header`/`node-preview-cover` 改读 `icon`/`cover`；`resolveCover()` 深度上限 1 的环保护 | 通过。逐处推演过 `A→A` / `A→B→A` / `A→B(image)` / `A→B(无 cover)` / 无 `resolveNode` 五种情形，均不递归；定位、`Esc`、`isFocus`、`data-preview-block` 未动 |
  | W1-D | `icon-selector-popover.tsx`：三 tab + 色板（8 色 + 无）+ 移除 + `aria-disabled` + 错误条，props 与 sel §4 逐字段一致 | 通过，**退回一处**：它自带第二份图标名表（~75 条），已改为消费 `LUCIDE_ICON_ENTRIES`（否则选中不在 A 表里的名字会静默回落，直接威胁第 3 条） |
- 用户操作清单：见 [node-content-ui.md §M2.4](./node-content-ui.md#m24-闸门-g2--用户操作清单)。**按实测调整几处**（入口改同域、可用节点、已知偏差、G2-r1 三条口径）——见该节开头前置说明的第 2/3/4/6 点。
- **第 1 轮实测（2026-10-06，G2-r1）**：用户报 3 条，全部定位到根因并回改；提交 `e463c89`。

  | #   | 现象                                              | 根因                                                                                                                                                                                                                              | 处理                                                                                                                                                                                                                                                                                     |
  | --- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | 1   | `icon-selector` **内部内容不能滚动**（溢出被裁）  | 上限压在 `Command` 的 inline `maxHeight` 上，却指望宿主 `flex-1 min-h-0` 的 `CommandList` 去滚。`height: auto` 的 flex 容器**不会**因自己的 `max-height` 收缩子项：368 格内容先按 max-content 算出 ≈1900px、再被钳到 384px，`Command` 的 `overflow-hidden` 把它裁掉，**整条链上没有任何滚动视口** | 上限压回 `CommandList` 自身（`[&_[cmdk-list]]:max-h-[calc(var(--media-body-cap)-2.25rem)]`，恢复仓库里既有的 `Popover + Command + CommandList` 滚动形状——`dataview/shared/field-picker.tsx`、`settings-panel.tsx` 在同一个编辑器弹窗里就是这么滚的）；外层包裹 `div` 用同一上限 + `overflow-y-auto` 作非 `CommandList` 体（上传 tab）的安全网；上限折入 `var(--radix-popover-content-available-height)`；`Command` 让出 `overflow-hidden`；搜索行 `sticky top-0 z-10 bg-popover` 钉在滚动视口顶 |
  | 2   | `icon-selector` 的**底色不能切回空**              | `handleColor(undefined)` 发的是 `{kind,value}`（**缺** `color` 键），宿主按 sel §7 用活值基底合并（`{ ...live, ...next }`）时保留旧色——**缺键与「别动颜色」不可区分**                                                                     | `handleColor` **总是**写 `color` 键（清除即 `undefined`）；对象展开会把显式 `undefined` 覆盖上去，PB 边界 `JSON.stringify` 再去掉该键，线上形状仍是 `{kind,value}`                                                                                                                            |
  | 3   | `cover-selector` 的 `URL` tab 多余（与上传同写一处） | 设计稿把 URL 当第三个来源，但它与 `上传` 写的是同一个目标（顶层 `cover`），tab 之间没有行为差异                                                                                                                                     | 删掉 `URL` tab 与其预览分支，`Or add via URL` 留在 `上传` tab 尾部；`COVER_TABS` 剩 上传 / 从节点选；`MediaPopoverTab` 的 id 注释去掉 `url`；sel §2/§6.3 与 §M2.4 同步改口径                                                                                                                  |

- 第 2 轮自检（回改后重跑，口径同首轮）：`bash docs/plan/baseline.sh` → typecheck / lint 两段 **0 新增 / 0 消失** ✅；已核对 Tailwind 实际产出 `[&_[cmdk-list]]:max-h-[calc(var(--media-body-cap)_-_2.25rem)] [cmdk-list]` 规则、以及客户端 chunk（`apps/web/.next/dev/static/chunks/packages_ui_src_components_node-media_*.js`）含新代码；改动仅 `node-media/**` 的 4 个文件 + 2 份文档，`ui/**` 基座、`backend/**`、`interfaces` 未碰，**零新依赖**。
- **测试环境提醒（已实测核实，非推断）**：本机 `http://127.0.0.1:3000/_next/webpack-hmr` 的 WebSocket 握手是 `101 Switching Protocols`，而经域名 `https://dev.yuqi-666.cn/_next/webpack-hmr` 是 **404**（`server: openresty`）——用户浏览器的 **HMR 通道不通**，页面不手动刷新就一直跑旧 bundle（同时可见新旧两份 chunk：`..._67d0d257._.js` 与 `..._ca112602_.js`）。⇒ **每轮实测前请刷新**（chunk 是 `cache-control: no-store`，普通 F5 即可）；要免刷新需在宿主 nginx 给 `/_next/webpack-hmr` 加 `Upgrade`/`Connection` 透传（属用户侧 M0.1 路由，主 agent 不改）。
- **第 2 轮实测（2026-10-06，G2-r2）**：用户报 2 点（「底色只在上传 tab 有了」「emoji / 图标 / 封面内容依然不能滚动」），并明确要求「写脚本自己检查」。据此搭了**真浏览器探针**（配方见 §6），定位到 G2-r1 **只修了一半**；提交 `e275532`。

  | # | 现象 | 根因（探针实测定位） | 处理 |
  | - | ---- | -------------------- | ---- |
  | 1 | 底色行只在「上传」tab 可见 | 它是 `children` 的最后一项，因此落在**滚动体内部**：46 行的 emoji 网格把它顶到折叠线以下（上传 tab 内容短，所以只有那一行看得见） | `MediaPopoverShell` 新增 **`footer` 槽**（渲染在滚动区之外、常驻），图标选择器把底色行交给它；sel §2 同步 |
  | 2 | emoji / 图标 / 封面**内容不能滚动** | **两个叠加根因，只改 CSS 永远修不好**：**(i)** G2-r1 修的一半（上限压在 `Command` 上 → 内容被裁且无滚动视口）；**(ii)** `modal` 的 Radix Dialog 挂的 `react-remove-scroll` 带 `shards: [contentRef]`，它会 `preventDefault()` **所有落在 shard 之外**的 `wheel` / `touchmove` —— portal 到 `document.body` 的 `PopoverContent` 在窗口模式下**必然**滚不动（触屏同理，所以平板上也划不动）；探针实测该车轮事件 `defaultPrevented=true`，且 `preventDefault` 的调用栈就落在 `react-remove-scroll` 的 `shouldPrevent` 里 | `ui/dialog.tsx` 新增 `DialogContentContainerContext`（`DialogContent` 把自己的 DOM 节点放进 context，并兼容外部 `ref`）；`ui/popover.tsx` 的 `PopoverContent` 新增可选 `container` 透传，`MediaPopoverShell` **显式**把该节点传进去（全屏编辑器没有 Dialog → `null` → 仍是 `document.body`）——即 §M2.1 第 7 行标「按需」的那次 `container` 透传，判据由实测给出。**有意不做成全局默认**：filter / view 对话框自身是 `max-h-[85vh] overflow-y-auto`、`quick-panel` 是 `overflow-hidden`，全局 portal 进去会把「滚不动」换成「被裁切」 |
- **G2-r2 自检（真浏览器探针，`chrome-headless-shell` + CDP）**：把**真组件**（`IconSelectorPopover` / `CoverSelectorPopover`）挂进**真模态 Dialog**、用应用**真编译 CSS**，再用 CDP 派发**受信任**鼠标 / 触摸事件。**13/13 通过**：
  ```
  ✓ 探针页挂载（真组件 + 真 CSS + 真模态 Dialog）
  ✓ ① 上限压回 CommandList：list.max-height=348px = wrapper 384px − 搜索行 36px
  ✓ ② 列表可滚：overflow-y=auto，client 348 < scrollHeight 1840
  ✓ ③ Command overflow=visible（旧版是 hidden）
  ✓ ④ 外层包裹是安全网：max-height + overflow-y=auto，且自身不溢出
  ✓ ⑤ 底色行钉在面板内：wrapper.bottom=563 ≤ footer.top=563 < footer.bottom=596 = panel.bottom
  ✓ ⑥ 受信任滚轮滚动 emoji 网格：scrollTop 0 → 400（wheel defaultPrevented=false）
  ✓ ⑦ 图标 tab 同：400 → 492
  ✓ ⑧ 封面「从节点选」：client 324 < scrollHeight 2640，scrollTop 0 → 400
  ✓ ⑨ 反向对照：用 CSS 还原旧形状（Command 裁剪 + list 无上限）后滚不动（0 → 0）
  ✓ ⑩ 无未捕获报错
  ✓ ⑪ 触屏一指滑动（trusted touchStart/Move/End）同样能滚：scrollTop 0 → 285（touchmove defaultPrevented=false，touch-action 全链 auto）—— 用户在平板上就是这条
  （代码提交 `e275532` 的 message 里写的是 12/12：触屏那条是探针最后补上的，实际 13/13。）
  ✓ 封面弹层能打开（data-state closed → open）
  ```
  探针同时验证了 `container` 改动**没有破坏定位**：弹层仍紧贴触发器（截图与坐标都对得上）。`bash docs/plan/baseline.sh` 两段 **0 新增 / 0 消失**。
- **波及面登记（由 opt-in 限制住，第 3 轮顺带瞄一眼）**：`container` 是**显式**透传，只有 `MediaPopoverShell` 传了它，其余 ~20 个 `PopoverContent` 消费方仍是 `document.body` portal、行为与本轮之前逐字一致 ⇒ §M2.5-6 要求的「20 个既有消费方不受影响」成立。**已知遗留**：那些弹层在模态对话框里**同样滚不动**（同一类 shard 限制，`dataview` 的字段 / 筛选面板就在这一批），哪天需要滚动就照 `MediaPopoverShell` 的样子 opt-in —— 已记入遗留项 7。另外注意 `MediaGrid` 的 `CommandItem` 现在落在 `[data-slot=dialog-content]` 之内，`command.tsx` 的 `in-data-[slot=dialog-content]:rounded-lg!` 会命中它（单元格圆角从 `rounded-md` 变 `rounded-lg`，探针截图已确认视觉正常）。
- 失败项与归因：第 1 轮 3 条见上表（骨架滚动契约 / 合并约定 / 设计口径）；第 2 轮 2 条见上表，其中滚动的第二半是**框架层**根因（Radix Dialog 的 `react-remove-scroll` shard），不是某个组件的实现疏漏。W1 四路已在首轮交付并关闭，回改由主 agent 直接做，不需要重开窗口。
- 迭代：**第 3 轮实测通过**（清单第 1、5、6、7 条含 G2-r1/r2 的新增判据；用户 2026-10-06 回复「G2全通过」）
- 遗留不阻塞项：
  1. **分类条 / 每分类 `CommandGroup` 未做**：设计文档 §2 的骨架图底部画了分类条，但本计划的 W1-D 验收条款与 G2 的 13 条都不含它；当前是扁平网格 + 把类名并入 `keywords`（搜「食物」仍命中）。要与骨架图完全一致需扩 `MediaGrid`（新增一条 `CommandGroup` + 滚动锚），由后续章节或用户反馈决定。
  2. **`MediaGrid` 的 `aria-selected` 由 cmdk 掌握**，无法与 roving 焦点同步（cmdk 未暴露 setter）。可见的焦点环与 `data-media-active` 高亮跟 roving 走，G2 第 11 条只判 tab 遍历与「不是 300 个 tab stop」，不受影响。要彻底同步得放弃 cmdk 过滤或给 shell 加受控 `value`。
  3. **`PopoverContent` 的 `container` 透传已随 G2-r2 落地**（`MediaPopoverShell` 显式 opt-in）——「按需」的判据由实测给出：**在模态对话框里不 portal 进去就滚不动**（radix Dialog 的 `react-remove-scroll` shard 会吞掉落在 shard 外的 `wheel`/`touchmove`）。属主 agent 独占的 shadcn 基座改动（`ui/dialog.tsx` + `ui/popover.tsx`），`ui` 与 `dataview` 的 typecheck 零新增。第 10 条仍要按「被裁切 / 偏移」复核两种宿主形态。
  4. **`webpage-source` 仍整份替换 `content`**：`WebpageContent` 今天只有 `code`/`language`，合并在行为上是 no-op，按 §M2.5-1「语义逐字不变」保留原样。
  5. **`listNodes(query)` 只被调用一次（空串）**：`从节点选` 的首屏由宿主给最近节点、过滤交给 `Command`；逐键回源查询需要 shell 暴露搜索串（`media-popover-shell.tsx` 拥有那个 `Command`），标为 P2。
  6. **最近使用 `dbrain:icon-recent` 未做**（sel §5 标 P2），仅在文件 JSDoc 留了落点。
  7. **其余弹层在模态对话框里仍滚不动**：`react-remove-scroll` 只放行落在 Radix Dialog shard 内的事件，任何仍 portal 到 `document.body` 的 `PopoverContent`（dataview 的字段 / 筛选面板、tag-list 等）在窗口模式下都受同一限制。本轮只让**媒体弹层** opt-in（`container` 透传），因为全局改会把 filter / view 对话框里那些弹层从「滚不动」换成「被裁切」。要收掉这条得逐个确认宿主对话框不是滚动容器。
- 用户结论：**通过**（2026-10-06，用户回复「G2全通过」）。本章 7 条遗留不阻塞项全部转入后续章节，不阻塞 M3 开工。

### G3 — M3 text 单块 + rich-text 头部

- 状态：**通过**（2026-10-07 · 第 2 轮）。第 1 轮 = 实现 + 自检 + 23/23 真浏览器探针全绿；第 2 轮 = **用户自行修掉几处瑕疵后实测通过**（修复提交 `f7d0be1`，主 agent 复核见下「用户侧修复」），用户结论见本条目末。（第 1 轮原文：自检 + 23/23 真浏览器探针全绿。交付后首轮实测报的一次运行时崩溃已归因到**未进提交的在飞构建**，并顺手堵掉一个真回归，见下。**再加两轮「追加交付」**：① 用户要求「单行 block 要有 rich-text 里 block 的能力」—— 选区浮条 + 行内 LaTeX，含一次前置别名修复；② 用户给定参考图，要求按图中的元素位置关系重排 rich-text 开头 —— 封面出列出血 + 图标骑封面下沿 + 「类型 • 语义」行，随后追加「图标大小应该和 emoji 一样大」（板不再按图标种类分档）。两轮都在下面各自的「追加交付」段）
- 提交：`e5ef141`（editor 单块：受限单块编辑器 + 只读渲染器 + SCSS）→ `8cc8d36`（text 内容换芯 + 共享写者 `patchNode`）→ `8ea92e2`（rich-text 头部挂载 + `editor-header` 收口）→ `f4e7357`（text 编辑器按 `node.id` 重挂载 + 防抖写跟随被编辑的节点）→ `b8e3fb5`（**前置修复**：`packages/ui` 的 `@workspace/editor` 别名）→ `5954cfe`（单块内联能力：选区浮条 + 行内公式）→ `e89cc0e`（rich-text 页头按参考图重排）→ `60a45cc`（页头 r1：图标与 emoji 同尺寸；r2：语义胶囊改成下拉切换）→ `f7d0be1`（**用户自行修复**：页头文字列按 plate 反推的字号刻度重排 + 输入框回声不再抢光标 + 模态内菜单/浮层的层叠，见下「用户侧修复」）
- 自检：
  - **typecheck diff**：`bash docs/plan/baseline.sh` → **0 新增 / 0 消失** ✅
  - **lint diff**：**0 新增 / 2 消失** ✅ —— `@workspace/ui` 28 → 26 problems（旧 `rich-text-node-content.tsx` 的 `cn` 与 `className` 两个 `no-unused-vars` 随重写消失，`pnpm eslint --stdin` 对 HEAD 版本复现过），`@workspace/editor` 仍是 **106 problems (67 errors, 39 warnings)** 与基线同数、**M3 新文件零 error**；基线已按脚本提示重采（`--accept`），所以现在两段都是 `0 新增 / 0 消失`
  - **越界检查**：`git status --short` 全程只有 §M3.1 白名单内的文件 + `use-node-content-writer.ts`（登记见下）；`backend/**`、`packages/interfaces`、`pb/**`、`preview-block/**`、`apps/**`、`package.json`/lockfile 均未触碰；**零新依赖**
  - **`globals.css` 的 `@source` 未改**：M3.1 第 8 行是「按需」项，落码后按 §M3.2-3 的结论把 Tailwind 类全部放在 `packages/ui` 侧（禅意容器在 `text-node-content.tsx`），`packages/editor` 侧只有结构 + 自己的 SCSS ⇒ 该行**未触发**。已实测域名侧编译产物里有 `max-w-\[42rem\]`（`packages_ui_src_styles_globals_css_*.single.css`），且新 SCSS 被 dev server 编成独立 chunk
  - **白名单登记（§M3.1 表格漏列的一行）**：`use-node-content-writer.ts` 是 M1 的交付文件，M3 必须扩它才能满足 §M3.2-10「`patchNode` 与 `useNodeContentWriter` 共用同一个 drain」——第 6 行的描述点明了这件事，但白名单只列了 `rich-text-node-content.tsx`。改动是**纯增量**：`+patchNode(top-level patch)`、`+` 写前 `cancelPendingUpdate(nodeId)`（被 debounce 的旧 payload 是本次写入的严格子集，留着它只会在稍后把新值覆盖回旧副本），`patchContent` 的语义逐字不变，database / collection 两个既有宿主零改动
- **交付后首轮实测报的崩溃：归因 + 顺手抓到的真回归**（`f4e7357`）：
  - **现场**：用户实测时报 `TypeError: undefined is not an object (evaluating 'initialDoc.current')`，栈顶 `TextNodeContent (text-node-content.tsx:99:11)`。
  - **归因（不是当前代码的错）**：dev server 日志的页面加载在 `03:07:34`（= 本地 **21:57:18**，日志时钟 = 本地 − 18:49:44，已用进程启动时间 18:49:43 校准），而 M3 最终构建落在 **22:05:53**；`packages_ui_src_components_dialog_bad17e46._.js` 的 chunk 名是**按模块图取的、不随内容变**，21:56 那份被 22:05 就地覆盖 ⇒ 21:57 打开的标签页内存里留着**中间态**模块。当前工作树、服务端当前产物（graph 路由的 `page_client-reference-manifest.js` → `bad17e46`，其内容与 SSR 侧 `ef222363`）里都**不存在** `initialDoc.current`（全仓 grep 只有日志里那一行）。Next 的 overlay 读的是**当前**源码映射，所以它的代码框显示的是修好后的 99 行 —— 这一点不要用来判断"哪个版本在跑"。
  - **顺手堵掉的真回归（M3 引入、M2 没有）**：`node-content-editor.tsx` **不按 `node.id` 挂载**（该文件被 §M3.5-5 冻结），而侧栏「关系」页签在对话框打开时直接改 `currentEditingNodeId`（`attributes-sidebar.tsx:519`）⇒ text→text 切换时：① 单块编辑器是无控的、种子只读一次，**会继续显示上一个节点的正文**；② 为旧节点武装的 400ms 防抖会经**新节点**的写者落到新节点（串数据）。M2 的 `<Textarea>` 是受控的，跟着 `node` prop 走，所以这是 M3 的回归。
  - **修法（只在白名单文件里）**：编辑器在宿主内 `key={node.id}` 重挂载（种子每挂载读一次 ⇒ 渲染期不再读 ref，改用 lazy `useState` 的等价形态）；待写内容与「它属于哪个写者」一起入队，flush 用当时捕获的 `patchContent` —— 于是旧节点的待写内容只会写回旧节点。rich-text 那一侧 M3 未改（M2 就是 `room={node.id}` + `getInitialContent`），同名风险登记为遗留 6。
  - **复跑**：探针 23/23（新增 ⑲⑳㉑ 覆盖切换路径 + 反向对照，原「无未捕获报错」改为 ㉒）；`baseline.sh` 仍 **0 新增 / 0 消失**。
- **追加交付：单块的内联能力对齐 rich-text（选区浮条 + 行内公式）**（`b8e3fb5` + `5954cfe`，清单加 14–17）：
  - **需求**：用户实测时提出「text-node-content 中的单行 block 要有 rich-text 中的 block 的能力，比如选中文字后的 toolbar 和 latex 输入」。
  - **交付**：① 扩展集补 rich-text 的**内联半边**（`TextStyle` / `Color` / `Highlight(multicolor)` / `Superscript` / `Subscript` / `Typography` / `LatexInline`），块级仍全关，`docs` 与 rich-text 的合法子集关系（设计 §0.2-1）保持；② 新增 `single-block-toolbar.tsx`，用**同一批** `tiptap-ui` 控件组装浮条（粗 / 斜 / 下划线 / 删除线 / 代码 / 链接 / 颜色 / 公式 / 更多＝上下标+四个对齐），可见性直接复用 `isSelectionValid`（公式节点因此不弹浮条，它有自己的编辑弹层）；③ 只读孪生加 `static` 模式：`generateHTML` 不跑 node view，`static` 时把 KaTeX 烘进 HTML，否则静态渲染的公式是个空 `span`。两条入口都在：浮条的「T」按钮（把选区文字**搬进**公式）与 `$` + 空格输入规则（新建空公式，它自己的编辑框会自动打开）。
  - **前置修复（`b8e3fb5`，超出本章原白名单，单独一次提交）**：`packages/ui/tsconfig.json` 的 `@workspace/editor` / `@workspace/editor/*` 原本指向 `../editor/src(/*)` —— **不存在的目录**。能编过是因为 `packages/ui/node_modules/@workspace/editor` 是 workspace 软链、TS 在 `paths` 落空后会回退到 node_modules 解析；代价是被拉进程序的 editor 文件内部的 `@workspace/editor/...` 全部 TS2307（`@workspace/ui` 段 65 行噪声）。不修的话，浮条引 8 个 tiptap-ui 模块就是 +8 条以上基线新行 ⇒「复用 editor 控件」这件事本身会把基线判据搞脏。改成 `../editor(/*)` 后：`@workspace/ui` typecheck **76 → 19** 条、全仓 typecheck **136 → 88** 条、lint 26 条不变；剩下的 19 条是 editor 文件**真实的**既存错误（与 `@workspace/editor` / `web` 两段同源），只是从「被 TS2307 掩盖的 TS7006」变成显示出来。
  - **自检**：`@workspace/editor` typecheck / lint 相对基线无新增行（lint 仍 `106 problems (67 errors, 39 warnings)`，**新增两个文件零 error**）；`@workspace/ui` typecheck 19 条、逐行与别名修正后一致（新文件零行）；`bash docs/plan/baseline.sh` 两段 **0 新增 / 0 消失**（基线已 `--accept` 重采为 typecheck 88 / lint 26，见 [baseline.md](./baseline.md) §2）。越界检查：本轮新增/修改文件只有 `single-block-editor.tsx` / `single-block-toolbar.tsx`（新）/ `single-block-renderer.tsx` / `packages/ui/tsconfig.json`；**零新依赖**（用的全是 `packages/editor` 既有的依赖：`katex`、`@tiptap/extension-{highlight,superscript,subscript,typography,text-style}`、`@floating-ui/react`）。
  - **主 agent 预跑证据（真浏览器探针 16/16）**：同一个 harness（`chrome-headless-shell` + 裸 CDP），页面这次把 `TextNodeContent` 放进**真 Radix Dialog**（`node-editor.tsx` 的窗口宿主形态），CSS 用 dev server 编出的两份产物（Tailwind globals + editor 组件 CSS）拼起来，数据层仍是行为等价的 stub：
    ```
    ✓ ① 探针页挂载（真 Dialog + 真 TextNodeContent → 真单块编辑器 + 浮条 + 真 CSS）
    ✓ ② 键入正文：仍是**一个** <p>，文字落进去
    ✓ ③ Ctrl+A 后出现选区浮条：贴在选区上方、横向覆盖选区、不出 Dialog 盒（345×40）
    ✓ ④ 浮条里是 rich-text 的同一套控件（粗/斜/下划线/删除线/代码/链接/颜色/行内公式/更多）
    ✓ ⑤ 点浮条「Bold」：选区真的加粗（<strong> + 按钮 data-active-state=on）
    ✓ ⑥ 「更多」弹层里是上下标 + 四个对齐（rich-text 同款，且点击弹层不收起浮条）
    ✓ ⑦ 点上标：选区变成 <sup>（弹层里的控件同样作用于正文）
    ✓ ⑧ 点浮条「行内公式」：选中的文字变成 latexInline 并渲染出 KaTeX（不是空公式）
    ✓ ⑨ 公式节点被选中时不弹格式浮条（latexInline 在 isSelectionValid 的排除表里）
    ✓ ⑩ 输入 `$ `（空格）触发输入规则：插入空公式节点并弹出公式编辑框（浮条让位）
    ✓ ⑪ 在公式编辑框里输入 E=mc^2 并回车：公式落到节点上、编辑框关闭
    ✓ ⑫ 回车不新建块：文档始终只有一个块级子节点
    ✓ ⑬ 落库：docs 是「单段 Tiptap doc」，粗体与行内公式都进了 JSON（写者只带 docs 一个键）
    ✓ ⑭ 只读孪生（generateHTML + static 模式）把公式渲染成 KaTeX，而不是空 span
    ✓ ⑮ 浮条不吞 Esc：浮条收起、Dialog 照常关闭（Esc 语义仍归宿主）
    ✓ ⑯ 无未捕获报错
    ```
    复跑：`node /tmp/probe/toolbar-check.mjs`（`PROBE_URL=http://127.0.0.1:8899/toolbar.html`；入口 `toolbar-entry.tsx` 要放进 `apps/web/` 下再交给 esbuild，否则 `@tiptap/*` 之类的裸包名解析不到）。
  - **探针工装踩到的两个坑（复跑时要带）**：① `Input.dispatchKeyEvent` **不带 `text` 不会插入字符**，所以「打一个空格触发 `$ ` 输入规则」必须走 `Input.insertText(" ")`，否则规则永远不触发；② 探针页尺寸要用 inline style —— 它链的是 app 的**预编译** Tailwind 产物，只写在探针文件里的任意值类（`w-[880px]`）根本不在 CSS 里，会得到一个 64px 宽的「对话框」，然后所有点击都落到盒子外面（表现为「输入不进编辑器」）。另有一个**不是 bug** 的现场：`Input.insertText("E=mc^2")` 是一次性多字符输入，`Typography` 的 `/\^2$/` 规则会按单字符位置算范围并抛 `RangeError: Position N out of range`（真机逐字输入不触发，且公式源码写在 textarea 里、根本不经过 ProseMirror）—— 登记为遗留 7。
  - **口径（判清单 14–17 时按这四条看）**：① 浮条**没有**「转换成」/ AI / 图片 / 缩进（单块只有一段，块级入口不适用），少几个按钮是设计；② 公式**只有行内**；③ 窄屏/平板**照常显示**浮条（不做 `MobileToolbar` 回落，理由：单块没有第二条格式入口）；④ 公式编辑弹层开着时第一次 `Esc` 归它（Radix innermost-first），第二次才关对话框。
- **追加交付 二：rich-text 页头按参考图重排（封面出列出血 + 图标骑封面下沿 + 类型 • 语义）**（`e89cc0e`，清单加 18–22 并改写老第 4 条）：
  - **需求**：用户给一张页面截图（封面 + 骑在下沿的 emoji 图标 + 标题 + 摘要 + 「Page • Tag」），要求「根据图中的各元素布局位置关系，调整 rich-text 开头」。
  - **先量图，再落码**：截图 3061×1028（缩略图规范化后的尺寸）。按「内容列 708px、两侧 `minmax(96px,1fr)`」反推 DPR≈2.4，得到 CSS 值：封面 `1244×287`、圆角 10px、距 pane 边缘 8px；图标板 `91×91` 且**左边缘与文字列左边缘对齐**；板底在封面下沿**以下 24px**（板顶在上方 67px ≈ 封面下方 25% 处）；标题墨迹顶在下沿以下 43px；meta 是灰色 `rgb(130,130,130)`、摘要是正文色 `rgb(37,37,37)`。折算到本仓（Dialog 1200×80vh ⇒ pane 1008 / 内容列 708）：封面 `h-60`=240、`rounded-lg`=10px、板 `size-20`=80 / 露出 16px、标题 `text-4xl`。
  - **交付**：① 封面**出文字列**（宿主不再包 `mx-auto max-w-[708px] px-12 pt-6`，文字列改由 `NodeContentHeader` 自己画，封面是根的第一个孩子 ⇒ 全宽出血）；② 图标**独占一行**（`h-10 items-end` + `-mt-6`，行底落在封面下沿 + 16px，板高多少都不影响这条关系）；③ 标题 `text-3xl → text-4xl`；④ 第 5 段从「语义 pill」变成「**类型 • 语义**」（复用 `NODE_TYPE_LABELS`，pill 保留 `semantic.color`）；⑤ `NODE_ICON_PLATE` / `NODE_ICON_GLYPH` / `NODE_ICON_FALLBACK` 导出，注入的触发按钮、`fallback` 板与字形共用同一份类名。
  - **交付后用户当场追加的两条（`60a45cc`，r1 + r2）。** 第一版按「`NodeIconView` 的 Lucide 字形写死 16px（sel §5）⇒ 大板里是小图形」给 `kind:"icon"` 配了 44px 小板；用户看完直接要求「图标大小应该和 emoji 一样大」。修法：给 `NodeIconView` 加**可选** `glyphClassName`（默认 `size-4` 不变 ⇒ M2 的四个既有消费方零改动、源码兼容），页头传 `size-3/5` ⇒ **emoji / Lucide 图形 / 图片统一 80px 板 + 48px 字形**。代价与登记：`node-icon-view.tsx` 是 M2/W1-A 的文件，超出 §M3.1 原白名单，按 `use-node-content-writer.ts` 的先例显式登记（§M3.1 第 14 行）；`NodeIconViewProps` 是「冻结形状」，加**可选**字段是纯增量、不动既有字段与语义。探针 ㉑㉙㉚ 改为三条都断言「80px 板 + 48px 字形」（emoji 量 plate 的 `font-size`，Lucide / 类型回落量 `<svg>` 的 `getBoundingClientRect`）。
    **r2「把 semantic 胶囊改成按钮下拉菜单切换 semantic」**：胶囊从静态 `span` 变成 `DropdownMenu` 触发器（`readOnly` 仍是静态 pill、无语义时「选择语义」），菜单体**复用**共享 `SemanticList`（搜索 + 目录 + Add new type），选一条 → `patchNode({ semanticId })`（仍然只有宿主 drain 写节点）；分类色仍是胶囊自己的颜色；**没有箭头**（用户要求）。**这里踩到一个真坑**：`ui/dropdown-menu.tsx:47` 的内容宽度默认是 `w-(--radix-dropdown-menu-trigger-width)` —— 胶囊 ~90–190px 宽，共享列表 256px ⇒ 列表被内容盒的 `overflow-x-hidden` 裁掉，行**既看不见也点不到**（探针 hit test 显示点击落在 Dialog overlay `DIV.fixed inset-0 ... bg-black/10` 上）。`w-auto` / `w-64` 都可能输给那个 CSS 变量（样式表顺序），改用 **`min-w-64`**（`min-width` 与 `width` 不同属性，顺序无关）。用户实测时截的正是这个裁剪现场，修完探针 ㉝b 断言「菜单 256px、行落在盒内」。
    **探针工装也因此修了两处会说谎的地方**（见 §M3.2-26）：stub store 改成 `useSyncExternalStore` + 写入通知（原先不可订阅 ⇒ 写进 store 不重渲染 ⇒ 一次**成功**的写入被报成「什么都没发生」）；fixture 把节点**放进 store**（`NodeService.upsert` 只更新已存在的行）。改完 ㉞ 一次通过：`{"text":"Concept","color":"rgb(20,184,166)","semanticId":"sem-2","menuOpen":false}`。
  - **探针当场抓到的一个真错误（值得记）**：第一版把负边距按「板要往上挪 56」写成 `-mt-14`，实测板底落在封面下沿**以上** 16px（探针报 `plate.bottom - cover.bottom = -16`）—— 负边距挪的是**行**不是板。改成定高盒 `h-10` + `items-end` + `-mt-6` 后，板高（80 / 44）与露出量（16）解耦，三种图标形态各测一次都是 16。
  - **自检**：`bash docs/plan/baseline.sh` 两段 **0 新增 / 0 消失**（基线未动：typecheck 88 / lint 26）；越界检查：改动集中在 `node-content-header.tsx` / `rich-text-node-content.tsx` 两个**已在 §M3.1 白名单内**的文件；r1 另加 `node/media/node-icon-view.tsx`（M2/W1-A 的文件，**超出原白名单**，按 `use-node-content-writer.ts` 先例在 §M3.1 第 14 行与本节登记）；**零新依赖**；`globals.css` 的 `@source` 未动（新类全在 `packages/ui` 侧，已核 dev 产物里有 `-mt-6` / `h-60` / `size-20` / `size-11` / `text-5xl` / `text-4xl`）。
  - **主 agent 预跑证据（真浏览器探针 18/18）**：同一个 harness（`chrome-headless-shell` + 裸 CDP），页面这次挂**真 `RichTextNodeContent`**（→ 真 `NodeContentHeader` + 真 `IconSelectorPopover` / `CoverSelectorPopover` + 真 plate 类）放进**真 Radix Dialog**（`node-editor.tsx` 的窗口宿主形态），`<NotionEditor>` 被 alias 成只保留 editor **布局 grid** 的替身（这样「标题与正文首段是否左对齐」仍是真问题），CSS 是 dev server 编出的 Tailwind globals + `notion-like-editor.scss` 两份产物：
    ```
    ✓ ㉝ 语义胶囊是下拉按钮：点开是共享的 SemanticList（搜索框 + 语义行 + Add new type）
    ✓ ㉝b 菜单按共享列表的宽度撑开（256px、行落在盒内）：不会被 overflow-x-hidden 裁掉
    ✓ ㉞ 选另一条语义：经 patchNode 写回 semanticId，胶囊文案与分类色即刻更新、菜单自关
    ✓ ⑱ 封面全宽出血：cover.left == pane.left（136）、cover.width == pane.clientWidth（998），比标题列（708 居中）宽出两侧
    ✓ ⑲ 封面高 240、圆角 10px（= 主题 rounded-lg，与参考图量到的 10px 同值）
    ✓ ⑳ 图标骑在封面下沿：plate.top(344) < cover.bottom(408) < plate.bottom(424)，露出 16px
    ✓ ㉑ emoji 撑满 plate：80×80、font-size 48px、与封面同圆角、底色 = 页面底色（lab(100 0 0)）
    ✓ ㉒ 触发按钮与 NodeIconView 的盒子同尺寸（宿主/头部共用同一个 plate 类）
    ✓ ㉓ 自上而下 icon → title → summary → meta，四段互不重叠
    ✓ ㉔ 头部标题与正文首段左边缘逐像素相同（708px 列 + 3rem 的推论仍成立）
    ✓ ㉕ meta 行 = 「Rich Text • <语义>」且 pill 保留分类色 rgb(99,102,241)
    ✓ ㉖ 横向无溢出（pane.scrollWidth - clientWidth = 0）
    ✓ ㉗ 无封面：不画封面块，图标回到列顶（pane.top + 24 = pt-6，不再负边距）
    ✓ ㉘ 无封面：入口变成标题行右侧的「添加封面」
    ✓ ㉙ 有封面无图标：类型图形回落进同一块 80px 板（字形 48px），仍在下沿露 16px
    ✓ ㉚ Lucide 图标与 emoji 同尺寸：同一块 80px 板 + 48px 字形，骑边不变
    ✓ ㉛ 图片型图标：真的画出 <img>（kind:"image" 读的是 value 字段）+ 同一块 80px 板
    ✓ ㉜ 无未捕获报错
    ```
    复跑：`node /tmp/probe/header-check.mjs`（`PROBE_URL=http://127.0.0.1:8899/header.html`；bundling 脚本 `/tmp/probe/build-header.mjs` 用 pnpm store 里的 esbuild + `nodePaths`，入口可以留在 `/tmp`）。**踩坑记录**：① headless shell 只有 DejaVu（没有 CJK/emoji 字体），截图里中文与 emoji 是豆腐块 —— 探针 fixture 因此换成 ASCII 文案，几何断言与字体无关；② `NodeIcon.kind === "image"` 读的是 **`value`** 字段（不是 `url`），第一版 fixture 写错导致 `onError` 静默回落到类型图标，已补一条断言（㉛）钉住；③ `pane.clientWidth` ≠ `getBoundingClientRect().width`（有纵向滚动条时差 10px），出血判据要用 clientWidth。
  - **口径（判清单 18–22 时按这五条看）**：① 参考图的绝对像素不是标准，判两条**关系**（封面比文字列宽、图标板压在下沿）；② 封面 240px 是按「封面高 : pane 宽 ≈ 22.5%」折的，嫌高/矮改一个类名；③ meta 行**多了类型标签**（参考图的 `Page • Tag`），语义 pill 的颜色没丢，不想要标签就说；④ 摘要在参考图里是正文色，本轮**没跟**（第 21 条专判）；⑤ 三种图标同一尺寸（80px 板 + 48px 字形，r1 已按你的要求改掉分档）。
- 用户操作清单：见 [node-content-ui.md §M3.4](./node-content-ui.md#m34-闸门-g3--用户操作清单)（**共 17 条**，14–17 是追加的内联能力）。**按实测调整 10 处**（开头前置说明），其中三条要特别看：① 第 1 条的现场与设计文档假设不同（seed 的 text 节点 `docs` 是未识别形状 ⇒ 打开是空块 + 占位文案，不是 bug）；② 第 6 条除判定方案 A 之外，请顺带判「rich-text 的 **title** 要不要也一起收口」——本轮只收了图标/封面；③ 第 1 条之前**必须整页刷新**（标签页可能还停在 21:5x 的中间构建上，见上）。
- **主 agent 预跑证据（真浏览器探针 23/23）**：`chrome-headless-shell` + 裸 CDP（配方见本文件 §6），页面挂**真组件**（`TextNodeContent` / `NodeContentHeader` / `SingleBlockRenderer` / `useNodeContentWriter` + 真模态 `Dialog`）+ **真编译 CSS**（dev server 编出的 Tailwind globals + 新的 single-block SCSS 两份产物拼起来），数据层换成行为等价的 stub（`upsert` 乐观同步落 store、网络调用是 await、单次 25ms），所有输入都是 CDP 的**受信任**事件：
  ```
  ✓ ① 探针页挂载（真 TextNodeContent / Header / Renderer / Writer + 真 CSS）
  ✓ ② 禅意排版落在 ui 侧：text-align=center、font-size=24px(text-2xl)、max-width=672px(42rem)、padding-top=64px(py-16)
  ✓ ③ 编辑器铺满整块内容盒：editable 472px / host 600px（点击区不是只有一行字）
  ✓ ④ 空文档占位文案「写下这句话…」由新 SCSS 规则给出（不依赖 paragraph-node.scss 是否被加载）
  ✓ ⑤ 点内容盒中部（留白处）即聚焦编辑器：activeElement = .tiptap.ProseMirror.single-block-editor
  ✓ ⑥ Enter 不新建块：输入「第一行」+ Enter + 「第二行」后 DOM 顶层仍只有 1 个 <p>，两行都在
  ✓ ⑦ 反向对照：往 DOM 注入第二个 <p> 时计数确实读到 2（第 ⑥ 条不是空过）
  ✓ ⑧ Mod-A + Mod-B 后落库 docs = {type:"doc",content:[{type:"paragraph",attrs:{textAlign:null},content:[{type:"text",marks:[{type:"bold"}],text:"第一行第二行"}]}]}（编辑器→写者→upsert 全链路）
  ✓ ⑨ 焦点在编辑器内时按 Esc，外层 Radix Dialog 仍关闭（探针确认 dialogMounted=true → stillOpen=false）。**事实记录**：Esc 会被 ProseMirror 的 keymap `preventDefault`（栈落在 `editHandlers.keydown`），Radix 自己在 document 上也 `preventDefault` 一次；两者都只 preventDefault、不 stopPropagation，所以 Dialog 照常关（旧 `<Textarea>` 路径里 PM 不存在，此差异无用户可见后果）
  ✓ ⑩ 合成 paste（DataTransfer "甲\n乙"）被 transformPasted 压平：仍只有 1 个 <p>，文本为「甲\n乙」（不落 hardBreak）
  ✓ ⑪ 只读渲染器输出 <strong>只读渲染</strong> + white-space: pre-wrap
  ✓ ⑪b 旧形状 {content:"旧文本"} 惰性升级：编辑器直接显示「旧文本」（不是 doc / [object Object] / 空白），且占位符不出现
  ✓ ⑫ 头部五段顺序：icon → title → summary → semantic pill；空封面时入口是标题行右端的 compact 按钮（24px 高，不画灰块）
  ✓ ⑬ 点 icon 位 → onPick → patchNode({icon}) 生效
  ✓ ⑭ 有封面后封面段占位并排到最上（顺序随状态变化）
  ✓ ⑮ 同一 tick 的 patchContent + patchNode 合并成**一次** upsert：{content:{docs:{v:1}}, title:"T1"}
  ✓ ⑯ 连续写串行化：4 次写、任一时刻在飞请求数 = 1、无时间重叠（PB 同记录会互相 abort 的根因面）
  ✓ ⑰ 顶层 patch 也走同一队列并落进 store（最后一次 title = "T2"）
  ✓ ⑲ 切到另一个 text 节点后编辑器换种子：DOM 文本 = 新节点的「第二个节点的正文」，不含刚在旧节点输入的「甲」
  ✓ ⑳ 旧节点的待写内容落回旧节点：切换到新节点后，防抖把「甲」写进 probe-text（旧），probe-text-2 的 upsert 数为 0
  ✓ ㉑ 反向对照：切过去并点进新编辑器后输入「丙」确实写进 probe-text-2，且旧节点 payload 里没有「丙」（⑳ 不是空过）
  ✓ ⑱ 卸载 flush：防抖窗口（400ms）内卸载编辑器，最后一次输入「末」仍落库
  ✓ ㉒ 无未捕获报错
  ```
- 探针脚本的复跑口径（三个脚本）：**追加交付 二**用 `node /tmp/probe/header-check.mjs`（15 条，见上）；**追加交付**用 `node /tmp/probe/toolbar-check.mjs`（16 条，见上）；首轮的 `node /tmp/probe/m3-check.mjs`（`chrome-headless-shell` 直连 `file://` 时外部脚本报错会被浏览器掩成 `Script error.`，排查期间改用 `PROBE_URL=http://127.0.0.1:8899/m3.html` + `python3 -m http.server 8899 -d /tmp/probe`；bundling 要显式带 `--jsx=automatic`，否则 `apps/web/tsconfig.json` 的 `jsx: preserve` 会让 esbuild 出经典 JSX 而在浏览器里报 `React is not defined`）
- 用户实测结果（2026-10-07，**23 条全通过**；用户原话见本条目末）：

  | #     | 结果 | 证据                                                                                                                                                                                                             | 备注                                                                                                    |
  | ----- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
  | 1–3   | ✅   | 单块居中、`Enter` 不新建第二个块；悬停预览能看到刚写的文字；旧形状 `{content:"旧文本"}` 惰性升级为 Tiptap doc                                                                                                        | 第 1 条的现场是「空块 + 占位」（seed 的 `docs` 是未识别形状，见前置说明 2）；探针 ①–⑪b 同口径            |
  | 4     | ✅   | rich-text 五段顺序 + 封面出血 + 图标骑封面下沿                                                                                                                                                                    | 用户随后**自己把这一段的排版又重排了一遍**（`f7d0be1`：按 plate 反推字号刻度），见下「用户侧修复」       |
  | 5     | ✅   | 头部 `title`/`abstract` 与侧栏「属性」双向同步                                                                                                                                                                     | `f7d0be1` 起两个输入框走 `useEchoSafeText`：光标不再被写者回声挪到行尾                                   |
  | 6     | ✅   | **方案 A 判定成立**：对话框头部对 rich-text 不再渲染图标/封面按钮（R35 结案）                                                                                                                                      | title 例外：两个标题输入框**保留**（见遗留 2）                                                           |
  | 7     | ✅   | 连续打字 + 500ms 内改 icon/title：正文与头部都在、控制台无 `autocancelled`                                                                                                                                         | 共用 drain（探针 ⑮⑯⑰）                                                                                  |
  | 8     | ✅   | 抓包：头部改动只落顶层字段，`updates.content` 与改动前逐字段一致                                                                                                                                                   | 与第 22 条同一次操作                                                                                     |
  | 9     | ✅   | 全屏（编辑器头部最左 `FullscreenButton`）下第 1 条同样成立                                                                                                                                                          | 单块在 `absolute inset-0` 宿主里同样居中、无内层滚动条                                                   |
  | 10    | ✅   | 粘贴两行被压平成一段；`Esc` 交给 Dialog 关窗                                                                                                                                                                       | 遗留 3（PM 只 `preventDefault`、不 `stopPropagation`）                                                   |
  | 11    | ✅   | image / database 节点的 node-content 与改动前一致                                                                                                                                                                 | M3 只动 text + rich-text                                                                                 |
  | 12    | ✅   | `bash docs/plan/baseline.sh` 两段 **0 新增 / 0 消失**（主 agent 复跑）                                                                                                                                              | typecheck 88 / lint 26                                                                                   |
  | 13    | ✅   | text→text 原地换节点：正文换种子、待写内容落回旧节点                                                                                                                                                               | 探针 ⑲⑳㉑（`f4e7357`）                                                                                   |
  | 14–17 | ✅   | 选区浮条（粗/斜/下划线/删除线/代码/链接/颜色/公式/更多）、`Mod-B`、上下标、`$ ` → 行内公式、F5 后仍在                                                                                                                | 追加交付一；探针 ③–⑫                                                                                     |
  | 18–20 | ✅   | 封面出血、图标骑下沿且与标题左对齐、两处「移除」后的回落（无封面 → 标题行右端入口；无图标 → 80px 白板 + 48px 类型图形仍骑边）                                                                                       | 追加交付二 + `f7d0be1`；探针 ⑱–㉛                                                                         |
  | 21    | ✅   | 「类型 • 语义」是灰色小字、语义 pill 保留分类色；**摘要仍保持 muted**（用户本轮把摘要调到 `text-lg`，未要求改色）                                                                                                   | 探针 ㉕；§M3.2-23                                                                                         |
  | 22    | ✅   | 三次 `node.update` payload 只带顶层字段                                                                                                                                                                            | 回归面 1                                                                                                 |
  | 23    | ✅   | 语义胶囊是按钮下拉（**无箭头**）、菜单 256px 不被裁、选中即换、F5 后仍是新语义                                                                                                                                     | 追加交付二 r2；探针 ㉝㉝b㉞                                                                                |

- 失败项与归因：**无闸门失败项**。用户报的是**自己在实测中发现的瑕疵**（不是判定失败），归因 **实现缺陷**，由用户自己提交 `f7d0be1` 修复；主 agent 复核文件集与结论（见下）。
- 迭代：
  - G3-r1（第 1 轮实测）：报 `initialDoc.current` 运行时崩溃 → 归因**环境**（标签页停在 22:05 之前的中间构建：chunk 名按模块图取、被就地覆盖，当前工作树与服务端产物里都没有该表达式）；排查中顺手修掉一个**真回归** —— 对话框不按 `node.id` 重挂载，而侧栏「关系」页签能在对话框打开时改 `currentEditingNodeId` ⇒ text→text 串数据（`f4e7357`，探针 ⑲⑳㉑）→ 重测基础 13 条通过。
  - G3-r2（**用户自行修复后通过**）：用户报「我修复了些瑕疵，提交后并测试 G3 通过」（`f7d0be1`），随即开工 M4。修复文件集与 M4 的相交面**为空**（改动在 `packages/editor` 的 notion-like SCSS、`tiptap-ui-primitive/menu/menu.tsx`、`floating-element/floating-element.tsx`、`ui/dialog.tsx`、新增 `lib/inner-layer.ts`、`node-content-header.tsx`；M4 只碰 `dynamic-island/**`、`store/src/uiStore.ts`、`store/src/index.ts`、`apps/web/components/island-*`、`apps/web/components/dynamic-island-host.tsx`、`(main)/layout.tsx`、`components/index.ts`、`packages/ui/package.json` + lockfile）。
- **用户侧修复（`f7d0be1`，主 agent 复核）**：三类，都是后续章节的既定事实：
  1. **页头排版按 plate 反推的刻度重排**（`node-content-header.tsx`）：去 `gap-4`，标题 `mt-6` + `text-4xl`，摘要 `text-lg`，meta 行 `text-xs → text-sm`，摘要/meta 各自 `mt-1.5`；参照系改成「plate 219px / `size-20`=80px ⇒ 截图像素 ×2.406 = CSS px」后取**比值**（标题 ≈32.6、摘要 ≈16.0、meta ≈12.7 ⇒ 标题的 0.49 / 0.39），行高节奏改按**「封面下沿以下的基线」**给（标题 ~73 / 摘要 ~107 / meta ~137）。`SEMANTIC_PILL` 去掉自带的 `text-[11px]`（跟行字号 `text-sm`），暗色输入框底色去掉。**口径修订**：M3 追加交付二记的绝对像素是「等比折到本仓」，本次的**比值 + 下沿基线**才是标准，判 G4 之后的页头一律用后者。
  2. **输入框的回声不再抢光标**（同文件新增 `useEchoSafeText`）：`patchNode` 是**排队**写（`use-node-content-writer.ts` 微任务 drain），受控输入在 keystroke 结束时看到的 `value` 仍是上一帧 ⇒ React 把旧文本写回 DOM、光标被丢到行尾。做法 = 本地草稿 + 一个「本字段已发出、尚未回声」的队列（回声在队列任意位置命中即采纳并清到它为止；没命中就视为外部编辑并采纳）。头部与侧栏仍写同一份 `title`/`abstract`，两向同步不变。
  3. **模态内菜单/浮层的层叠**（`menu.tsx`、`floating-element.tsx`、`ui/dialog.tsx` + 新增 `packages/ui/src/lib/inner-layer.ts`）：Radix 的 `DismissableLayer` 会给下层写**内联** `pointer-events: none`（模态下 `body` 也拿到 `none`）⇒ ① portal 到 `body` 的菜单点不动 → 菜单自带 `pointer-events: auto`；② `Esc` 改由 window capture 分层裁决，不再顺手关掉外层对话框；③ `focusin` 落在本菜单链（本层浮层/祖先浮层/触发按钮）不算「点到外面」，Radix 的 FocusScope 把 hover 焦点抢回触发按钮时不再 close/open 抖动；④ 手势**开始时**用 `isShieldedByInnerLayer`（沿祖先读最近的显式内联 `pointer-events`）判断这次 dismissal 是否归内层，被遮住就不关外层。**对 M4 的含义**：Radix 弹层的 portal 仍必须在岛之上（§M4.2-4 的 `z-40` 判据不变）；将来若岛的「点击岛外收起」要判「这次 pointerdown 是否归内层」，`isShieldedByInnerLayer` 是现成原语。
- 遗留不阻塞项（G3 通过后定稿；**逐条给了归属，没有一条阻塞下一章**）：
  1. **`SingleBlockRenderer` 已落地但没有消费方**（归属：接只读展示路径时认领；M8 的岛预览面板是下一个候选面）。理由同原记：预览浮层的文本预览用自己的 `text-preview.tsx`（M3 不碰 `preview-block/**`），它是 §M3.1 第 2 行的交付物，不是死代码。
  2. **rich-text 有两个标题输入框**（归属：**用户未要求收口**；M10 动 `node-content-editor.tsx` 时可一并判）。对话框头的 `NodeTitle`（debounced，走 store 调度器）+ 内容区头部的 title（走共享 drain）写的是同一份 `nodes.title`；`f7d0be1` 之后两条路都回声安全（不再互相覆盖、不再抢光标），剩下的只是「一个字段两个输入框」的观感。
  3. **Esc 被 ProseMirror 的 keymap 消费（`preventDefault`）**（归属：无，记为已知事实）。无用户可见后果（Dialog 照常关：探针 ⑨ / 第 10 条），§M3.2「编辑器不消费 Esc」的措辞按实测应改成「不 stopPropagation」。
  4. **`@tiptap/starter-kit` 仍是 `packages/editor` 的 devDependency 却被运行时 import**（归属：主 agent，动 manifest 要碰 lockfile）。M3 沿用既有形态（`notion-like-editor.tsx:10` 早已如此）。
  5. **`@tiptap/static-renderer` 未安装**（归属：上游若把它变成必需包时按 §5 账本增依赖）。只读渲染用 `@tiptap/core` 的 `generateHTML`（3.22.4 已导出）。
  6. **内容宿主仍不按 `node.id` 挂载**（归属：**M10** —— `node-content-editor.tsx` 是 M10 的独占文件，加 `key={node.id}` 是一行且不改路由）。`f4e7357` 只在 `text-node-content.tsx` 内部修掉 text→text；rich-text 靠 `NotionEditor` 的 `room`、database/collection 靠各自宿主的 key。
  7. **`Typography` 的 `^2`/`^3` 输入规则在「一次插入多字符」时会抛 `RangeError`**（归属：后续章节单判 —— 关掉它就等于关掉「输入 `^2` 变 `²`」）。既存行为、非本轮引入，真机逐字输入不触发。
  8. **浮条不做移动端回落**（归属：若平板实测发现触摸选区下不好用，给单块做紧凑固定工具条）。rich-text 在窄屏藏浮条改用 `MobileToolbar`，单块没有第二套入口所以照常显示。
  9. **`NodeIconView` 的字形默认仍是 `size-4`**（r1 已解决页头三档尺寸的问题）。别的消费方（编辑器头部 36px 按钮、`preview-header` 16px 盒）在大盒子里同样要显式传 `glyphClassName`；要不要改成「字形默认按盒子比例」需单独判（会让 `preview-header` 的 16px 盒出现 9.6px 字形）。
  10. **页头文字列与正文列只在 pane ≥ 900px 时严格同源**（探针 ㉔ 在 1200px 对话框里逐像素一致）。窄 pane 下 grid 的 96px 边距 vs `mx-auto` 的 0 会差 ~50px；真要修得让头部复用 editor 的 `.notion-like-editor-layout` 列。
  11. **`readOnly` 会让封面一起消失**（今天无消费方）。`readOnly` 时不调用两个注入点，`{hasCover && coverEntry}` 渲染 `false`；要修就单开一条：`readOnly` 下用 `NodePreviewCover` 静态画封面。
- 用户结论（原话，2026-10-07）：「**我修复了些瑕疵，提交后并测试G3通过，现在开始G4**」

---

### G4 — M4 灵动岛 P0

- 状态：**通过**（2026-10-07 · 第 2 轮：第 1 轮用户实测提出瑕疵 → 用户本人修复并重构（`48f4e5d`）→ 重测通过；三条通过判据全部满足）
- 提交：`382b7b0`（依赖：`packages/ui` 增 `motion ^12` + lockfile）→ `dbccaf2`（状态：`uiStore` 增 `islandPanel` 切片）→ `94ac393`（P0：七个组件文件 + 宿主 + `(main)/layout.tsx` 挂载 + 文档）→ `8f4cd21`（G4 待测记录 + 决策 17–19）→ `693fb7b`（build 证据 + 第 9 条口径）→ **`48f4e5d`（用户侧：形变分层重构 + 实测瑕疵修复，见下「用户侧修复」）**
- 自检：
  - **typecheck diff**：`bash docs/plan/baseline.sh` → 两段 **0 新增 / 0 消失** ✅（typecheck 88 / lint 26）。逐包复核：`@workspace/ui` **19 条 = 基线**（探针期新增的 7 个文件**零 error**）、`@workspace/store` 干净（新切片零诊断）、`web` 段 37 条（新增的 `island-routes.ts` / `dynamic-island-host.tsx` 零 error；挂载先于宿主文件落地时那条 `app/(main)/layout.tsx(7,35) TS2307` 已随新文件消失，且它本就不在基线里 ⇒ diff 仍是 0/0）
  - **lint diff**：`@workspace/ui` **26 problems (0 errors, 26 warnings)**，与基线逐条一致、新增文件零 warning；`web` 4 warnings 不变
  - **越界检查**：`git status --short` 全程只有 §M4.1 白名单里的文件；`backend/**`、`packages/interfaces`、`pb/**`、`packages/ui/src/styles/globals.css`、`preview-block/**` 未触碰；`apps/web/app/**` 只动了 `(main)/layout.tsx` 的挂载
  - **依赖**：`packages/ui/package.json` +`"motion": "^12"`（实装 **12.43.0**，即 framer-motion 12.43.0，peer 明确 `^18 || ^19`；`./react` 是合法子路径），lockfile 已入库
  - **`pnpm --filter=web build`**（跑了两次）：① 装完依赖、岛还没落码时 —— `✓ Compiled successfully in 70s`；② **岛挂上 `(main)/layout.tsx`、`motion` 真的进了模块图之后** —— `✓ Compiled successfully in 66s`。两次的 TS 阶段都停在**基线里已有的** `app/(main)/graph/page.tsx` 「`theme` 不存在于 `GraphProps`」一条（[baseline/typecheck-errors.txt:2](./baseline/typecheck-errors.txt)）。⇒ **`motion` × React 19 × Next 16 的打包无碍**（总纲 §10 的风险行解除），而 `web build` 的整体不通过是 M4 开工前就存在的既存缺陷，判据因此按 §M4.4 前置说明 3 改写。**旁证**：产物里真有两者的代码 —— `.next/static/chunks/e3f26232c5bd4698.js`（133 KB，含 `data-island`）、`.next/dev/static/chunks/_fe96e69c._.js`（含 `IslandSurface` / `LIQUID_SPRING` / `originX` / `framer-motion`）。副作用：`next build` 会把 `apps/web/next-env.d.ts` 由 `.next/dev/types` 改写成 `.next/types`，两次都已 `git checkout --` 还原、未入库（见遗留 6）
  - **未改 Tailwind `@source`**：新类全在 `packages/ui/src/**`（已在白名单内），dev server 的产物已含 `size-11` / `supports-[backdrop-filter:blur(1px)]:…` 等（探针直接吃这份真产物，不是自造 CSS）
- **主 agent 预跑证据（真浏览器探针 15/15）**：`chrome-headless-shell` + 裸 CDP（配方见本文件 §6），页面挂**真 `<DynamicIsland />`**（真 `motion`、真 `island-surface` / `island-nav`、真 Radix `Dialog`）+ **真编译 CSS**，所有输入都是 CDP 的受信任事件；`chrome-headless-shell` 默认没有指点设备（`(hover: none)`），所以浏览器用 `--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4` 声明一只「细粒度、可悬停」的鼠标，触摸端再用 `Emulation.setTouchEmulationEnabled` 单独跑一轮：
  ```
  ✓ ① 真 <DynamicIsland /> 挂载（真 motion + 真 Tailwind 产物）：inline border-radius 9999px、transform-origin 50% 100% 0
  ✓ ② 收起态：w=133（≤180）、h=40、全圆 pill（解析后的圆角 ≥ 半高）
  ✓ ③ 收起态导航行：3 个图标按钮 + 1px 分隔线 + 当前项 aria-current=page + 禁用项 aria-disabled/opacity-40（=0.4）
  ✓ ④ 禁用项点了不做事（onSelect 计数 0→0、面板不变）；搜索图标 → 面板变 search
  ✓ ⑤ 展开态 search：560×440（视口 1280）、圆角 28px（motion 投影期是 `5.0049% 6.3715%`，解析后同为 28）、内容层与 data-island-placeholder 都在
  ✓ ⑥ 形变原点在**底边中点**（transform-origin = 280px 440px = 盒子的底部中心，即 originY: 1）
  ✓ ⑦ Esc：焦点在岛内时收起（局部 onKeyDown，回到 w=133）；焦点在岛外时**不动**（面板仍是 search）⇒ 不是全局监听
  ✓ ⑧ 形变可打断：140ms 后改向时胶囊已在飞行途中（w=342.6），settledAt=741ms（若排队播完「展开+收起」需 ~1.4s）、终点 132.8
  ✓ ⑨ 非降级下确实是弹簧：展开序列过冲到 607.7 再收敛到 560.0（欠阻尼）
  ✓ ⑩ 指针：外层 pointer-events:none、胶囊 auto；胶囊左外侧 8px 命中 #canvas、胶囊中心命中岛；外层 z-index=40
  ✓ ⑪ 层级：打开的 Radix Dialog 盖在岛之上（岛中心命中弹层）、Esc 关掉弹层且岛不受影响
  ✓ ⑫ 桌面端（hover: hover）高光跟随：--light-x=34.95% / --light-y=50.00% 有值
  ✓ ⑬ prefers-reduced-motion：尺寸**直接切换**（点击后第一帧已在 560.0）、整段无过冲、功能不变
  ✓ ⑭ (hover: none)/(pointer: coarse)：三个导航按钮均 44×44、高光不跟随（--light-x 为空）
  ✓ ⑮ 无未捕获报错、无 console error
  ```
  复跑：`bash /tmp/probe/run-island.sh`（刷新 dev 编出的 Tailwind 产物 → esbuild 打包 → 起/复用 `python3 -m http.server 8899 -d /tmp/probe` → 跑 `island-check.mjs`）。**工装踩到的三个坑**（复跑要带）：① `chrome-headless-shell` 默认报 `(hover: none)`/`(pointer: coarse)`，不加 blink-settings 就会把「桌面」那一轮全跑成触摸分支；② motion 的 `layout` 投影期间把 `border-radius` 写成**百分比对**（`5.0049% 6.3715%` = 560×440 上的 28px），`parseFloat` 会读成 5 —— 圆角断言必须按盒子解析百分比；③ headless 下**点击不会把焦点给按钮**（`document.activeElement` 仍是 `<body>`），局部 Esc 那条要显式 `focus()`（真机 Chrome/Windows/Linux 点击是会聚焦的，macOS 不会 —— 这也是 M9 要加全局 Esc 的原因之一）。
- 用户操作清单：见 [dynamic-island.md §M4.4](./dynamic-island.md#m44-闸门-g4--用户操作清单)（**9 条** + 8 条前置说明；第 2 条在 P0 只有「搜索 → Esc 收起」两个动作，第 8 条的判据已按既存缺陷改写）
- 用户实测结果（原话，2026-10-07）：「**我修复了些瑕疵，提交后并测试G4通过，现在开始G5**」——9 条清单随那一次修复一并通过；用户未逐条回传读数（与 G3-r2 同一处理），故本条以用户结论为准，主 agent 的 15/15 探针是第 1–6、10 条逻辑面的底稿。
- 失败项与归因：**无清单判定失败项**。用户在实测中提的是自己发现的瑕疵（不是把某条判为不通过），归因 **实现缺陷**，由用户自己提交 `48f4e5d` 修复；主 agent 在记录前复核了该提交的文件集与行为面（见「用户侧修复」），并确认它没有改坏 M4 的三条边界。
- 迭代：
  - G4-r1（第 1 轮实测，用户执行）：用户按 9 条清单实测 → 提出瑕疵并**自行完成一次形变实现的重构 + 修复**（`48f4e5d`：几何/弹簧/换层/时机拆成独立模块、`tuning.ts` 唯一数字源 + `__island` 调参台、展开态可点击关闭、点击岛外收起、`IslandPanel` 上移到 `packages/interfaces`）→ 重测通过，随即开工 M5。
  - **闸门前的自检期**抓到两个真缺陷，都在交用户之前修掉，不计入闸门轮次（见下）。
- **用户侧修复（`48f4e5d`，主 agent 复核；31 个文件，+2971/−1145）**：
  1. **分层**：`island-config.ts` / `island-nav.tsx` / `island-surface.tsx` / `panels/*` 删除，换成 `forms.ts`（四形态几何 + 三种交棒策略）/ `geometry.ts`（纯几何、proximity、层不透明度）/ `motion.ts`（盒子与层的弹簧）/ `layers.ts`（换层状态机，保留被降级层的 key）/ `stage.tsx`（渲染哪一层）/ `surface.ts` / `nav.tsx` / `panels.tsx` / `use-pill-box.ts` / `environment.ts` / `tuning.ts` / `use-tuning.ts` / `types.ts`；`dynamic-island.tsx` 只剩壳。**M4.2-14 的 `data-*` 锚点全部保留**（`data-island` / `data-island-panel` / `data-island-nav` / `data-island-nav-item` / `data-island-nav-disabled` / `data-island-placeholder` / `data-island-content`），新增 `data-island-layer{,-side}` 两个；M8/M9 的探针锚点不变。
  2. **公开面收敛**：props = `panel` + `onPanelChange` + `nav` + **`content?: Partial<Record<IslandExpandedPanel, ReactNode>>`** + `actions` + `backdrop?: "auto" | "opaque"` + `ref`；`IslandNavItem` 增 `separator`（分隔线由宿主标记，不再由 `key` 推断）；宿主改为用 `ref` 观察胶囊写 `--dynamic-island-height`（不再 `document.querySelector`，effect 回到 mount-only）。**⇒ M8/M9 的内容注入点是 `content={{ preview: … }}` / `content={{ search: … }}`，不是 M4 文档里的 `previewContent` / `searchContent` / `agentContent`；两条边界（不读 store、不注册全局键盘）未变。**
  3. **类型收敛**：`IslandPanel` / `IslandExpandedPanel` 移到 `packages/interfaces/src/models/island.ts`，`@workspace/store` 只重新导出 —— **M4.2-7「两处结构等价副本」的约定作废**。
  4. **时机重做**：内容交棒统一由 `proximity` 驱动（grow 硬切 / shrink 在 `pillHandover` 处切换 / swap 走溶解窗口）；`timingOf` 生成三行策略表，`handoverFor` 只选行（纯函数，测试钉住）—— **M4.2-18/19 的口径被这条取代**。
  5. **手感与调参**：`tuning.ts` 是唯一一份数字与纯数学（`applyPatch` 校验、`ringOf` 推导回弹圈、`scaleSpring` 保 ζ、`sourceOf` 打印可粘贴源码）；`use-tuning.ts` 提供 dev 控制台 `__island`（`help/show/set/speed/instant/reset/copy`）+ localStorage 持久化；`resolveMotion` 是数字到 motion 的唯一通路。**本轮手调结果按被观看时的有效值提交**：弹簧 440/24、440/32、1280/60（speed 2 已烘入），`PILL_HANDOVER = 3`。
  6. **测试先例**：`packages/ui` 增 `node --test` 脚本（Node 原生跑 TS，**零新依赖**）+ tsconfig 放行 `.ts` 扩展名导入；`geometry.test.ts` / `swap.test.ts` / `tuning.test.ts` 共 33 条。**仓库此前无 JS/TS 测试先例**，`packages/ui` 现在有一条可跑的纯函数测试线（`pnpm --filter=@workspace/ui test`）—— 与本仓「不引入测试框架」的反模式不冲突（Node 内置 runner）。
  7. **行为面新增**：展开态的搜索图标**可点击收起**（平板没有 Esc，M4 记录里「展开态只能靠键盘 Esc」的缺口由此补上）、**点击岛外收起**（`document` capture 阶段的 `pointerdown`）。这两条不在 M4 清单的 9 条里，属用户实测驱动的增益。
  8. **本轮 M4 交付里的三处「实现选择」被重构取代**（不再作为遗留）：`SNAP_SPRING` 的嵌套接法、2.4s 高光漂移（`surface.ts:44` 明确写「自走的径向高光刻意不在这里」）、`--dynamic-island-height` 的每次面板切换重订阅。**`blurEnabled` 也被新公开面的 `backdrop?: "auto" | "opaque"` 取代**（`"opaque"` 今天仍无消费方 —— 见遗留 1）。
- **闸门前自检抓到的两个真缺陷**（都不是笔误，且第一条本来会让 G4 第 1 条直接失败）：
  1. **`Tooltip` 缺 `TooltipProvider` ⇒ 整个岛渲染抛错**。Radix 的 provider context **没有默认值**（`radix-ui@1.4.3`），`island-nav` 的「禁用项原因 tooltip」是**第一处可达**的 `Tooltip`：探针第一轮的控制台原文是 `` Uncaught Error: `Tooltip` must be used within `TooltipProvider` ``，`#root` 里什么都没渲染（`[data-island]` 不存在）。修法：`IslandNav` 内包一层 scoped `<TooltipProvider delayDuration={0}>`（一个岛一个；Provider 不产出 DOM，锚点与 40px 行不变）。**同时发现一处既存同类隐患**：`packages/ui/src/components/ui/sidebar.tsx:528` 的 `<Tooltip>` 也在没有 provider 的情况下渲染，而全仓没有任何地方挂 `TooltipProvider` —— 今天不可达（`MainSidebar` 没给那几个按钮传 `tooltip`），见遗留 5。
  2. **`nav-hover`（收起态悬停横向展开标签）与 G4 第 1 条的判据冲突**。设计 §2.2 把它标为**可选**、优先级最低，G4 清单里没有一条测它；但「指针一进胶囊就变宽/出标签」会让「收起态宽度 ≤180px」在验收时变成「看你指针在哪」。已删除该分支（`IslandNavPanel` 保留给**展开态**用），并写进 `dynamic-island.tsx` 文件头与 [§M4.2-17](./dynamic-island.md)。
- **两处「按可运行等价写法」而非逐字照抄设计样例**（都已在代码 JSDoc 记录，G4 不判）：
  1. `transformOrigin: { originX, originY }` → 写成 motion 12 style 的**顶层键** `originX/originY`（`ISLAND_ORIGIN`）。理由：嵌套对象是 motion 的内部 `TransformOrigin` 记录，`motion-dom` 只对 `origin*` 顶层键合成 `transform-origin`，对象形式既过不了 `MotionStyle` 的类型、也不会渲染出目标值。渲染结果与设计意图一致：`transform-origin: 50% 100% 0`（探针 ⑥ 按「盒子底部中心」量）。
  2. 底色第①层写成 `bg-popover` + `supports-[backdrop-filter:blur(1px)]:bg-popover/85`（暗色同款 `/80`），而不是把 `bg-popover/85` 当无条件底 —— 否则「不支持 `backdrop-filter` 时改不透明」就没有落点（§3.4 第 2 行）。因此按 `classList` 精确匹配 `bg-popover/85` 会落空，按计算样式量透明度才通过。
- 遗留不阻塞项（**G4 通过后定稿**，复核基准 = 用户重构后的 `48f4e5d` 代码）：
  1. **`backdrop: "opaque"` 今天没有消费方**（新的公开面）：设计 §3.4 第 3 行要的「模拟运行中 / 岛上 300ms 无重绘 ⇒ 关模糊」按 R10 不接 `packages/graph`，谁先知道「背后在重绘」谁就去传 `"opaque"`（dashboard 网格、编辑器全屏是候选）。归属：该消费方落地的章节（M10 或之后）。
  2. **`__island` 调参台没有环境门**（`use-tuning.ts` 往 `globalThis.__island` 挂控制台 + localStorage 持久化）：生产构建里把 `speed` 烘回 1 就等价于关掉它，但今天没有 `process.env.NODE_ENV` 门（`packages/ui` 里也无先例）。无用户可见后果；真要门就在 `use-tuning.ts` 一行。
  3. **「点击岛外收起」是 `document` capture 阶段的全局 `pointerdown`**（岛的第三条边界写的是「不注册全局键盘」，不是「不注册全局指针」）：任何一次点击都会收起展开态，这是用户要的行为；但它不判「这次 pointerdown 是否归内层浮层」（G3 的 `isInnerLayer` 是现成原语），而岛内今天没有 portal 到 `body` 的内容（placeholder 是普通 DOM）。**M8/M9 注入 `content` 后必须复测这一条**（岛内若有 Radix 弹层/下拉，点它不能被当成「岛外」）。
  4. **既存隐患：`packages/ui/src/components/ui/sidebar.tsx:528` 的 `<Tooltip>` 缺 provider**（全仓只有岛的 `nav.tsx` 挂了 scoped `TooltipProvider`）：今天不可达（`MainSidebar` 未给那些按钮传 `tooltip`），但任何走通那条路径的改动都会白屏。归属：接入 tooltip 的那个人；或在 `apps/web/app/layout.tsx` 挂一个全局 `TooltipProvider`（M5 的 toolbar 自带 scoped provider，见 §M5.2）。
  5. **`next build` 会改写 `apps/web/next-env.d.ts`**（`.next/dev/types` ⇄ `.next/types`）：`next dev` 与 `next build` 交替跑会来回抖。已还原未入库；谁要跑 build 请留意别顺手提交。
- 交用户决定的两条（**未回答**，随 G4 通过转入待决台账；第 1 条在 G7/G10 开工前必须有结论）：
  1. **`web` 的 `pnpm --filter=web build` 今天不通过，但原因与 M4 无关**：`app/(main)/graph/page.tsx:69` 传了 `theme`，而 `packages/graph` 的 `GraphProps` 只有 `viewId` / `view` / `className` / `style`（基线里的 TS2322，[baseline/typecheck-errors.txt:2](./baseline/typecheck-errors.txt)）。**M5 不判 `web build`，所以现在不阻塞**；但 M7 的回归面 4 与 M10 的「装完依赖跑一次 `web build`」都会撞上它 —— 届时要先花一条前置修复（动 `apps/web/app/(main)/graph/page.tsx` 或 `packages/graph`，两者都在任何现有白名单之外）。
  2. **`/settings` 今天不进胶囊**（只有 middleware 保护、没有 page）：若希望它占一个位置（禁用态 + 原因），改 `apps/web/components/island-routes.ts` 一行，并按新的 `separator` 口径（分隔线由宿主标记，不再按 `key` 推断）决定它落在哪一项前。
- 用户结论（原话，2026-10-07）：「**我修复了些瑕疵，提交后并测试G4通过，现在开始G5**」

---

## 6. 自检探针配方（主 agent 用，不进仓库）

计划原本的验证面是「`baseline.sh` + 用户手测」；G2-r2 起多一层**真浏览器探针**，用来在交用户之前自己把行为钉死（用户要求「写脚本自己检查」）。它是临时工装，**不进仓库**（本仓反模式明确不要 JS 测试设施），全部落在 `/tmp`：

1. **浏览器**：从 Chrome for Testing 下 `chrome-headless-shell`（本容器没有 GTK/X11，装不了常规浏览器，但这台机器只缺 10 个 `.so`）：
   `curl -o /tmp/cft/chs.zip https://storage.googleapis.com/chrome-for-testing-public/<ver>/linux64/chrome-headless-shell-linux64.zip`（版本号取 <https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json>）；
   `cat chrome-headless-shell-linux64/deb.deps` 给了包清单，`apt-get download <pkg> && dpkg-deb -x <deb> /tmp/cftlibs` 逐个解包（无需 root），`LD_LIBRARY_PATH=/tmp/cftlibs/usr/lib/x86_64-linux-gnu:/tmp/cftlibs/lib/x86_64-linux-gnu`，`ldd chrome-headless-shell | grep 'not found'` 迭代到 0。
2. **页面**：`apps/web/.probe-g2/entry.tsx`（用完即删）用**真组件** + **真模态 `Dialog`** 搭最小场景，数据层用 alias 换成 stub：
   `esbuild apps/web/.probe-g2/entry.tsx --bundle --outfile=/tmp/probe/bundle.js --tsconfig=apps/web/tsconfig.json --alias:@workspace/store=…stub --alias:@workspace/services=… --alias:@workspace/api-client=… --alias:@workspace/ui/components/menu/upload-menu=…`
   CSS 直接复用 dev server 编出来的那份：`apps/web/.next/dev/static/chunks/[root-of-the-server]__*.css`。
3. **驱动**：`/tmp/probe/check.mjs` 用**裸 CDP**（Node 内置 `WebSocket`，零依赖）：`Target.attachToTarget(flatten)` → `Runtime.evaluate` 量 `clientHeight/scrollHeight/getComputedStyle` → `Input.dispatchMouseEvent{type:"mouseWheel"}` 派发**受信任**滚轮并读回 `scrollTop` → `Page.captureScreenshot` 存证据。关键技巧：给 `Event.prototype.preventDefault` 打桩记录调用栈，可以直接指认「谁吞了滚轮」。
4. **必须带反向对照**：用注入 CSS 还原旧形状，断言同一探针**失败**（否则探针可能空过）。

复跑：`node /tmp/probe/check.mjs`（脚本自己拉起 / 关闭浏览器）。
