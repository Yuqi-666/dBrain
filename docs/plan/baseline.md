# 回归基线（M0 产出）

> 状态：**已采集**（2026-10-06，`develop` @ 907521f）
> 用途：每个闸门（[gates.md](./gates.md)）的判据是「**相对本基线无新增错误**」，不是「干净」
> 重跑：`bash docs/plan/baseline.sh`（`--accept` 可把当前结果晋升为新基线）
> 原始输出：`.baseline-raw/{typecheck,lint}.txt`（已 gitignore，脚本可重新生成）｜归一化快照：[baseline/typecheck-errors.txt](./baseline/typecheck-errors.txt)、[baseline/lint-errors.txt](./baseline/lint-errors.txt)

---

## 0. 为什么需要基线：三个既存缺陷

采集基线时实测出三个**本轮之前就存在**的问题。它们不属本轮范围，但直接决定了「验证怎么做」。

| # | 缺陷                                                                                         | 证据                                                                                                                                                            | 后果                                                                 |
| - | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1 | `turbo.json` 的 `lint` / `check-types` 声明了 `dependsOn: ["^lint"]` / `["^check-types"]`，而 workspace 存在**真实源码环** | `pnpm lint` 直接 `x Cyclic dependency detected` 退出 1；环是 `packages/interfaces/src/models/filter.ts:1` ← `@workspace/utils` 与 `packages/utils/src/filter.ts:7` ← `@workspace/interfaces` 互引（另有 `services ⇄ api-client`、`ui ⇄ editor ⇄ dataview`） | 全仓 lint / typecheck 一条命令都跑不了                                |
| 2 | 根 `check-types` 脚本是 `turbo run check-types`，但**没有一个包**定义 `check-types` 脚本（包里叫 `typecheck`） | 去掉 `dependsOn` 后 turbo 输出 `No tasks were executed as part of this run. Tasks: 0 successful, 0 total`                                                        | 即使修了环，`pnpm check-types` 仍是**空跑**，什么都不检查             |
| 3 | 大量既存类型/lint 错误（见 §2、§3）                                                          | 见下                                                                                                                                                            | 「typecheck 干净」这种验收标准在本仓**今天不可能成立**，判据必须改成 diff |

**M0 的最小修法**（[spine.md §M0](./spine.md#1-m0--基线与验证闭环)）：让 turbo 的任务名与包脚本名对齐、去掉 `^` 依赖边、给两个命令加 `--continue`（否则 turbo 遇第一个失败就中止，拿不到完整清单）。**不拆环**——那是独立重构（会在 §5 风险里留一条）。

修完实测：typecheck 跑 **19** 个任务、lint 跑 **20** 个任务，均能拿到完整失败清单（`Tasks: 14 successful, 19 total` / `11 successful, 20 total`）。

---

## 1. 怎么读这份基线

- `baseline/typecheck-errors.txt` / `baseline/lint-errors.txt` 是**归一化后的错误清单**（每行一条，已排序，去掉了时间/缓存命中等每次都会变的行）。
- 闸门判定 = 把当前输出跑同一套归一化，再 `diff`。**新增行 = 新增错误**；消失行 = 顺手修好了（是好事，但要 `--accept` 更新基线，免得下次看花眼）。
- `docs/plan/baseline.sh` 会打印 diff；`server:` 前缀的重复错误是 `apps/server` 跨包 typecheck 后端源码所致（`server` 把 `backend/**` 一起编），diff 时当噪声看即可——它同时也是后端改动的**第二道哨兵**。

---

## 2. typecheck 基线（19 任务：14 通过 / 5 失败）

| 包 / 应用                  | 结果 | 说明                                                                        | 本轮是否触碰 |
| -------------------------- | ---- | --------------------------------------------------------------------------- | ------------ |
| `@workspace/interfaces`    | ❌ 4 条 | 3 条是 `nodes/complex/index.ts:5-7` 的**死 re-export**（`RichTextBlock` / `BaseBlock` / `ReferenceBlock` 已从 `rich-text.ts` 删除）；1 条是环的产物 `../utils/src/filter.ts(7,8) TS2307` | **是**（M1；M0 修掉那 3 条） |
| `@workspace/editor`        | ❌ 多条 | `@workspace/adapter-front` / `@workspace/store` / `next/dynamic` 解析不到的 TS2307，以及 tRPC hooks 的 TS2339 | **是**（M3） |
| `@workspace/ui`            | ❌ 多条 | 与 `editor` 同源的跨包解析错误（`ui` 把 `../editor/**` 一起编）               | **是**（M2–M13） |
| `web`                      | ❌ 多条 | 同族 TS2307（`@workspace/hooks`、`@workspace/infrastructure`、`@workspace/domain/...`）+ 若干 TS18047/TS2322 | **是**（M4、M10 加路由） |
| `server`                   | ❌ 45 条 | 全部是 `backend/**` 源码经 `apps/server` 解析 `@workspace/interfaces/...` 的 TS2307 + 少量 TS7006 | **是**（M1、M11） |
| `@workspace/{dataview,store,services,graph,hooks,utils,api-client,dev}` | ✅ | —— | dataview / store / services 会被 M1、M4、M10 碰 |
| `@workspace/{domain,application,infrastructure,adapter-back,adapter-front,adapter-tauri}` | ✅ | **四个后端层都是干净的** —— 这是 M1 唯一的硬判据 | **是**（M1、M11） |

**对本批次最重要的一条**：`@workspace/interfaces` 的 4 条错误里，M0 修掉 3 条死 re-export 后，M1 之后这里**必须只剩环的那 1 条**。这是「无新增错误」判据在 M1 上的具体操作方式，写进了 G1 的判据里。

---

## 3. lint 基线（20 任务：11 通过 / 9 失败）

| 组                      | 包                                                                                            | 结果                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **缺 flat config**（exit 2） | `@workspace/{adapter-back,adapter-front,adapter-tauri,application,domain,infrastructure}`、`server` | `ESLint couldn't find an eslint.config.(js\|mjs\|cjs) file.`（ESLint 9 起默认只认 flat config；这些包 `scripts.lint = "eslint"` 但没有配置文件） |
| **脚本本身坏了**（exit 1）  | `desktop`                                                                                     | `Invalid project directory provided, no such directory: apps/desktop/lint` —— `next lint` 在 Next 16 已移除，被当成目录参数 |
| **真错误**（exit 1）       | `@workspace/editor`                                                                           | **106 problems (67 errors, 39 warnings)** —— 该包未走 `eslint-plugin-only-warn`，`no-explicit-any` 等是真 error |
| **仅警告**（exit 0）       | `@workspace/{api-client,dataview,graph,hooks,interfaces,store,ui,utils}`、`web`、`@workspace/dev` | 计数：`api-client` 1、`dataview` 0、`graph` 3、`hooks` 2、`interfaces` 3、`store` 5、`ui` 31、`web` 4 |

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
| 采集时间          | 2026-10-06                                                      |
| 分支 / HEAD       | `develop` @ `907521f`                                           |
| node / pnpm / turbo | v24.21.0 / 9.0.0 / 2.9.6                                      |
| PocketBase        | `pb/pocketbase`（31 MB 二进制）；`pb/pb_data/` 已存在（`data.db` 372 KB，**有真实数据，不得删**） |
| 迁移现状          | `pb/pb_migrations/` 只有 `1700000000_initial_schema.js`          |
| dev server        | 采集时 3000 / 3001 / 8090 均未监听                              |
