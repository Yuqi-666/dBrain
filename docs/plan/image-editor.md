# 执行计划：照片编辑（M5.1 image 底图编辑）

> 状态：**待开工**（前置 M5 未完成：本章与 M5 改**同一个宿主文件** `image-node-content.tsx`，M5 是唯一 owner，必须先过 G5）
> 覆盖：**M5.1**（node-content `## image` 行的「照片编辑」）；闸门 **G5.1**
> 契约：[README.md](./README.md)（执行总纲；本文件写「总纲 §n」时指它）；[../node-content/image-editor.md](../node-content/image-editor.md)（设计契约——本文件里不带文件名的 `§n` 一律指它）；[../node-content/annotation.md](../node-content/annotation.md)（批注层）、[../node-content/selectors.md](../node-content/selectors.md) §6.5（图标/封面裁剪，与本章共用依赖）
> 相关：[gates.md](./gates.md)（进度真相源）、[baseline.md](./baseline.md)（判据 = 相对基线无新增失败）、[spine.md](./spine.md)（M1 的列/全链路范式，本章照抄）
> 一句话：把 `content.imageEdits`（原图 + 裁剪/旋转/翻转/导出配方）落成 `nodes` 的第五个 json 列，前端用 `react-easy-crop` + 一个纯函数烘焙器实现「编辑 → 保存 = 烘焙成新 blob → 一次 upsert 写回 url 与 width/height/fileSize」，**原图永不覆盖**；批注按 §6 的仿射公式随动。

---

## 0. 这一章要解决什么

[proposal/node-content-refine.md](../proposal/node-content-refine.md) 的 `## image` 行写的是两件事：**照片编辑** + 批注覆盖层。批注已成章（M5），照片编辑在 [node-content/README.md](../node-content/README.md) §1.2 被收窄成「只到盒子 / 显示模式这一层」——那是**文档缺口**，不是需求变更。本章把它补回来。

| | 底图 | 落库形态 | 本章新增什么 |
| --- | --- | --- | --- |
| 今天 | `content.url` 一个字符串 | `nodes.content`（裸字符串列）+ `annotations`（M1 加的 json 列） | —— |
| M5.1 后 | `content.url` = **可直接渲染的最终像素**（未编辑时就是原图） | 再加一列 `imageEdits`（json）：原图 url + 裁剪/旋转/翻转/导出配方 | 编辑态 UI + 纯函数烘焙器 + 恢复原图 + 批注随动 |

**四条章级契约**：

1. **`packages/interfaces` 的 `ImageContent` 在本章被显式解冻一次**（总纲 R3 写的是「M1 之后后端冻结」）。解冻面只有一项：`ImageContent.imageEdits?: ImageEditRecipe | null` 与新的 `image-edit.ts`。改完立刻回到冻结；**除主 agent 外任何人不得碰 `packages/interfaces/**`**。
2. **后端在本章会被碰（第三次）**，只加 `imageEdits` 一条链 + 一个迁移：`value-objects.ts` / `node-command.service.ts` / `node-dto.mapper.ts` / `node.mapper.ts` / `router/node.ts` + `pb/pb_migrations/1700000002_node_image_edits.js`。清单照 M1 的 T2/T3/T4 分包照抄（[spine.md §M1.1](./spine.md)）。
3. **写回只有一次 upsert。** `content`（url + imageEdits）与顶层 `width/height/fileSize` 必须同一个 `NodeService.upsert`（§0.3-2：分两次会出现「尺寸变了图还是旧的」）。**不要**用 `patchContent` 写元数据（它只写 content 半边）。`content` 必须用 `liveContent()` 拼，保住 `annotations`。
4. **依赖只有一个**：`react-easy-crop@^6.2.4`（M12 的 §6.5 裁剪是同一个包，**总依赖数不增加**）。`bake.ts` 与 `recipe.ts` 是包内相对 import（`exports["./components/*"]` 只认 `.tsx`，§0.3-7）。

**为什么排在 M5 之后、M6 之前**：

