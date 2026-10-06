# node-content UI 执行计划（M2 / M3）

> 状态：**待开工**（前提：M0 已过 G0、M1 已过 G1；M3 另需 M2 已过 G2）
> 覆盖：M2 = 图标与封面（selectors P0 UI + P1 + node-content P0 的 `file-drop-zone` + 重排 R1/R4）；M3 = text 单 block（禅意）+ rich-text 头部挂载（node-content P1）
> 闸门：G2、G3（各自独立过闸；可与 W0 的 G4 共用一次用户会话，但结果**分别记录、分别判定**，总纲 §6.4）
> 契约：设计文档 [../node-content/selectors.md](../node-content/selectors.md)（下称「sel §n」）、[../node-content/README.md](../node-content/README.md)（下称「nc §n」）、执行总纲 [./README.md](./README.md)（下称「总纲 §n」）
> 相关：[gates.md](./gates.md)（进度真相源）、[baseline.md](./baseline.md)（判据 = 相对基线**无新增行**）、[spine.md](./spine.md)（M1 交付面）、[dynamic-island.md](./dynamic-island.md)（R1 的对侧）

---

## 0. 这一章要解决什么

| 里程碑 | 一句话交付                                                                                     | 来源                                       | 依赖    | 闸门 |
| ------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------ | ------- | ---- |
| M2     | 两个弹层（Icon / Cover Selector）+ `node-media/**` + 编辑器头部两按钮 + preview/卡片读 `icon`/`cover` + `FileDropZone` 新 variant + `NodePreviewBody` 抽取 | sel P0（UI）、sel P1、nc P0（`file-drop-zone`）、R1、R4 | M1      | G2   |
| M3     | text 单 block 富文本（居中禅意）+ 旧 `docs` 惰性升级 + rich-text 头部（cover/icon/title/summary/semantic pill）与顶层 `patchNode` 写者 | nc P1                                      | M1、M2  | G3   |

四条硬前提，缺一条就停下来问、不许自行扩权：

1. **M1 已落地的东西**：`NodeIcon` / `NodeCover` 进了 `packages/interfaces/src/models/node/base.ts`（今天该文件 `:57-69` 的 `NodeBase` 里**没有** `icon`/`cover`）；`nodes.icon` / `nodes.cover` 两列在**既有** `pb/pb_data` 上迁移成功；`useNodeContentWriter` 存在（今天 `packages/ui/src/components/dialog/editor/content/` 目录下**没有** `use-node-content-writer.ts`）。
2. **主 agent 的冻结（W1 开工前一次做完，这是 W1 的唯一前提）**：
   - 新增 `packages/ui/src/components/preview-block/node-preview-body.tsx`，导出 `PreviewBodyProps = { node: NodeData; className?: string }` 与 `NodePreviewBody`（**M8 的 stale 检查就是 `grep -rn "NodePreviewBody" packages/ui/src` 必须有命中**，[dynamic-island.md](./dynamic-island.md) §M8.1 末段）；
   - 新增 `packages/ui/src/components/node-media/media/**` 五个原子件的 props 签名（空实现 + `// TODO` 亦可）；
   - 修改 `file-drop-zone.tsx` 的 `Variant`（`:27-33`）加 `"icon"`、`"cover"` 两行与 `VARIANT_CONFIG`（`:53-79`）两行——W1-A 的 `media-drop-pane` 要 `variant="cover"` 才能编译；
   - 新增 `packages/ui/src/components/node-media/node-icon-view.tsx` 的 `NodeIconViewProps` 签名（W1-D 要用）。
3. **本章不新增依赖**。M2 零依赖；M3 的只读渲染用 `@tiptap/core@3.22.4` 已导出的 `generateHTML(doc, extensions)`（`packages/editor/node_modules/@tiptap/core/dist/index.d.ts:1986`），**不装** `@tiptap/static-renderer`（全仓未安装，已核）。`packages/ui/package.json` 与 lockfile 一律主 agent 独占（总纲 §2.2-3）。
4. **不碰本章白名单之外的 `backend/**`、`packages/interfaces` 形状、`pb/pb_migrations`**（总纲 §1：M2/M3 不动后端）。

### 0.1 开工前的实测校正（2026-10-06 · M1 之后重核行号与事实）

M1 改了 `node.ts` / `node-command.service.ts` / `node.mapper.ts` / `file-drop-zone.tsx`，本章不少引用是 M1 **之前**写的，行号已经漂移。开工前逐条对过一遍（**只核不改**，代码仍在原状）：

**① 硬前提 1 三项已落地，可直接开工（G1 通过后）**：`NodeIcon`/`NodeCover` 已进 [base.ts](../../packages/interfaces/src/models/node/base.ts) 并挂在 `NodeBase.icon/cover`；`nodes.icon`/`nodes.cover` 两列已在既有 `pb_data` 上迁移成功；[use-node-content-writer.ts](../../packages/ui/src/components/dialog/editor/content/use-node-content-writer.ts) 已存在。

**② §M2.2-1 那个「唯一的跨章阻塞点」已经解除，哨兵就是 `null`**（R29-定）。M1 落地并在真机上端到端验过（[gates.md §5 G1](./gates.md) 探针 #4）：`updateNode({ icon: null })` → PB `nodes.icon` = `null` → DTO 读回 `undefined`，且 `content`/`cover`/`annotations` 一个都没动。W1-D 的 `onRemove` 直接写 `{ icon: null }` / `{ cover: null }`，**不要再自创 `removeIcon` 布尔**；注意**不能**写 `{ icon: undefined }`（`NodeService.upsert` 的 `{...old, ...updates}` 会把它合进去，服务端按值判定 ⇒ 什么都不做）。

**③ 事实补充（M1 探针实测）**：`update` 的 `content` 是 **`z.any()`**（`node.ts:305`），所以 content 半边不会被 zod 剥键；但 `add` 的 content 是各类 `z.object` 字面量，**`annotations` / `timestampNotes` 不在其中** → 「新建时就带批注」这条链路今天是断的（G1 遗留 1）。M2 不碰它。

**④ 行号漂移表**（引用要按右列改）：

| 章里的引用 | 今天的实际位置 | 漂移原因 |
| --- | --- | --- |
| `adapter-front/.../node.ts:259-273`（`updateSchema`，§M2.2-1） | **`:296-312`** | M1 在前面插入了 content schema / `nodeIconSchema` |
| `node-command.service.ts:290-292`（`isPinned` 值判定） | **`:310`** | M1 在其上方加了 icon/cover 的两段判定 |
| `node.mapper.ts:474-479`（text → `docs`） | **`:493-498`**（`if (node instanceof TextNode)`；`content: node.content.docs` 在 `:496`） | M1 给 `baseRecord` 加了 `icon`/`cover` 与一整段「为什么是 `null`」注释（`:474-486`） |
| `node.mapper.ts:481-491`（image → url 字符串） | **`:500-511`**（`content: node.content.url` 在 `:503`，`annotations` 在 `:509`） | 同上 |
| `node.mapper.ts:493-499`（pdf） | **`:513-522`**（`content` 在 `:516`，`annotations` 在 `:520`） | 同上 |
| `node.mapper.ts:501-516`（video / audio） | video **`:524-538`**（`timestampNotes` 在 `:536`）、audio **`:540-548`**（`:546`） | 同上 |
| `file-drop-zone.tsx:27-33`（`Variant`） | `:26-33`，`type Variant` 在 **`:33`** | —— |
| `file-drop-zone.tsx:171-178`（image 分支） | `case "image"` 在 **`:172`**，两处 `content: { url }` 在 **`:174`** / **`:181`** | —— |
| `file-drop-zone.tsx:462`、`:424-531`（`webpage-source`） | `variant === "webpage-source"` 在 **`:534`**（文件共 539 行） | M1 改了「读活 content」的写者后该分支后移 |
| `node-editor.tsx:51-64`（「被 transform 的对话框」） | `node-editor.tsx` 只是消费 `DialogContent`（`:51` 起）；真正带 `-translate-x-1/2 -translate-y-1/2` 的是共享基座 **`packages/ui/src/components/ui/dialog.tsx:64`** | §M2.2-8 的成因在基座，不在 editor |
| `apps/web/app/(main)/graph/page.tsx:44-46`（seed） | **`:43-45`**，真正的 seed 实现在 `./demo-seed` | —— |
| `graph-context-menu-canvas.tsx:37` / `dataType-list.tsx:20`（G2 第 6 条） | 全路径是 `packages/ui/src/components/menu/graph-context-menu/graph-context-menu-canvas.tsx`（`Add Node` 子菜单 `:34-37`）与 `packages/ui/src/components/menu/**node**/dataType-list.tsx:20`（`collection: "Collection"`，**行号准确**） | 章里省了目录 |

