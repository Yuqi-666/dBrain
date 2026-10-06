# 节点图标与封面选择器（Icon / Cover Selector）设计文档

> 状态：**待实现**（提案 [../proposal/icon-selector.md](../proposal/icon-selector.md) 与 [../proposal/cover-selector.md](../proposal/cover-selector.md)——两份正文近乎逐字重复，本文是它们的合并版）
> 范围：给**节点**加两个可选的展示字段——**图标** `icon`（弹层里选 Emoji / 图标 / 上传图片 / URL，可配色、可清除）与**封面** `cover`（上传 / 从节点选 / URL / 移除），并落地它们出现在节点编辑器头部、`preview-block`、dataview 卡片里的规则。
> 新增运行时依赖：**P0 无**（§3）；P1 视 Emoji 面板的取舍再定（候选 `frimousse`，懒加载 chunk）
> 相关文档：[../dynamic-island/README.md](../dynamic-island/README.md)（本文体例照抄它）、[../dataview/README.md](../dataview/README.md)（卡片封面的既有规则）、`packages/ui/src/AGENTS.md`、`packages/dataview/AGENTS.md`、`packages/interfaces/src/AGENTS.md`

---

## 0. 实现现状与关键决策

### 0.1 今天的代码是什么样

图标与封面这两个概念今天都已经**在别处存在**，但都不在节点自己身上：

| 现有物                          | 位置                                                                  | 现状                                                                                                                                                                                                                                                                                     |
| ------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 节点模型 `NodeBase`             | `packages/interfaces/src/models/node/base.ts:57-69`                   | 只有 title / abstract / permission / semanticId / tags / isPinned / workspaceId / stateData —— **今天没有 icon，也没有 cover**。唯一"随手塞个新键还能过类型"的地方是 `stateData.client`（`:41-45` 带索引签名）                                                                             |
| 语义图标 `NodeSemantic.icon`    | `base.ts:4-11`（`icon?: string`）                                     | **语义级**，不是节点级。唯一写入口是语义弹窗的自由文本输入（`semantic-dialog.tsx:31/43/201-205`，标签写着 "Icon (Lucide icon name)"，提示 `e.g., Lightbulb, User, Calendar`）——而全仓唯一的渲染点是把这串字**当纯文本**画（`packages/ui/src/components/menu/node/semantic-list.tsx:86-88`）：写 `Lightbulb` 就显示 "Lightbulb"，而不是灯泡图标。属于「写了但没被正确渲染」的死字段，与本文的节点级 `icon` 不撞车                                                                        |
| PDF 封面 `PdfContent.coverUrl`  | `nodes/single/pdf.ts:11-14`                                           | content 级、**机器产出**：上传后由后端 `analyzePdf` 解析抽帧回填（`file-drop-zone.tsx:197-220`）。video 同理（`applyVideoTranscode`，`:234-264`）                                                                                                                                        |
| 上传/落地 `FileDropZone`        | `file-drop-zone.tsx`（539 行）                                        | props 见 `:42-51`（nodeId / accept / variant / onUploadStart / onUploaded / onUploadError）；走 `useFileUpload` + `uploadFile` → PocketBase `files` 集合（`api-client/src/upload.ts:289-296`），成功后**自己**调 `NodeService.upsert` 写节点（`:215`/`:313`/`:326`/`:462`）              |
| 文件地址 `resolveFileUrl`       | `api-client/src/upload.ts:141-154`                                    | 相对 `/api/files/...` 拼 PocketBase origin，绝对 URL（http/data/blob）原样返回。所有媒体渲染都先过它                                                                                                                                                                                     |
| 节点封面 `NodePreviewCover`     | `preview-block/node-preview-cover.tsx`                                | 「封面从哪来」的**节点侧唯一真理**：image→`content.url`、video/pdf→`content.coverUrl`、website→`faviconUrl`（`:68-87`），文本节点退化为文本（`:90-106`），其余退化为类型图标（`:32-43`）；它**声明自己是叶子**（`:13`：no store, no `PreviewHeader`）                                     |
| 卡片封面 `CardCoverBox`         | `dataview/src/shared/card-cover.tsx` + `card-ops.ts:48-50`            | 三级优先：url 单元格 → relation 节点 → collection 的节点自身（`resolveRowCover`，`card-ops.ts:298-316`）；`{kind:"node"}` 由 `CardCoverBox` 自己 `resolveNode` 后交给 `NodePreviewCover`（`card-cover.tsx:142-144`）                                                                        |
| 编辑器头部 `EditorHeader`       | `editor-header.tsx:42-49`                                             | 中间是 `<NodeTitle>`（`:43`），右侧 PinButton / 属性 / 更多（`:49` 起）。**没有任何 icon 或 cover 的位置**                                                                                                                                                                                |
| 各节点 content 的"头"           | `content/{rich-text,image,pdf,text}-node-content.tsx`                 | **都没有头**：rich-text 直接挂 `NotionEditor`（`:18-34`）、image / pdf 的头就是落地区或 iframe（`image:35-44`、`pdf:29-38`）、text 是裸 `Textarea`（`:28-46`）                                                                                                                             |

其余相关事实：

- 编辑器弹窗是 Radix `DialogContent`，modal + 居中（`node-editor.tsx:51-64`），内容区在 `:104-111`；dataview 已有 **popover 落在该 dialog 内**的先例（工具栏面板），并为「fixed 锚点落在被 transform 的祖先里」写过补丁件 `dataview/src/shared/body-layer.tsx:10-21`。
- 提案里写的 **`file-upload-zone` 在仓库里不存在**：实际组件名是 `FileDropZone`（`file-drop-zone.tsx:533`）。两份提案正文也几乎相同（cover 提案里还留着"点击 icon 时弹出，用于更新 icon 数据"这句）——这正是本文要合并它们的原因，也说明**两处应当共享同一套组件**，而不是各写一个弹层。

### 0.2 四条决策

**决策 1（关键）：`icon` / `cover` 存 `NodeBase` 顶层，各自一列 json。不放进各节点 content，也不放进 `stateData`。**

证据链：