- **必须 M5 之后**：`image-node-content.tsx` 是 M5 的收口任务 7/8 的地盘（批注层 + `baseRect` + 共享写者接线）。同文件同 owner，M5 先过 G5。
- **不必等 M7**：本章只改 image 宿主与配方，不碰 `geometry.ts` / `annotation-canvas.tsx`；排 M6 之前是为了让 M7 的 image 回归面（改过 `geometry.ts` 之后要复测批注）跑在**已经包含编辑功能**的宿主上，少一轮返工。
- **不排在 M3/M4 之前**：那两章的闸门按序还挂着；插队会让已排好的 W0/W2 前提失真（总纲 §3.2）。

> 越界即停：白名单里没有 `packages/graph/**`、`packages/dataview/**`、`packages/editor/**`；`packages/interfaces/**` 与 `pb/pb_migrations/**` 只有主 agent 能动；`annotation/**`（M5 的产物）本章一律只读，批注变换写在**本章的** `image-editor/annotations.ts` 里。

---

## M5.1 工作分解（任务包）

### 5.1.1 开工即冻结（主 agent，串行，未完成不得开 W6）

| # | 任务 | 文件白名单（新增/修改） | 执行主体 | 验收（编译器可判定） |
| --- | --- | --- | --- | --- |
| 0 | 核实 M5 交付面：`image-node-content.tsx` 的盒与 `ResizeObserver` 出口、`AnnotationLayer` 的 props、`annotations` 的真实形状 | 只读，不改文件 | 主 agent | 若 M5 的盒/出口与设计 §5.1 不符 → 在 5.1.4 登记决策 |
| 1 | 装 `react-easy-crop@^6.2.4` 并立即提交 lockfile | `packages/ui/package.json` | 主 agent（独占） | `pnpm --filter=@workspace/ui typecheck`；`pnpm --filter=web build` 通过（总纲 §10 对每个新依赖都用这条压风险） |
| 2 | **冻结配方形状**：`ImageEditRecipe`（`version: 1`）+ `ImageContent.imageEdits?: ImageEditRecipe \| null` + barrel 导出 | `packages/interfaces/src/models/node/nodes/single/image-edit.ts`（新）、`.../single/image.ts`、相应 `index.ts` | **主 agent**（独占：形状是全体编译基准） | `pnpm --filter=@workspace/interfaces typecheck` 仍只有 1 条既存错误；`@workspace/{domain,application,infrastructure,adapter-front}` 全部 typecheck 通过 |
| 3 | **冻结 UI 侧契约**：`image-editor/types.ts`（`ImageEditorProps` / `EditorSession` / `CropPreset` / `EditorResult`）与 `recipe.ts` / `bake.ts` / `encode.ts` 的**全部导出签名**（可先落桩） | `packages/ui/src/components/image-editor/types.ts`、`.../recipe.ts`、`.../bake.ts`、`.../encode.ts` | 主 agent（独占） | `pnpm --filter=@workspace/ui typecheck`；此后签名变更必须过主 agent |
| 4 | **迁移**：`nodes` 加 `imageEdits` json 列（`up`/`down` 都真跑） | `pb/pb_migrations/1700000002_node_image_edits.js`（新） | 主 agent（独占：不可逆） | 在既有 `pb/pb_data` 上跑通，`_migrations` 多一条，`nodes` 字段 36 → 37 |

### 5.1.2 并行窗口 W6（文件集互不相交；后端两路与 UI 三路同时开）

前提：上一节的四步全部落地（形状、签名、依赖、迁移）。**边界 = 每个文件只有一个 owner**。