**⑤ 逐条核过、行号仍然准确的引用**（不用改）：`preview-header.tsx:18-29`；`node-preview-cover.tsx:13`（leaf 约束）、`:32-43`；`preview-block.tsx:36-65`、`:121-130`、`:182`（`data-preview-block` 在，且 `packages/graph/src/force/ForceGraph.tsx:823` 也在读它）、`:68-93` 十路分发（实际 `:70-88`）；`ui/popover.tsx:20-40`（`PopoverPrimitive.Portal` 在 `:27-38`，确认**没有** `container` 透传）；`editor-header.tsx:42-44`（中间组）、`:46-58`（右侧组）；`node.service.ts:50/58/76`；`components/index.ts:16`（`export { PreviewBlock }`）；`semantic-dialog.tsx:200-208`（仍是自由文本 icon 输入）；`card-cover.tsx:26`、`:142-144`、`clampCardCoverAspect`（函数体 `:42` 起）；`eventHandler.ts:172-176`（`node:dblclick` → `handleNodeEdit`）；`demo-data.ts:86`（Backend Services）、25 条 seed、`collection` **0 条**；`lucide-react` `0.577.0`（ui）/`0.469.0`（editor）。

**⑥ 冻结还没做**（§0-2 那四项）。它本身就是 M2 的第一批写操作，按总纲 §6 必须在 **G1 通过后**才能落笔；本章登记 W1 的前提时以「冻结已提交」为准。

---

## M2 — 图标与封面

### M2.1 工作分解（任务包）

并行窗口 **W1**（总纲 §3.2）只包含下表第 1–4 行；它们文件集互不相交，但都读第 2 条冻结出来的形状。第 5–8 行在 W1 关闭后串行收口。

| #   | 任务                                                                                                                                        | 文件白名单（新增/修改）                                                                                                       | 执行主体                                | 验收（编译器可判定的部分）                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | **W1-A** `node-media/` 骨架与原子件：`node-type-icons.ts`（合并 `preview-header` 与 `node-preview-cover` 两份重复图标表）+ `node-icon-view.tsx`（emoji / Lucide 名 / image / 类型图标四段回落）+ `emoji-set.ts`（P0 精选集，纯静态）+ `media/{media-popover-shell,media-search-input,media-grid,media-drop-pane,media-url-row}.tsx` | 新增 `packages/ui/src/components/node-media/**`（**不含**两个 `*-selector-popover.tsx`） | 子 agent（**W1-A**）                     | `pnpm --filter=@workspace/ui typecheck` 相对 `baseline/typecheck-errors.txt` 无新增行；`NodeIconView` 的 `switch (icon.kind)` 分支穷尽（无 `default` 也过 `tsc`） |
| 2   | **W1-B** `FileDropZone`：`"icon"`、`"cover"` 两个新 variant（R4 前半）+ PDF/video/image 三条回填改「读活 content → 合并本半边」（R4 后半） | 修改 `packages/ui/src/components/dialog/editor/content/file-drop-zone.tsx`（`:27-33`、`:53-79`、`:165-186`、`:197-220`、`:234-264`、`:326-329`） | 子 agent（**W1-B**）                     | 同上；`VARIANT_CONFIG` 声明成 `Record<Variant, …>` 后键缺失会自己报错                                              |
| 3   | **W1-C** `preview-block`（**R1**）：新增 `node-preview-body.tsx`（`PreviewHeader` + `previews/*` 十路分发，`:68-93` 逻辑原样搬移）；`preview-block.tsx` 改用它并**保留** `data-preview-block` 外壳与定位（`:152-196` 不动）；`preview-header.tsx` 删本地 `nodeTypeIcons`（`:18-29`）改 `NodeIconView`；`node-preview-cover.tsx` 先读 `node.cover` 再回落既有推导 + 可选 `resolveNode` + 深度上限 1；`index.ts` 再导出 | 新增 `packages/ui/src/components/preview-block/node-preview-body.tsx`；修改同目录 `preview-block.tsx`、`preview-header.tsx`、`node-preview-cover.tsx`、`index.ts` | 子 agent（**W1-C**）                     | 同上；`grep -rn "NodePreviewBody" packages/ui/src` 有命中；`grep -rn "nodeTypeIcons" packages/ui/src` **零命中**（本地表已删干净） |
| 4   | **W1-D** `IconSelectorPopover`：`Emoji` / `图标` / `上传` 三 tab + 搜索 + roving 网格 + `Or add via URL` + 8 色板 + `移除`（sel §5） | 新增 `packages/ui/src/components/node-media/icon-selector-popover.tsx`                                                         | 子 agent（**W1-D**）                     | 同上；props 与 sel §4 逐字段一致（`nodeId`/`value`/`onChange`/`onRemove`/`disabledReason`/`accept`/`children`/`className`） |
| 5   | `CoverSelectorPopover`：`上传`/`从节点选`/`移除`，上传 tab 下半是 `Or add via URL`，16:9 预览盒；`listNodes?` 由宿主注入（**G2-r1 第 3 条**：删掉与上传同写一处的 `URL` tab） | 新增 `packages/ui/src/components/node-media/cover-selector-popover.tsx`                                                        | 子 agent                                | 同上；文件内**不** import `@workspace/store`（sel §2 边界 1/2）                                                   |
| 6   | 编辑器头部两个按钮：读活节点、写 `NodeService.upsert(id, { icon })` / `{ cover }`；挂载进 `EditorHeader` 中间组（`:42-44`）与右侧组（`:46-58`） | 新增 `packages/ui/src/components/header/editor-header/node-{icon,cover}-button.tsx`；修改同目录 `editor-header.tsx`            | 子 agent                                | `pnpm --filter=@workspace/ui typecheck`；两按钮都用 `useDataStore.getState().nodes.get(id)` 取基底               |
| 7   | **按需**：给 `PopoverContent` 加**可选** `container` 并透传给 `PopoverPrimitive.Portal`（sel §0.3-4、§12 的 P1 行） | 修改 `packages/ui/src/components/ui/popover.tsx`（`:20-40`）                                                                   | **主 agent**（shadcn 基座 + **20** 个现有 `PopoverContent` 消费方，只做加法：12 dataview + 1 `ui` + 7 `editor`） | `pnpm --filter=@workspace/ui typecheck` + `--filter=@workspace/dataview typecheck` 零改动通过（`ui` 的 typecheck 会连带编译 `packages/editor` 源码，见 [baseline.md](./baseline.md) §2）                     |
| 8   | 弹层内的错误条与上传失败冒泡（不写库、不清空已有值，sel §6.1）                                                                                | 与第 4、5 行同文件（同一 owner，不拆）                                                                                         | 子 agent                                | 同上                                                                                                             |

