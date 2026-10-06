# 数据脊柱：M0（基线与验证闭环）、M1（四列 + 全链路 + 前端写者）

> 状态：**待开工**
> 覆盖里程碑：M0、M1 ｜ 闸门：G0、G1
> 设计契约：[node-content/README.md](../node-content/README.md) §4（全链路矩阵）、[selectors.md](../node-content/selectors.md) §0.2-①/§7/§8、[annotation.md](../node-content/annotation.md) §0.2-①
> 相关：[README.md](./README.md) §1/§3/§4/§5/§6/§8/§9 ｜ [baseline.md](./baseline.md) ｜ [gates.md](./gates.md)

---

## 0. 这一章要解决什么

三份设计文档（node-content / selectors / annotation）都把「字段全链路」放在各自的 P0，而它们改的是**同一批 5 个后端文件**。按总纲的偏差 **R3**，这里一次性做完：

> `nodes` 表加 4 个 json 列 → `packages/interfaces` 的类型形状 → domain 值对象/实体 → application 命令与半边更新 → DTO → infra mapper → tRPC schema。

做完之后，**后端在本批次内冻结**：M2–M13 不再有 `backend/**` 与 `packages/interfaces` 形状的改动（M11 的 `dashboard_pages` 新集合除外）。这是让后面 11 章能并行、能各自过闸的前提。

