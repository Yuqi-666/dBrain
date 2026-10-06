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
| G1   | M1 数据脊柱                | [spine.md](./spine.md#m14-闸门-g1--用户操作清单) | 待测 | 1    | 2026-10-06 | 见 §5 |
| G2   | M2 图标与封面              | [node-content-ui.md](./node-content-ui.md) | 未开工 | —    | —    | —    |
| G3   | M3 text 单块 + rich-text 头部 | [node-content-ui.md](./node-content-ui.md) | 未开工 | —    | —    | —    |
| G4   | M4 灵动岛 P0               | [dynamic-island.md](./dynamic-island.md)   | 未开工 | —    | —    | —    |
| G5   | M5 image 批注              | [annotation.md](./annotation.md)           | 未开工 | —    | —    | —    |
| G6   | M6 媒体与时间戳笔记        | [media.md](./media.md)                     | 未开工 | —    | —    | —    |
| G7   | M7 PDF 自绘与批注          | [annotation.md](./annotation.md)           | 未开工 | —    | —    | —    |
| G8   | M8 灵动岛 P1 预览面板      | [dynamic-island.md](./dynamic-island.md)   | 未开工 | —    | —    | —    |
| G9   | M9 灵动岛 P2+P3 搜索与清理 | [dynamic-island.md](./dynamic-island.md)   | 未开工 | —    | —    | —    |
| G10  | M10 dashboard P0           | [dashboard.md](./dashboard.md)             | 未开工 | —    | —    | —    |
| G11  | M11 dashboard P1           | [dashboard.md](./dashboard.md)             | 未开工 | —    | —    | —    |
| G12  | M12 selectors P2 收尾      | [node-content-ui.md](./node-content-ui.md) | 未开工 | —    | —    | —    |
| G13  | M13 dashboard P2+P3        | [dashboard.md](./dashboard.md)             | 未开工 | —    | —    | —    |

**并行窗口登记**（[README.md §3.2](./README.md#32-并行窗口必须由主-agent-显式开启并登记到-gatesmd)）：目前**无开启**。开工时在此登记一行，写明该窗口的 owner、文件白名单与「相交面为空」的依据。

| 窗口 | 章        | 开启前提（必须已落地）                                                        | 登记状态 |
| ---- | --------- | ----------------------------------------------------------------------------- | -------- |
| W0   | M4 ∥ M2/M3 | M0 过 G0（registry 可写，`motion` 装得上）                                     | 未开启   |
| W1   | M2        | 主 agent 冻结 `node-media/` 的导出与 props 形状                                | 未开启   |
| W2   | M5        | 主 agent 冻结 `annotation/types.ts` 与 `geometry.ts` 签名（另独占 `annotation-layer.tsx`） | 未开启   |
| W3   | M10       | 主 agent 冻结 `DashboardItem`/`DashboardLayout`、`dashboardStore` 切片、`dashboard-config.ts` | 未开启   |
| W4   | M13       | M11 已落 `dashboard_pages` 的 tRPC 契约；`dashboard-header.tsx` 由主 agent 先写成两个插槽 | 未开启   |
| W5   | M6        | 主 agent 冻结 `media/types.ts`（`MediaController` / `TimestampNoteMarks` / `formatTimeMs`） | 未开启   |

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

- 状态：**待测**（第 1 轮；自检与主 agent 端到端预跑全绿）
- 提交：`2b6bbf7`（interfaces 形状 + `null` 哨兵）→ `3a9b5ee`（domain）→ `357f59a`（迁移 + 基线第三类归一化）→ `4aec001` + `35af438`（application/DTO/tRPC + infra mapper）→ `153e6cf`（共享写者 + doc-normalize）→ `22fb180`（attributes-sidebar 修）→ `3d8c1a4`（清空哨兵写显式 `null`）→ `1d67b4d`（doc-normalize 空串）→ `b70eaaf`（apps/server paths + 基线重采）
- 自检：
  - **typecheck diff**：`bash docs/plan/baseline.sh` → **0 新增 / 47 消失** ✅。消失的 47 条全是 `server:` 段噪声，根因是 `apps/server/tsconfig.json` 漏了 `@workspace/interfaces` / `@workspace/utils` 的 `paths`（见 R38）；补上后 `pnpm --filter=server typecheck` **零诊断**，全仓 `Tasks: 15 successful, 19 total`（`Failed:` 只剩 editor / interfaces / ui / web）。
  - **lint diff**：`bash docs/plan/baseline.sh` → **0 新增 / 3 消失** ✅（`@workspace/ui` 31 → 28，attributes-sidebar 去掉 2 条 `no-explicit-any` + 1 条 unused directive）。
  - **四个后端层 typecheck 全绿** ✅（domain / application / infrastructure / adapter-back / adapter-front；这是 M1 唯一的硬判据）。
  - **`@workspace/interfaces` 仍只剩环的那 1 条** ✅（M1 新增两个文件 + 若干 barrel 导出后未增）。
  - **迁移**：`./pb/pocketbase migrate up` → `Applied 1700000001_node_extras.js`，`nodes` 字段 32 → 36；`printf 'y\n' | ./pb/pocketbase migrate down 1` → `Reverted …`，字段回到 32；再 `up` 回到 36 ✅（`down` 用的是 `removeByName`，真的能跑）。
  - **`agent-browser` 预跑**：未做（无浏览器工具）。替代物是一条**真机端到端探针**（`tsx` 起真 `AppContainer` + 真 PocketBase），6/6 全过 —— 明细见「主 agent 预跑证据」。
- 用户操作清单：见 [spine.md §M1.4](./spine.md#m14-闸门-g1--用户操作清单)。**按实测调整三处**：
  1. 第 1/2 条**已经由主 agent 代跑并留证**（迁移已应用、四列已在）；你只需在 PB 后台复核一眼。
  2. 第 3/8/9 条**不要用 text 节点**：库里的 25 条是 `packages/dev` 的演示数据，其中 `text` 节点的 `docs` 是 `null`、正文被 seeder 塞在 `content` 的**字符串**里，打开会显示 `{` —— 这是 seeder 的形状，不是 M1 引入的；M3 的 `normalizeDoc` 才会修它。请改用 **image / audio / pdf** 节点（它们的数据是好的）。
  3. 第 4/5/8/9 条的「既有节点」直接用主 agent 造的两条探针节点（在你的工作区里，标题以 `M1 自检 ·` 开头，可删）：`M1 自检 · image（可删）` 已经带了一层 `annotations`，`M1 自检 · audio（可删）` 已经带了一条 `timestampNotes`。
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
- 失败项与归因：暂无（用户实测前）
- 迭代：——
- 遗留不阻塞项：
  1. **create 路径不支持 content 级新字段**：`addSchema` 的 image/pdf/audio/video content schema 仍只声明原有键，`createNode` 也不透传 `annotations` / `timestampNotes`。计划里没要求（M5/M6/M7 都走 update 半边），但「新建时就带批注」这条链路今天是断的。谁需要谁在 M5/M6 开工时补。
  2. **`nodes` 表没有 `created` / `updated` 列**（0 号迁移的 nodes 定义里本来就没有），domain 的 `create()` 用 `?? new Date()` 兜底 ⇒ 节点时间戳每次读取都变成「现在」。M1 未引入、未修，已登记为风险；**M12「最近使用」开工前必须解决**。
  3. `CollectionNode.clearFilter` 走 `filterConfig: undefined`，与遗留 1/风险表同族（PB 部分更新下清不掉）。当前没有 UI 入口，M1 未碰。
  4. 属性侧栏去掉 `debounce: true` 后写变成「下一个微任务」，比原先的 500ms 防抖更即时；`handleContentUrlChange` 的 `if (!node.content) return;` 守卫也一并去掉（content 恒存在，实测无差）。G1 第 8/9 条会实测其行为。
- 用户结论：**待填**