**M2 明确不做**：不改 `packages/ui/src/components/index.ts`（公共出口不登记，理由是 dataview 已按路径 import，见 §M2.2-10）；不改 `packages/graph/**`；不改 `packages/dataview/**`（sel §8）；不改 `semantic-dialog.tsx`（那是 M12，本章只提一句：`semantic-dialog.tsx:200-208` 今天仍是自由文本 `Input`，图标选择器接进去是 M12 的事）。

### M2.2 关键决策与挡路的坑

1. **移除 `icon` / `cover` 不能写成 `upsert(id, { icon: undefined })`——sel §7 那一行今天不成立。** 证据链：`NodeService.upsert` 先 `const merged = { ...oldNode, ...updates }`（`packages/services/src/graph/node.service.ts:50`）再 `mutate({ id, updates: merged })`（`:58`、`:76`）；服务端 `updateSchema` 是 `z.object`（`backend/adapter-front/src/trpc/router/node.ts:259-273`），M1 之后会含 `icon`/`cover`；而 `updateNode` 的判断是**值判定**（`if (cmd.isPinned !== undefined)`，`backend/application/src/commands/node/node-command.service.ts:290-292`）→ `undefined` 一律表示「本次不动」。客户端又用 superjson（`packages/api-client/src/trpc/client.ts:41`、`backend/adapter-front/src/trpc/server.ts:69`），`undefined` 会被原样保留而不是当缺键丢掉，所以服务端**确实**收到这个 `undefined` 然后什么都不做。→ 清空需要一个非 `undefined` 的哨兵（`null`，或一个显式的 `removeIcon` 布尔），**由 M1 在 command 层定死**；本章的 `onRemove` 按 M1 落地的那一个写。这是本章唯一的跨章阻塞点，也是 G2 第 7 条的实测点。
2. **sel §11-2 的抓包判据要改写。** 线上发的是**整份合并后的节点**（`node.service.ts:50` + `:58`），不是 `{ icon }`，所以「`updates` 里只有 `icon`」永远看不到。正确判据：`updates.icon` 有新值，且 `updates.content`（以及 PB 的 `nodes.content` 列）与操作前**逐字段一致**。G2 第 2/8 条按这个写。
3. **两张图标表必须一起改。** `preview-header.tsx:18-29` 的 `nodeTypeIcons` 与 `node-preview-cover.tsx:32-43` 的 `NODE_TYPE_ICONS` 是同一份东西；W1-C 里只改一处就会出现「本地表又长回来」。整合后两处都 import `node-media/node-type-icons.ts`。
4. **`NodePreviewCover` 必须继续是叶子。** 它的自我约束写在 `node-preview-cover.tsx:13`（no store, no `PreviewHeader`），所以 `resolveNode` 只能是**可选 prop**、由宿主注入（sel §6.2）。R1 的 `NodePreviewBody` 不渲染 `NodePreviewCover`，因此 M2 **不需要**动 `packages/graph`（那是 M8 的面）。
5. **`{kind:"node"}` 的环保护 = 深度上限 1，而卡片侧不接第二层。** sel §8 明写不改 `dataview/src/shared/{card-cover,card-ops}`，于是 `card-cover.tsx:142-144` 那条分支不会把 `resolveNode` 往下传：「节点自身的封面又是 `{kind:"node"}`」在卡片上最多解析一层，第二层回落类型图标。**这是有意接受的限制**，登记进文末待验证；`NodePreviewCover` 内部仍必须防自引用（`A.cover = {kind:"node", nodeId: A}` 不能递归）。
6. **R4 的 content 半边只能由组件写，不能由模块级 helper 写。** `applyPdfAnalysis`（`file-drop-zone.tsx:197-220`，含 `:215` 的 `upsert`）与 `applyVideoTranscode`（`:234-264`）今天是模块函数；`useNodeContentWriter` 是 hook，只能在 `UploadDropZone`（`:270` 起）里调。做法：三个 helper 退化为**只产出本半边**（`contentHalf` + `meta`），由 `UploadDropZone` 做「读活 content → `{...live, ...half}` → 串行写」。**合并的对象必须是客户端的 `content` 对象（DTO 形状），不是 `nodes.content` 列的形状**——同一列在不同类型下存的东西不同：text 存 `docs` 对象（`node.mapper.ts:474-479`），image / pdf / video / audio 存的是 url **字符串**（`:481-491`、`:493-499`、`:501-516`）。照列形状拼会把 `{url}` 塞进一个字符串列。
7. **新 variant 不能复用 `image` 分支。** image 分支写 `content: { url }` + `width/height`（`:171-178`），拿它当封面等于把节点内容换成封面图（数据损坏）。`icon` / `cover` 两个分支只写**顶层**字段（`{ cover: { kind:"image", url } }` / `{ icon: { kind:"image", value: url } }`）。
8. **弹层落在被 transform 的对话框里。** 编辑器是 `-translate-*` 居中的 Radix Dialog（`node-editor.tsx:51-64`），而 shadcn 的 `PopoverContent` 把 `PopoverPrimitive.Portal` 包在里面、**没有**把 `container` 透传出去（`packages/ui/src/components/ui/popover.tsx:20-40`）。所以第 7 行那个改动只在**实测确认默认 portal 不够**时才做；先测（G2 第 10 条），默认能用就不动 shadcn 基座。
9. **`--primary` 不表示「有图标 / 有封面」。** sel §0.3-8：tab 选中态用 recessed track 里抬起的那一个，不着色；只有色板的选中态算「用户已激活」。
10. **公共出口不登记，因此不占主 agent 的独占面。** `packages/ui/src/components/index.ts:16` 今天导的是 `PreviewBlock` 之类；dataview 消费 `NodePreviewCover` 用的是按路径 import（`card-cover.tsx:26`）。M2 沿用按路径 import，**不改** `index.ts`。
11. **`lucide-react` 有两份，类型不能跨包传。** `packages/ui` 是 `0.577.0`（`packages/ui/package.json:34`），`packages/editor` 是 `0.469.0`（该包 `package.json` 的 dependencies）；`packages/ui/node_modules/lucide-react/dist/esm/icons` 下 **1951** 个 `.js`（已核）。P0 用静态精选表（sel §3.2）不碰 `lucide-react/dynamic`；`LucideIcon` 类型一律从 `@workspace/ui` 自己那份取。

### M2.3 提交切分

1. `node-media 骨架：NodeIconView 与 media 原子件，NODE_TYPE_ICONS 收成单一真源`
2. `file-drop-zone 变体：新增 icon/cover variant，上传回填改为读活 content 合并本半边`
3. `preview-block 抽取：NodePreviewBody 独立导出，preview 两处改读 icon/cover`
4. `节点图标与封面：两个选择器弹层 + 编辑器头部两个按钮接线`

（第 1 条覆盖 W1-A、W1-D；第 2 条 = W1-B；第 3 条 = W1-C；第 4 条是串行的第 5/6/8 行与按需的第 7 行。主 agent 在提交前跑 §M2.5 回归面。）

### M2.4 闸门 G2 — 用户操作清单

入口统一：`pnpm dev:full` → PocketBase 后台 `http://127.0.0.1:8090/_/`、web `http://localhost:3000/graph`（需已登录；未登录跳 `/login`）。dev 下首次进会 seed 演示数据（`apps/web/app/(main)/graph/page.tsx:44-46`）；**seed 里没有 `collection` 节点**（`packages/dev/src/MOCK/demo-data.ts` 的 25 条 seed 里 `grep -c 'nodeType: "collection"'` = 0，已核），集合节点按第 6 条现建。所有「Network 面板」类证据都把过滤器设成 `node.update` 这一条请求。