1. 后端 content 写回是**按节点类型 + 字段是否出现**分派的（`backend/application/src/commands/node/node-command.service.ts:343-431`）：rich-text 要求 `referencedNodes` 与 `docs` **同时出现**（`:403-414`），database 要求 `fields` + `rows`（`:415-430`），pdf 要求 `url` + `coverUrl`（`:350-356`）。**不满足就静默不改**（既不报错也不写）。而 `NodeService.upsert(id, { content })` 只做**顶层**合并（`node.service.ts:50`），`content` 一出现就是**整份替换**（`file-drop-zone.tsx:230-232` 把这句话写在了注释里）。
2. 两条合起来：把 icon 塞进 content 意味着「改一个图标要回写整份 content」——对 database 是**整张表**，对 rich-text 是编辑器正在写的 Yjs docs，与各自的写者直接打架；而 icon/cover 本质是**每个节点类型都该有**的东西，不是某一种 content 的一部分。
3. `stateData.server.icon` 是零迁移的捷径，但无类型（索引签名吞掉一切）、不可查询、语义混乱，且**部分写 `{ stateData }` 会把 `client.position` 一起丢掉**（同一条顶层合并规则）——位置是画布的命根子。「仅 rich-text 头部」也不成立：icon 是通用能力，只为一种类型做会立刻被第二种要求补齐。

代价必须承认：加一个 `NodeBase` 字段要动 **10 个子类 × 4 处**（`NodeBaseProps`（`entities.ts:33-45`）与每个类的构造 / `create` / `updateContent` / `cloneWith`（例 `entities.ts:250-258`）+ 基础设施 mapper 里 **10 份重复内联的 baseProps 类型**（`node.mapper.ts:235-246` 起）+ DTO base（`node-dto.mapper.ts:27-39`）+ 前端白名单（`adapter-front/src/trpc/router/node.ts:7-17`、`:259-273`、`:289-316`）+ 一个新迁移列。§8 给了「先把重复的 baseProps 收成一个类型 / 一个 getter」的降本项，落地前值得先做。

对三处渲染的影响：

| 消费方            | 今天                                                                                          | 加字段后该怎么做                                                                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| graph 力导向节点  | seed 只带 `nodeType` / `label = title` / 颜色（`force/transform.ts:154-166`），pixi 画圆 + 文本（`worker/pixi/nodes.ts`、`pixi/labels.ts`） | **P0 不改**。在 worker 里画 emoji/图片要把字形光栅化成 `Texture`，而标签预算 100 + LOD 门限（`labels.ts:1-24`，常量在 `styleConfig.ts:236`/`:239`）正说明文本光栅化本就昂贵。字段只是随 `NodeData` 流进 transform，留给后续 |
| preview-block     | `PreviewHeader` 用 `nodeTypeIcons[node.nodeType]`（`preview-header.tsx:18-29`、`:34`）        | 头部图标优先用节点 `icon`，缺省回落到类型图标（一处改动）                                                                                                                                    |
| dataview 卡片封面 | `CardCoverBox` → `NodePreviewCover`                                                           | **只改 `NodePreviewCover`**：先看 `node.cover`，再看今天那套按类型推导。卡片、preview-block 与未来任何消费方一起继承，dataview 侧一行都不用改                                            |

**决策 2：两个组件，共享一组内部 primitive。不做「一个 `MediaSelectorPopover` 的两个 preset」。**

tab 集合不同（Emoji / 图标 / 上传 / URL vs 上传 / 从节点选 / URL）、值形态不同、写回目标不同、可用性不同（cover 只对一部分类型有意义）。合成一个组件，躯干里必然长出 `switch (variant)` 去决定 tab、空态与提交——而本仓刚在 `file-drop-zone.tsx:533-539` 用过、并认可的形状正好相反：**一个入口 + 两个内部实现**。照抄它：两个导出组件各写自己的弹层内容，共享 `media/` 下的骨架与原子件（§2）。

**决策 3：值都是带 `kind` 的判别联合，各存一个 json 列。**

```ts
/** 节点的展示图标。`kind` 是判别键。 */
export interface NodeIcon {
  kind: "emoji" | "icon" | "image";
  /** emoji：字符本身；icon：Lucide 图形名（kebab 或 Pascal 皆可）；image：文件地址（过 resolveFileUrl）。 */
  value: string;
  /** 底色 / 前景色（hex，如 "#6366f1"）；缺省表示无底色。 */
  color?: string;
}

/** 节点的封面。与 dataview 的 `CardCover`（`card-ops.ts:48-50`）同构：URL 型 + 节点引用型两个成员（判别键命名不同，见下）。 */
export type NodeCover =
  | { kind: "image"; url: string }
  | { kind: "node"; nodeId: NodeId };
```

- `kind:"icon"` 的 value 是 **Lucide 图形名**——与 `NodeSemantic.icon` 同一约定（`semantic-dialog.tsx:201`），两个图标字段因此能共用同一个解析器。
- `kind:"image"` 的 value 是**存库地址**，渲染时过 `resolveFileUrl`；上传返回的本来就是相对路径。
- `cover` 联合与 `CardCover` 同构，`{kind:"node"}` 的语义一致（注意判别键命名不同：`CardCover` 的 URL 型是 `kind:"url"`，这里是 `kind:"image"`；两者不互换，但最终都由 `NodePreviewCover` 消化），所以卡片侧**不需要第三种"节点自身封面"概念**——`CardCoverBox` 已有的那条分支（`card-cover.tsx:142-144`）自动覆盖。

**决策 4：写回时机 = 离散选择立即写，文本输入受控草稿 + Enter/失焦才写。** 字段在顶层，一次写就是 `NodeService.upsert(id, { icon })`，不碰 content，因此**不需要草稿机**。这也顺手解决"每键一次写"：唯一有逐键行为的控件是 URL 输入框，它是本地 `useState`，只在 Enter / blur 提交（§7）。

### 0.3 必须知道的坑