| 路 | 任务 | 文件白名单 | 交付判据 |
| --- | --- | --- | --- |
| W6-a | `recipe.ts` 函数体（默认值 / 校验归一化 / §6 的仿射变换数学）、`bake.ts` 函数体（`renderRecipe` / `bakeRecipe`：旋转→翻转→裁剪→长边缩放）与 `encode.ts`（`toBlob` + **白底 flatten** + **`blob.type` 断言与回落**） | `.../image-editor/recipe.ts`、`.../bake.ts`、`.../encode.ts` | `pnpm --filter=@workspace/ui typecheck` + `lint`；三个文件**不 import React** |
| W6-b | `crop-surface.tsx`：`react-easy-crop` 包装（比例预设 / 平移 / 缩放 / 90° 旋转 / 翻转 / `touch-action` / 键盘），按 `types.ts` 的冻结类型 | `.../image-editor/crop-surface.tsx` | 同上 |
| W6-c | `image-editor.tsx`（编辑态外壳 + 工具条 + 保存/取消/恢复原图）与 `use-image-editor.ts`（会话状态 + 撤销/重做栈 + 保存流水线：`bakeRecipe` → `uploadAttachment` → 回调宿主）与 `annotations.ts`（§6 变换） | `.../image-editor/{image-editor,use-image-editor,annotations}.tsx\|ts` | 同上 |
| W6-d | **后端 A**：domain 值对象（`imageEdits` + getter + `withImageEdits()` + `equals`） | `backend/domain/src/models/node/value-objects.ts` | `cd backend/domain && pnpm typecheck` 通过 |
| W6-e | **后端 B**：application / DTO / tRPC（`node-command.service.ts` 的 image 分支、`node-dto.mapper.ts` 的 image content 字面量、`router/node.ts` 的 `imageContentSchema`） | `backend/application/src/commands/node/node-command.service.ts`、`backend/application/src/dto/node-dto.mapper.ts`、`backend/adapter-front/src/trpc/router/node.ts` | 两个包 `pnpm typecheck` 通过 |

> W6-e 之外还剩一个后端文件（`backend/infrastructure/.../node.mapper.ts`）——它与 W6-e 不同文件，可同时派；若要控制并发，就并入 W6-e 的下一轮。

### 5.1.3 收口（主 agent，串行）

| # | 任务 | 文件白名单 | 验收 |
| --- | --- | --- | --- |
| 5 | 宿主接入：浮层操作组（`替换` / `编辑`）、编辑态挂载、只读态逐字不变 | `packages/ui/src/components/dialog/editor/content/image-node-content.tsx` | `pnpm --filter=@workspace/ui typecheck` + `pnpm --filter=web typecheck` |
| 6 | 写回接线：**一次** upsert（`content` 用 `liveContent()` 拼 + `width/height/fileSize`）；清空走 `imageEdits: null` 哨兵 | 同上 | 同上 |
| 7 | 属性侧栏换底图 → `patchContent({ url, imageEdits: null })` | `packages/ui/src/components/header/editor-header/attributes-sidebar.tsx`（image 分支） | 同上 |
| 8 | `bake.ts` 的跨源告警路径：`SecurityError` / `toBlob` 返回 `null` / 解码失败三种可见错误条 | `.../image-editor/*` | 同上 |
| 9 | 桌面预跑（`chrome-headless-shell` + CDP，配方照 [gates.md §6](./gates.md)）：真组件 + 真模态 Dialog，用**一张带四角标记的测试图**跑裁剪/旋转/保存/刷新 | 不新增文件 | 结论与截图贴进 `gates.md` |

---

### 5.1.4 关键决策与挡路的坑