> **按本机实测调整的口径（2026-10-06，与 G1 同一套环境）**
>
> 1. **入口走同域**，不要用回环：web `https://dev.yuqi-666.cn/graph`，PB 后台 `https://dev.yuqi-666.cn/pb/_/`（`admin@dbrain.dev`，密码在 gitignored 的 `pb/pb_data/.superuser-credentials.txt`）。`127.0.0.1:8090` 是主 agent 这台机器的回环，不在你的浏览器那侧。
> 2. **第 1 条改用一个 image 节点**（例如「System Architecture Diagram」）：判定面是**编辑器头部**，与正文无关；而 seed 的 `text` 节点正文是坏形状（`docs = null`、正文塞在 `content` 里），打开会显示 `{`（seeder 的形状，M3 的 `normalizeDoc` 才修）。M1 留下的两条 `M1 自检 · image/audio（可删）` 探针节点也还在，可随手用或删。
> 3. **第 10 条是 `container` 透传的唯一判据**：两种宿主形态（窗口 / 全屏）各开一次弹层，**只有实测发现被裁切或偏移错误**时才由主 agent 去改 `ui/popover.tsx`（那属主 agent 独占的 shadcn 基座）；默认 portal 够用就不动。
> 4. **两条已知偏差，不算失败**：① 设计文档 §2 骨架图底部的**分类条**没做（扁平网格 + 类名并入关键词，搜「食物」仍命中）；② `MediaGrid` 的 `aria-selected` 由 cmdk 掌握、不与 roving 焦点同步 —— 第 11 条只判「`Tab` 能正常遍历、网格不是 300 个 tab stop」。
> 5. 第 4 条需要一个**本地图片文件**；第 6 条要现建一个 collection 节点（seed 里没有）。
> 6. **G2-r1（2026-10-06 第 1 轮实测的三点回改，已提交）**：① 弹层体的滚动契约重做——旧形状把上限压在 `Command` 上（inline `maxHeight`）却指望宿主 `flex-1 min-h-0` 的 `CommandList` 去滚；`height: auto` 的 flex 容器不会因自己的 `max-height` 收缩子项（368 格 ≈1900px 算完再钳到 384px），于是网格被裁掉、**没有滚动视口**。现在两条机制并存：**(a) 上限压回 `CommandList` 自身**（`[&_[cmdk-list]]:max-h-[calc(var(--media-body-cap)-2.25rem)]`，恢复仓库里既有的 `Popover + Command + CommandList` 滚动形状——`dataview/shared/field-picker.tsx` 与 `settings-panel.tsx` 在同一个编辑器弹窗里就是这么滚的）；**(b) 外层包裹 `div` 作安全网**（同一个上限 + `overflow-y-auto`），供上传 tab 这种非 `CommandList` 的体使用。上限值含 `var(--radix-popover-content-available-height)`，所以靠视口边的弹层不会高过 popper 量到的可用高度；`Command` 让出 `overflow-hidden`，`MediaSearchInput` 用 `sticky top-0 z-10 bg-popover` 钉在滚动视口顶。第 1 条顺带确认「网格能滚、搜索行不滚走」。② `无底色` 现在真的清空：`handleColor` **总是**写 `color` 键（清除时写 `undefined`），因为宿主是 `{ ...live, ...next }` 合并（sel §7 活值基底），缺键与「别动颜色」不可区分，旧色因此存活。并入第 5 条。③ 封面弹层删掉 `URL` tab（与 `上传` 同写一处、同一种来源），`Or add via URL` 留在 `上传` tab 尾部；第 6/7 条只看两个 tab。
> 7. **G2-r2（2026-10-06 第 2 轮实测的两点，已回改）**：① **「底色只在上传 tab 有了」**——底色行原本是 `children` 的最后一项，即落在**滚动体之内**：46 行的 emoji 网格把它顶到折叠线以下看不见（上传 tab 内容短，所以那一行才在）。现在它是 `MediaPopoverShell` 的 **`footer` 槽**，钉在滚动区之外，任何 tab 都常驻可见。② **「依然滚不动」有两个叠加根因，只改 CSS 修不好**：**(i)** G2-r1 修的那一半（上限压在 `Command` 上 → 内容被裁、整条链没有滚动视口）；**(ii)** `modal` 的 Radix Dialog 挂的 `react-remove-scroll`（`shards: [contentRef]`）会把**落在 shard 之外**的 `wheel` / `touchmove` 一律 `preventDefault()` —— portal 到 `document.body` 的弹层因此**在窗口模式下无论自身 CSS 多正确都滚不动**，触屏同理（平板上一指也划不动）。现在 `MediaPopoverShell` **显式把最近的 `DialogContent` 作为 `PopoverContent` 的 `container`**（`ui/dialog.tsx` 暴露 `DialogContentContainerContext`，`ui/popover.tsx` 新增可选 `container` 作透传），即 §M2.1 第 7 行标「按需」的那次透传。**有意不做成全局默认**：filter / view 对话框自身就是 `max-h-[85vh] overflow-y-auto` 的滚动容器、`quick-panel` 是 `overflow-hidden`，把弹层 portal 进去会从「滚不动」变成「被裁切」，所以其余 ~20 个消费方行为不变。**证据**：真 Chromium + 真组件 + 真模态 Dialog + 受信任滚轮的探针 **12/12**（⑥⑦⑧ 滚轮真的滚动、⑨ 反向对照还原旧形状后滚不动、滚轮事件 `defaultPrevented` 由 true 变 false），配方见 `gates.md` §6。③ 另外实测到（与本 bug 无关但影响复测）：域名的 nginx 没代理 HMR —— `/_next/webpack-hmr` 本机 101、经域名 404，**代码改完不刷新页面不会更新**。⇒ 刷新后本轮的判据：`Emoji` tab 底部**能看到「底色」那一行**，且网格 / 图标 / 封面列表都能滚（列表滚动条按仓库惯例隐藏）。