1. **0 号迁移不会重跑。** PocketBase 只按**文件名**去重迁移（`pb/pb_migrations/1700000000_initial_schema.js:170-176` 的原话），给已存在的 `pb_data` 加列**不会**生效，写 node 会直接 `unknown field`。本仓当前只有 0 号一个迁移文件。加两列要么改 0 号脚本并删 `pb/pb_data` 重建，要么**新增一个迁移文件**（对已有库更友好）。
2. **content 写回有静默门槛。** 见决策 1 的行号：缺键就**不报错也不改**。这是"字段放顶层"最硬的理由，也是将来若有人把 icon 挪进 content 的回归点。
3. **提交必须基于活值，且一次手势只发一次写。** 两个宿主为此各写了一套「读活 content + 微任务合流」的机制（`database-node-content.tsx:46-56`、`collection-node-content.tsx:78-90`），动机是**同一节点的两次写同时在飞会互相 abort**（注释里记了 `TRPCClientError: The request was aborted (most likely autocancelled…)` 的现场）。选择器只写顶层字段，天然躲开 content 那一半，但"基于活值 + 一次手势一次写"仍要照做。**待验证**：服务端 PocketBase 客户端其实关掉了 auto-cancellation（`infrastructure/src/database/pocketbase-client.ts:9-25`），真正触发 abort 的路径值得再确认；无论如何串行化是当前两个宿主的既有事实。
4. **dialog 里的 popover：焦点与坐标。** 编辑器是 modal `DialogContent`（`node-editor.tsx:51-64`），居中用的 Tailwind v4 `-translate-x-1/2 -translate-y-1/2` 会**建立 containing block**，弹层内任何 `position: fixed` 都按对话框面板测量——`body-layer.tsx:10-21` 记了实测值（面板在 `128, 63`，固定盒 `100,100` 渲染成 `228,163`）。shadcn 的 `PopoverContent` 默认 portal 到 body（`ui/popover.tsx:20-40`），偏移 / 裁剪 / 滚动锁定都要手测。社区口径（[Popover in Dialog](https://www.jacobchak.com/articles/radix-popover-dialog-scroll-issues)）：dialog 内的 popover 优先 portal 到 **dialog content 元素**，其次 body；Radix 在 2026 年中重做过 dismissable-layer（#3585 / #3612 已关，#1159 滚动问题仍开）。若出现"点开就被 focus scope 抢回"或滚动锁死，第一手段是给 `PopoverContent` 透传 `container`。
5. **Emoji 数据的体积与来源。** 数据是大头：`@emoji-mart/data` 的 `all.json` 约 **423 KB**，而 emoji-mart 本体 min+gzip 约 **28 KB**；`frimousse` 是**运行时拉取**数据再本地缓存（基于 Emojibase）。本地优先的应用必须问：离线 / 内网时这个面板还开不开？**待验证**：frimousse 的数据源能否自托管。
6. **上传失败与本地预览的时序。** `useFileUpload` 先插入 `{status:"uploading", progress:0}` 再上传（`upload.ts:325-382`），成功才拿到 `url`。必须**先拿到 URL 再写节点**；不要拿 `URL.createObjectURL` 的预览去写库——`blob:` 刷新即失效（`revokeIfObjectUrl` 也只处理 blob，`upload.ts:125-131`）。即时预览的 blob URL 只放在组件 state 里。
7. **`cover.kind === "node"` 会成环。** A 的封面取自 B、B 取自 A 时会无限递归。解析必须带访问集或**深度上限 1**（§6.2）。
8. **`--primary` 不能表示"有图标 / 有封面"。** 约定：`--primary` 只用于**用户已激活的状态**；tab 选中态照 dataview 的做法——recessed track 里抬起的那一个，不着色。
9. **`UploadMenu` 是手搓浮层，别抄。** 它自己 `createPortal` + 透明遮罩 + 绝对定位（`upload-menu.tsx:227-272`），不是 Radix。新选择器按仓库约定用 shadcn `Popover` / `Command` / `DropdownMenu`。

---

## 1. 目标与使用场景

| 目标         | 场景                                                                                     | 提案截图                                                                          |
| ------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **节点图标** | 编辑器头部点图标 → 弹层里选 Emoji / Lucide 图标 / 上传图片 / 贴 URL，可配色、可移除        | [../proposal/assets/2026-10-06-14-17-59.png](../proposal/assets/2026-10-06-14-17-59.png)：`Emojis / Library / Upload` + 右上 `Remove` + "Click to filter…" + 分类网格 + 底部分类条 |
| **节点封面** | 头部点封面 → 上传 / 从节点选 / URL / 移除；封面的**呈现**沿用既有封面位（preview-block、卡片） | [../proposal/assets/2026-10-06-14-18-59.png](../proposal/assets/2026-10-06-14-18-59.png)：`Upload / Library / Gallery / Unsplash` + 落地区 "Choose Image or Drag it here" + "Or add via URL" |

成功标准（可验收）：

1. 任何节点类型都能在 2 次点击内设置 / 清除图标；图标在 preview-block 头部与触发按钮上立刻可见。
2. 设置封面后，同一节点在 dataview 卡片（网格 / 瀑布流 / 看板）上的封面**立刻**换成新封面，且失败加载回落为字母占位而不是破图。
3. 弹层里连续快速切换选项（点 A 再点 B）不产生两条并发写，也不出现"选了又变回去"。
4. 全程键盘可达（打开 → 搜索 → 方向键选 → Enter 确认 → Esc 关闭且焦点回到触发按钮）；离线（无外网）时 Emoji 与图标 tab 仍可用（P0 的零依赖方案即为此）。

---

## 2. 结构与形态

```text
                ┌─ IconSelectorPopover ──────────────────┐
 [icon] 触发按钮 │ [Emoji] [图标] [上传]        [移除]    │ ← MediaPopoverShell:
      │          ├────────────────────────────────────────┤   头部 tab 行 + 右侧动词
      └─────────▶│ 🔍 Click to filter…                    │ ← MediaSearchInput(Command)
                 ├────────────────────────────────────────┤
                 │  😀 😃 😄 😁 …     8 列网格            │ ← MediaGrid(roving tabindex)
                 │  …                                     │   或 MediaDropPane / MediaUrlRow
                 ├────────────────────────────────────────┤
                 │  😀 🐻 🍔 ⚽ 🚗 💡 🎵 🚩 🔀            │ ← 分类条（CommandGroup 的滚动锚）
                 └────────────────────────────────────────┘
```

CoverSelectorPopover 同骨架，tab 换成 [上传] [从节点选] [URL]：上传 tab 是落地区 (MediaDropPane → `<FileDropZone variant="cover" />`)，下半部分是 "Or add via URL"(MediaUrlRow)。

```text
packages/ui/src/components/node-media/
├── icon-selector-popover.tsx / cover-selector-popover.tsx   # 两个弹层（各自实现 tab 与提交）
├── node-icon-view.tsx      # <NodeIconView /> 唯一的图标渲染器（emoji / Lucide / img / 类型图标回落）
├── node-type-icons.ts      # NODE_TYPE_ICONS（今天在 preview-header 与 node-preview-cover 各存一份）
├── emoji-set.ts            # 精选 Emoji 集（P0 零依赖方案；分类 + 名称 + 关键词）
└── media/                  # media-popover-shell（Popover+tab 行+动词，唯一浮层外壳）/
                            #   media-search-input（InputGroup+Command）/ media-grid（roving tabindex）/
                            #   media-drop-pane（包 FileDropZone，回传 url）/ media-url-row（Enter/blur 提交）
```

三条边界（写进 JSDoc，与 graph 包的契约风格一致）：

1. **受控**：`value` / `onChange`，组件不读 store、不读路由；`nodeId` 只作为上传与"从节点选"的上下文透传。
2. **不自己写库**：弹层只产出新的 `NodeIcon` / `NodeCover`，`NodeService.upsert` 由宿主（头部按钮的宿主组件）调用。唯一的例外是上传：`FileDropZone` 今天自己写库（`:215`/`:313`/`:326`），P0 保留该行为并把它归入 variant（§6.1）。
3. **不做业务判断**：`disabledReason` 由宿主给出（例如 collection 投影里节点不可写），组件只在给出时渲染禁用态与原因 tooltip。

形态常量：图标弹层 `w-[320px]`（网格 8 列 × 36px + 间隙）、体高上限 `min(384px, 52vh)`；封面弹层 `w-[420px]`，落地区 16:9、体高上限 `min(360px, 52vh)`。两者都用 `side="bottom"` `align="start"`，与触发按钮左对齐。

---

## 3. 技术选型

### 3.1 Emoji 面板

| 方案                                   | 体积 / 来源                                                                                          | 代价                                                                 | 结论 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---- |
| **零依赖（精选集 + 直接粘贴）**        | 自写 `emoji-set.ts`，8 类 × ~40 = ~320 个，纯静态字符串 + 关键词，量级 10–20 KB                       | 长尾 Emoji 靠系统输入法 / 直接粘贴到 URL 框（`kind:"emoji"` 存字符本身） | **P0 采用** |
| `frimousse`（Liveblocks）              | 组件本体轻量、无依赖、可 tree-shake、已虚拟化；**数据运行时拉取并缓存**（Emojibase）；React 18/19 | 运行时网络依赖（离线 / 内网待验证）；样式要自己写                     | P1 候选（懒加载 chunk） |
| `emoji-mart` + `@emoji-mart/data`      | 本体 min+gzip ~28 KB，但数据 `all.json` ~423 KB                                                      | 体积大、自带样式体系要压平                                            | 排除 |

理由与仓库既有倾向一致：gallery 视图当时**零新依赖**（AGENTS：「the gallery added no dependency at all」）。P0 用精选集把交互、键盘、搜索做对；P1 若要完整面板，把 `frimousse` 放进 `React.lazy` 的 chunk，别进首屏。

### 3.2 图标（Library）tab

| 方案                                                     | 事实（本机实测）                                                                                                                   | 结论 |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---- |
| **精选集 + 静态 import**                                 | ~150 个常用 Lucide 图形，一个 `Record<string, LucideIcon>`，`Command` 过滤名称与关键词                                              | **P0 采用** |
| `lucide-react/dynamic` 的 `DynamicIcon` + 全量名字清单    | 已装 `lucide-react@0.577.0`：`dist/esm/icons` 有 **1951** 个图标模块（该目录 3902 个文件 = 1951 个 `.js` + 1951 个 `.js.map`）；`dynamicIconImports` 默认导出是 `名前 kebab → () => import(...)` 的对象，`Object.keys()` 即**可枚举的名字清单**；官方 caveat：**构建时导入全部图标**、每个图标一个独立模块 → 网络请求多、加载闪烁 | P1 可选（"全部图标"开关，仅在此 tab 内动态加载） |
| `lucide-static` 的 `tags.json` / `icon-nodes.json`       | 给的是名字 / 节点数据，仍需自己渲染                                                                                                | 只在 P1 需要更细的搜索关键词时借用 |

持久化的是**名字**（`kind:"icon"` 的 `value`），不是组件——这样与 `NodeSemantic.icon` 同约定、可跨版本、可被 graph 侧将来复用。

### 3.3 裁剪与浮层组合

- P2 用 `react-easy-crop`（npm 现为 6.0.2，拖拽 / 缩放 / 旋转 / 触摸 / 键盘，输出裁剪参数）。P0/P1 不引入：比例由**消费方**裁剪（卡片侧 `clampCardCoverAspect`，`card-cover.tsx:37-50`；preview 侧 `object-cover`），先不做"裁剪即写库"。
- shadcn 官方的 [Combobox](https://ui.shadcn.com/docs/components/base/combobox) 就是 `Popover` + `Command`，本仓两者都在（`ui/popover.tsx`、`ui/command.tsx`），dataview 也有同样组合的先例（`shared/field-picker.tsx`、`option-picker.tsx`、`date-picker.tsx`）。选择器沿用：**外壳 `Popover`、搜索与列表 `Command`、动词 `Button`（`variant="ghost" size="sm"`）**，不手搓浮层（§0.3-9）。
- 图库 / Unsplash tab **不做**：提案的封面弹层画了 `Gallery` 与 `Unsplash`，两者都需要外部服务与合作方——Unsplash API 的 demo 模式 50 请求/小时、生产额度需申请审批（[Unsplash 文档](https://unsplash.com/documentation)）。本设计明确排除（§10），tab 位不放。

---

## 4. 组件契约

值类型（`NodeIcon` / `NodeCover`）见 §0.2-3，落 `packages/interfaces/src/models/node/base.ts`：

```ts
export interface NodeBase {
  // …既有字段…
  /** 展示图标；缺省回落到节点类型图标（NodePreviewCover / PreviewHeader 的既有行为）。 */
  icon?: NodeIcon;
  /** 展示封面；缺省回落到按节点类型推导的封面。 */
  cover?: NodeCover;
}
```

```tsx
// packages/ui/src/components/node-media/node-icon-view.tsx
export interface NodeIconViewProps {
  icon?: NodeIcon;            // 节点的 icon；缺省时用 fallback（通常是类型图标）
  fallback?: React.ReactNode;
  className?: string;         // 决定尺寸与圆角（36px 触发按钮 / 20px 头部 / 卡片角标）
}
/** 唯一的图标渲染器：emoji 当文本画，icon 查名字表，image 过 resolveFileUrl。 */
export function NodeIconView(props: NodeIconViewProps): React.ReactNode;
// packages/ui/src/components/node-media/icon-selector-popover.tsx
export interface IconSelectorPopoverProps {
  nodeId: string;
  value?: NodeIcon;                              // 受控；undefined = 未设置
  onChange: (next: NodeIcon | undefined) => void; // 离散选择立即触发；URL 输入 Enter/blur 触发
  onRemove?: () => void;                         // 有值时显示「移除」
  disabledReason?: string;                       // 给出即禁用 + tooltip + aria-disabled
  accept?: string;                               // 上传 accept，默认 "image/*"
  children?: React.ReactNode;                    // 触发器；不传则渲染默认 36×36 按钮
  className?: string;
}
// packages/ui/src/components/node-media/cover-selector-popover.tsx
export interface CoverSelectorPopoverProps {
  nodeId: string;
  value?: NodeCover;
  onChange: (next: NodeCover | undefined) => void;
  onRemove?: () => void;
  disabledReason?: string;
  /** 「从节点选」的数据源，由宿主注入（同 dataview 的 resolveNode 约定：渲染器需要节点就向宿主索取）。 */
  listNodes?: (query: string) => NodeData[] | Promise<NodeData[]>;
  label?: string;                                // 触发按钮文案，默认「添加封面」/「更换封面」
  children?: React.ReactNode;
  className?: string;
}
```

宿主侧（P0 只落一处）：`editor-header/node-icon-button.tsx` 读 `useDataStore` 的节点、写 `NodeService.upsert(nodeId, { icon })`，把 `<IconSelectorPopover value={node.icon} onChange={…} />` 放在 `EditorHeader` 的中间组（`editor-header.tsx:42-44`，NodeTitle 左侧）。

---

## 5. icon-selector 详设

| 项           | 设计                                                                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **tabs**     | `Emoji` / `图标` / `上传`，外加右侧 `移除`（提案截图同此）。URL 不单列 tab，放在 `上传` tab 的下半部分（`Or add via URL`），与封面弹层同形——一个 tab 一个"来源"心智，避免第四个空 tab |
| **搜索**     | `Command` 的 `shouldFilter` 默认过滤，输入框即 `Click to filter…`。Emoji 项文本 = 名称 + 关键词；图标项文本 = 名字 + 语义关键词。切换 tab 保留查询串（`key` 不重置 Command） |
| **最近使用** | 本地 `localStorage`（`dbrain:icon-recent`，上限 24，去重按 `kind:value`）。**只在 effect 里读**（渲染期不碰 `window`，避免水合不一致）；空时该分组不渲染。P2 |
| **颜色 / 底色** | 8 色板 + "无"（`color?: string`）。色板取 `shared/field-meta.tsx` 的既有调色板以保持一致。色块是 24×24 的按钮，选中的那个用 `--primary` 描边（**用户已激活状态**，符合约定） |
| **清除**     | 右侧 `移除`（`variant="ghost" size="sm"`，`aria-label="移除图标"`）。`value` 为空时禁用而不是隐藏（右锚定组里出现/消失会推动左侧控件） |
| **尺寸 / 命中区** | 触发按钮 36×36（编辑器头部 `size-9`，与 PinButton 一排）；网格单元 36×36、间隙 4px；`(pointer: coarse)` 下单元提到 44×44 |
| **禁用**     | `disabledReason` 给出时：触发按钮 `aria-disabled` + `title`，点击不打开；`disabled:opacity-50`                                                                          |

键盘可达性（网格是**单一 tab stop** 的 roving tabindex，不产生 300 个 tab 位）：

| 输入                      | 行为                                                                           |
| ------------------------- | ------------------------------------------------------------------------------ |
| `Enter` / `Space`         | 触发按钮打开弹层（焦点进搜索框）                                                |
| 输入                      | 过滤当前 tab                                                                    |
| `↑` `↓`                   | 在当前 tab 的项间移动（`Command` 原生，`aria-activedescendant`）                |
| `↑↓←→`（网格有焦点时）    | roving tabindex 在网格里移动（`Home`/`End` 到行首 / 行尾）                       |
| `Enter`                   | 选中焦点项（emoji / 图标立即 `onChange`；上传打开文件选择器）                    |
| `Tab` / `Esc`             | `Tab`：搜索框 → 网格 → 分类条 → `移除` → 关闭（**归还浏览器的焦点遍历**）；`Esc`：关弹层并把焦点还给触发按钮（Radix 默认），不冒泡到外层 Dialog |
| `⌘/Ctrl+V`（URL 输入聚焦） | 直接粘贴 URL 或 emoji 字符；粘贴 emoji 时识别为 `kind:"emoji"`（P1 可选）        |

图标回落链（`NodeIconView`）：`icon` → `icon.kind === "image"` 用 `<img src={resolveFileUrl(value)}>`（加载失败回落类型图标）→ `kind:"emoji"` 直接画字符 → `kind:"icon"` 查名字表（查不到回落类型图标，**不抛错**，因为名字可能来自更新的 lucide 版本或手改的库）→ 类型图标。

---

## 6. cover-selector 详设

### 6.1 上传

- 复用 `FileDropZone`：**给 `Variant` 联合加两个成员**（今天 `Variant = UploadVariant | "webpage-source"`，`file-drop-zone.tsx:27-33`）——`"icon"` 与 `"cover"`，在 `VARIANT_CONFIG`（`:53-79`）各给一行（icon → `SmileIcon` + `min-h-[100px]`，cover → `ImagePlus` + `min-h-[160px]`），并在 `buildNodeUpdates`（`:165-186`）各加一个分支：`cover → { cover: { kind:"image", url } }`、`icon → { icon: { kind:"image", value: url } }`。
- **这是"复用 file-upload-zone"提案的真正落地方式，也是唯一安全的方式。** 直接拿现成的 `variant="image"` 当封面会把封面写进 `content.url`（image 分支写 `content` + `width/height`，`:171-178`）——即**把节点内容换成封面图**，属于数据损坏。要么扩展 variant（推荐），要么给 `FileDropZone` 加一个"只上传不落库"的开关；不要照抄调用点。
- `maxSize` 沿用 `100MB`（`:288`）；P1 收到 `10MB`。接受 `image/*`。
- 上传失败：`onUploadError` 冒泡到弹层内的错误条（`upload-menu.tsx:313-320` 是同类视觉参照），**不写库、不清空已有封面**。

### 6.2 从节点选

- 列表项**直接渲染 `<NodePreviewCover node={n} />`**：这就是"复用 `NodePreviewCover` 的解析规则"的字面做法——image 的图、pdf / video 的封面、website 的 favicon、文本节点的摘要都会自动成为可选封面。
- 选中即 `onChange({ kind: "node", nodeId })`，**不复制 URL**：目标节点内容变了，封面跟着变。
- 搜索走 `listNodes(query)`（宿主注入，沿用 dataview「渲染器不读 store」的边界）；首屏给最近编辑 / 打开的若干节点（宿主决定），空态「没有可选节点」。
- 消费侧：`CardCoverBox` 已有 `{kind:"node"}` 分支（`card-cover.tsx:142-144`）；`NodePreviewCover` 需新增**可选** `resolveNode` prop 来解析**节点自身封面**里的 `{kind:"node"}`，并带环保护（§0.3-7）。它保持"叶子"地位：**只多一个 prop，不 import store**（`:13` 的自我约束继续成立）；`preview-block` 侧由宿主传 `(id) => useDataStore.getState().nodes.get(id)`。

### 6.3 URL

- `Or add via URL` 受控输入行 + `Enter` / blur 提交；`resolveFileUrl` 让相对路径与绝对 URL 都能用；提交前做轻量校验（非空、无空白字符），P1 再加 `<img>` 预加载校验（失败就报错不写库）。
- **不下载到 PocketBase**：与 `UploadMenu` 的"URL 先 fetch 再当文件上传"（`upload-menu.tsx:164-209`）不同，封面允许外链；代价是离线不可见（与 `website` 的 favicon 同待遇），不做额外提示。

### 6.4 移除

`onChange(undefined)`；`value` 为空时按钮禁用。移除**只清顶层 `cover`**，不碰 `content.coverUrl`——pdf / video 因此**回落到机器产出的封面**，这是期望行为（回落链见 §0.2-1）。

### 6.5 比例与裁剪

- P0/P1 **不做裁剪**。呈现侧：卡片按 `clampCardCoverAspect`（4/5…16/9，`card-cover.tsx:37-50`）+ `object-cover`；瀑布流按自然比例 + clamp；preview / 弹层预览按 16:9 盒。
- P2 引入 `react-easy-crop`：裁剪结果**另存为新文件**再写 `cover`（不覆盖原文件，避免动到 image 节点 `content.url` 指向的同一 blob）。

### 6.6 无封面时的空态（沿用既有规则，不新造）

| 位置                             | 规则                                                                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 卡片（看板 / 网格 / 列表）       | `cover === undefined` → **整个封面区不渲染**（`cardCoverEnabled` 规则）；`cover === null`（配了源但解析不出）→ 保留封面盒 + 字母占位（`card-cover.tsx:74-96`）；网格无封面时**缩行** |
| 卡片：url 来源加载失败           | 落到字母占位 + `ImageOff` 角标（`card-cover.tsx:89-93`），**不留破图**                                                                               |
| preview-block / `NodePreviewCover` | 无封面 → 文本节点出摘要，其余出类型图标（`node-preview-cover.tsx:126-162`）                                                                          |
| 封面弹层内                       | 「从节点选」列表为空时给一句「没有可选节点」；其余 tab 本身就是空输入态，不加说明文字（dataview 的"面板不放解释性散文"惯例）                          |

---

## 7. 数据流与写回

```text
手势                     组件状态                   写库                                    库
──────────────────────────────────────────────────────────────────────────────────────────
点 emoji / 图标 / 色板   局部（无草稿）        ──▶ upsert(id,{icon})                ──▶ nodes.icon(json)
上传（FileDropZone）     uploading 条目 → url  ──▶ uploadFile 拿到 url 后 upsert(id,{cover})
URL 输入                 受控 useState（逐键）  ──▶ Enter/blur 才 upsert(id,{cover})
从节点选 / 移除          局部                  ──▶ upsert(id,{cover:{node,…}}) / {cover:undefined}
```

| 动作           | 草稿？           | 写什么                                              | 何时写                                    |
| -------------- | ---------------- | --------------------------------------------------- | ----------------------------------------- |
| 选 Emoji / 图标 | 否               | `{ icon: { kind, value } }`                          | 点选当下（离散选择，与 Pin 同类）         |
| 改底色          | 否               | `{ icon: { ...当前 icon, color } }`                  | 点选当下；必须基于**当前** `icon`（活值） |
| 上传            | 上传进度由 `useFileUpload` 管 | `{ cover: { kind:"image", url } }` / `{ icon: {...} }` | 上传**成功拿到 url 之后**                 |
| URL             | 是（`useState`） | 同上                                                | `Enter` / blur，且只提交一次              |
| 从节点选        | 否               | `{ cover: { kind:"node", nodeId } }`                 | 点选当下                                  |
| 移除            | 否               | `{ icon: undefined }` / `{ cover: undefined }`       | 点选当下                                  |

- **乐观更新已经在服务层**：`NodeService.upsert` 先同步写 store 再发 tRPC，失败回滚（`node.service.ts:52-63`）。选择器不需要自己维护乐观状态，但**要接受回滚**（值会闪回旧值，这是既有行为）。
- **不需要 `debounce`**：顶层字段一次一写，没有逐键路径（URL 框将来做"边输边预览"也不写库）。**串行化**：一次手势只发一次 `upsert`，不做合流（没有 content 那种一帧多 patch 的场景）；若 P2 加了色板拖拽（连续改色），按两个宿主的做法加微任务合流（`database-node-content.tsx:46-56`）。
- **不变式**：任何一次提交都用 `useDataStore.getState().nodes.get(nodeId)` 的**活值**作为基底，尤其是「改底色」与「换图但保留底色」这两类部分更新。

---

## 8. 复用与重构清单

| 文件                                                                          | 动作                                                                                                                                                     | 阶段 |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `packages/interfaces/src/models/node/base.ts`                                  | `+ NodeIcon` / `+ NodeCover` / `NodeBase.icon?` / `NodeBase.cover?`                                                                                       | P0   |
| `pb/pb_migrations/<新>.js`（或改 0 号 + 删 `pb/pb_data`）                       | `nodes` 加 `icon`(json) / `cover`(json) 两列，参照 0 号的 `views` 注释体例                                                                                 | P0   |
| `backend/domain/src/models/node/entities.ts`                                   | `NodeBaseProps` + `_icon`/`_cover` + getter + `updateIcon/updateCover`；10 个子类的构造 / `create` / `updateContent` / `cloneWith` 各加两行（**先抽 baseProps getter**） | P0   |
| `backend/infrastructure/src/database/mappers/node.mapper.ts`                   | `BaseNodeRecord` + `baseProps`（`:195-207`）+ `baseRecord`（`:458-472`）；**顺带**把 10 份重复内联的 baseProps 类型抽成一个 `NodeBaseRecordProps`            | P0   |
| `backend/application/src/dto/node-dto.mapper.ts`                               | `base`（`:27-39`）加两个字段（一个 mapper 管读写两侧，别再加第二个）                                                                                       | P0   |
| `backend/adapter-front/src/trpc/router/node.ts`                                | `baseNodeFields`（`:7-17`）、`updateSchema.updates`（`:259-273`）、`update` 的字段搬运（`:289-316`）三处                                                                 | P0   |
| `backend/application/src/commands/node/{command.ts,node-command.service.ts}`    | `UpdateNodeCommand` + `updateNode` 里 `cmd.icon !== undefined → updateIcon(...)`（与 `isPinned` 同形，`:290-292`）；`createNode` 的 10 个分支透传 base 字段 | P0   |
| `packages/ui/src/components/dialog/editor/content/file-drop-zone.tsx`          | `Variant` + `"icon" \| "cover"`；`VARIANT_CONFIG`（`:53-79`）与 `buildNodeUpdates`（`:165-186`）各加分支                                                   | P0   |
| `packages/ui/src/components/node-media/**`                                     | 新增（§2 目录）                                                                                                                                           | P0/P1 |
| `packages/ui/src/components/preview-block/node-preview-cover.tsx`              | 读 `node.cover`（含可选 `resolveNode` + 环保护）；`NODE_TYPE_ICONS` 迁到 `node-media/node-type-icons.ts` 并从两处 import                                  | P0   |
| `packages/ui/src/components/preview-block/preview-header.tsx`                  | 删掉本地 `nodeTypeIcons`（`:18-29`），改用 `<NodeIconView fallback={类型图标}/>`                                                                          | P0   |
| `packages/ui/src/components/header/editor-header/`                             | 中间组（`:42-44`）加 `<NodeIconButton />`（NodeTitle 左侧）；右侧组（`:47-`）加 `<NodeCoverButton />`                                                      | P0/P1 |
| `packages/ui/src/components/dialog/semantic-dialog.tsx`                        | 图标输入框（`:201-205`）换成 `<IconSelectorPopover>` 的"仅图标 tab"形态；让语义图标**终于被渲染**（走 `NodeIconView`，`value = {kind:"icon", value: name}`） | P2   |
| `packages/ui/src/components/ui/popover.tsx`                                    | 若 §0.3-4 需要：给 `PopoverContent` 透传 `container`（Radix 原生支持）                                                                                     | P1   |
| **不改**：`dataview/src/shared/{card-cover,card-ops}`（封面来源即 `NodePreviewCover`）、`graph/src/force/**`（§0.2-1）、`menu/upload-menu.tsx`（不抄；P2 可选换成 Radix `DropdownMenu`） | 保持原样                              | —    |

---

## 9. 路线图

| 阶段   | 交付                                                                                                                                                                       | 验收                                                                                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **P0** | 字段全链路（迁移 → domain → mapper → DTO → tRPC → interfaces）+ `NodeIconView` + `IconSelectorPopover`（Emoji 精选集 / 图标精选集 / 上传 / URL / 底色 / 移除）+ 编辑器头部按钮 + `NodePreviewCover` 与 `PreviewHeader` 读 `icon` | `typecheck` / `lint` 干净；设图标后 preview-block 头部立刻变；`upsert` 只写顶层字段（抓包确认 content 未被替换）；手测清单 1–6 |
| **P1** | `CoverSelectorPopover`（上传 / 从节点选 / URL / 移除）+ 编辑器头部封面按钮 + `NodePreviewCover` 读 `cover`（含 `resolveNode` 与环保护）+ `popover` 的 `container` 透传按需 | 卡片 / 瀑布流 / preview 三处封面同时生效、失败回落字母占位；手测清单 7–11                          |
| **P2** | `react-easy-crop` 裁剪、最近使用、Emoji 全量面板（`frimousse` 懒加载）、语义弹窗接入图标选择器                                                                            | 裁剪结果另存新文件且不改原 blob；离线时 P0 的 tab 不受影响                                            |

依赖顺序上，**P0 的字段全链路必须先合并**（它对后端是破坏性最小的加法，但跨 5 个包），再动 UI；否则 UI 只能对着假类型开发。

---

## 10. 边界与取舍

**不做**（本设计明确排除）：

1. **Gallery / Unsplash 等在线图库**：需外部 key、配额与生产审批（§3.3）。
2. **AI 生成图标 / 封面**。
3. **把图标画进 graph 画布**（P0）：pixi worker 里光栅化 emoji / 图片是另一件工程（§0.2-1）。
4. **节点内容里的封面 banner**（P1）：所有封面呈现都走**既有封面位**（卡片 / preview）。理由：做 banner 要在 10 个 node content 里各排一个 16:9 盒子，且与它们现有的落地区 / iframe / 编辑器抢版面；而"封面"在卡片上才是它真正被消费的地方。
5. **裁剪**：P2（§6.5）。P1 的比例由消费方裁剪。**同一节点多图标 / 封面画廊**也不做：一个字段一个值。
6. **封面下载到本地**：外链封面允许离线不可见（§6.3）。

**已知取舍**：

- 字段放顶层换来"一次写一个键、不碰 content"，代价是后端 5 个包都要动（§0.2-1，§8）；这笔账在 P0 一次性付清。
- P0 的 Emoji / 图标是**精选集**而不是全集：少部分长尾要用户粘贴或等 P1。换来零依赖、零网络、零闪烁。
- 封面在编辑器里**看不到**（只在卡片 / preview 呈现），改完在本页没有反馈——这是"不做 banner"的直接代价。缓解：弹层里给一个 16:9 的**预览盒**显示当前 / 待选封面（截图里落地区占那么大一块即是此用途）。
- 移除封面后，pdf / video 会回落到机器产出的 `content.coverUrl`（看起来像"没移除干净"）——这是有意的回落链，文案上不承诺"清空"。

---

## 11. 验证方法

项目**没有测试基础设施**（无 vitest/jest），验证 = 类型 + lint + 浏览器手测。

```bash
pnpm --filter=@workspace/{ui,interfaces,dataview} typecheck
for d in domain infrastructure application adapter-front; do (cd backend/$d && pnpm typecheck); done
pnpm --filter=web dev            # http://localhost:3000
```

手测清单（P0 起逐阶段累加）：

1. **字段落地**：改 0 号脚本 + 删 `pb/pb_data` 重建（或跑新迁移）后，新建节点并设图标，重载页面图标仍在；直接查 `nodes` 表能看到 `icon` 列。
2. **不碰 content**：设图标前后各抓一次 tRPC `node.update` 的 payload——`updates` 里**只有 `icon`**，没有 `content`。
3. **回落链**：清掉图标后，preview-block 头部回到类型图标；图标弹层里选一个不存在的图标名（手改库）不报错、回落类型图标。
4. **四种来源**：Emoji、图标、上传（选一张图）、URL 各设一次，都能立刻显示；URL 框在输入过程中**不发**任何请求（Network 面板确认），只 Enter 后发一次。
5. **键盘**：`Enter` 打开 → 输入过滤 → `↓` 选 → `Enter` 确认 → 弹层关闭且焦点回触发按钮；`Esc` 同样归还焦点；`Tab` 在搜索框 / 网格 / 移除之间正常遍历，不被 dialog 抢走。
6. **dialog 里的坐标**：窗口模式（`mainViewType === "graph"`，编辑器是居中 Dialog）与全屏模式（`"editor"`）各开一次弹层，检查偏移、裁剪、外部点击关闭、页面滚动锁定是否正常。
7. **封面三处一致**（P1）：给一个 collection 节点设封面后，看板 / 网格 / 列表卡片与 preview 一起变；给一个 database 节点的记录配封面字段后再设节点封面，确认优先级——**本条要作为验收点定死**：建议记录字段优先，节点封面是"记录没有封面时"的兜底。
8. **坏 URL 与环**：贴一个 404 图片地址，卡片出现字母占位 + `ImageOff` 角标、不留破图，且数据仍保存该 URL；A 的封面选 B、B 选 A 时不卡死（深度上限生效）。
9. **连点**：弹层里快速点 A → B → C，最终值为 C，且只有最后一次写成功（Network 面板 + store 值一致）。
10. **回归面**：image 节点上传落地（`variant="image"`）行为不变——尤其**新 variant 没有污染 image 分支**（content 仍写 `url` + `width/height`）；dataview 卡片既有封面规则（url 单元格 / relation / 字母占位）不变。

---

## 12. 文件与依赖清单

**新增**

| 路径                                                                     | 说明                                        |
| ------------------------------------------------------------------------ | ------------------------------------------- |
| `packages/ui/src/components/node-media/{icon,cover}-selector-popover.tsx` | 两个弹层                                     |
| `packages/ui/src/components/node-media/{node-icon-view.tsx,node-type-icons.ts,emoji-set.ts}` | 图标渲染器 / 类型图标表（合并两处重复定义）/ 精选 Emoji 集 |
| `packages/ui/src/components/node-media/media/*`                           | 骨架与原子件（§2 目录）                      |
| `packages/ui/src/components/header/editor-header/node-{icon,cover}-button.tsx` | 头部按钮（读 store + 写 `NodeService`）      |
| `pb/pb_migrations/<新>.js`（可选）                                        | `nodes.icon` / `nodes.cover` 两列            |

**修改**（P0 除 `popover.tsx` / `semantic-dialog.tsx` 外全部落地）

| 路径                                                                  | 改动                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------- |
| `packages/interfaces/src/models/node/base.ts`                         | `+ NodeIcon` / `+ NodeCover` / `NodeBase.{icon,cover}`   |
| `pb/pb_migrations/1700000000_initial_schema.js`                       | 或改 0 号（需删 `pb_data`）：`+ icon` / `+ cover`        |
| `backend/{domain/src/models/node/entities.ts,infrastructure/.../node.mapper.ts}` | base 字段 + 10 子类四处（先抽 baseProps getter）+ 读写两侧 mapper（抽 `NodeBaseRecordProps`） |
| `backend/{application/.../{dto/node-dto.mapper.ts,commands/node/*},adapter-front/.../router/node.ts}` | DTO base 加两字段、command 与 `updateNode`/`createNode` 透传、router 三处白名单 |
| `packages/ui/.../{editor/content/file-drop-zone.tsx,preview-block/{node-preview-cover,preview-header}.tsx}` | `+ variant "icon" \| "cover"`；读 `cover`/`icon`、加 `resolveNode`、类型图标表改 import |
| `packages/ui/.../editor-header/editor-header.tsx`                     | 左右两组各加一个按钮                                     |
| `packages/ui/src/components/ui/popover.tsx`                           | P1 按需：`container` 透传                                |
| `packages/ui/.../dialog/semantic-dialog.tsx`                          | P2：图标输入框换成图标选择器                             |

**依赖**：P0 **+0**；P1 视 Emoji 全集方案决定是否 `+ frimousse`（懒加载）；P2 `+ react-easy-crop`。`lucide-react@^0.577.0` 已在 `packages/ui`，`dynamicIconImports` 与 `lucide-react/dynamic` 都随包提供，不需要新依赖。

---

## 参考

- shadcn/ui · Combobox（`Popover` + `Command` 的官方组合）：<https://ui.shadcn.com/docs/components/base/combobox>
- Radix Primitives · Popover（`container` / portal / 模态语义）：<https://www.radix-ui.com/primitives/docs/components/popover>
- Popover 落在 Dialog 内的裁剪 / 滚动 / 关闭问题与 portal 目标选择：<https://www.jacobchak.com/articles/radix-popover-dialog-scroll-issues>；相关 issue：#1949（<https://github.com/shadcn-ui/ui/issues/1949>）、#1338（<https://github.com/radix-ui/primitives/issues/1338>）
- Frimousse（轻量、无样式、可组合的 React Emoji picker；数据运行时拉取，基于 Emojibase）：<https://github.com/liveblocks/frimousse> ／ <https://frimousse.liveblocks.io/>
- `@emoji-mart/data` 文件体积（`all.json` 约 423 KB）：<https://cdn.jsdelivr.net/npm/@emoji-mart/data@1.2.1/sets/12/>；Emoji Mart 本体体积参考：<https://bestofjs.org/projects/emoji-mart>
- Lucide · Dynamic Icon Component（`DynamicIcon` 及其 caveat：构建期导入全部图标、每图标一个模块、加载闪烁）：<https://lucide.dev/guide/react/advanced/dynamic-icon-component>；取名字清单的建议（`lucide-static` 的 `tags.json` / `icon-nodes.json`）：<https://github.com/lucide-icons/lucide/discussions/1778>
- react-easy-crop（拖拽 / 缩放 / 旋转 / 裁剪输出）：<https://github.com/ValentinH/react-easy-crop>
- Unsplash API 配额（demo 50 请求/小时，生产需审批）：<https://unsplash.com/documentation>

**待验证**

- `frimousse` 的 Emoji 数据源能否自托管 / 指向内网（离线可用性）。
- 前端写回被 "autocancelled" 的确切触发点（见 §0.3-3）。
- `radix-ui@^1.4.3` 里 dismissable-layer 的重做是否已含 #3585 / #3612 的修复（本文按"未修复"的保守做法给出 `container` 方案）。