1. **`null` 是唯一的「清空」哨兵，`undefined` 是「保留」。** `imageEdits` 与 `icon`/`cover` 同类（可清空），「恢复原图」必须发 `{ url: originalUrl, imageEdits: null }`；而 `annotations` 的 `undefined` 是半边合并的期望语义（总纲 §10 风险表最后一条 / R29-定）。**两个字段的处理方式故意不同，不许统一。**
2. **一次 upsert 的分片风险。** `useNodeContentWriter.patchContent` 只写 `content` 半边，写不了 `width/height/fileSize`。本章的保存路径直接调 `NodeService.upsert(nodeId, { content: {...liveContent(), url, imageEdits}, width, height, fileSize })`。**必须单独定义这条路径**，不要顺手扩 `patchContent` 的签名（它是 M1 的公共面，M5/M6 都在用）。
3. **服务端 image 分支的 guard（M1 坑 1 的同款）。** `node-command.service.ts` 的 `updateNodeContent` 在 image 上用「`content.url !== undefined`」决定要不要重建 VO；只写 `imageEdits`（不带 url）会被**静默吞掉**。本章的 UI 写路径永远同时带 url（烘焙后 url 必变），所以闸门不会撞上它；但**开工第一步要读一遍 M1 坑 1 的正文，并在 G5.1 的预跑里用一次「只带 `imageEdits` 的 tRPC `update`」探针确认行为**（要么按同款改 guard、要么在文档里写死「`imageEdits` 不允许单独写」，二选一都要登记）。
4. **`croppedAreaPixels` 原样存、原样烘。** 预览（`react-easy-crop` 自己画）与保存（canvas 烘焙）是**两次渲染**；唯一可控的做法是让烘焙直接吃 `croppedAreaPixels`（源像素空间整数矩形），顺序按 §0.2-② 固定为 旋转→翻转→裁剪。**不要**在中间再做一次归一化重算。
5. **平板上的 `touch-action`。** 裁剪面必须自己压住宿主 Dialog 内容区（`overflow-y-auto`）的滚动，先例是 `packages/graph/src/force/ForceGraph.tsx:849` 的 `touch-action: none`；退出编辑态必须复原，否则整页不能滚。G5.1 有专门一条判据。
6. **外链图的 CORS 面。** PB `files` 的响应头已实测带 `Access-Control-Allow-Origin: *`（设计 §0.1），所以「工作区内的图」必定可烘焙；**外链图**（picsum / arxiv / 用户粘贴的地址）不一定带 CORS 头 ⇒ 必须走 §5.1.3-8 的显式错误条，不许静默失败、不许写库。
7. **`files` 的 30 天缓存。** 响应头 `Cache-Control: max-age=2592000` ⇒ 新像素必须用**新 URL**（新 `files` 记录）。PB 覆盖同名文件虽然会改文件名（随机后缀），但语义上会毁掉原图，**禁止**。
8. **孤儿 blob 不回收（P0 决策）。** 每次保存新增一个 `files` 记录；老的原图与上一次的烘焙结果都留下。删了就无法「恢复原图」，也无法确认没有别的节点 / 封面在引用同一个 URL。作为遗留登记（G5.1 的遗留列），P2 再评 GC 与 PB `?thumb=` 缩略图。
9. **`width/height/fileSize` 的口径**：始终是**当前 url 那张图**的尺寸（不是原图）。`image-preview.tsx:30-34` 正在显示它们，所以保存后必须同步，闸门有一条判据（PB 后台 + preview 块两处看）。
10. **包出口只认 `.tsx`**（§0.3-7）：`recipe.ts` / `bake.ts` / `encode.ts` 走包内相对 import。M12 若要复用，先在 `packages/ui/package.json` 的 `exports` 补具体子路径（主 agent 独占）。**顺便**：两级通配跨目录**已有可用先例**（`packages/dataview/src/shared/card-cover.tsx:26` import `@workspace/ui/components/preview-block/node-preview-cover`，M2 时随 dataview typecheck 通过）——总纲 §10 那条「无先例」的风险已由 M2 证伪，本章按先例照做即可。
11. **编码两道硬坎（调研实测，§0.3-10/11）**：① `toBlob("image/webp")` 在 WebKit（**Linux 桌面的 Tauri 就是 WebKitGTK**）**静默回落 PNG**、不抛错 ⇒ 本章**不提供 WebP 导出**，且 `encode.ts` 仍要断言 `blob.type`；② JPEG 无 alpha、规范合成到**黑底** ⇒ 透明 PNG 存 JPEG 前必须先白底 flatten，否则出黑斑。两条都有闸门判据（#14）。
12. **编辑器必须懒加载**（§0.3-13）：`React.lazy(() => import(...).then((m) => ({ default: m.ImageEditor })))` + `Suspense`，范式照 `packages/dataview/src/registry.ts:80-91`（`packages/ui` 不能 import `next/*`）。判据 = 打开 image 节点首屏 Network 里**没有** `image-editor` chunk（#13）。
13. **批注随动的回退口径**。§6 的仿射变换是「保留批注」的方案；若 #9 实测证明「界外点丢弃」不可接受，就降到**方案 (a)：`annotations` 非空时禁用裁剪/旋转并提示**（一行判断 + 一句文案），把变换整体挪到 P1。**这条降级不需要动数据模型**，因此闸门不会卡住；但**不许**默默改成「裁剪时把批注一起烘焙进图」（那会毁掉 sidecar 语义，annotation.md §3-③）。