| #   | 用户做什么（具体入口）                                                                                                                                          | 期望                                                                                                          | 判据或证据                                                                                                                     | 失败先看哪                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 1   | `/graph` → **双击**节点「Backend Services」（text，`demo-data.ts:86`；双击进编辑器由 `packages/graph/src/eventHandler.ts:172-176` 的 `node:dblclick` → `handleNodeEdit` 保证） → 看编辑器头部标题**左侧** | 出现一个 36×36 图标位，空态画的是 text 的类型图标；点开弹层，焦点已在搜索框；滚轮能在 emoji 网格里滚动、搜索行钉在顶部不动（G2-r1①）                                    | 截图；`document.activeElement` 是搜索输入框；滚到底后 `[cmdk-input]` 仍在弹层视口内                                                                                     | `editor-header.tsx:42-44` 的中间组；`node-icon-button.tsx` 的默认触发器         |
| 2   | 在弹层 `Emoji` tab 点第 3 个 emoji → 关掉对话框 → 重新双击同一节点                                                                                              | 头部立刻变该 emoji；重开后仍在                                                                                | **Network 面板**：`node.update` 的 payload 里 `updates.icon` 有新值，且 `updates.content` 与操作前逐字段一致；**PB 后台** `nodes` 表该行 `icon` = `{"kind":"emoji","value":"…"}` | §M2.2-1/2；`NodeIconButton` 是否用了活值做基底                                   |
| 3   | `图标` tab 输入 `Light` → 选「Lightbulb」→ 刷新页面                                                                                                             | 头部变灯泡图形；刷新后仍是灯泡（不是字符 `Lightbulb`）                                                         | 截图；PB `nodes.icon.kind === "icon"`                                                                                           | `NodeIconView` 的 `kind:"icon"` 分支是否真查名字表                              |
| 4   | `上传` tab 选一张本地 png → 等进度 100% → 再打开弹层，在 `Or add via URL` 粘贴一个外链图片地址并按 **Enter**                                                    | 两次都立刻改头部；上传得到的是 `kind:"image"`，URL 得到的是 `kind:"image"` 且 value 是完整外链                  | **Network 面板**：输入过程中**零** `node.update`，只在 Enter 后发一次；PB `nodes.icon.value` 与粘贴串一致                        | sel §5 的「Enter/blur 才写」；`media-url-row` 是否逐键写                        |
| 5   | 打开弹层点第 3 个色块；再点第 5 个；最后点「无底色」（`Ban` 那个）                                                                                              | 底色行**每个 tab 都常驻可见**（G2-r2：它在 `footer` 槽里，不在滚动体内）；底色跟着换，emoji/图形本身不变；点「无底色」后底色回到**空**（G2-r1②） | PB `nodes.icon` 三个键（`kind`/`value`/`color`）都在，`kind`/`value` 与点色前一致；第 3 步后 `nodes.icon` **不含** `color` 键                                       | sel §7「改底色必须基于活值」；`onChange` 是否传了只带 color 的对象 / 缺 color 键 |
| 6   | 画布**右键** → `Add Node` → `Collection`（`graph-context-menu-canvas.tsx:37`，标签表 `dataType-list.tsx:20`）→ 选任意语义 → 双击新节点打开 → 点封面按钮 → 上传一张图 → 内容区切到画廊视图 | 头部封面按钮显示新封面；**该节点的卡片封面也变成这张图**                                                       | 卡片上 `<img>` 的 `src` 等于 `resolveFileUrl(cover.url)`；PB `nodes.cover` = `{"kind":"image","url":"…"}`                       | sel §6.2/§6.6；`NodePreviewCover` 是否真先读 `node.cover`                       |
| 7   | 同一个 collection 节点：封面弹层里 `移除`；然后对节点 A 选「从节点选 → 某个 image 节点（如「System Architecture Diagram」）」                                                                 | ① 移除后卡片回落字母占位/类型图标；② 选节点后封面变成那张图；③ **A 的封面选 B、B 的封面选 A 不卡死** | PB `nodes.cover` 分别为空 / `{"kind":"node","nodeId":"…"}`；③ 无栈溢出、无白屏（深度上限 1）                                     | **§M2.2-1 是第 ① 步的已知阻塞点**；第 ③ 步看 `NodePreviewCover` 的深度守卫      |
| 8   | 悬停画布上刚设过图标的节点（桌面 hover）→ 看预览浮层头部                                                                                                        | 浮层头部图标 = 节点 icon（不是类型图标）；鼠标移开浮层消失，`isFocus` 语义与改动前一致                         | 截图；`document.querySelectorAll('[data-preview-block]').length` 与改动前一致（R1 抽取没弄丢这个标记）                          | `preview-header.tsx` 的 `NodeIconView` 接线；`preview-block.tsx` 外壳是否被顺手删 |
| 9   | 弹层里快速连点 emoji A → B → C                                                                                                                                  | 最终值是 C，中间不闪回、不并发写                                                                              | **Network 面板**只有最后一次 `node.update` 的 `icon` 是 C（失败回滚时会闪回旧值，这是既有行为，不算失败）                       | sel §7 的「一次手势一次写」                                                     |
| 10  | 两种宿主形态各开一次弹层：窗口模式（`/graph` 里双击节点）+ 全屏模式（编辑器头部最左 `FullscreenButton` 进 `mainViewType === "editor"`）                          | 弹层不被对话框裁切、偏移正确、点外部能关、页面滚动不被锁死                                                     | 两次截图；关掉后页面仍能滚动                                                                                                   | §M2.2-8；此时才决定要不要做 `PopoverContent` 的 `container` 透传                |
| 11  | 键盘走一遍：`Enter` 打开 → 输入过滤 → `↓` 选 → `Enter` 确认 → `Esc`                                                                                             | 弹层关闭且焦点回到触发按钮；`Tab` 能在搜索框 / 网格 / 移除之间正常遍历，不被外层 Dialog 抢走                    | 逐键操作；观察焦点环                                                                                                           | sel §5 的键盘表；网格是否成了 300 个 tab stop                                   |
| 12  | 回归：新建一个 Image 节点（`Add Node → Image`）→ 点落地区上传一张 png                                                                                          | 内容区出现图片；节点不因为新 variant 被改坏                                                                    | PB：`nodes.content` = 上传返回的相对路径**字符串**（image 的列形状就是 `node.content.url`，`backend/infrastructure/src/database/mappers/node.mapper.ts:481-491`）、`width`/`height`/`fileSize` 有值（`file-drop-zone.tsx:171-178` 的 image 分支语义未变） | §M2.2-7；`buildNodeUpdates` 的分支是否被新 variant 串了                         |
| 13  | 回归：新建一个 PDF 节点 → 上传一个真实 PDF                                                                                                                     | 上传后 `pageCount` > 0、`content.coverUrl` 有值                                                                | PB `nodes.pageCount` > 0、`nodes.coverUrl` 有值（走 `applyPdfAnalysis`，`:197-220`；pdf 的 `content` 列同样只存 url 字符串，`node.mapper.ts:493-499`）                                                                            | R4 后半段：读活 content 的合并是否把 `url` 也一起带上                           |

### M2.5 回归面

1. **四种媒体上传路径语义不变**：image（`content:{url}` + `width`/`height`）、audio（`content:{url}` + `duration`）、video（整包 `content:{url,coverUrl,hlsUrl}` + `duration`/`source`）、pdf（`content:{url,coverUrl}` + `pageCount`/`fileSize`）；`variant="webpage-source"` 仍读本地文本进 `content.code`（`:424-531`、`:462`）。
2. **`preview-block` 的浮层行为不变**：定位（`calculatePosition`，`:36-65`）、`Esc` 关闭（`:162-167`）、`isFocus` 冻结位置（`:121-130`）、`data-preview-block` 标记（`:182`）——R1 只搬「header + 十路预览分发」，不搬定位。
3. **dataview 卡片封面三来源优先级不变**：url 单元格 → relation 节点 → collection 的节点自身（`card-cover.tsx:120/142-144`）；覆盖不当的失败仍落字母占位 + `ImageOff`，不留破图；封面比例钳制 `clampCardCoverAspect`（`:37-50`）不动。
4. **`AttributesSidebar` 与编辑器头部其余控件不变**：`FullscreenButton`、`ToggleSidebarButton`、`ToggleSearchCommandButton`、`PinButton`、属性按钮、`OptionsMenu`、`NodeTitle`（`node-title.tsx:21-30` 的 debounce 写）全部照旧；新增的两个按钮不得改变右侧组的顺序与命中区。
5. **`semantic-dialog.tsx` 仍是自由文本图标输入**（`:200-208`），M2 不改它；`NodeSemantic.icon` 的渲染现状（`semantic-list.tsx` 当文本画）也不在 M2 范围。
6. **既有 20 个 `PopoverContent` 消费方不受影响**：12 个在 `packages/dataview/src/**`、1 个是 `packages/ui/src/components/menu/node/tag-list.tsx`、7 个在 `packages/editor/**`（第 7 行若动手，`ui` 与 `dataview` 两个包的 typecheck 必须零改动通过——`ui` 的 typecheck 会连带编译 editor 源码）。

---

## M3 — text 单 block（禅意）与 rich-text 头部

### M3.1 工作分解（任务包）

