# 回归基线（M0 产出）

> 状态：**已重采**（2026-10-06，M0 落地后；`develop` @ `ac6a0f0`）
> 用途：每个闸门（[gates.md](./gates.md)）的判据是「**相对本基线无新增错误**」，不是「干净」
> 重跑：`bash docs/plan/baseline.sh`（`--accept` 可把当前结果晋升为新基线）
> 原始输出：`.baseline-raw/{typecheck,lint}.txt`（已 gitignore，脚本可重新生成）｜归一化快照：[baseline/typecheck-errors.txt](./baseline/typecheck-errors.txt)、[baseline/lint-errors.txt](./baseline/lint-errors.txt)

---

## 0. 为什么需要基线：三个既存缺陷（+1 个 M1 顺手修掉的噪声源）

采集基线时实测出三个**本轮之前就存在**的问题。它们不属本轮范围，但直接决定了「验证怎么做」。

| # | 缺陷                                                                                         | 证据                                                                                                                                                            | 后果                                                                 |
| - | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1 | `turbo.json` 的 `lint` / `check-types` 声明了 `dependsOn: ["^lint"]` / `["^check-types"]`，而 workspace 存在**真实源码环** | `pnpm lint` 直接 `x Cyclic dependency detected` 退出 1；环是 `packages/interfaces/src/models/filter.ts:1` ← `@workspace/utils` 与 `packages/utils/src/filter.ts:7` ← `@workspace/interfaces` 互引（另有 `services ⇄ api-client`、`ui ⇄ editor ⇄ dataview`） | 全仓 lint / typecheck 一条命令都跑不了                                |
| 2 | 根 `check-types` 脚本是 `turbo run check-types`，但**没有一个包**定义 `check-types` 脚本（包里叫 `typecheck`） | 去掉 `dependsOn` 后 turbo 输出 `No tasks were executed as part of this run. Tasks: 0 successful, 0 total`                                                        | 即使修了环，`pnpm check-types` 仍是**空跑**，什么都不检查             |
| 3 | 大量既存类型/lint 错误（见 §2、§3）                                                          | 见下                                                                                                                                                            | 「typecheck 干净」这种验收标准在本仓**今天不可能成立**，判据必须改成 diff |
| 4 | **`apps/server/tsconfig.json` 没有 `@workspace/interfaces` / `@workspace/utils` 的 `paths`**（它有 domain/application/infrastructure/adapter-* 的） | 那 46 条 `server:` 前缀错误**全部**是 `Cannot find module '@workspace/interfaces...'` 及其次生 TS7006/TS2322；M1 补上两条 path 后 `pnpm --filter=server typecheck` **零诊断**，全仓 `Tasks: 14 successful` → **`15 successful`** | 基线里最大的一块噪声（46 条）。它把「后端改动」的信号淹掉：M1 只改 12 行就换来 12 条假新增。已在 M1 修掉（见 §9 R38） |