---

### 5.1.5 提交切分

1. `image-edit 配方落库：nodes 加 imageEdits 列，interfaces/domain/DTO/infra/zod 全链路打通`
2. `image 照片编辑：react-easy-crop 裁剪面 + 纯函数烘焙器（旋转/翻转/裁剪/长边）+ 会话撤销重做`
3. `image 编辑接入：宿主浮层入口 + 一次 upsert 回写（url/imageEdits/元数据）+ 批注随动 + 换底图清配方`

---

### 5.1.6 闸门 G5.1 — 用户操作清单

前置：主 agent 起 `pnpm dev:full`（PB 8090 + web 3000 + server 3001），确认迁移已跑（PB 后台 `nodes` 字段列表出现 `imageEdits`），并把 1–14 的可自动化部分用桌面预跑跑过一遍。**真机（平板）与桌面要分别标注。**

| # | 用户做什么（必须含具体入口） | 期望 | 判据或证据 | 失败先看哪 |
| --- | --- | --- | --- | --- |
| 1 | 打开一个已有 image 节点 → 看图片盒**右上角** | 出现 `替换` / `编辑` 两个入口；点 `编辑` 进入编辑态（底图换成裁剪面）；点 `取消` / 按 `Esc` 退出 | 前后截图；PB 后台 `nodes` 该记录 `content` / `imageEdits` **一行未动** | 入口是否被 M5 的批注工具条压住（§5.3 的模式互斥）；退出是否漏了复原 `touch-action` |
| 2 | **真机**：在裁剪面上**用一根手指**拖动图片、再双指缩放；用笔再拖一次 | 拖动的是**裁剪框内的图**，页面**不跟着滚**；笔与手指都能操作 | 真机录屏/截图 + 页面滚动位置不变 | 裁剪面是否 `touch-action: none`（坑 5）；宿主 Dialog 的 `overflow-y-auto` 抢指针 |
| 3 | 把裁剪框拖到贴住图中某个可辨认物体（如一角图标）的右下角，比例选 `1:1` → 保存 | 保存后该物体**正好**在图片右下角，形状比例正确 | 保存前后截图对比（这是「预览与烘焙一致」的核心判据） | §0.2-② 的顺序定义；烘焙是否原样吃了 `croppedAreaPixels`（坑 4） |
| 4 | 依次做 `旋转 90°` ×1、`水平翻转` ×1 → 保存 | 像素方向与预览一致（左右/上下可辨认） | 保存前后截图 | `bake.ts` 的 `setTransform` 顺序；`naturalWidth/Height` 是否用了原值 |
| 5 | 保存后**立刻刷新**页面，再打开 preview 块 / 图库（dataview collection）卡片 | 三处都是新图；preview 块的 `W × H` 与文件大小是**新值**（不是旧值） | 三处截图 + PB 后台 `width/height/fileSize` | 保存是否只写了 content 没写顶层元数据（契约 3 / 坑 9） |
| 6 | PB 后台看 `nodes` 该记录 + `files` 集合 | `content` 是新 `/api/files/...`（能直接打开）、`imageEdits` 是配方 JSON（含 `originalUrl` / `original` / `crop`）；`files` **多了一条**新记录，**旧记录仍在** | PB 后台两张截图 | 烘焙是否覆盖了原 blob（禁止）；DTO 是否漏点名 `imageEdits`（`hlsUrl` 的翻版） |
| 7 | 再进编辑器一次，看裁剪框位置 | 读回上次的配方（裁剪框回到保存时的位置），不是全图 | 截图 | `imageEdits` 是否真读回（读路径 mapper）|
| 8 | 点 `恢复原图`（编辑器工具条内） | 图片回到原图；PB 后台 `imageEdits` 变成 **`null`**（不是「值还在」）；刷新后仍是原图 | PB 后台前后截图（对比 G1 第 10 条的哨兵判据） | 清空是否发了 `undefined`（发 `undefined` = 什么都不做，坑 1） |
| 9 | 打开一张**有批注**的 image（先用 M5 画两笔，一笔在左上、一笔在右下）→ 裁剪到只剩左上 → 保存 | 保存前出现「批注会一起被裁剪」的确认；确认后**右下那笔消失、左上那笔仍在且位置正确** | 保存前后截图 + 图元计数 | §6 的公式与「界外点丢弃」；确认框是否真的拦住了 |
| 10 | 给一张长边 > 4096 的大图（或先用属性侧栏把 URL 换成一张大图）做任意裁剪 → 保存 | 落库文件长边 ≤ 4096；`width/height` 同步为缩放后的值；画面不糊 | PB 后台记录 + 尺寸读数 | 长边上限是否生效；降采样是否两步（一步会糊）|
| 11 | 属性侧栏把「内容链接」改成另一个 URL → 再进编辑器 | 编辑器以「新 url 即原图」开局（没有残留裁剪）；PB 后台 `imageEdits` = `null` | PB 后台截图 + 编辑器截图 | §0.2-⑤ 的清配方改动是否落地 |
| 12 | 失败面：属性侧栏填一个**不带 CORS 头**的外链图（或一个 404 的地址）→ 试图编辑保存 | 404：编辑入口置灰；无 CORS 头：保存给出**明确错误条**且**不写库**、不出现半保存状态 | 截图 + PB 后台该记录未变 | `SecurityError` 是否被 `catch`（坑 6）|
| 13 | 打开一个 image 节点但**不进编辑态** → DevTools Network 面板筛 `image-editor` | **没有**该 chunk 请求（懒加载生效，首屏不为裁剪库付费） | Network 面板截屏 | `image-node-content.tsx` 是否静态 import 了编辑器（坑 12）|
| 14 | 打开一张**带透明区**的 PNG → 选 JPEG 导出并保存 | 透明区是**白底**（不是黑斑）；落库文件名后缀是 `jpg`；`blob.type` 与请求一致 | 保存后截图 + PB 后台文件名 | `encode.ts` 的 flatten 顺序 / `blob.type` 断言（坑 11）|
| 15 | 回归：上传替换一张图（`替换` 入口）；再跑一遍 G5 的 #3 / #6 / #7（批注三连） | 上传后 `annotations` 仍在、`imageEdits` 被上传路径**不动也不清**（上传是换底图，但走的是 `file-drop-zone` 的点名 patch）——若你希望上传也清配方，当场说，记入遗留 | 截图 + PB 后台 | `file-drop-zone` 是否意外整包覆盖 content（R4/R13 的反向回归）|
| 16 | 静态检查：看主 agent 的 `bash docs/plan/baseline.sh` 结论 | 两段 **0 新增 / 0 消失** | 终端输出 | 是否漏了某个包的 typecheck |