**M3 不开并行窗口**（[gates.md](./gates.md) §并行窗口的「明确不开窗的章」：编辑器与只读渲染器共享同一份 schema/扩展集文件）。下表按 1 → 8 串行；第 1/2 行的 `single-block-editor.tsx` 与 `single-block-renderer.tsx` **同属一个任务包、同一个 owner**，不许拆给两个子 agent。

| #   | 任务                                                                                                                                                          | 文件白名单（新增/修改）                                                                                                                     | 执行主体   | 验收（编译器可判定的部分）                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | 受限单块 Tiptap 编辑器：自定义 `Document`（`content: "paragraph"`）+ `StarterKit.configure` 关掉全部块级 + `Placeholder` + `TextAlign({ types:["paragraph"] })` + `handleKeyDown` 拦 `Enter` 兜底 + `transformPasted` 压平多行；不含 Yjs/协作 | 新增 `packages/editor/components/tiptap-templates/single-block/single-block-editor.tsx`、`packages/editor/components/tiptap-templates/single-block/single-block-editor.scss` | 子 agent   | `pnpm --filter=@workspace/editor typecheck` 相对基线无新增行；`pnpm --filter=@workspace/editor lint` 的 `106 problems (67 errors)`（[baseline.md](./baseline.md) §3）**不增长**，新文件自身零 error（新文件里出现 `any` 会直接撞 `no-explicit-any`） |
| 2   | 只读渲染器：用 `@tiptap/core` 的 `generateHTML(doc, extensions)`（**不装** `@tiptap/static-renderer`）+ 同一套扩展集，输出居中块 | 新增 `packages/editor/components/tiptap-templates/single-block/single-block-renderer.tsx`                                                  | 子 agent   | 同上；不 import `next/*`、不 import `@workspace/store`                                                               |
| 3   | `text-node-content.tsx` 换芯：`<Textarea>`（`:30-44`）→ 单块编辑器；禅意容器落在 **UI 侧**；经共享写者写 `content.docs`（只写 `docs` 这半边）                    | 修改 `packages/ui/src/components/dialog/editor/content/text-node-content.tsx`                                                               | 子 agent   | `pnpm --filter=@workspace/ui typecheck` 无新增行                                                                     |
| 4   | `normalizeDoc` 惰性升级的**目标形状**：旧 `{ content: string }` → `{ type:"doc", content:[{ type:"paragraph", content:[{ type:"text", text }] }] }`；读时不写库，首次编辑落新形状（文件属 M1，M3 只按需在此扩展） | 修改 `packages/ui/src/components/dialog/editor/content/doc-normalize.ts`（**M1 已建，见 [spine.md](./spine.md) §M1 T5 与 §M3.2-1**）                                        | 子 agent   | 同上；纯函数，无 React、无 store                                                                                     |
| 5   | 共享头部壳 `node-content-header.tsx`：cover → icon → title → summary → semantic pill 五段，props 与 nc §1.6 的 `NodeContentHeaderProps` 逐字段一致（`patchNode` + `renderCoverSelector` / `renderIconSelector` 注入点） | 新增 `packages/ui/src/components/dialog/editor/content/node-content-header.tsx`                                                             | 子 agent   | 同上；不 import `@workspace/store`（`node` 由宿主传、写回经 `patchNode`）                                            |
| 6   | `rich-text-node-content.tsx` 组装：头部 + 既有 `<NotionEditor>`（`:18-34` 调用不变）；头部选择器由宿主注入 `IconSelectorPopover` / `CoverSelectorPopover`；顶层 `patchNode` 与 `useNodeContentWriter` 共用同一 drain | 修改 `packages/ui/src/components/dialog/editor/content/rich-text-node-content.tsx`                                                          | 子 agent   | 同上                                                                                                                 |
| 7   | 头部与 chrome 的重复入口收口（**仅当采用 §M3.2-2 的方案 B**）：`EditorHeader` 对「内容自带头部」的类型不渲染图标/封面按钮 | 修改 `packages/ui/src/components/header/editor-header/editor-header.tsx`（M2 之后的第三个串行 writer）                                       | 子 agent   | 同上                                                                                                                 |
| 8   | **按需**：若第 1/3 行最终把 Tailwind 工具类写进 `packages/editor`，补一行 `@source`                                                                            | 修改 `packages/ui/src/styles/globals.css`（`:8-16` 的 `@source` 列表）                                                                       | **主 agent**（总纲 §3.1 独占） | 改完立刻 `pnpm --filter=web build` 通过 + G3 复测该样式                                                               |

### M3.2 关键决策与挡路的坑