**M0 的最小修法**（[spine.md §M0](./spine.md#1-m0--基线与验证闭环)）：让 turbo 的任务名与包脚本名对齐、去掉 `^` 依赖边、给两个命令加 `--continue`（否则 turbo 遇第一个失败就中止，拿不到完整清单）。**不拆环**——那是独立重构（会在 §5 风险里留一条）。**已落地**：`turbo.json` + 根 `package.json` 见提交 `578f4e5`。

修完实测：typecheck 跑 **19** 个任务、lint 跑 **20** 个任务，均能拿到完整失败清单（M0 时 `Tasks: 14 successful, 19 total`；**M1 修掉缺陷 4 后为 `15 successful, 19 total`**，`Failed:` 只剩 `editor` / `interfaces` / `ui` / `web`）。

---

## 1. 怎么读这份基线

- `baseline/typecheck-errors.txt` / `baseline/lint-errors.txt` 是**归一化后的错误清单**（每行 = `N× <错误>`，已排序，去掉了时间/缓存命中/行号等每次都会变的成分）。
- 闸门判定 = 把当前输出跑同一套归一化，再 `diff`。**新增行 = 新增错误（或同一文案多了一条）**；消失行 = 顺手修好了（是好事，但要 `--accept` 更新基线，免得下次看花眼）。
- `server:` 前缀曾经是 `apps/server` 跨包 typecheck 后端源码却解析不到 `@workspace/interfaces` 造成的噪声段；**M1 补上 `paths` 后它已归零**（`pnpm --filter=server typecheck` 干净）。如今 `server` 是一条**真哨兵**：后端源码在另一份 tsconfig 下再编一遍，真出错就会出现在这里。

### 1.1 归一化里必须抹掉的**三类假差异**（M0 两类 + M1 一类）

判据是「错误清单」的 diff，所以任何**在同一错误集上仍会抖动**的输出都必须先归一化，否则每个闸门都会看到假新增。均已写进 `baseline.sh`：

| 类 | 现象 | 证据 | 归一化 |
| -- | ---- | ---- | ------ |
| ① pnpm 退出码 | 同一份错误清单，`ELIFECYCLE Command failed with exit code 2` 会变成 `1` | `apps/web` 的 `tsc --noEmit`：**冷跑 exit 2、热跑 exit 1**（连跑四次：2/1/1/1）；`web:typecheck` 这行因此在上一次采集与本次之间无端变化 | `s/exit code [0-9]+/exit code N/` —— 保留「该包脚本失败」的信号，只抹掉会变的数字 |
| ② TS 对象字面量成员顺序 | 同一处 `TS2345` 的错误文案里 `{ userId; sourceId; color?; category?; }` 的成员顺序两次运行不同 | `server: ../../backend/adapter-front/src/trpc/router/edge-semantic.ts(31,80)`，两次采集的差异**只**在成员顺序 | `canon_type_literals`：把每个 `{...}` 内的 `a: T; b: U` 按字典序排序（先摘掉结尾 `;` 再排，否则空元素会被排到最前——这是第一版的 bug） |
| ③ **行/列号漂移** | 里程碑编辑一个**本身带基线错误**的文件时，那些既存错误的行号必然跟着挪，于是同一份错误集在 diff 里表现为「删 9 行 / 加 10 行」 | M1 实测：`backend/domain/src/models/node/value-objects.ts` 的 3 条 TS7006 从 `(931,8)/(937,14)/(943,8)` 挪到 `(1019,8)/(1025,14)/(1031,8)`；`entities.ts` 的 3 条 TS2307 从 `(1,31)/(6,8)/(9,8)` 挪到 `(2,31)/(7,8)/(10,8)`。它们全在 `server:` 段（`apps/server` 编 `backend/**` 时解析不到 `@workspace/interfaces` 的深路径/裸入口） | `s/\([0-9]+,[0-9]+\)/(L,C)/g` **＋ 保留出现次数**（`sort \| uniq -c`，快照写成 `N× <错误>`）。判据因此是「**file + error code + message + 出现次数**」的集合比较：新文件、新文案、或同一文案多一条，都仍然会被 diff 抓到；丢掉的只有「同一 file+文案 内部换了行号」这一件无信息量的事 |

> 三类都**只影响文案/位置、不影响错误集**：真有字段增删时清单依然会变，所以不掩盖真实回归。归一化后的基线（**M3/G3 追加交付时重采**）：typecheck **88** 条、lint **26** 条。

---

### 1.2 第四类「假差异」其实是**真差异**：`@workspace/ui` 段的别名修复（M3/G3 追加交付）

`packages/ui/tsconfig.json` 的 `@workspace/editor` / `@workspace/editor/*` 原本指向 `../editor/src(/*)` —— **不存在的目录**。它之所以"能编过"，是因为 `packages/ui/node_modules/@workspace/editor` 是 workspace 软链，TS 在 `paths` 落空后会**回退到 node_modules 解析**：文件确实被拉进程序了，但那些文件**内部**的 `@workspace/editor/...` 一律 TS2307，于是 `@workspace/ui` 段堆了 65 行噪声（还有一批被 2307 掩盖、因类型退化成 `any` 而消失的 TS7006）。

改成 `../editor(/*)` 后同一批文件按正确路径解析，结果是**一次真实的改善**：

| 段 | 修前 | 修后 | 说明 |
| -- | ---- | ---- | ---- |
| `@workspace/ui` | 76 条 | **19 条** | 剩下的 19 条是 editor 文件**真实的**既存错误（latex 三件套、`notion-like-editor-header`、`excalidraw-wrapper`），与 `@workspace/editor` / `web` 两段同源；`packages/ui/src` 自身仍是零错误 |
| `@workspace/editor` / `web` / `interfaces` / `server` | 不变 | 不变 | 只有 `packages/ui` 一份 tsconfig 改了 |
| 全仓归一化条数 | 136 | **88** | diff = −52 / +4（那 4 条是上面说的"显示出来"的真实错误） |
| lint | 26 | **26** | 不受影响 |

这不是 M3 功能的副作用，而是它的**前置条件**：单块编辑器要复用 `packages/editor` 的 `tiptap-ui` 控件（浮条），不修别名的话每引一个模块就 +1 条噪声行，基线判据会被"复用 editor 代码"这件事本身搞脏。改动与判定过程记在 [gates.md §5 G3](./gates.md) 的「追加交付」段。

---

## 2. typecheck 基线（19 任务：15 通过 / 4 失败；M3/G3 追加交付重采）

| 包 / 应用                  | 结果 | 说明                                                                        | 本轮是否触碰 |
| -------------------------- | ---- | --------------------------------------------------------------------------- | ------------ |
| `@workspace/interfaces`    | ❌ 1 条 | M0 前是 4 条；其中 3 条是 `nodes/complex/index.ts:5-7` 的**死 re-export**，已在 M0 删除。剩下 1 条是环的产物 `../utils/src/filter.ts(7,8) TS2307`，**M1 之后这里必须仍然只有这 1 条**（实测：M1 加了 annotation/timestamp-note 两个新文件与若干 barrel 导出后仍是 1 条 ✅） | **是**（M1） |
| `@workspace/editor`        | ❌ 多条 | `@workspace/adapter-front` / `@workspace/store` / `next/dynamic` 解析不到的 TS2307，以及 tRPC hooks 的 TS2339 | **是**（M3） |
| `@workspace/ui`            | ❌ **19 条** | 别名修正后只剩 editor 文件真实的既存错误（见 §1.2）；**`packages/ui/src` 自身零错误**。M1（76 条）/ M2 期间逐条 diff 为空；M3 追加交付把 76 → 19 | **是**（M2–M13） |
| `web`                      | ❌ 多条 | 同族 TS2307（`@workspace/hooks`、`@workspace/infrastructure`、`@workspace/domain/...`）+ 若干 TS18047/TS2322 | **是**（M4、M10 加路由） |
| `server`                   | ✅ **0 条** | **M1 修掉了缺陷 4**：给 `apps/server/tsconfig.json` 补 `@workspace/interfaces` / `@workspace/utils` 的 `paths` 后，46 条噪声一次归零。它现在是后端改动的**真哨兵** | **是**（M1、M11） |
| `@workspace/{dataview,store,services,graph,hooks,utils,api-client,dev}` | ✅ | —— | dataview / store / services 会被 M1、M4、M10 碰 |
| `@workspace/{domain,application,infrastructure,adapter-back,adapter-front,adapter-tauri}` | ✅ | **四个后端层都是干净的** —— 这是 M1 唯一的硬判据（M1 大改后仍全绿） | **是**（M1、M11） |

**对本批次最重要的一条**：`@workspace/interfaces` 的 4 条错误里，M0 修掉 3 条死 re-export 后，M1 之后这里**必须只剩环的那 1 条**。这是「无新增错误」判据在 M1 上的具体操作方式，写进了 G1 的判据里。M1 实测结论：**仍是 1 条**。

---

## 3. lint 基线（20 任务：11 通过 / 9 失败；M1 后为 12 通过 / 8 失败）

| 组                      | 包                                                                                            | 结果                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **缺 flat config**（exit 2） | `@workspace/{adapter-back,adapter-front,adapter-tauri,application,domain,infrastructure}`、`server` | `ESLint couldn't find an eslint.config.(js\|mjs\|cjs) file.`（ESLint 9 起默认只认 flat config；这些包 `scripts.lint = "eslint"` 但没有配置文件） |
| **脚本本身坏了**（exit 1）  | `desktop`                                                                                     | `Invalid project directory provided, no such directory: apps/desktop/lint` —— `next lint` 在 Next 16 已移除，被当成目录参数 |
| **真错误**（exit 1）       | `@workspace/editor`                                                                           | **106 problems (67 errors, 39 warnings)** —— 该包未走 `eslint-plugin-only-warn`，`no-explicit-any` 等是真 error |
| **仅警告**（exit 0）       | `@workspace/{api-client,dataview,graph,hooks,interfaces,store,ui,utils}`、`web`、`@workspace/dev` | 计数（M1 后）：`api-client` 1、`dataview` 0、`graph` 3、`hooks` 2、`interfaces` 3、`store` 5、**`ui` 28**（M1 去重后从 31 降到 28）、`web` 4 |

**两条对本批次直接有用的结论**：

1. **后端 4 个层（domain / application / infrastructure / adapter-front）的 lint 今天跑不了**（缺 config）。所以 M1 对后端的判据**只能是 typecheck**（那 4 个层在 typecheck 上是干净的，见 §2）。缺 flat config 这件事记在 §4 可选修复里，**不做**是本轮的默认决策。
2. **`@workspace/editor` 的 67 个真 error 是 M3 的雷区**：M3 要在 `packages/editor/components/tiptap-templates/single-block/` 新增两个文件。判据是这 67 条**不增长**，且新增文件自身零 error（新文件里出现 `any` 就会直接撞在 `no-explicit-any` 上）。

---

## 4. M0 可选修复（默认**不做**，需要时单独开章）

| 项                                                     | 成本                          | 收益                                       | 决策       |
| ------------------------------------------------------ | ----------------------------- | ------------------------------------------ | ---------- |
| 给 7 个包补 `eslint.config.js`（复用 `packages/eslint-config`） | 7 个小文件 + 各加一条 devDependency | 后端改动也能过 lint                        | **不做**   |
| 修 `desktop` 的 `lint` 脚本（`next lint` → `eslint .`）  | 1 行                          | 桌面端 lint 可用                           | **不做**   |
| 拆 `interfaces ⇄ utils` 等三处包环                     | 未估（要动公共类型归属）      | `^dependsOn` 可以装回去；跨包 typecheck 变干净 | **不做**   |
| 顺手修 `@workspace/editor` 的 67 个 error              | 未估（跨多个 tiptap 扩展）    | editor 的 lint 变成可持续信号              | **不做**   |

> 这些项全部与「本轮要交付的功能」正交。动它们会把闸门判据搅浑（一次改动的失败原因从 1 个变 2 个）。若某章确实被其中一项卡住，按 [README.md §6.3](./README.md#63-不通过时的处置) 拆 `M<n>.1` 子章单独过闸。

---

## 5. 基线快照的元信息

| 项                | 值                                                              |
| ----------------- | --------------------------------------------------------------- |
| 采集时间          | 2026-10-06（初采 @ `907521f`；M0 落地后重采 @ `ac6a0f0`；M1 收口重采 @ `1d67b4d` 后工作树：补第三类归一化 + 修掉 `apps/server` 的 paths；**M3/G3 追加交付重采**：修掉 `packages/ui` 的 `@workspace/editor` 别名，见 §1.2） |
| 分支 / HEAD       | `develop`（M1 进行中）                                           |
| 快照格式          | `N× <file>(L,C): error TSxxxx: <message>` —— 行/列号已归一化，出现次数保留（见 §1.1 类③） |
| 归一化后条数      | typecheck **88** 条（计数行）／ lint **26** 条（M3/G3 追加交付重采；M1 收口时是 136/26，M0 时是 213/26 —— 差值分别来自 M1 归零的 `server:` 段与 §1.2 的别名修复） |
| node / pnpm / turbo | v24.15.0 / 9.0.0 / 2.9.6                                      |
| PocketBase        | `pb/pocketbase`（31 MB 二进制）；`pb/pb_data/` 已存在 —— **但库是空的**：`nodes`/`users`/`workspaces`/`edges` 全 0 行（M0 直读 sqlite 实测）。superuser 安装已于 M0 用 CLI 完成（`admin@dbrain.dev`，密码见 gitignored 的 `pb/pb_data/.superuser-credentials.txt`） |
| 迁移现状          | `pb/pb_data/data.db` 的 `_migrations` 已含 `1700000000_initial_schema.js` + **M1 的 `1700000001_node_extras.js`**（另 8 条是 PB 自带迁移）；`nodes` 字段 32 → 36（`annotations`/`timestampNotes`/`icon`/`cover`），`up`/`down` 双向实跑通过 |
| dev server        | 初采时 3000 / 3001 / 8090 均未监听；M0 重采时三者均在监听（`pnpm dev:full`）；M1-T6 跑迁移时已停，验完再起 |