> **第 15 条的已知取舍**：`替换`（上传新图）与「编辑」是两条写路径。本章**不**让上传清 `imageEdits`（上传路径只 patch 点名键，动画最小），代价是「换图后配方仍指向旧原图，点恢复原图会回到旧图」。**若你要上传即清配方，说一声**，这是一行改动（`file-drop-zone.tsx` 的 image 分支加 `imageEdits: null`），但它是 M2 的 W1-B 地盘，需要登记。

---

### 5.1.7 回归面

全部相对 [baseline.md](./baseline.md)，逐条可测：

1. **批注全链路**：G5 的 #3（手指不画线）/ #6（断线）/ #7（持久化）各复测一次——本章改了 `image-node-content.tsx`（批注的宿主）。
2. **上传替换**：`FileDropZone` 的 image 分支不动 `annotations`（M1 半边合并）；上传后 `width/height/fileSize` 是新值。
3. **属性侧栏其它字段**：标题 / 摘要 / 标签 / 内容链接各改一次，`annotations` 与 `imageEdits` 都不被抹（R13 的回归）。
4. **preview 块与图库卡片**：未编辑的图逐字不变；编辑过的图显示烘焙结果。
5. **其它 9 种 node-content**：database / collection / text / rich-text / pdf / video / audio / webpage / website 各打开一次无变化（本章只碰 image 分支 + 一个新列）。
6. **`/graph` 页双指语义**不变（本章没碰 `packages/graph`）。
7. **打包**：`pnpm --filter=web build` 通过（新依赖 `react-easy-crop` 必须能被 Turbopack 打包；总纲 §10 的同一条命令）。
8. **静态检查**：`pnpm --filter=@workspace/ui typecheck` / `lint`、`pnpm --filter=web typecheck`、四个后端包 typecheck、`bash docs/plan/baseline.sh` 相对基线无新增。