1. **`doc-normalize.ts` 与 `use-node-content-writer.ts` 都由 M1 交付，M3 只消费。** [spine.md](./spine.md) §M1 任务 T5 把两个文件都列为 M1 的新增文件（`packages/ui/src/components/dialog/editor/content/{use-node-content-writer.ts,doc-normalize.ts}`）。开工前置检查：`ls packages/ui/src/components/dialog/editor/content/{use-node-content-writer.ts,doc-normalize.ts}` 两个都必须存在（今天都**不存在**，已核）。若缺，停在本章入口回派 M1，**不在 M3 里补建第二个归一化文件**；`normalizeDoc` 的目标形状（`{type:"doc", content:[…]}`）以本章 §M3.2-7 为准，需要扩展就在 M1 那个文件上改。
2. **rich-text 会长出两个图标/封面入口，必须显式收口。** sel §4 要求 `EditorHeader` 中间组挂 `NodeIconButton`（`editor-header.tsx:42-44`）、右侧组挂 `NodeCoverButton`（`:46-58`）；nc §1.6/§2 又要求 rich-text 内容区自带 cover/icon 头部。两者都会渲染同一个 `node.icon`/`node.cover`，于是同一个 rich-text 节点会出现两套入口。**方案 A（推荐，M2 一次做完）**：M2 的按钮加一个「当前 nodeType 是否有内容自带头部」判定，集合先写进常量、M2 阶段为空；M3 只往集合里加 `"rich-text"`。**方案 B**：两处都留着，M3 改 `editor-header.tsx`（第 7 行）。无论哪个，G3 第 6 条都要给判定；**不许**留成「看情况」。
3. **Tailwind `@source` 的结论：`packages/editor` 今天不在白名单里，且实测确实没被扫。** `packages/ui/src/styles/globals.css` 的 `@source` 只有四行——`:8` `"../../../apps/**/*.{ts,tsx}"`、`:9` `"../../../components/**/*.{ts,tsx}"`、`:10` `"../**/*.{ts,tsx}"`（这条按相对 CSS 文件解析就是 `packages/ui/src/**`）、`:16` `"../../../dataview/src/**/*.{ts,tsx}"`；**没有一条指向 `packages/editor`**，它只被 `:4-5` 的两条 **SCSS `@import`** 引用（样式，不是源码扫描）。旁证：`packages/editor/.../latex-node/*` 里独有的工具类 `z-[101]`、`w-[500px]`、`w-[400px]`、`min-h-[50px]` 在既有 dev 产物 `apps/web/.next/dev/static/chunks/packages_ui_src_styles_globals_css_bad6b30c._.single.css` 里**一个都没有**（该产物里 `packages/ui` 的 `min-h-[100px]` 有）。→ **本章结论：禅意容器的 Tailwind 类写在 `packages/ui` 侧（第 3 行），`packages/editor` 侧只写结构 + SCSS**（编辑器既有范式就是 SCSS，如 `notion-like-editor.tsx:56-89` 成片的 `import "….scss"`）。只有第 1/3 行最终决定把 Tailwind 类写进 editor 时才补 `@source`（第 8 行，主 agent），并重跑 web build。（该产物是一次 dev 构建的快照，故作为旁证而非唯一依据；但「不在名单里」本身就是硬事实。）
4. **只读渲染不要引新包。** `@tiptap/core@3.22.4` 已导出 `generateHTML(doc: JSONContent, extensions: Extensions): string`（`packages/editor/node_modules/@tiptap/core/dist/index.d.ts:1986`；同处还有 `generateText`、`generateJSON`），而 sel/nc 提到的 `@tiptap/static-renderer` **全仓未安装**。如果落码时发现 v3 的 static renderer 更合适，那就是一次依赖增删 → 走主 agent + 总纲 §5 账本，不在本章自行 `pnpm add`。
5. **`@tiptap/starter-kit` 是 `packages/editor` 的 `devDependencies`，却被运行时 import**（`notion-like-editor.tsx:10`）。M3 的单块编辑器照抄这个既有形态（不改 manifest，避免动 lockfile）；提升为 `dependencies` 记入文末待验证。
6. **单块 schema 收紧是唯一能防住粘贴与 IME 的一层。** `StarterKit.configure({ heading:false, bulletList:false, … })` 只管扩展；「只允许一个块」的主手段是自定义 `Document`（`content: "paragraph"`），`handleKeyDown` 拦 `Enter` 只是观感兜底，`transformPasted` 负责粘贴压平（nc §1.1 的四条路径里选 ① + ②）。
7. **`docs` 的惰性升级方向是「客户端读时升级」，不是写迁移脚本。** DB 里 text 节点的 `content` 列**就是 `docs` 对象本身**：infra 写 `content: node.content.docs`（`backend/infrastructure/src/database/mappers/node.mapper.ts:474-479`）、读 `new TextContent(record.content || {})`（`:247-251`），而 `TextContent` 只是 `Object.freeze({...docs})` + `docs` getter（`backend/domain/src/models/node/value-objects.ts:148-162`）；后端全链路对 `docs` 内部形状零校验（`node-command.service.ts:343-346` 只要求 `content.docs !== undefined`）。所以升级只发生在前端读路径，第一次编辑就把 Tiptap doc 落进同一个列。
8. **回滚的唯一不可逆项与 nc §4.3-5 的措辞有一处对不上。** 旧前端 `text-node-content.tsx:20-25` 的 `getValue()` 取 `Object.keys(docs)[0]` 对应的值；对 `normalizeDoc` 产出的 `{ type:"doc", content:[…] }`，第一个键是 `type`，于是显示的是字符串 `"doc"`——**不是**设计文档写的 `"[object Object]"`（那个要 `docs.content` 才是首个键）。结论不变（旧前端看到的是垃圾文本，回滚必须连同前端一起），但闸门/遗留记录里引用的现场文案按实测写。
9. **text 预览今天是坏的，M3 顺手修好它。** `text-preview.tsx:6-20`（`if (!docs || !docs.content) return ""`）与 `node-preview-cover.tsx:49-65`（`extractDocText`）都假设 `docs.content` 是**数组**；旧写入形状是 `{ docs: { content: "字符串" } }`（`text-node-content.tsx:37`），于是预览落到 `"No content"`（`text-preview.tsx:34`）。统一成 Tiptap doc 后两处自动生效——G3 第 2 条必须实测这条。
10. **头部六项里只有正文碰 `content`。** nc §2 的纪律：cover/icon/title/summary/semantic pill 都是顶层字段直写（`NodeService.upsert(id, { icon })`），**永远不要为了改图标发 `{ content }`**——`NodeService.upsert` 的顶层浅合并里 `content` 是整包替换（`node.service.ts:50`）。即便如此也要串行化：传 `content` 的半边（正文）与传顶层字段的头部仍会落进同一个「同一节点两次写互相 abort」的坑（nc §0.3-8），所以 `patchNode` 与 `useNodeContentWriter` 共用同一个 drain。
11. **rich-text 正文只写 `docs` 半边依赖 M1 拆开后端。** 今天 `updateNodeContent` 要求 `referencedNodes` 与 `docs` **同时出现**（`node-command.service.ts:403-407`），缺一个就静默不改；M1 已把两半边拆开（总纲 §9 R3）。G3 的正文回归里要确认 `referencedNodes` 不会因为编辑器只发 `docs` 而丢。
12. **双宿主尺寸约束继续成立。** node-content 既在 `w-[1200px] h-[80vh]` 的 Dialog（`node-editor.tsx:55`）里，也在 `absolute inset-0`（`:69-78`）里；单块编辑器的禅意留白不得用 `vh`/视口单位，高度一律 `h-full min-h-0`（内容盒是 `:104-107` 的 `flex-1 overflow-y-auto`）。

### M3.3 提交切分

1. `editor 单块：受限单块 Tiptap 编辑器与只读渲染器，禅意排版落在 ui 侧`
2. `text 内容：Textarea 换成单块编辑器，docs 旧形状走 normalizeDoc 惰性升级`
3. `rich-text 头部：cover/icon/title/summary/semantic pill 挂载，顶层字段经共享写者直写`

（第 1 条含第 1/2 行；第 2 条含第 3/4 行；第 3 条含第 5/6/7 行与按需的第 8 行。按需项的提交并入对应条，不另起一次提交。）

### M3.4 闸门 G3 — 用户操作清单

入口同 G2：`pnpm dev:full` → `http://localhost:3000/graph`。text / rich-text 的既有节点：「Backend Services」（text，`demo-data.ts:86`）、「Frontend Architecture」（rich-text，`:74`）。PB 后台 `http://127.0.0.1:8090/_/` 的 `nodes` 集合可直接改 `content` 字段造旧数据。