M0 是它的前置：**修好验证闭环本身**。设计文档里写的 `pnpm check-types` / `pnpm lint` 今天一条都跑不了（[baseline.md §0](./baseline.md#0-为什么需要基线三个既存缺陷)），不修则后面每个闸门的判据都是空话。

---

## 1. M0 — 基线与验证闭环

> 无用户可见功能。G0 是一次**环境可用性**确认，不测手感。

### M0.1 工作分解

| #  | 任务                                                                                                  | 文件白名单（新增/修改）                                                        | 执行主体 | 验收                                    |
| -- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------- | --------------------------------------- |
| 1  | 修 turbo 任务图与根脚本（**R7**）                                                                      | `turbo.json`、`package.json`                                                   | **主 agent** | `pnpm check-types` 跑 19 个任务、`pnpm lint` 跑 20 个任务（不再是 0） |
| 2  | 删 `nodes/complex/index.ts:5-7` 的三条死 re-export（`RichTextBlock` / `BaseBlock` / `ReferenceBlock`） | `packages/interfaces/src/models/node/nodes/complex/index.ts`                    | **主 agent** | `@workspace/interfaces` 的类型错误从 4 条降到 1 条（只剩环的那条） |
| 3  | 写 `baseline.sh` 与归一化快照                                                                          | `docs/plan/baseline.sh`、`docs/plan/baseline/{typecheck,lint}-errors.txt`       | **主 agent** | `bash docs/plan/baseline.sh` 输出「与基线一致」 |
| 4  | 写 `gates.md` 台账骨架 + 本目录 6 个章节文件                                                            | `docs/plan/**`                                                                  | **主 agent** | 内部链接全通 |
| 5  | 落实迁移账本与依赖版本（§4、§5）                                                                        | ——                                                                             | **主 agent** | 见下 |

**任务 1 的确切改法**（已实测通过，见 [baseline.md §0](./baseline.md#0-为什么需要基线三个既存缺陷)）：

```jsonc
// turbo.json —— 任务名与包脚本名对齐（包里叫 typecheck，不叫 check-types），并去掉 ^ 依赖边
"tasks": {
  "build": { /* 原样不动 */ },
  "lint": {},
  "typecheck": {},
  "dev": { "cache": false, "persistent": true }
}
```

```jsonc
// package.json —— 对外仍叫 check-types（AGENTS.md 与五份设计文档都这么写），
// 但指向真实存在的任务名；--continue 让 turbo 不再遇第一个失败就中止
"lint": "turbo run lint --continue",
"check-types": "turbo run typecheck --continue"
```

> 注意 `turbo.json` 是 **JSONC**（末尾有合法尾逗号），任何脚本化改它都要按文本处理，别用 `json.load`（实测会 `JSONDecodeError: Illegal trailing comma`）。

**任务 5 的两个子项**：

1. `bash docs/plan/baseline.sh --accept` 归位基线。
2. 依赖版本核实：本机 `npm view` 当前报 `EROFS: read-only file system, open '/home/lyq/.npm/_cacache/tmp/***'`（缓存目录不可写，不是纯网络问题）。先 `npm config set cache <工作区可写路径>` 或 `pnpm config set store-dir`，再核实 `motion@^12`、`perfect-freehand@^1.2`、`pdfjs-dist@^4.10`（**必须与 `backend/infrastructure/package.json:13` 的 `^4.10.38` 同 major**）、`react-grid-layout@^2.3.0` 五个版本范围是否存在。**这是 M0 的阻塞项**：核实不了就不要在 M4/M5/M7/M10 开工。

### M0.2 关键决策与挡路的坑

| 坑                                                       | 处置                                                                                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `turbo.json` 是 JSONC，且有尾逗号                         | 按文本替换（见上）                                                                                                       |
| 环是**真实源码环**，不是声明噪声                          | **不拆**（[baseline.md §4](./baseline.md#4-m0-可选修复默认不做需要时单独开章)）。去掉 `^` 边足以让命令可用                  |
| 去掉 `^dependsOn` 后 turbo 不再做拓扑排序                  | 无害：包以 `.ts` 源码经 `exports`/tsconfig `paths` 解析，typecheck 不需要上游先跑                                        |
| `--continue` 让 exit code 仍非 0                          | 这正是我们要的：**判据是 diff，不是 exit code**（[baseline.md §1](./baseline.md#1-怎么读这份基线)）                       |
| 删死 re-export 会不会破坏别的引用                          | 已全仓 grep：`RichTextBlock` / `BaseBlock` / `ReferenceBlock` **只出现在** `complex/index.ts:5-7`，无其他引用              |

### M0.3 提交切分

| # | 提交信息                                                                 |
| - | ------------------------------------------------------------------------ |
| 1 | `构建 修：turbo 任务图与包脚本对齐，check-types 不再空跑，lint 可跑全仓`  |
| 2 | `interfaces 清理：删 rich-text 三条失效 re-export，typecheck 错误降到 1 条` |
| 3 | `docs/plan：执行总纲、六章计划、闸门台账与回归基线`                       |

### M0.4 闸门 G0 — 用户操作清单

| # | 用户做什么                                                                                                     | 期望                                                                                     | 判据/证据                                                    | 失败先看哪                                    |
| - | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| 1 | 在仓库根跑 `pnpm check-types`                                                                                  | 输出 `Tasks: 14 successful, 19 total`（数字可因本次改动而变），**不再** `Cyclic dependency detected`，**不再** `0 total` | 终端输出                                                     | `turbo.json` 的 `tasks` 键名是否等于包脚本名  |
| 2 | 跑 `pnpm lint`                                                                                                 | 输出 `20 total`，且打印出 `Failed:` 包清单（与 [baseline.md §3](./baseline.md#3-lint-基线20-任务11-通过--9-失败) 一致） | 终端输出                                                     | 同上                                          |
| 3 | 跑 `bash docs/plan/baseline.sh`                                                                                | 两段都打印「✓ 与基线一致（0 新增，0 消失）」                                              | 终端输出                                                     | 若报「turbo 仍在报循环依赖」→ 任务 1 没生效   |
| 4 | 跑 `pnpm dev:full`，开 `http://localhost:3000/graph`                                                           | 应用能起、图能画、PB 在 8090 起来                                                         | 浏览器截图 + 终端                                            | 端口占用 / PB 二进制权限                      |
| 5 | 到 `http://127.0.0.1:8090/_/` 的 `_migrations` 表                                                              | 目前**只有** `1700000000_initial_schema.js`（M1 之后会多一条）                            | PB 后台截图                                                  | ——                                            |

> G0 不测任何功能手感。若用户此刻不想起服务，第 4 条可以推到 G1 一起做——但**前 3 条必须过**。

### M0.5 回归面

M0 只改构建配置与一条死导出，回归面 = 第 4 条的 `/graph` 可用性。

---

## 2. M1 — 数据脊柱

> 交付：`nodes` 四列贯通 + 前端共享写者。
> 这是全批次**改动面最大**的一章（10 个 entity 子类 × 4 处、10 份 `baseProps`、3 处 tRPC 白名单），也是唯一「一个错误会让后面 5 章返工」的一章。

### M1.1 工作分解（任务包）

依赖链：**T1（主，冻结形状）→ T2（子 A，domain）→ { T3（子 B，application/DTO/tRPC）∥ T4（子 C，infra mapper）+ T6（主，迁移）}**；**T5（子 D，前端写者）与 T2 并行**（只依赖 T1 的接口）。

| #  | 任务                                                                                       | 文件白名单                                                                                                                                                                                              | 执行主体        | 验收（编译器可判定）                                                     |
| -- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------ |
| T1 | **冻结类型形状**：新增 `AnnotationLayerData` 图元联合、`TimestampNote`、`NodeIcon`/`NodeCover`；写进 `NodeBase`/`ImageContent`/`PdfContent`/`AudioContent`/`VideoContent`；**并定死「清空顶层字段」的哨兵**（坑 8） | `packages/interfaces/src/models/node/nodes/annotation.ts`（新）、`.../single/timestamp-note.ts`（新）、`.../base.ts`、`.../single/{image,pdf,audio,video}.ts`、相应 `index.ts` | **主 agent**（独占：形状是全体编译基准） | `pnpm --filter=@workspace/interfaces typecheck` 仍只有 1 条既存错误；`@workspace/{domain,application,infrastructure,adapter-front}` 全部 typecheck 通过 |
| T2 | **domain**：值对象 + 实体                                                                   | `backend/domain/src/models/node/value-objects.ts`、`.../entities.ts`                                                                                                                                     | 子 agent A      | `cd backend/domain && pnpm typecheck` 通过                                |
| T3 | **application + DTO + tRPC**                                                                | `backend/application/src/commands/node/{command.ts,node-command.service.ts}`、`backend/application/src/dto/node-dto.mapper.ts`、`backend/adapter-front/src/trpc/router/node.ts`                            | 子 agent B      | `cd backend/application && pnpm typecheck`、`cd backend/adapter-front && pnpm typecheck` 通过 |
| T4 | **infra mapper**                                                                            | `backend/infrastructure/src/database/mappers/node.mapper.ts`                                                                                                                                              | 子 agent C      | `cd backend/infrastructure && pnpm typecheck` 通过                        |
| T5 | **前端共享写者**（node-content P0 的前端半）+ **修 `attributes-sidebar` 的整包 content 抹除** | `packages/ui/src/components/dialog/editor/content/use-node-content-writer.ts`（新）、`.../doc-normalize.ts`（新）、`.../database-node-content.tsx`、`.../collection-node-content.tsx`、`packages/ui/src/components/header/editor-header/attributes-sidebar.tsx` | 子 agent D      | `pnpm --filter=@workspace/ui typecheck` / `lint` 的**错误清单不增长**（ui 基线本就失败，见 [baseline.md §2](./baseline.md#2-typecheck-基线19-任务14-通过--5-失败)） |
| T6 | **迁移 + 收口**                                                                             | `pb/pb_migrations/1700000001_node_extras.js`（新）                                                                                                                                                       | **主 agent**（独占：不可逆） | 迁移在既有 `pb/pb_data` 上跑通，`_migrations` 多一条，`nodes` 多 4 列     |

**并行窗口**（总纲 §3.2 未单列本章，因为顺序本身已是最优）：T2 ∥ T5 → 之后 T3 ∥ T4 → T6。

**T1 的形状从哪里来**：`TypeScript` 草案照抄设计文档，不要临场发明——
`AnnotationLayerData` 与图元判别联合 = [annotation.md §3.1](../node-content/annotation.md)；`TimestampNote { id; timeMs; text; createdAt; updatedAt }` = [node-content/README.md §4.1](../node-content/README.md)；`NodeIcon { kind: "emoji" | "icon" | "image"; value; color? }`、`NodeCover { kind:"image"; url } | { kind:"node"; nodeId }` = [selectors.md §0.2-①](../node-content/selectors.md)。

**T2 的机械面**（子 agent A 的任务包要把这段原文给它）：

- `value-objects.ts`：`ImageContent`(:167) / `PdfContent`(:186) 收 `annotations` + getter + `withAnnotations()`；`VideoContent`(:216) / `AudioContent`(:251) 收 `timestampNotes` + getter + `withTimestampNotes()`；各自 `equals` 纳入新字段。**体例照 `CollectionContent.withViews`(:436)**。
- `entities.ts`：`NodeBaseProps`(:33-45) 与 `Node` 的 protected 字段加 `icon`/`cover` + getter + `updateIcon`/`updateCover`；**先抽一个 `baseProps` getter**（[selectors.md §8](../node-content/selectors.md) 的要求），再让 10 个子类的构造 / `create` / `updateContent` / `cloneWith` 铺开；`ImageNode`/`PdfNode` 加 `applyAnnotations`、`AudioNode`/`VideoNode` 加 `applyTimestampNotes`（照 `CollectionNode.applyViews`:1137）。
- ⚠️ 10 个子类 × 4 处 = 40 个改动点，是本轮最容易漏一处的地方。**建议：先抽 getter 再逐个改，每改完一个子类跑一次 typecheck**，否则一次性改完再编译会一次性面对几十条错误。

**T6 的迁移文件**（直接照抄，已核实 API）：

```js
/// <reference path="../pb_data/types.d.ts" />
// 文件名必须是新的：PocketBase 只按文件名去重（1700000000_initial_schema.js:170-176）。
// 四列一次加：annotations(image+pdf) / timestampNotes(audio+video) / icon+cover(全部类型)。
migrate((app) => {
  const nodes = app.findCollectionByNameOrId("nodes");
  for (const name of ["annotations", "timestampNotes", "icon", "cover"]) {
    nodes.fields.add(new Field({ name, type: "json" }));
  }
  app.save(nodes);
}, (app) => {
  const nodes = app.findCollectionByNameOrId("nodes");
  for (const name of ["annotations", "timestampNotes", "icon", "cover"]) {
    nodes.fields.removeByName(name);
  }
  app.save(nodes);
});
```

### M1.2 关键决策与挡路的坑

#### 坑 1（**本轮最危险的一条**）：`updateNodeContent` 的 guard 会**静默吞掉**「只写新字段」的 patch

实测（[node-command.service.ts:343-431](../../backend/application/src/commands/node/node-command.service.ts)）：每个分支都以「旧字段存在」为进入条件，不满足就 `return node`——**什么都不做、不报错**。

| 分支        | 今天的 guard                              | 表现（若只改新字段）                                  | 必须改成                                                                 |
| ----------- | ----------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| image (:348) | `content.url !== undefined`              | 只改批注 → 后端 `return node`，**保存了但刷新就没了**  | guard 加 `\|\| content.annotations !== undefined`，构造按 `content.url ?? node.content.url` + `content.annotations ?? node.content.annotations` |
| pdf (:352)   | `content.url !== undefined && content.coverUrl !== undefined` | 只改批注 → 同上                                  | 同上（并保留 coverUrl 的 `??` 合并）                                        |
| audio (:371) | `content.url !== undefined`              | 只加笔记 → 同上                                        | guard 加 `\|\| content.timestampNotes !== undefined` + `??` 合并            |
| video (:358) | `content.url !== undefined \|\| content.hlsUrl !== undefined` | 只加笔记 → 同上             | guard 加 `\|\| content.timestampNotes !== undefined` + `??` 合并            |
| rich-text (:403) | `referencedNodes !== undefined **且** docs !== undefined` | 只改正文 → 半边被吞                        | **拆成两个独立半边**（设计文档 §4.2 第 7 行明确要求修掉这个「两键同时给」）    |

`VideoContent` 的现有写法（`content.url ?? node.content.url`，:358-370）就是本仓既有的**半边合并范式**，照它抄。这一条同时是 G1 第 4 条的验收对象。

#### 坑 2：`z.object` 会**剥键**，判别联合必须走 `z.custom`

`baseNodeFields`（[router/node.ts:7-17](../../backend/adapter-front/src/trpc/router/node.ts)）是个 `z.object` 白名单；`imageContentSchema`(:23-25) / `pdfContentSchema`(:27-30) 同样是。判别联合（`NodeIcon` / `NodeCover` / `AnnotationLayerData` 的图元）用 `z.object` 会把 `color`、`nodeId`、图元的多余键**静默删掉**。`views` 的既有教训是走 `z.custom`（dataview README §5.2「两条陷阱」）。

> **两条路径行为不同**（[annotation.md §9](../node-content/annotation.md) 已警告）：`add` 路径用严格 schema（会 strip），`update` 路径的 `content` 是 `z.any()`（:268，不 strip）。**只改一处 → 「能保存但读不出来」**。

#### 坑 3：DTO 不点名 = 字段永远到不了客户端

`node-dto.mapper.ts` 的 `base`(:27-39) 与各 content 字面量是**穷举**写法，同名文件 `:15-24` 的注释记录了 `hlsUrl` 的翻版事故（写路径映射了、读路径漏了 → 存了但客户端永远看不到）。**每个新字段都必须在 base 或对应 content 字面量里点名。**

#### 坑 4：迁移与读兼容

- 新列**不设 required**；mapper 缺列一律 `undefined`（照 `record.views` 的写法），前端把 `undefined` 当空数组。
- **不得改 0 号脚本、不得删 `pb/pb_data`**（[README.md §4](./README.md#4-迁移编号账本)）；`pb_data` 有真实数据。
- 若没有执行迁移就写新字段，PocketBase 直接报 `unknown field`——所以 **T6 要在 T3/T4 之前或同时落地**，G1 第一条就是验迁移。

#### 坑 5：`packages/utils/src/filter.ts:7` 的 TS2307 别去修

它是包环的产物，不是本次改动引入的。修它会牵出拆环（[baseline.md §4](./baseline.md#4-m0-可选修复默认不做需要时单独开章)）。

#### 坑 6：`useNodeContentWriter` 抽取要「行为不变」

它要抽的是 `database-node-content.tsx` 与 `collection-node-content.tsx` 里重复的 **`liveContent` + 微任务 drain** 逻辑（设计文档 §4.2 第 12 行）。这不是重构机会，是**去重**：两个宿主的并发写语义（一次手势一笔写、串行化）必须逐字保持，否则 dataview 的回归面在 G1 就会红。

#### 坑 7（**跨章**）：`attributes-sidebar.tsx` 会用「整包 content」抹掉新字段

实测（`packages/ui/src/components/header/editor-header/attributes-sidebar.tsx:216-223`）：

```ts
const handleContentUrlChange = (field: string, value: string) => {
  if (!node.content) return;
  const content = { ...node.content, [field]: value } as any; // ← 本次 render 的快照
  void NodeService.upsert(nodeId, { content }, { debounce: true });
};
```

两件事叠加成事故：

1. 它拼的是**本次 render 的 `node.content` 快照**，不是活值；而 `debounce: true` 让 payload 在 **schedule 时**就固定下来（`packages/services/src/graph/node.service.ts:66-88` 的 `nodeUpdateScheduler.schedule(id, merged, …)`）。
2. 它的入口 `showContentUrl` 覆盖 **video / audio / image / pdf / website 五种类型**（`:274-279`，“内容链接”输入框 `:390`）。

于是 M1 加上 `annotations` / `timestampNotes` 之后，在属性侧栏改一次「内容链接」就会**整包覆盖 content、连同批注与笔记一起抹掉**。它同时威胁 **M5（image 批注）、M6（媒体笔记）、M7（pdf 批注）** 三章。

**处置（本批次的关键收口决策）**：把它并入 M1 的 T5 一次修好——改用同一个共享写者读**活值**再合并半边，并去掉那个 `debounce`（写者自己有微任务合流）。这样 M5/M6/M7 拿到的就是一个不会互相抹除的写路径，而不是各自打补丁。这也是 [README.md §9](./README.md) 的 R13。

#### 坑 8（**必须在 M1 定死**）：`{ icon: undefined }` 表达不了「清空」

selectors.md §7 的写回表写的是「移除 → `upsert(id, { icon: undefined })`」。实测走不通，链路每一环都有据：

| 环 | 事实 | 出处 |
| -- | ---- | ---- |
| 客户端 | `upsert(id, updates)` 先 `const merged = { ...oldNode, ...updates }`，然后把**整份合并后的节点**发给服务端 | `packages/services/src/graph/node.service.ts:50`、`:58`（同步）/ `:76`（防抖） |
| 传输 | 客户端用 superjson，`undefined` 会被**原样保留**送达，而不是当缺键丢掉 | `packages/api-client/src/trpc/client.ts:41`、`backend/adapter-front/src/trpc/server.ts:69` |
| 服务端 | `updateNode` 是**值判定**：`if (cmd.isPinned !== undefined)` —— `undefined` 一律表示「本次不动」 | `backend/application/src/commands/node/node-command.service.ts:290-292` |

⇒ `upsert(id, { icon: undefined })` 的结果是**什么都不发生**，「移除图标 / 移除封面」永远做不成。**M1 必须在 command 层定一个哨兵**，二选一：

- **`null` 哨兵（推荐）**：`{ icon: null }` + zod 放行 `z.union([..., z.null()])` + `updateNode` 里 `if (cmd.icon === null) → clearIcon()`。一个字段说清一件事，与「一次写一个键」的模型一致。
- **显式 flag**：`{ removeIcon: true }` / `{ removeCover: true }`。多一个字段，但语义更直白。

无论选哪个，M2 的 `onRemove`、G2 第 7 条与 G1 的验收都按它写。**这条不定死，M2 就没法开工**（selectors §7 与 §11-2 两处随此失效 → [README.md §9](./README.md) R29/R30）。

### M1.3 提交切分

一章内部允许分段提交（每段 typecheck 过再进下一段）：

| # | 提交信息                                                                                       |
| - | ---------------------------------------------------------------------------------------------- |
| 1 | `interfaces 节点字段：icon/cover 上 NodeBase，annotations/timestampNotes 上各 content`          |
| 2 | `domain 节点字段：四个 content 值对象加半边入口，10 个子类铺开 base 字段`                        |
| 3 | `node-extras 落库：nodes 增四列，application/DTO/tRPC 与 infra mapper 贯通，顶层字段清空哨兵落地` |
| 4 | `node-content 写者：抽共享 use-node-content-writer 与 doc-normalize，两个宿主去重`              |
| 5 | `attributes-sidebar 修：内容链接改写活 content 半边，不再整包覆盖新字段`                        |

### M1.4 闸门 G1 — 用户操作清单

| # | 用户做什么                                                                                                                                  | 期望                                                                                       | 判据/证据                                                                 | 失败先看哪                                                     |
| - | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 1 | 停掉 dev → `pnpm dev:full` → 看终端有没有迁移日志；再到 `http://127.0.0.1:8090/_/` 的 `_migrations` 表                                       | 多出 `1700000001_node_extras.js`                                                            | PB 后台截图                                                               | 文件名是否重复 / `pb_data` 权限                                |
| 2 | 在 PB 后台看 `nodes` 集合的字段列表                                                                                                          | 出现 `annotations` / `timestampNotes` / `icon` / `cover` 四个 **json** 字段                  | PB 后台截图                                                               | 迁移 `migrate` 里的 `fields.add` 是否真的 `app.save(nodes)`     |
| 3 | 打开一个**既有**的 text / image / audio 节点（旧数据，没有新字段）                                                                             | 正常打开、内容还在、控制台无 `unknown field`                                                 | 页面截图 + 控制台                                                         | mapper 对缺列是否给了 `undefined`（不是抛错、不是补空对象）      |
| 4 | **半边语义**：在 PB 后台给某个 image 记录手工写入 `annotations`（一小段 JSON），然后在 PB 后台读回该记录                                        | 值在；同时 `content`（url）**没被清空**                                                       | PB 后台前后截图                                                           | `updateNodeContent` 的 image 分支 guard（坑 1）                |
| 5 | **半边语义**：给某个 audio 记录手工写 `timestampNotes`，读回                                                                                  | 值在；`content` 不变                                                                          | PB 后台截图                                                               | audio 分支 guard（坑 1）                                       |
| 6 | 跑 `bash docs/plan/baseline.sh`                                                                                                              | typecheck / lint 的错误清单相对基线**无新增**；`@workspace/interfaces` 只剩 1 条（环的那条）  | 终端 diff 输出                                                            | 哪个包多出错误行，就回哪个包的提交                             |
| 7 | 回归面：`/graph` 打开节点编辑器 → 改标题/abstract/钉选；打开一个 database 节点 → 在表格里改一个单元格；打开一个 collection 节点 → 切两个视图      | 全部与改动前一致                                                                             | 页面操作                                                                  | `useNodeContentWriter` 抽取（坑 6）是否改了 drain 语义          |
| 8 | **抹除回归（坑 7）**：在 PB 后台给某个 image 记录写入 `annotations`，然后在 `/graph` 打开该节点 → 属性侧栏「内容链接」改一个字 → 再回 PB 后台看该记录 | `annotations` **仍在**；`content`（url）是新值                                                | PB 后台前后截图                                                           | `attributes-sidebar.tsx:216-223` 是否还在拼 render 快照          |
| 9 | 同上换成 audio/video 节点，看 `timestampNotes`                                                                                                | 笔记仍在                                                                                      | PB 后台截图                                                               | 同上                                                            |
| 10 | **清空哨兵（坑 8）·自检项**：主 agent 起 dev 后，在 `/graph` 页控制台直接发一次清空写（`window.__trpc?.node.update` 或等价片段，会随实现附上），你在 **PB 后台**核对结果 | 该节点的 `icon` 被清空（键消失或为 `null`，以 M1 定死的哨兵为准）——**不是**「发了请求但值没动」 | PB 后台前后截图 + 那次请求在 Network 面板里的 `updates.icon` | M1 的哨兵是否真贯通了 `interfaces` → command → DTO → zod → mapper；**UI 上的「移除」按钮属 M2，在 G2 第 7 条验** |

> G1 不验「批注长什么样」「图标显示成什么样」——那两件事 M5 / M2 才有 UI。第 4、5 条只用 PB 后台验**写路径确实落库**，可见性留到各自章节的闸门；第 10 条同理，只验哨兵在**服务端**真的生效，UI 上的「移除」按钮是 G2 第 7 条。

### M1.5 回归面

1. `database` / `collection` 两个宿主的**并发写语义**不变（同节点快速「上传 + 编辑」>5 次，控制台无 `The request was aborted (most likely autocancelled…)`、无回滚闪烁）。
2. `NodeEditor` 的 `AttributesSidebar`、`PinButton`、`OptionsMenu` 行为不变。
3. dataview 七个视图（table / kanban / calendar / gallery / gantt / chart / graph）全部可渲染。
4. 四个后端层 `typecheck` 保持通过（基线即通过，不许变红）。

---

## 附：本章「待验证」回填清单

| # | 待验证项                                                                    | 何时可判 | 判定方式                                                                 |
| - | --------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| 1 | `new Field({ name, type: "json" })` 是否被 PB 0.40 接受                      | **M0/M1 已可判** | 已核实 `Field` 签名为 `constructor(data?: Partial<core.Field>)`（[types.d.ts:441](../../pb/pb_data/types.d.ts)）；迁移实跑是最终确认 |
| 2 | `FieldsList.removeByName` 的 `down` 是否真能跑                               | M1       | 已核实存在（[types.d.ts:12473](../../pb/pb_data/types.d.ts)）；需要时手工 `migrate:revert` 一次 |
| 3 | 依赖版本范围（`motion@^12` 等五个）是否存在                                   | **M0**   | 先修 `npm`/`pnpm` 缓存目录可写，再 `npm view <pkg> version`               |
| 4 | `@workspace/editor` 的 67 个 lint error 是否会被 M3 的新文件推高             | M3       | `bash docs/plan/baseline.sh` 的 lint 段                                  |
| 5 | `pb_data/types.d.ts` 与 `pb/pocketbase` 的实际版本是否一致（文件头写 0.40）    | M1       | 迁移实跑通过即视为一致                                                    |