---

### 5.1.8 对后续章节的影响（登记，避免各章各写一份）

| 章 | 影响 |
| --- | --- |
| **M5（已完成时）** | 无源码影响；G5 已过，宿主在 M5.1 前冻结、之后由 M5.1 收口 |
| **M6（媒体）** | 无。文件集不相交（audio/video 宿主 vs image 宿主） |
| **M7（PDF）** | §7.5-1 的 image 回归面追加一条：**编辑过的图 + 批注**（`geometry.ts` 升维后仍要对齐）|
| **M10（dashboard P0）** | 无。卡片走 preview 块 / `NodeBodyRouter`，读到的就是烘焙结果 |
| **M12（selectors P2 裁剪）** | **复用**本章的 `react-easy-crop` 与 `bake.ts`（包内相对 import）与比例预设；写回目标不同（`cover` / `icon`）。**依赖不用再装一次** |
| **总纲 §4 迁移账本** | 本章占用 `1700000002`，dashboard 顺延到 `1700000003`（见 [README.md §4](./README.md)） |
| **总纲 §9 偏差** | 新增两条：R39（新增 M5.1 子章 + `nodes` 第五列 + 后端第三次解冻）、R40（迁移号重排）|

---

## 附：本章「待验证」回填清单

执行期间**不许改设计文档正文**（本轮的文档补充是用户显式要求的例外），只在闸门通过后就地回填设计文档末尾的「待验证」条目（总纲 §2.2-7）：

| # | 待验证项（出处） | 由哪一条结案 | 可能结论 |
| --- | --- | --- | --- |
| 1 | `react-easy-crop` 的 `croppedAreaPixels` 与 canvas 烘焙是否逐像素一致（含旋转态） | G5.1 #3 / #4 | 一致 / 需按 §0.2-② 修正顺序定义（回填设计 §9 表第 1 行） |
| 2 | `crossOrigin="anonymous"` + PB `files` 的 CORS 头在真实大图上成立 | G5.1 #6 / #12 | 成立（设计 §0.1 已用 1×1 探针确认头存在） / 需补头 |
| 3 | 模态 Dialog 内裁剪面的 `touch-action` 是否压得住宿主滚动 | G5.1 #2（真机） | 需加 `touch-action: none`（预期）；退出态必须复原 |
| 4 | 一次 upsert 同时写 content 与顶层 `width/height/fileSize` 是否被白名单/DTO 放行 | G5.1 #5 | 放行（上传路径就这么写） / 需补白名单 |
| 5 | `ctx.filter` 在 Tauri 的 WebKitGTK 上是否可用（P1 的调整导出） | P1 开工第一步（不在 G5.1 内） | 可用 / 回落 ImageData + LUT |
| 6 | `replace`（上传）是否应当清 `imageEdits` | G5.1 #13 的用户口径 | 保留现状（不清）/ 加一行（清） |
| 7 | 孤儿 `files` 的规模与 GC 策略 | G5.1 之后的遗留观测 | 不回收（P0）/ P2 加 GC 与 `?thumb=` |