| #   | 用户做什么（具体入口）                                                                                                         | 期望                                                                                                     | 判据或证据                                                                                                                              | 失败先看哪                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | `/graph` → 双击「Backend Services」→ 在内容区输入两行文字，中间按 **Enter**，再按 `Mod-B` 加粗一段                            | 内容是一块**居中**、字号明显大于正文的富文本；`Enter` **不**新建第二个块；加粗生效                           | 截图；DOM 里 `.ProseMirror` 的直接子节点只有**一个** `<p>`                                                                                | 自定义 `Document`（`content:"paragraph"`）是否真生效；`handleKeyDown` 是否被 IME 绕过 |
| 2   | 鼠标悬停刚编辑过的同一节点，看预览浮层头部与正文                                                                                | 预览里能看到刚写的文字（**不是** `"No content"`）                                                          | 截图；PB `nodes` 表该行 `content` 已是 `{"type":"doc","content":[…]}`                                                                     | §M3.2-9（`text-preview.tsx:6-20`）；`normalizeDoc` 是否只作用于编辑器而不作用于预览 |
| 3   | PB 后台把某个 text 节点的 `content` 手工改成 `{"content":"旧文本"}` → 回到 `/graph` 打开它 → 随便改一个字 → 回 PB 后台重新看该行 | 打开时显示「旧文本」（**不是** `doc`、**不是** `[object Object]`、不是空白）；改完之后 `content` 已是 `{"type":"doc",…}` | 前后两次 PB `content` 值（贴出来）                                                                                                       | §M3.2-7/8；`normalizeDoc` 的旧形状分支                                            |
| 4   | 双击「Frontend Architecture」（rich-text）→ 看内容区顶部                                                                        | 自上而下：cover 位（空则不占位）、icon 位、title、summary、semantic pill、正文 `<NotionEditor>`             | 截图                                                                                                                                     | nc §1.6/§2 的五段顺序；`node-content-header.tsx` 的 props 是否与宿主对齐           |
| 5   | 在头部改 title 与 summary；在侧栏「属性」里看「摘要」；再在侧栏把摘要改成另一串，回看头部                                       | 头部与侧栏是同一份 `abstract` / `title`，两个方向都同步                                                    | 双向各改一次，两处一致；PB `nodes.abstract` / `nodes.title` 是最后输入的值                                                                | `patchNode` 是否直写顶层；`AttributesSidebar` 的 `handleAbstractChange`（`:168-170`） |
| 6   | 在头部点 icon 位选一个 emoji；再点 cover 位传一张图                                                                            | 两个都立刻生效                                                                                            | PB `nodes.icon` / `nodes.cover` 有值                                                                                                     | **§M3.2-2**：若同一节点出现两套图标入口，按所选方案判定（A：少一套；B：两套同步）   |
| 7   | 在正文里**连续打字**的同时，两步之内（<500ms）改一次 icon 或 title                                                              | 两者都在：正文不回退到上一帧，头部改动也在                                                                | 操作后正文与头部都对；**控制台无** `The request was aborted (most likely autocancelled…)`                                                | §M3.2-10 的共用 drain；`patchNode` 与 `useNodeContentWriter` 是否各建了一套队列     |
| 8   | 回归：在头部改 icon/title/summary 的前后各抓一次 `node.update` 的 payload                                                       | 改动只落在顶层字段                                                                                        | **Network 面板** `updates.content` 与改动前逐字段一致（正文 `docs` 不被头部写覆盖）                                                      | §M2.2-2/§M3.2-10                                                                  |
| 9   | 全屏模式（编辑器头部最左 `FullscreenButton`）下把第 1 条再做一遍                                                                | 单块编辑器在 `absolute inset-0` 宿主里同样居中、不溢出、不出现内部滚动条套娃                                | 两种形态各一张截图                                                                                                                       | §M3.2-12；是否用了 `vh`                                                           |
| 10  | 在单块编辑器里粘贴两行文本；按 `Esc`                                                                                            | 粘贴被压平成一段（不落 `hardBreak`）；`Esc` 交给 Dialog 关闭编辑器，编辑器自己不消费                        | 操作后 DOM 只有一个 `<p>`；`Esc` 后编辑器关闭                                                                                             | nc §1.1 的交互表；`handleKeyDown` 是否拦了 `Esc`                                  |
| 11  | 回归：双击一个 image / database 节点                                                                                            | 它们的 node-content 与改动前一致（M3 只动 text 与 rich-text）                                             | 逐项操作；PB 数据无变化                                                                                                                  | `node-content-editor.tsx:29-62` 的路由是否被改                                    |
| 12  | 跑三条命令：`pnpm --filter=@workspace/editor lint`、`--filter=@workspace/editor typecheck`、`--filter=@workspace/ui typecheck`（或 `bash docs/plan/baseline.sh`） | 相对 [baseline.md](./baseline.md) **无新增行**；`@workspace/editor` 的 lint 计数不超过 `106 problems (67 errors)`，且 M3 新增文件零 error | 贴三条输出的尾部 + `.baseline-raw` 的 diff                                                                                                | 新文件里的 `any`（editor 不走 `eslint-plugin-only-warn`）；未使用的 import         |

### M3.5 回归面

1. **rich-text 正文链路不变**：`NotionEditor` 的四个 props 语义（`room` / `placeholder` / `onContentChange` / `getInitialContent`，`notion-like-editor.tsx:104-109`）照旧；`referencedNodes` 不因「只写 `docs`」而丢（依赖 M1 拆开的后端半边）。
2. **`preview-block` 十路预览分发不变**（R1 抽取后）：text / image / video / pdf / audio / webpage / website / collection / rich-text / database 十种都能出内容；text 预览从「坏」变「好」是期望内的变化，其余九种不许变。
3. **`AttributesSidebar` 与 `EditorHeader` 的既有控件不变**：title 输入（`node-title.tsx:21-30`）、摘要、语义下拉、标签、内容链接、`PinButton`、`OptionsMenu` 行为照旧。
4. **text 节点仍是 `text` 类型、`content` 仍是 `{ docs }`**：不改 `NodeType`、不加 `TextDoc` 类型、后端零改动（`node-command.service.ts:343-346`、`node.mapper.ts:247-251`/`:474-479`）。
5. **其余八种 node-content 不受影响**：`node-content-editor.tsx:29-62` 的路由不改；`node-content-header.tsx` 只被 rich-text 挂载。
6. **`packages/editor` 的既有 lint 债务不增长**：[baseline.md](./baseline.md) §3 的 `106 problems (67 errors)` 是判据的分母，不是要修的债。
7. **`packages/ui/src/styles/globals.css` 的 `@source` 列表不变**（除非真的落地第 8 行）：加行要重跑 `pnpm --filter=web build`，不能只在 dev 里看。

---

## 附：本章「待验证」回填清单

执行期确认后，按总纲 §2.2-7 回填到设计文档的「待验证」区或 §9 偏差登记（**不回改正文**）：

1. **`icon` / `cover` 的「清空」表示**（sel §7 的 `upsert(id,{icon:undefined})` 一行）：M1 最终用 `null` 还是显式 flag？本章 §M2.2-1 只证明「`undefined` 不行」，表示法由 M1 定；G2 第 7 条实测通过后回填。
2. **`packages/editor` 是否要补 `@source`**（nc §0.3-11）：本章结论是「不补，样式落在 `packages/ui` 与 editor 自己的 SCSS」。若 G3 出现样式类缺失，回填为「需补一行 `@source`」并记录 globals.css 的改动。
3. **`@tiptap/starter-kit` 的 devDependency 身份**（`packages/editor/package.json`）：运行时 import 一个 devDependency 是既存形态（`notion-like-editor.tsx:10` 已如此）。是否提升为 `dependencies`，待定。
4. **`@tiptap/static-renderer`**：本章用 `@tiptap/core` 的 `generateHTML`（3.22.4 已导出，`dist/index.d.ts:1986`），未安装也未新增。若上游 v3 后续把 static renderer 独立成必需包，登记为依赖增删。
5. **`PopoverContent` 的 `container` 透传**（sel §0.3-4、§12 的 P1 行）：G2 第 10 条实测「默认 portal 够不够」之后决定要不要做（`ui/popover.tsx:20-40` 今天没把它透传给 Portal）。
6. **`cover.kind === "node"` 的环保护形态**（sel §0.3-7）：本章用「深度上限 1」；卡片侧因 sel §8「不改 dataview」只能解析一层（§M2.2-5）。是否升级成访问集、以及 `card-cover.tsx:142-144` 要不要补 `resolveNode`，G2 第 7 条后回填。
7. **rich-text 的两套图标/封面入口**（§M3.2-2）：方案 A（M2 的按钮按类型集合隐藏）还是方案 B（M3 改 `editor-header.tsx`）？G3 第 6 条的判定结果写进 §9 偏差登记。
8. **`doc-normalize.ts` 的归属**（已定案，待 G3 复核）：[spine.md](./spine.md) §M1 任务 T5 明确由 M1 新建；本章只在 M3 开工前置检查里复核它存在，并复核 `normalizeDoc` 的旧形状分支（`{content:"字符串"}`）真能出 Tiptap doc（G3 第 3 条）。
9. **`lucide-react` 双版本**（`packages/ui` 0.577.0 / `packages/editor` 0.469.0）：`LucideIcon` 类型跨包传递是否会报错——本章回避（图标表只在 `packages/ui`），若将来 editor 侧要渲染图标则回填实测结论。
10. **`packages/editor` 单块编辑器的 `docs` 归一化位置**：`normalizeDoc` 放在 `packages/ui`（消费侧）还是 `packages/editor`（渲染侧）更省一次拷贝——落码后回填。
