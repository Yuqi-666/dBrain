# node-content 组件与数据模型改造设计文档

> 状态：**待实现**（提案见 [../proposal/node-content-refine.md](../proposal/node-content-refine.md)）
> 范围：`packages/ui/src/components/dialog/editor/content/`（10 个 node-content 组件 + 路由 + 上传区 + 空状态）。本次改造覆盖提案点名的六种类型：**text**（单 block 富文本）、**image**（批注层）、**audio**（自定义组件 + 时间戳笔记）、**video**（同上）、**pdf**（批注层）、**rich-text**（cover / icon / title / summary / semantic pill 头部 + 正文）。`webpage` / `website` / `collection` / `database` 四类**不动**，只在共享改动（写者工具、类型形状）里被动跟随。
> 数据面：**新增 4 个 `nodes` JSON 列**（`annotations` / `timestampNotes` / `icon` / `cover`）+ **若干新迁移文件**；其中 `annotations` 与 `icon` / `cover` 的归属分别是 [./annotation.md](./annotation.md) 与 [./selectors.md](./selectors.md)，**本文只对 `timestampNotes` 的全链路负责**（§4.1）。`text` 与 `rich-text` 共用一个文档形状；本文不新增运行时依赖（PDF 渲染复用仓库已有的 `pdfjs-dist`，见 §4.4）。
> 相关文档：[../proposal/node-content-refine.md](../proposal/node-content-refine.md)、[../proposal/cover-selector.md](../proposal/cover-selector.md) 与 [../proposal/icon-selector.md](../proposal/icon-selector.md)（两者的设计文档合并为 [./selectors.md](./selectors.md)，由他人编写）、[../proposal/annotation.md](../proposal/annotation.md)（其设计文档为 [./annotation.md](./annotation.md)，由他人编写）、[../dataview/README.md](../dataview/README.md) §5.2（「渲染器不写、向宿主索取」与 `views` 列全链路先例）、[../dynamic-island/README.md](../dynamic-island/README.md)（本文体例样板）、根 `AGENTS.md`

---

## 0. 实现现状与关键决策

### 0.1 今天的代码是什么样

`node-content-editor.tsx` 是一个纯 `switch` 路由（`node-content-editor.tsx:29-62`），把 `node.nodeType` 映射到 10 个组件之一；它被 `NodeEditor` 的 `NodeEditorContent` 唯一挂载（`node-editor.tsx:6`、`:106`），而 `NodeEditor` 本身由 `apps/web/app/(main)/graph/page.tsx:74` 与 `:78` 分别在有窗口/全屏两种模式下渲染。宿主形态与尺寸是硬事实：

- 窗口模式：Radix Dialog，`sm:max-w-[80%] w-[1200px] h-[80vh] flex flex-col p-2 pt-0`（`node-editor.tsx:44-66`，尺寸在 `:55`）。
- 全屏模式：`absolute inset-0 z-50 bg-background flex flex-col`（`node-editor.tsx:69-78`）。
- 内容盒：`flex-1 overflow-y-auto`（`node-editor.tsx:104-107`）——**高度由宿主给定，node-content 只能填满它**。

现状表（文件 → 渲染什么 / 数据从哪来 / 写回走哪条路）：

| 文件                                     | 渲染什么                                                                                     | 数据来源                                                                                          | 写回路径                                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `text-node-content.tsx`                  | 一个 `<Textarea>`（`min-h-[200px] resize-none font-mono text-sm`，`:43`）                     | `node.content.docs`，用 `getValue()` 兼容「字符串」与「取第一个键」（`:20-25`）                    | `NodeService.upsert(currentEditingNodeId, { content: { docs: { content: 值 } } }, { debounce: true })`（`:30-44`） |
| `image-node-content.tsx`                 | 无 `url` 时 `<FileDropZone>`（`:35-44`），否则 `<img>`（`:46-66`）                            | `resolveFileUrl(node.content.url)`（`:16`）                                                        | 上传走 `FileDropZone` → `NodeService.upsert`                                                                     |
| `audio-node-content.tsx`                 | 原生 `<audio controls>`（`:38-49`）；无 `url` 时上传区（`:27-36`）                            | `resolveFileUrl(node.content.url)`                                                                 | 同上                                                                                                             |
| `video-node-content.tsx`                 | `<VideoPlayer>`（HLS 优先，`:84-92`）；不可解码时降级提示（`:56-79`）                          | `content.url` / `content.hlsUrl` / `content.coverUrl`（`:23-27`）                                  | 同上；HLS 打包后整包 content 重写                                                                                |
| `pdf-node-content.tsx`                   | **`<iframe src={url}>`**（`:44-53`）                                                          | `resolveFileUrl(node.content.url)`                                                                 | 上传走 `FileDropZone` → 服务端 `analyzePdf` 回填 `content:{url,coverUrl}`（`file-drop-zone.tsx:197-220`，`:216`） |
| `rich-text-node-content.tsx`             | `<NotionEditor room={node.id}>`（`:18-34`）                                                   | `getInitialContent()` → `editor.commands.setContent(initialContent.docs)`                          | `NotionEditor.onContentChange`（每次 `onUpdate` 的 `getJSON()`）→ `upsert({ content: { referencedNodes, docs } }, { debounce: true })`（`:21-32`） |
| `database-node-content.tsx`              | `<DataViewRoot>` + `<RecordEditor>`（`:249-281`）                                             | `node.content` → `databaseToDataViewSource`（`:63-66`）                                            | 串行化 drain：`liveContent()` + `queueMicrotask` 合并 + `NodeService.upsert`（`:78-117`）                          |
| `collection-node-content.tsx`            | `<DataViewRoot readOnly>` + `<RecordEditor>` + `<CollectionFilterDialog>`（`:193-239`）        | `node` + `nodes`/`nodeSemantics`/`nodeTags`（`:54-61`）                                            | 同一套 `liveContent` + drain（`:91-128`）                                                                        |
| `webpage-node-content.tsx` / `website-node-content.tsx` | 代码编辑器 / 网页信息卡                                                            | `content.code` + `content.language` / `content.url` + `faviconUrl`                                 | `NodeService.upsert`                                                                                             |
| `node-content-editor.tsx`                | 路由；未知类型渲染 `Unsupported node type`（`:51-61`）                                        | `node.nodeType`                                                                                    | —                                                                                                               |
| `file-drop-zone.tsx`                     | 上传区 + 进度 + 上传菜单（4 种变体共享）                                                      | 本地文件 → `uploadFile` / `analyzePdf` / `transcodeVideo`                                          | `buildNodeUpdates`（`:165-190`）与两个异步回填（PDF `:197-220`，视频 `:234-260`）→ `NodeService.upsert`            |
| `empty-hint.tsx`                         | 共享空状态（图标 + 标题 + 说明），当前无消费方                                                | —                                                                                                  | —                                                                                                               |

写回语义（三条决定后面一切）：

1. `NodeService.upsert` 先做**顶层浅合并** `{ ...oldNode, ...updates }`，立刻写 store，再走 tRPC；`debounce: true` 时默认 500ms 合并窗口（`node.service.ts:18-21`、`:45-53`、`:67-88`）。
2. 浅合并意味着**传 `content` 就是整包换掉 `content`**：`packages/store/src/dataStore.ts:376-381` 直接 `set(node.id, node)`。视频回填因此在注释里明确要求「整个 content 一次写完」（`file-drop-zone.tsx:230-232`）。
3. **同一节点的并发 upsert 会互相取消**：PocketBase SDK 以记录 id 作 `requestKey`，第二个请求会 abort 第一个（`database-node-content.tsx:41-55`、`collection-node-content.tsx:78-86` 有完整记录）。`database` / `collection` 的 `liveContent()` + drain 就是为此而生的先例。

### 0.2 五条决策

1. **`text` 保留自己的节点类型，只统一 `docs` 的形状。** 不把 `text` 改成 `rich-text`（那会牵动 `NODE_DATA_TYPES`、`NodeType` 值对象、图菜单、预览分发、`pb` 表结构，收益为零），也**不新增 `TextDoc` 类型**：让 `TextContent.docs` 存放与 `RichTextContent.docs` **同一个 Tiptap JSON 文档形状**（`{ type: "doc", content: [...] }`），差异只由「编辑器允许哪些节点」表达——text 只允许一个 `paragraph` + inline marks，rich-text 允许整个 Notion 扩展集。
   - 收益一：text 的存储形状**变成 rich-text 文档的合法子集**，将来「把名言升级成一篇笔记」不需要任何数据迁移。
   - 收益二：后端全链路**零改动**（见下面第 2 条），`text` 是一次纯前端改造。
2. **`text` 的后端链路今天已经是透传的，不需要动。** 证据链：`TextContent` 只是 `Object.freeze({ ...docs })`、不校验内部形状（`backend/domain/src/models/node/value-objects.ts:148-162`）→ DTO 原样 `content: { docs }`（`backend/application/src/dto/node-dto.mapper.ts:42-47`）→ infra mapper 直接写 `content: node.content.docs` / 读 `new TextContent(record.content || {})`（`backend/infrastructure/src/database/mappers/node.mapper.ts:474-479`、`:247-251`）→ router 只校验 `docs: z.record(z.any())`（`backend/adapter-front/src/trpc/router/node.ts:19-21`）→ `updateNodeContent` 只要求 `content.docs !== undefined`（`backend/application/src/commands/node/node-command.service.ts:344-346`）。**所以 text 的改造止于前端**，加一条读兼容把旧形状升级掉即可（§0.3-2）。
3. **rich-text 的「Yjs 文档」不是一个需要共存的东西——它今天根本不存在。** `CollabProvider` 的 token 是写死的 mock（`packages/editor/lib/tiptap-collab-utils.ts:200-202`），provider 是内存实现（`packages/editor/lib/mock-collab.ts:48-82`），`ydoc` 是每次挂载 `useMemo` 新建的（`packages/editor/contexts/collab-context.tsx:5`、`:41`、`:69-72`），文档内容只从 `getInitialContent()` 灌入、经 `onUpdate` 的 `getJSON()` 写回 `docs`（`packages/editor/components/tiptap-templates/notion-like/notion-like-editor.tsx:222-234`、`:242-243`）。**结论：`RichTextContent.docs` 就是 Tiptap JSON，是唯一真源；所谓「批注/Tiptap 双写冲突」的真实形态是「同一份 `content` 有第二个写者」**，用 §0.2-5 的单写者纪律解决，不需要 CRDT 层的合并。若将来接入真的 Yjs 服务端，`docs` 才需要改成 Yjs update blob 并单独设计（记为未来项，不在本次范围）。
4. **头部字段：`title` / `summary` / `semantic pill` 复用既有基字段；`cover` / `icon` 按 [./selectors.md](./selectors.md) 的决策**存 `NodeBase` 顶层**、各自一列 json，不放 content。** 本文接受该决策（它是本文 §2 的上游），理由是它比「放进 `RichTextContent`」更硬：content 写回**按字段是否出现**分派，缺键就静默不改，而 icon/cover 是通用能力、不该被某一种 content 的写者绑架；且 `coverUrl` 这一列已被 pdf / video 的媒体封面占用（`1700000000_initial_schema.js:142`），base 层需要的是新名字 `cover` 而不是复用 `coverUrl`。
   - `title` → `NodeBase.title`（`packages/interfaces/src/models/node/base.ts:57-69`，`nodes.title` 列）；`summary` → `NodeBase.abstract`（`nodes.abstract` 列，`preview-header.tsx:62-66` 已在这么用）；`semantic pill` → `NodeBase.semanticId`（`semanticId` 列 + `nodeSemantics` map）。**三者今天已存在，零新增。**
   - `cover` / `icon` 的类型与语义以 selectors.md 为真源（`NodeIcon { kind: "emoji" | "icon" | "image"; value; color? }`、`NodeCover { kind: "image"; url } | { kind: "node"; nodeId }`），本文不重定义；落地代价（10 个子类 × 4 处 + 10 份内联 baseProps + DTO base + 前端白名单 + 1 个新迁移列）由其 §0.2-1 与 §8 承接。
   - 对本文的直接后果：**头部不再需要 `patchContent`**——它只写顶层字段（`NodeService.upsert(id, { cover })` / `{ icon }` / `{ title }` / `{ abstract }` / `{ semanticId }`），一次也不碰 content，因此「改头把正文覆盖掉」这一整类风险不存在（§2）。
5. **单写者纪律上提为共享工具。** 每一个会写 `content` 的 node-content 都改用同一套「读 live content → 合并 patch → 串行化 drain」的写者（把 `database-node-content.tsx:78-117` 与 `collection-node-content.tsx:91-128` 的重复实现抽成一个 hook，例如 `useNodeContentWriter(nodeId)`）。**任何 patch 都不允许基于本次 render 的 `node` 快照构造**：rich-text 的 `docs`、image/pdf 的 `annotations`、audio/video 的 `timestampNotes` 都是同一 `content` 的不同半边，这正面复刻 `collection` 的 `filterConfig` / `views` 独立半边规则（`node-command.service.ts:389-401`），而后端今天对 rich-text 还是「两键同时给才写」（`:403-414`，见 §0.3-7）。

### 0.3 必须知道的坑

1. **`docs` 是 Tiptap JSON，不是 Yjs 二进制。** 见 §0.2-3。任何「把 Y.Doc 存进 `docs`」或「为 docs 做 CRDT 合并」的设计都是误判；真正要防的是两个写者互相覆盖。
2. **`text` 今天的写形与读方假设不一致，预览是坏的。** 写入侧是 `{ docs: { content: "字符串" } }`（`text-node-content.tsx:37`），而 `text-preview.tsx:6-20` 与 `node-preview-cover.tsx:48-70` 都假设 `docs.content` 是**数组**（`extractText` 只在 `Array.isArray(node.content)` 时递归，否则返回 `""`）。结果：有正文的 text 节点在悬停预览/封面里渲染成空。统一成 Tiptap doc 会顺手修好它，**同时必须加读兼容**：`normalizeDoc(value)` 把 `{ content: string }` 升级成 `{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] }`，而不是写一次性数据迁移脚本（惰性升级：读到旧形状就在下一次写入时落新形状）。
3. **`NodeService.upsert` 是顶层浅合并，`content` 是整包替换。** 只带 `{ annotations }` 的 patch 会把 `url` 抹掉（`node.service.ts:50`、`dataStore.ts:376-381`）。所有新写者一律走「读 live content → 展开 → 覆盖本半边」。
4. **新增字段必须在 3 个地方点名，漏一个就静默丢数据。** ① tRPC 的 zod schema（`router/node.ts:19-110` 是逐个 content 形状手写的，`z.object` 会剥掉未声明键；`views` 就是靠 `z.custom` 绕开这条，`:79-98`）；② DTO mapper 的 content 字面量（`node-dto.mapper.ts:134-137` 的注释：「anything not named here never reaches the client」）；③ infra mapper 的 record 接口 + `toRecord` 分支。这三处正是 dataview README §5.2 两条陷阱的同一条。
5. **pdf 今天用 `<iframe>`，批注层在它上面是做不出来的。** 同源文档内无法拿到 PDF 的页坐标，也无法在 iframe 内部叠加 DOM（`pdf-node-content.tsx:44-53`）。**结论：换 pdfjs-dist 自绘 canvas**；仓库已经在 `backend/infrastructure` 依赖 `pdfjs-dist ^4.10.38`（该 `package.json:13`，服务端走 `pdfjs-dist/legacy/build/pdf.mjs`，`pdf-document-analyzer.ts:32`、`:46`、`:106`、`:161-167`），客户端要用**浏览器入口 + 独立 worker**，注意版本对齐与打包（§4.4）。
6. **0 号迁移不会重跑，而 `pb/pb_data` 在本仓已存在。** PocketBase 只按文件名去重，改 `1700000000_initial_schema.js` 对已有库无效（该文件 `:170-173` 的注释已把这条写死）。因此 3 个新列**必须新增一个迁移文件**（§4.5）；想在开发机上直接改 0 号脚本，前提是删掉 `pb/pb_data` 重建并接受数据清空。
7. **rich-text 的 content patch 今天是「两键同时给才写」。** `updateNodeContent` 要求 `referencedNodes !== undefined && docs !== undefined`（`node-command.service.ts:403-414`），缺键就**静默不改**。因此正文之外的任何 content 半边（`annotations`、`timestampNotes`，以及将来的字段）都要按 `collection` 的独立半边写法改成各写各的，否则新增字段会「看起来写了、其实没写」。
8. **同一节点的并发 upsert 会互相中止**（PocketBase SDK 自动取消，见 §0.1-3）。多写者（正文编辑器 + 头部 + 批注层）会把这个问题从「偶发」变成「常见」，串行化 drain 从优化变成必需。
9. **双宿主尺寸约束。** node-content 既挂在 `w-[1200px] h-[80vh]` 的 Dialog 里（`node-editor.tsx:55`），也挂在全屏 `absolute inset-0`（`:69-78`）。因此：新组件**不得**使用 `100vh` / 视口单位 / 固定像素高度；高度一律 `h-full min-h-0`（`database-node-content.tsx:233-238` 的写法）。**批注坐标必须相对「内容盒」归一化，不能相对视口**，否则同一个批注在窗口模式与全屏模式下落在不同位置。`RecordEditor` 的「绝对定位覆盖本盒而不是视口」也是同一条约束的先例（`collection-node-content.tsx:187-191`）。
10. **时间基准不是 `currentTime` 浮点秒。** `HTMLMediaElement.currentTime` 是秒的浮点数，精度由实现决定且长播放会漂移，直接落库会得到 `90.00000000000001` 这类不可比较的值。**统一落整数毫秒 `timeMs`**，捕获时 `Math.round(el.currentTime * 1000)`，跳转时 `el.currentTime = timeMs / 1000`，`mm:ss` / `h:mm:ss` 只是展示格式。HLS 的额外风险：播放的是打包后的 playlist，`currentTime` 相对 playlist 时间轴；若打包过程曾裁切时间轴，笔记会整体偏移——当前 ffmpeg 参数是否保持原始时间轴**待验证**（§8 记一条验证项）。
11. **Tailwind `@source` 白名单。** `packages/ui/src` 由 `@source "../**/*.{ts,tsx}"` 覆盖（`packages/ui/src/styles/globals.css:10`），`@workspace/dataview` 单独有一行（`:16`）。**`packages/editor` 不在名单里**——如果把单 block 编辑器的样式类写进 `packages/editor`，这些类不会进样式表（AGENTS.md 已把这条列为项目级约定）。放 `packages/ui` 或补一行 `@source`。

---

## 1. 六种类型的改造详设

### 1.1 text —— 单 block 富文本（禅意）

**目标形态。** 整块内容是一个居中的、字号明显大于正文的富文本块，四周留白，可选引用样式；适用名言、定理、公式。编辑态与展示态是同一个渲染器，只是 `editable` 不同。

**数据结构变化。**

```ts
// packages/interfaces/src/models/node/nodes/single/text.ts
export interface TextContent {
  /** Tiptap JSON：{ type:"doc", content:[{ type:"paragraph", ... }] } —— 与 RichTextContent.docs 同形状 */
  docs: Record<string, any>;
}
```

字段本身**不变**（仍是 `docs: Record<string, any>`），变的是**约定**（一个 `paragraph`，只带 inline marks）。`TiptapDoc` 只作为文档化的形状与运行时归一化目标引入，不改持久化字段的类型——避免 `Record<string, any>` 到结构化接口的赋值在 5 个后端的类型面上产生连锁（**待验证**：若 typecheck 证明可直接标注，P1 再收紧）。

**组件改造。**

- `text-node-content.tsx` 换成「受限 Tiptap 编辑器 + 居中大字号容器」。
- 新增 `packages/editor` 侧的 `single-block-editor.tsx`（Tiptap 属于 `@workspace/editor`；`@workspace/ui` 已经依赖它：`packages/ui/package.json:24`、`packages/ui/tsconfig.json:27-31`）。
- 只读渲染走 Tiptap v3 的 static renderer（`generateHTML` 那一族），避免为一个块挂一个编辑器实例。

**扩展集草案（P1 落码时按 typecheck 与手测收敛）。** Tiptap 的 schema 是严格的：内容不符 schema 会被丢弃，`enableContentCheck` + `contentError` 事件是官方给的观测点（[Schema 文档](https://tiptap.dev/docs/editor/core-concepts/schema)）。因此：

```ts
// 草案：packages/editor/components/tiptap-templates/single-block/single-block-editor.tsx
// 块级一律关掉，只留 paragraph 与 inline marks；居中交给 CSS，不交给属性。
StarterKit.configure({
  heading: false, bulletList: false, orderedList: false, listItem: false,
  blockquote: false, codeBlock: false, horizontalRule: false, hardBreak: false,
  dropcursor: false, gapcursor: false, undoRedo: false, // Yjs 关闭时再打开
  link: { openOnClick: false },
}),
Placeholder.configure({ placeholder: "写下这句话…" }),
TextAlign.configure({ types: ["paragraph"] }),
```

- 「只允许一个块」有四条可选路径：① 自定义 `Document`（`content: "paragraph"`，比 `block+` 更紧）；② 在 `editorProps.handleKeyDown` 上拦截 `Enter` / `Mod-Enter`；③ 粘贴时用 `transformPasted` 压平；④ 只做 UI 约束（不拦 Enter，允许空段落）。**结论：① 为主 + ② 为兜底**——schema 层拒绝是唯一能防住粘贴与 IME 的一层，键盘拦截只负责「不出现第二个空段落」的观感。Tiptap 官方没有「单行编辑器」的现成示例，社区 Issue [#96](https://github.com/ueberdosis/tiptap/issues/96) 是最接近的讨论（**待验证**：该 Issue 的 OneLiner 方案是 v1 时代写法，v3 需自行实现）。
- 展示层样式：`mx-auto max-w-[42rem] px-8 py-16 text-center text-2xl leading-relaxed`（字号与留白是设计值，落地浏览器里调），公式走 `@tiptap/extension-mathematics`（已在 `packages/editor/package.json:25`），KaTeX 的打包体积需评估（**待验证**）。

**交互与快捷键。**

| 输入                     | 行为                                                       |
| ------------------------ | ---------------------------------------------------------- |
| `Enter`                  | 不新建块（保持单块）                                       |
| `Mod-B` / `Mod-I` / `Mod-E` | 粗体 / 斜体 / 行内代码（inline marks 各自默认）            |
| `Mod-A`                  | 全选块内文本                                               |
| 粘贴多行                 | 压平成单段（保留软换行由 CSS `white-space` 决定，不落 `hardBreak`） |
| `Esc`                    | 交给 Dialog（既有行为），编辑器不消费                       |

**边界。** 不做多块（那是 `rich-text` 的道路）、不做块级拖拽/斜杠菜单、不做图片与表格、不做块 ID。旧 `{ content: string }` 数据不迁移脚本，靠 `normalizeDoc` 惰性升级。

### 1.2 image —— 照片编辑 + 覆盖批注层

**目标形态。** 现有 `<img>`（`image-node-content.tsx:46-66`）外面套一个**内容盒**：图片按 `object-contain` 铺满盒子，盒子之上绝对定位一层批注覆盖层（`pointer-events-none`，仅在批注层激活时打开指针）。「照片编辑」在本次只到「盒子 / 显示模式」这一层：批注层需要知道图片的**实际渲染矩形**（而不是 `<img>` 元素的矩形，因为 `object-contain` 会留黑边）。

**数据结构变化。**

```ts
// packages/interfaces/src/models/node/nodes/single/image.ts
export interface ImageContent {
  url: string;
  /** 覆盖在图片上的批注；形状以 annotation.md §3.1 为真源，page 必须 undefined（§3-①） */
  annotations?: AnnotationLayerData;
}
```

**组件改造。**

- `image-node-content.tsx`：`<img>` 外面套一个 `relative h-full min-h-0` 的内容盒（`object-contain` + `mx-auto max-h-full`），批注层作为同盒内的绝对定位子层；层本体来自 annotation.md。
- 接入批注层：`image-node-content.tsx` 负责给出容器与 `baseRect`（§3-②），组件本身（canvas / toolbar / 输入）见 [./annotation.md](./annotation.md) §9 的文件清单。
- 上传路径不变（仍 `FileDropZone` → `NodeService.upsert`），但**上传回填的 patch 必须走 live-content 合并**，否则会把已有 `annotations` 抹掉（`file-drop-zone.tsx:165-190` 今天直接写 `content: { url }`）。

**交互与快捷键。** 批注自己的工具集、快捷键、手势与触控笔仲裁**由 [./annotation.md](./annotation.md) §2 / §4 定义，本文不重复**（两份文档各写一份工具表必然漂移）。node-content 只负责这几条宿主语义：

| 输入                  | 行为                                                                     |
| --------------------- | ------------------------------------------------------------------------ |
| 进入 / 退出绘制模式    | 由批注层 toolbar 决定；宿主只负责把容器与 `baseRect` 交给它               |
| `Esc`                 | 先退出绘制模式，再交给 Dialog——**不吞掉对话框的关闭语义**                 |
| 只读态                | 不渲染 toolbar；批注仍可查看（tooltip / 侧栏由批注层提供）                 |
| 容器尺寸变化          | 重算 `baseRect`（双宿主切换、窗口缩放），批注坐标不动                      |

**边界。** 不做像素级修图（滤镜、裁剪、旋转写入文件）；不做多人实时批注；不做批注导出为图片。

### 1.3 audio —— 自定义组件 + 时间戳笔记

**目标形态。** 替换原生 `<audio controls>`（`audio-node-content.tsx:38-49`）：自绘传输控件（播放/暂停、进度、时间读数、速度）+ 一条按 `timeMs` 分布标记的时间轴 + 一个笔记列表（点笔记跳转，播放中「加笔记」捕获当前时间）。

**数据结构变化。**

```ts
// packages/interfaces/src/models/node/nodes/single/audio.ts
export interface AudioContent {
  url: string;
  /** 按 timeMs 升序读；时间基准见 §0.3-10 */
  timestampNotes?: TimestampNote[];
}
```

**组件改造。**

- 新增 `packages/ui/src/components/media/audio-player.tsx`（自绘控件，不引入波形依赖）。
- 新增 `packages/ui/src/components/media/timestamp-notes.tsx`（列表 + 时间轴标记，audio/video 共用，`getCurrentTimeMs()` / `seek(timeMs)` 由宿主传入的控制器提供）。
- `audio-node-content.tsx` 只做组合与写回。

**交互与快捷键。**

| 输入                | 行为                                                     |
| ------------------- | -------------------------------------------------------- |
| `Space`             | 播放 / 暂停（焦点在播放器内时，阻止冒泡）                 |
| `←` / `→`           | ∓5s / ±5s（`Shift` 时 ∓30s / ±30s）                       |
| `Mod-Enter`         | 在当前时间加一条空笔记并聚焦输入框                        |
| 点击笔记时间         | `seek(timeMs)`                                            |
| `↑` / `↓`（列表内） | 上下移动笔记焦点                                          |

**边界。** 不做波形图（P2 用自绘进度条；波形作为可选增强，参考 wavesurfer.js 的 Regions/Markers/Timeline，见 §9）；不做转写/自动分段；不做笔记的拖拽改时间（时间由播放位置捕获而来）。

### 1.4 video —— 自定义组件 + 时间戳笔记

**目标形态。** 保留现有 `<VideoPlayer>`（HLS 优先、渐进回退的那一层已经写好，`video-node-content.tsx:84-92`），在它**周围**补自绘控件与笔记层；不重写 HLS 逻辑。

**数据结构变化。**

```ts
// packages/interfaces/src/models/node/nodes/single/video.ts
export interface VideoContent {
  url: string;
  coverUrl: string;
  hlsUrl?: string;
  timestampNotes?: TimestampNote[];
}
```

**组件改造。**

- `VideoPlayer` 增加 `children`/`overlay` 插槽或 `onTimeUpdate` 回调（现在是纯 `forwardRef<HTMLVideoElement>` 风格），供笔记层订阅当前时间。
- 笔记组件与 audio 共用（§1.3）。时间基准同样落 `timeMs`。
- **HLS 专属注意**：`hlsUrl` 存在时播放的是打包产物，笔记跳转要落在同一个媒体元素上（`video.currentTime`），不要另开元素；打包是否保持原始时间轴见 §0.3-10 的验证项。

**交互与快捷键。** 与 audio 相同（`Space` / `←` / `→` / `Mod-Enter`），另加 `F` 全屏（沿用浏览器默认，不自行实现）。

**边界。** 不做内嵌字幕、不做画中画之外的画质切换、不做视频帧级批注（时间戳笔记只到毫秒，画面级批注超出本次范围）。

### 1.5 pdf —— 自绘渲染 + 批注层

**目标形态。** 不再 `<iframe>`；用 pdfjs-dist 在客户端把页渲染到 `<canvas>`，每页一个**页盒**，页盒之上是批注覆盖层；支持翻页/连续滚动、缩放、页缩略图（后两项可后置）。

**数据结构变化。**

```ts
// packages/interfaces/src/models/node/nodes/single/pdf.ts
export interface PdfContent {
  url: string;
  coverUrl: string;
  /** 页面批注；形状以 annotation.md §3.1 为真源，page 必须是非负整数（§3-①） */
  annotations?: AnnotationLayerData;
}
```

**组件改造。**

- 新增 pdf 自绘视图组件（pdfjs 加载、worker、页盒、缩放；命名与文件清单以 annotation.md §9 的 `pdf-document-view.tsx` 为准）+ 批注层复用。
- `pdf-node-content.tsx:44-53` 的 `<iframe>` **从主路径退为降级兜底**（pdfjs 初始化失败时只能看、不能批注——annotation.md §1.3），主路径换成 canvas 逐页渲染。
- 页盒尺寸来自 `page.getViewport({ scale })`；缩放只改 `scale` 与页盒 CSS 尺寸，**不改已存批注**（坐标已归一化，见 §3）。
- pdfjs 的 worker 在 Next.js 里要用 `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)` 形式加载（**待验证**：Next 16 + Turbopack 的具体写法需在 P3 落码时确认）。

**交互与快捷键。**

| 输入              | 行为                                              |
| ----------------- | ------------------------------------------------- |
| `PageUp`/`PageDown`、`↑`/`↓` | 上下页 / 滚动                           |
| `Mod-+` / `Mod--` | 缩放                                              |
| 拖拽选择          | 绘制区域高亮（P3 起，先矩形，不做文本层逐字高亮）  |
| 双击页面空白      | 放一个便签（`kind: "note"`）                      |
| `Esc`             | 退出绘制模式（不吞掉对话框的关闭语义）             |
| 批注工具与笔迹键位 | 见 [./annotation.md](./annotation.md) §2（本文不重复） |

**边界。** 不做文本层与文本选择高亮（区域矩形 + 便签 + 手绘是 P3 的范围；逐字高亮需要文本层与逐字矩形映射，参考 §9 的 PDF.js 坐标转换文章，记为后续）；不做表单填写（PDF.js 的 AnnotationLayer 能渲染内嵌批注与表单，但我们不引入它——**待验证**其与自绘层的关系）；不把批注写回 PDF 文件（§6）。

### 1.6 rich-text —— 页面头部 + 正文

**目标形态。** Notion 式页面：顶部 cover（点击出现 cover-selector）→ icon（点击出现 icon-selector）→ title → summary → semantic pill → 正文（`<NotionEditor>`）。

**数据结构变化：`RichTextContent` 本身一个字段都不加。**

```ts
// packages/interfaces/src/models/node/nodes/complex/rich-text.ts —— 保持今天的样子
export interface RichTextContent {
  referencedNodes: NodeId[];
  docs: Record<string, any>;
}
```

头部五项全部落在既有字段上（§0.2-4）：`title` → `NodeBase.title`、`summary` → `NodeBase.abstract`、`semantic pill` → `NodeBase.semanticId`、`icon` → `NodeBase.icon`、`cover` → `NodeBase.cover`（后两项的形状与列由 [./selectors.md](./selectors.md) 定义）。**本文的 rich-text 改造因此是「组件层搬运 + 顶层字段直写」，content 侧只保留正文 `docs` 与 `referencedNodes`。**

**组件改造。**

- 新增 `packages/ui/src/components/dialog/editor/content/node-content-header.tsx`（§2 的共享头部壳）。
- `rich-text-node-content.tsx` 变成「头部 + `<NotionEditor>`」两段；正文仍用 `NotionEditor`（`:18-34` 的既有调用不变）。
- 头部**不碰 content**：cover/icon/title/summary/semantic 都是顶层字段，一次 `NodeService.upsert(id, { icon })` 就是一整次写（selectors.md §0.2-4）。正文仍只由编辑器写 `content`，两边互不覆盖。
- 正文的写回必须补齐 `referencedNodes`：今天是「两键同时给才写」（§0.3-7），一旦后端改成独立半边（§4.2-6），编辑器只写 `docs` 也不再丢引用。
- 写回接口（头部壳收的 props，选择器的弹层由 [./selectors.md](./selectors.md) 提供）：

```ts
export interface NodeContentHeaderProps {
  node: NodeData;
  /** 顶层字段直写；内部串行化，不触碰 content */
  patchNode: (patch: Partial<Pick<NodeData, "title" | "abstract" | "semanticId" | "icon" | "cover">>) => void;
  /** 选择器入口：由宿主决定挂 cover-selector / icon-selector（selectors.md） */
  renderCoverSelector?: (props: { node: NodeData; onPick: (cover: NodeCover | null) => void }) => React.ReactNode;
  renderIconSelector?: (props: { node: NodeData; onPick: (icon: NodeIcon | null) => void }) => React.ReactNode;
  readOnly?: boolean;
  className?: string;
}
```

**交互与快捷键。** 头部自身的键位（唤起选择器、`Esc` 关闭弹层）由 `selectors.md` 定义；本文件只保证：头部不占用 `Tab` 序之外的全局键，`Backspace` 在 title 为空时不删除节点。

**边界。** 不做页面级模板/属性表（那是 `database` 的领域）；不做 cover 的视差与位置调节（`verticalAlign` 之类）；不做 icon 的完整 emoji picker（交 `selectors.md`）。

---

## 2. 共享头部（cover / icon / title / summary / semantic pill）

**本节只写概览与契约；选择器（两个 popover、emoji 集合、上传交互）见 [./selectors.md](./selectors.md)。** 两份提案已经定下了形态：cover-selector 与 icon-selector 都是**点击后弹出的 popover**，上传复用现有的上传区（[../proposal/cover-selector.md](../proposal/cover-selector.md)、[../proposal/icon-selector.md](../proposal/icon-selector.md)），即 `FileDropZone` 背后的 `uploadFile` 通道——本文件只负责在头部挂上入口，并把选中的值交给顶层的 `patchNode`。

结构与语义（自上而下）：

| 位置 | 元素           | 字段（真源）                                        | 语义                                     | 写回                                       |
| ---- | -------------- | --------------------------------------------------- | ---------------------------------------- | ------------------------------------------ |
| 1    | cover          | `NodeBase.cover?: NodeCover`                         | 图片或「取自另一个节点」；空则不占位（不画灰块）。形状与列见 selectors.md | 顶层直写 `patchNode({ cover })`        |
| 2    | icon           | `NodeBase.icon?: NodeIcon`                           | emoji / Lucide 图形名 / 图片；空则回退到节点类型图标 | 顶层直写 `patchNode({ icon })`             |
| 3    | title          | `NodeBase.title`                                     | 已是 `nodes.title` 列；空态显示 placeholder | 顶层直写 `patchNode({ title })`            |
| 4    | summary        | `NodeBase.abstract`                                  | 卡片/预览复用的摘要，`preview-header.tsx:62-66` 已用 | 顶层直写 `patchNode({ abstract })`         |
| 5    | semantic pill  | `NodeBase.semanticId` + `dataStore.nodeSemantics`     | 语义是「一条带颜色/图标的分类」，pill 复用 `preview-header.tsx:43-60` 的渲染规律 | 顶层直写 `patchNode({ semanticId })`       |
| 6    | rich-text-content | `RichTextContent.docs`                            | 正文，`NotionEditor`；**唯一写 content 的元素** | 编辑器 `onContentChange` → 共享写者         |

**宿主写回接口的纪律**：① 头部六项里只有第 6 项碰 `content`，前五项都是顶层字段直写——**永远不要为了改图标去 `upsert({ content })`**，那会把正在编辑的正文覆盖回上一帧（§0.2-4、§0.3-3）；② 即便都是顶层写，也要串行化：`NodeService.upsert` 仍是「先 store 后网络」，同一节点的两次写同时起飞会互相 abort（§0.3-8），因此 `patchNode` 内部与 `useNodeContentWriter` 共用同一个 drain。

**与既有渲染层的复用**：`PreviewHeader`（`preview-header.tsx:31-67`）的语义 pill 与 `NODE_TYPE_ICONS`（`node-preview-cover.tsx:32-45`）是 icon 回退的现成来源；头部组件不重复实现图标表，从 `@workspace/ui` 内部导出复用。

---

## 3. 批注接入点（image / pdf）

**本节只写接入契约；toolbar、命中测试、批注面板、触控笔手势细节与只读态的完整设计见 [./annotation.md](./annotation.md)。**

四份契约：

**① 数据契约（形状以 [./annotation.md](./annotation.md) §3.1 为真源，本文不重定义）。**

node-content 侧只需要认下这三件事：

```ts
// packages/interfaces/src/models/node/nodes/single/image.ts / pdf.ts
export interface ImageContent {
  url: string;
  /** 缺省 = 无批注，老记录天然兼容 */
  annotations?: AnnotationLayerData;
}
export interface PdfContent {
  url: string;
  coverUrl: string;
  annotations?: AnnotationLayerData;
}
```

1. 落库形态是**带版本号的信封** `AnnotationLayerData = { version: 1; items: Annotation[] }`，`Annotation` 是 `Stroke | Highlight | TextAnno | ArrowAnno | ShapeAnno` 的判别联合——图元细节、`bbox` 外扩、`color` 令牌、`z` 层序都在那边定义，本文只当它是**不透明数组**（node-content 唯一的自由度是「读写整份 `annotations`」）。
2. **坐标基准是「底图显示矩形」**（image 是图片在盒内的实际渲染矩形，pdf 是页盒），归一化到 0..1，而不是元素盒、也不是视口——这正是双宿主与缩放都不需要迁移批注的原因（§0.3-9）。
3. **`page` 的不变量**：`image` 必须 `undefined`，`pdf` 必须是非负整数；两套变换函数分别把关（annotation.md §3.1 的不变量 3）。

**② 表面契约（node-content 必须交给批注层的东西）。** 批注层不认识节点类型，只认识**一个 `baseRect`**（归一化坐标的基准矩形）——`image` 是 `<img>` 的 `object-contain` 实际显示矩形（CSS 决定的 letterbox，DOM 拿不到，要用 `containRect` 自己算），`pdf` 是当前页 canvas 的盒。两套变换、旋转折回与 `dpr` 都在 annotation.md §3.4 的 `geometry.ts` 里，本文不重复实现，只负责：

- 给批注层一个尺寸正确的容器（image：图片显示盒；pdf：页盒）；
- 把 `img.naturalWidth/naturalHeight` 或 `page.getViewport({ scale })` 的结果传给变换层；
- 保证容器尺寸变化时重新计算 `baseRect`（双宿主切换、pdf 缩放都会触发）。

**③ 宿主契约（写回与层级）。**

- 批注**不是**独立实体：它是 `ImageContent.annotations` / `PdfContent.annotations` 的一整份半边，写回走 §0.2-5 的共享写者（`patchContent({ annotations })`），**整份替换**（不是增量追加到 store 里的旧值上）。
- 层级：静态批注层可以 `pointer-events-none`，但绘制画布必须接收指针——「图片右键菜单 / PDF 滚动」与「落笔」的取舍由 annotation.md §4.2 给出（`pointer-events` + `touch-action` 的组合、以及双指仲裁）。
- 只读态（`readOnly`）隐藏 toolbar，保留批注渲染。
- 落笔写库的时机与抽稀由那边定（annotation.md §3.2/§3.3：落笔只在内存采样，抬笔才进 items 并写库）。

**④ 输入契约（触控笔优先）。** 提案把批注定位在**触控笔**场景（含 toolbar、批注层、触控笔与手势，[../proposal/annotation.md](../proposal/annotation.md)），而目标设备是平板（根 `AGENTS.md` 的环境拓扑）。因此接入面按 Pointer Events 设计，不是 mouse 事件：

- 统一用 `pointerdown/move/up` + `setPointerCapture`，以 `event.pointerType` 区分 `"pen" | "touch" | "mouse"`；笔压进 `[x, y, pressure]` 三元组交给 `perfect-freehand`（`simulatePressure: false` 才用真实笔压——annotation.md §4.5）。
- 绘制面 `touch-action: none`，否则平板上落笔会被浏览器当成滚动/缩放；退出绘制模式时必须恢复，以免吃掉滚动。
- **手掌误触与手势互斥**：触摸态默认不绘制（只有 `pointerType === "pen"` 才进入绘制），触摸留给滚动与双指缩放；缩放/平移只在非绘制模式生效，不做「边画边缩」。

---

## 4. 数据模型与全链路改造清单

### 4.1 持久化字段（本文负责 2 个新列；另 2 个由兄弟文档负责）

| 列名（`nodes`）  | 承载                 | 使用者            | content / 顶层字段                                          | 归属 |
| ---------------- | -------------------- | ----------------- | ---------------------------------------------------------- | ---- |
| `annotations`    | `AnnotationLayerData` JSON | `image`、`pdf` | 各 content 下的 `annotations`                              | [./annotation.md](./annotation.md) |
| `timestampNotes` | `TimestampNote[]` JSON | `audio`、`video` | `AudioContent.timestampNotes` / `VideoContent.timestampNotes` | **本文** |
| `icon`           | `NodeIcon` JSON      | 全部 10 种类型    | `NodeBase.icon`（顶层）                                     | [./selectors.md](./selectors.md) |
| `cover`          | `NodeCover` JSON     | 全部 10 种类型    | `NodeBase.cover`（顶层）                                    | [./selectors.md](./selectors.md) |

「一列两类型」是刻意的，直接沿用 `views` 由 `database` + `collection` 共用的既有规律（`1700000000_initial_schema.js:167-176`、`node.mapper.ts:114-120`、`:141-149`）。**本文只对 `timestampNotes` 的全链路负责**；另外三列按各自文档执行——本文在 §4.2 里只列「会被同一批改动波及的层」，避免与那两份文档重复登记。

### 4.2 全链路改造矩阵（层 → 文件 → 改动）

| #   | 层          | 文件                                                                                 | 改动                                                                                                                                                                                            |
| --- | ----------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 类型        | `packages/interfaces/src/models/node/nodes/single/audio.ts`、`video.ts`               | `+ timestampNotes?: TimestampNote[]`；`TimestampNote { id; timeMs; text; createdAt; updatedAt }` 定义在同目录的 `timestamp-note.ts`（时间基准见 §0.3-10）                                          |
| 2   | 类型        | `.../single/image.ts`、`pdf.ts`、`complex/rich-text.ts`                               | 前两者 `+ annotations?: AnnotationLayerData`（形状由 annotation.md 定）；rich-text **不加字段**（头部走 `NodeBase`，§1.6）                                                                        |
| 3   | 类型        | `packages/interfaces/src/models/node/base.ts`                                         | `+ icon?: NodeIcon`、`+ cover?: NodeCover`（形状由 selectors.md 定，本文只消费）                                                                                                                |
| 4   | 领域 VO     | `backend/domain/src/models/node/value-objects.ts`                                     | `AudioContent` / `VideoContent` 加只读 getter + `withTimestampNotes()`（照 `CollectionContent.withViews`，`:430-438`）；`equals` 纳入新字段。其余三个 content 与本层的 base 改动按各自文档执行      |
| 5   | 领域实体    | `backend/domain/src/models/node/entities.ts`                                          | `AudioNode` / `VideoNode` 加半边更新入口（如 `applyTimestampNotes`），语义同 `CollectionNode.applyViews`（`:1137`）；`NodeBaseProps`（`:33-45`）与 10 个子类按 selectors.md 加两个 base 字段        |
| 6   | 应用命令    | `backend/application/src/commands/node/command.ts`                                    | audio/video 的 `content` 字面量加可选新字段；`UpdateNodeCommand.content` 保持 `any`（`:212`）但补注释说明半边语义                                                                                  |
| 7   | 应用服务    | `backend/application/src/commands/node/node-command.service.ts`                       | `updateNodeContent`（`:343-431`）：audio/video 的 `timestampNotes` 单独半边；**rich-text 拆成 `referencedNodes` / `docs` 两个独立半边**（修掉 `:403-414` 的「两键同时给」）；base 字段走既有的 `updateTitle`/`updateAbstract` 之路新增两条                             |
| 8   | DTO         | `backend/application/src/dto/node-dto.mapper.ts`                                      | `base` 加 `icon` / `cover`（`:27-39`）；audio/video 的 content 字面量点名 `timestampNotes`（`:89-98`、`:71-88`）——不点名就永远到不了客户端（`:134-137` 的既有注释）                                |
| 9   | tRPC        | `backend/adapter-front/src/trpc/router/node.ts`                                       | `addSchema` 的 audio/video 分支与 `updateSchema`（`:259-273`）加 `timestampNotes`；数组/信封用 `z.custom`（`:79-98` 的既有教训）；base 白名单（`:7-17`、`:259-273`、`:289-316`）加 `icon` / `cover` |
| 10  | 基础设施    | `backend/infrastructure/src/database/mappers/node.mapper.ts`                           | record 接口加 4 个可选列；`mapAudioNode`（`:324-342`）/`mapVideoNode`（`:296-322`）读 `timestampNotes`（缺列 → `undefined`，同 `views` 的 `record.views` 写法 `:395-400`）；`toRecord` 对应分支写列（`:518-525`、`:503-516`）；base 字段加进 10 份内联 `baseProps` 类型与 `toRecord` 的 `baseRecord` |
| 11  | 迁移        | `pb/pb_migrations/`（新增文件，见 §4.5）                                               | `annotations` 归 annotation.md 的 `1700000001_node_annotations.js`；本文的 `timestampNotes` 与 selectors.md 的 `icon` / `cover` 用后续编号（或合并成一个新文件，只要文件名是新的）                  |
| 12  | 前端写者    | `packages/ui/src/components/dialog/editor/content/use-node-content-writer.ts`（新增）  | 把 `database-node-content.tsx:78-117` 与 `collection-node-content.tsx:91-128` 的 `liveContent` + 微任务 drain 抽成共享 hook（content 半边用），并暴露一个顶层字段的 `patchNode`；6 个新老 node-content 统一使用 |
| 13  | 前端组件    | `content/` 下 text / rich-text / audio / video / image / pdf 六个组件 + `node-content-header.tsx` | §1 各节；批注与选择器的组件文件清单见各自文档的 §9                                                                                    |
| 14  | 读兼容      | `packages/ui/src/components/dialog/editor/content/doc-normalize.ts`（新增）             | `normalizeDoc(value)`：旧 `{ content: string }` → Tiptap doc；`normalizeNotes(value)`：非数组/缺 `timeMs` → 丢弃并 `console.warn`（只在前端做，不改后端宽容度）                                     |
| 15  | 预览层      | `preview-block/previews/text-preview.tsx`、`preview-block/node-preview-cover.tsx`       | 现有 `extractText*` 已能吃 Tiptap doc（`node-preview-cover.tsx:48-70`），统一形状后 text 预览自动修好（§0.3-2）；只需确认它不再见到旧形状                                                                 |

### 4.3 迁移与兼容策略

1. **新增列 → 新迁移文件，不动 0 号脚本。** `pb/pb_data` 已存在，PocketBase 只按文件名去重（0 号脚本 `:170-173`），改 0 号脚本对既有库无效。开发机若愿意清库，删 `pb/pb_data` 后重建亦可（代价：全部节点数据）。
2. **旧记录读兼容。** mapper 对缺失列一律给 `undefined`（不抛错、不补空对象），与 `views` 的处理一致；前端把 `undefined` 当空数组。**新列不设 required。**
3. **text 旧形状惰性升级。** 读时 `normalizeDoc` 转换（不写库），首次编辑即落成 Tiptap doc；不做一次性迁移脚本。
4. **单条笔记的读写粒度。** `timestampNotes` 是整份数组读写（与 `annotations`、`fields`/`rows` 同一取舍）；删除一条 = 重写整份，串行化保证最后一次写赢。
5. **不可逆点。** `docs` 一旦按 Tiptap 单 block 写入，回退到旧前端会看到一个「有 content 数组但没有 `content` 字符串」的文档 → 旧 `Textarea` 的 `getValue()`（`text-node-content.tsx:20-25`）会取到 `"doc"` 这个键名对应的值（对象 → `String(...)` → `"[object Object]"`）。因此**回滚必须连同前端一起回滚**，这是本次唯一的不可逆项。
6. **wire 兼容。** 新字段全部可选，旧客户端不传 → 后端半边不写 → 旧值保留；新客户端对旧服务端会因 zod 剥键静默丢字段（与 dataview 的 `views` 同一表现），故**前端与后端必须同批发布**。

### 4.4 依赖

- **本文不新增 npm 依赖。** `text` 用仓库已有的 Tiptap（`packages/editor/package.json:15-39`）；`audio` / `video` 的自绘控件与笔记层是本仓组件；`image` 的批注层是自绘 canvas。另外两份文档各自引入：`perfect-freehand`（annotation.md，P0）与 `pdfjs-dist` 浏览器侧（annotation.md，P1）。
- **PDF 渲染复用仓库已有的 `pdfjs-dist`**（`backend/infrastructure/package.json:13`，`^4.10.38`）。客户端需要 `pdfjs-dist/build/pdf.mjs` + `pdf.worker.min.mjs`（服务端现在用的是 `legacy/build/pdf.mjs`，`pdf-document-analyzer.ts:32`、`:46`），**版本必须与那边同 major**，否则会出现两份 pdfjs。`packages/ui` 需显式声明该依赖（不能靠 backend 的传递依赖）。**待验证**：`react-pdf`（wojtekmaj）作为封装层是否值得——它绑定 pdfjs 的 peer 版本且在 Next.js 下有 `DOMMatrix` 等 SSR 例外（§9），本设计倾向直接用 pdfjs。
- **Tailwind**：新组件都在 `packages/ui/src` 下，已被 `globals.css:10` 覆盖；若把任何样式类写进 `packages/editor`（单 block 编辑器就会），必须补 `@source`（§0.3-11）。

### 4.5 新迁移文件的骨架（本文负责的一列）

```js
/// <reference path="../pb_data/types.d.ts" />
// 文件名必须是新的：PocketBase 只按文件名去重，改 0 号脚本对已有 pb_data 无效（§0.3-6）。
// annotations 已由 1700000001_node_annotations.js 负责；本文件只管本文与 selectors.md 的列。
migrate((app) => {
  const nodes = app.findCollectionByNameOrId("nodes");
  // timestampNotes 由 audio+video 共用，icon / cover 是全部类型的顶层字段
  // —— 与 views（database+collection 共用）同构。
  for (const name of ["timestampNotes", "icon", "cover"]) {
    nodes.fields.add(new Field({ name, type: "json" }));
  }
  app.save(nodes);
}, (app) => {
  const nodes = app.findCollectionByNameOrId("nodes");
  // PB 0.40 的 FieldsList 只有 removeById / removeByName（见 0 号脚本注释）。
  for (const name of ["timestampNotes", "icon", "cover"]) {
    nodes.fields.removeByName(name);
  }
  app.save(nodes);
});
```

> 注意：0 号脚本里创建字段用的是**普通描述对象**而不是 `new TextField(...)`（该脚本 `:209-210` 记录了 FileField 被静默丢弃的坑）。`json` 字段的写法以 P0 落码时在 PB 0.40 上的实测为准（**待验证**：`Field` 构造器是否对未知 type 静默丢弃）。

---

## 5. 分阶段路线图

| 阶段   | 交付                                                                                                                                                                                                                                        | 验收                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **P0** | 数据契约与写者：`TimestampNote` 类型 + `@workspace/interfaces` 的 audio/video 半边；两个 content VO 的 getter + `withTimestampNotes`；`updateNodeContent` 的 `timestampNotes` 半边与 rich-text 两半边（修 `:403-414`）；DTO 点名；zod schema；infra mapper 读写列；**新迁移文件**；`useNodeContentWriter` 抽取并替换 database/collection 两处重复实现；`doc-normalize.ts` | 全仓 `pnpm check-types` / `pnpm lint` 干净；迁移在**既有** `pb/pb_data` 上执行成功（`nodes` 出现 `timestampNotes`，另三列随各自阶段）；四个既有宿主（database/collection/text/rich-text）回归无变化；手写一次 content 半边能 read-back |
| **P1** | text 单 block（`packages/editor` 的受限编辑器 + 只读渲染 + 居中禅意样式 + `normalizeDoc` 惰性升级）；rich-text 头部挂载（cover / icon / title / summary / semantic pill；字段与选择器由 selectors.md 提供）+ 顶层 `patchNode` 写者                                                                                     | 手测 1–4 全过；旧 `{content: string}` 的 text 节点被打开后不再出现 `[object Object]`，且在预览里能看到文字                       |
| **P2** | image 批注层 + 绘制/编辑/删除；audio 自绘播放器；video 自绘控件外壳；共享时间戳笔记组件（audio/video）；`Mod-Enter` 捕获与跳转                                                                                                                          | 手测 5–8 全过；同一节点上「上传回填 + 批注 + 笔记」的动作不互相抹除（并发写者串行化生效）                                     |
| **P3** | pdf 自绘渲染（pdfjs + worker + 页盒 + 缩放）；pdf 批注层复用 §3 契约（同一份批注层，两个 `baseRect` 来源）；`<iframe>` 退为失败兜底                                                                                                                    | 手测 9–11 全过；窗口模式与全屏模式下同一个批注位置一致；首屏不因 pdfjs 拖慢（懒加载）                                          |

阶段之间无强制依赖顺序，但 **P0 必须先落**：`useNodeContentWriter` 与 `timestampNotes` 列是 P1–P3 共同的地基。

**与两份兄弟文档的阶段对齐**（避免同一批文件被两个阶段各改一次）：`selectors.md` 的 icon / cover 全链路在其 P0，`annotation.md` 的 image 批注全链路在其 P0、pdf 渲染在其 P1。本文的阶段只描述 node-content 自己的增量；`text` 单块与 rich-text 头部挂载可以与它们并批，媒体与 PDF 部分以那两份文档的阶段为准。

---

## 6. 边界与取舍

**明确不做：**

1. **不把批注写回 PDF 文件。** 上传的 PDF 是 `files` 集合里不可变的 blob，`content.url` 是它的地址，服务端 `analyzePdf` 还以它为输入生成封面；把批注嵌进 PDF 意味着重新上传、破坏地址身份，而 `pdf-lib` 那条路也不是受支持的注解写入 API（§9 的讨论帖）。**批注 = sidecar JSON，与文件解耦。**
2. **不做基于文本层的逐字高亮。** P3 的批注是几何的（区域矩形 / 便签 / 手绘），不做文本选择 → 逐字矩形映射。代价：PDF 上的「高亮」是半透明色块而不是贴合文字的荧光笔；换来的是不需要文本层与字体度量这条最贵的链路。
3. **不做多人实时批注（CRDT）。** 仓库里的 Yjs 目前是内存 mock（§0.2-3），把它扩到批注层是一次独立的架构决策，不在本次。
4. **不做音频波形。** 自绘进度条 + 时间轴标记足够；波形需要新依赖（wavesurfer.js）与峰值数据，记为可选增强。
5. **不做「只给 rich-text 的头部」。** cover / icon 按 selectors.md 落在 `NodeBase`（§0.2-4），因此本设计里 rich-text 头部只是一次**挂载**，字段与列由那两份文档负责——本文不做自己的 `RichTextContent.header`。
6. **不做旧数据的批量迁移脚本。** text 走惰性升级；新列对旧记录天然读作空。
7. **不做像素级图片编辑**（滤镜/裁剪/旋转落地到文件）、不做视频剪辑、不做 PDF 页面重排/合并/拆分。
8. **不做头部模板/属性表**（那是 `database` 节点与 `RecordEditor` 的领域）。

**已知取舍：**

- 头部与正文共用一个节点，但**不再共用一个 `content`**：cover / icon / title / summary / semantic 都是顶层字段（一次 `upsert` 只带一个键），正文是 content。代价是改头部与改正文会各发一次写（顶层字段写不碰 content，见 selectors.md §0.2-4），换来的是两边永不互相覆盖。
- `timestampNotes` 与 `annotations` 作为数组整体读写：删除一条笔记会重写整个数组（无并发合并语义，串行化保证最后一次写赢）。
- 时间戳笔记不参与拖拽排序，顺序完全由 `timeMs` 决定——简单、可预测，牺牲「同一秒内手动排序」。
- PDF 用 pdfjs 自绘后，浏览器内置 PDF 的查找/打印/表单能力不再免费；P3 只补翻页与缩放，查找与打印列为后续。

---

## 7. 验证方法

**项目没有 JS/TS 测试基础设施**（无 vitest/jest，无 `*.test.*`，无 CI），验证 = **typecheck + lint + 浏览器手测**。这是全仓一致的事实（根 `AGENTS.md` 的 ANTI-PATTERNS、`packages/services/AGENTS.md`），本设计不引入测试框架。

```bash
pnpm check-types                              # turbo 全仓
pnpm lint                                     # turbo 全仓
pnpm --filter=@workspace/interfaces typecheck
pnpm --filter=@workspace/ui typecheck
pnpm --filter=@workspace/editor typecheck
pnpm --filter=@workspace/dataview typecheck   # 宿主回归面
for d in domain application infrastructure adapter-front; do (cd backend/$d && pnpm typecheck); done

pnpm dev:full                                 # 端到端手测：PocketBase(默认 8090) + web(3000) + server(3001)
```

**迁移验证（P0 必做）。** 在**既有** `pb/pb_data` 上启动 PocketBase，确认新迁移文件都被拾取（`_migrations` 表出现新文件名），并在 PB 后台（默认 `http://127.0.0.1:8090/_/`）确认 `nodes` 集合出现 `annotations` / `timestampNotes` / `icon` / `cover` 四个 json 字段；然后写一个节点验证 read-back。**若没有执行迁移就写新字段，PocketBase 会直接报 `unknown field`。**

**手测清单（逐阶段累加）：**

1. **text 单块**：打开一个 text 节点 → 输入多行文本 → 回车不产生第二个块 → 悬浮预览与封面能看到文字（不是 `No content`，不是 `[object Object]`）→ 刷新后内容仍在。
2. **text 旧数据**：把一个库里已有的 `{ content: "字符串" }` 文本节点打开 → 内容正确显示 → 随便改一个字 → 重新读库，`docs` 已是 `{ type:"doc", ... }`。
3. **rich-text 头部**：点 cover → 选/上传一张图 → 刷新仍在；点 icon 选 emoji → 刷新仍在；改 title / summary / semantic pill → 侧栏 `AttributesSidebar` 同步显示同一份数据（title/abstract/semantic 是同一份基字段）。
4. **头部与正文不互斥**：在正文里连续打字的同时改 cover / icon / title（两步之间 <500ms）→ 两者都在；特别是改完头部后正文不回退。
5. **image 批注**：给一张图加 2 条高亮 + 1 条便签 → 刷新后位置不变；把窗口模式切到全屏模式，批注位置**不变**；删除一条 → 剩下的不丢；重新上传图片（走 `FileDropZone`）后批注不丢。
6. **audio 笔记**：播到 1:30 加一条笔记 → 点该笔记跳回 1:30（±0.5s）；刷新后时间与文本都在；删掉中间一条，其余顺序仍按时间。
7. **video 笔记 + HLS**：一个已打包 HLS 的视频加一条笔记并跳转 → 与 `hlsUrl` 存在前的同文件对比，时间偏移在 ±1s 内（若超出，记录并回填 §0.3-10 的验证项）。
8. **并发写者**：对同一 image 节点快速连续「批注 + 上传 + 删除」>5 次 → 控制台无 `The request was aborted (most likely autocancelled…)`，无 rollback 闪烁。
9. **pdf 渲染**：打开 PDF → 页盒尺寸正确、翻页正确、缩放后批注跟随；关闭窗口再开，位置不变。
10. **pdf 批注**：矩形高亮 + 便签 + 手绘各一条 → 刷新与缩放后都在；退出绘制模式后页面仍可选中/滚动（`pointer-events` 恢复）。
11. **双宿主与尺寸**：以上每一条都要在窗口模式（`w-[1200px] h-[80vh]`）与全屏模式（`absolute inset-0`）各做一次；不出现 `100vh` 造成的溢出或内部滚动条套娃。
12. **回归面**：`database` / `collection` 的数据视图、记录页、编辑过滤不受 `useNodeContentWriter` 抽取影响；`NodeEditor` 的 `AttributesSidebar`、`PinButton`、`OptionsMenu` 行为不变。

---

## 8. 文件与依赖清单

**新增**

| 路径                                                                                        | 说明                                                     | 阶段 |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---- |
| `packages/interfaces/src/models/node/nodes/single/timestamp-note.ts`                        | `TimestampNote { id; timeMs; text; createdAt; updatedAt }` | P0   |
| `pb/pb_migrations/1700000002_node_timestamp_notes.js`（编号与文件名可并批调整，只要是新文件） | `nodes` 加 `timestampNotes`（另两批列见 §4.5）             | P0   |
| `packages/ui/src/components/dialog/editor/content/use-node-content-writer.ts`                | 共享串行化写者（live content + 微任务 drain）              | P0   |
| `packages/ui/src/components/dialog/editor/content/doc-normalize.ts`                          | 旧 `docs` 形状与脏数组的归一化                              | P0   |
| `packages/ui/src/components/dialog/editor/content/node-content-header.tsx`                   | 共享头部壳（cover / icon / title / summary / semantic pill） | P1   |
| `packages/editor/components/tiptap-templates/single-block/single-block-editor.tsx`           | 受限单块 Tiptap 编辑器（schema 收紧 + inline marks）        | P1   |
| `packages/editor/components/tiptap-templates/single-block/single-block-renderer.tsx`         | 只读渲染（Tiptap static renderer）                          | P1   |
| `packages/ui/src/components/annotation/*`                                                    | 批注层（文件清单见 annotation.md §9；本文只对接 §3 的契约）  | P2/P3 |
| `packages/ui/src/components/media/audio-player.tsx`                                          | 自绘音频播放器                                              | P2   |
| `packages/ui/src/components/media/timestamp-notes.tsx`                                       | 时间戳笔记（audio / video 共用）                            | P2   |
| `packages/ui/src/components/pdf/*`                                                           | pdfjs 自绘渲染（页盒 / 翻页 / 缩放 / worker）；清单见 annotation.md §9 | P3   |

**修改**

| 路径                                                                     | 改动                                                                                   | 阶段 |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ---- |
| `packages/interfaces/src/models/node/nodes/single/{audio,video}.ts`       | `+ timestampNotes?: TimestampNote[]`（另两处 content 字段见各自文档）                     | P0   |
| `packages/interfaces/src/models/node/base.ts`                             | `+ icon?: NodeIcon`、`+ cover?: NodeCover`（形状由 selectors.md 定）                      | P0   |
| `backend/domain/src/models/node/value-objects.ts`                         | `AudioContent` / `VideoContent` 的 getter + `withTimestampNotes()` + `equals`              | P0   |
| `backend/domain/src/models/node/entities.ts`                              | `AudioNode` / `VideoNode` 加 `applyTimestampNotes`；base 字段按 selectors.md 铺开到 10 个子类 | P0   |
| `backend/application/src/commands/node/command.ts`                        | 各类型 `content` 字面量补可选字段                                                        | P0   |
| `backend/application/src/commands/node/node-command.service.ts`           | `timestampNotes` 半边；rich-text 拆两半边（修 `:403-414`）；base 字段两条更新入口          | P0   |
| `backend/application/src/dto/node-dto.mapper.ts`                          | audio/video content 字面量 + base 加 `icon` / `cover`                                     | P0   |
| `backend/adapter-front/src/trpc/router/node.ts`                           | audio/video content schema + base 白名单加可选字段（`z.custom` 透传）                     | P0   |
| `backend/infrastructure/src/database/mappers/node.mapper.ts`              | record 接口 + audio/video 两个 `map*` / `toRecord` + 10 份 `baseProps`                     | P0   |
| `packages/ui/src/components/dialog/editor/content/{database,collection}-node-content.tsx` | 改用共享 `useNodeContentWriter`                                    | P0   |
| `packages/ui/src/components/dialog/editor/content/text-node-content.tsx`  | `<Textarea>` → 受限编辑器 + 禅意容器；经共享写者写 `docs`                                | P1   |
| `packages/ui/src/components/dialog/editor/content/rich-text-node-content.tsx` | 挂载头部；正文经共享写者写 `docs`（头部只写顶层）                                       | P1   |
| `packages/ui/src/components/dialog/editor/content/image-node-content.tsx` | 内容盒 + 批注层；上传回填走 live-content 合并                                            | P2   |
| `packages/ui/src/components/dialog/editor/content/audio-node-content.tsx` | 自绘播放器 + 笔记                                                                       | P2   |
| `packages/ui/src/components/dialog/editor/content/video-node-content.tsx` | `VideoPlayer` 外套控件 + 笔记                                                            | P2   |
| `packages/ui/src/components/video-player/video-player.tsx`                | 暴露当前时间订阅 / overlay 插槽                                                          | P2   |
| `packages/ui/src/components/dialog/editor/content/pdf-node-content.tsx`   | 主路径换成 pdfjs 自绘视图 + 批注层；`:44-53` 的 `<iframe>` 退为失败兜底                    | P3   |
| `packages/ui/src/components/dialog/editor/content/file-drop-zone.tsx`     | 上传回填改为「读 live content → 合并本半边」（`:165-190`、`:197-220`、`:234-260`）        | P0   |
| `packages/ui/package.json`                                               | 按 annotation.md：`+ perfect-freehand`（P0）、`+ pdfjs-dist`（P1，与 backend 同 major）   | P0/P1 |

---

## 9. 参考

**Tiptap（单块受限编辑器与只读渲染）**

- Tiptap · Schema（严格 schema、`content: 'inline*'`、node 的 `marks` 白名单、`enableContentCheck` + `contentError`）：<https://tiptap.dev/docs/editor/core-concepts/schema>
- Tiptap · StarterKit（用 `configure({ x: false })` 关掉块级扩展）：<https://tiptap.dev/docs/editor/extensions/functionality/starterkit>
- Tiptap · Static renderer（不建 Editor 实例渲染 JSON）：<https://tiptap.dev/docs/editor/api/utilities/static-renderer>
- Tiptap · Collaboration（Yjs 扩展与 `field` 选项）：<https://tiptap.dev/docs/editor/extensions/functionality/collaboration>
- GitHub · tiptap Issue #96「Allow only one line」（**待验证**：v1 时代方案，v3 需自行实现）：<https://github.com/ueberdosis/tiptap/issues/96>

**PDF 渲染与批注层**

- PDF.js · `PDFPageProxy` API（`getViewport` / `render`）：<https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFPageProxy.html>
- Nutrient · 用 PDF.js + React 做文本高亮批注（浏览器选区 → PDF 坐标 → 持久化 overlay）：<https://www.nutrient.io/blog/pdfjs-text-highlight-annotations/>
- Nutrient · 用 React portal 注入抗缩放/旋转的 overlay 层：<https://www.nutrient.io/blog/pdfjs-rendering-overlays-react-portals/>
- Nutrient · PDF.js 原生 AnnotationLayer 与表单（**待验证**与我们自绘层的关系）：<https://www.nutrient.io/blog/pdfjs-native-annotation-layer-forms/>
- GitHub · pdf-lib 讨论「如何添加注解」（**待验证**：注解写入不是受支持路径）：<https://github.com/Hopding/pdf-lib/discussions/1596>
- GitHub · react-pdf Issue #2039（`DOMMatrix is not defined`，Next.js/SSR 例外）：<https://github.com/wojtekmaj/react-pdf/issues/2039>
- GitHub · `perfect-freehand`（笔迹轮廓数学；annotation.md 选用的唯一绘制依赖）：<https://github.com/steveruizok/perfect-freehand>

**媒体与时间戳**

- WaveSurfer.js · API（Regions / Markers / Timeline / Minimap，可选增强的参照）：<https://wavesurfer.xyz/docs/>
- Beamly · Timestamps `HH:MM:SS` / `MM:SS` 的既有约定：<https://docs.beamly.com/article/33-timestamps>
- Autodidacts · YouTube 链接片段（`t=` / `start=` / `end=` 的行为差异）：<https://www.autodidacts.io/link-to-segment-of-a-youtube-video-with-set-stop-time-using-end-url-query-parameter/>
- Google AI · 音视频时间戳一律用 `MM:SS` 的建议（外部平台口径，仅作展示格式参照）：<https://discuss.ai.google.dev/t/timestamp-format-for-extremely-long-audio-and-video-inputs/107089>

**仓库内文档**

- [../proposal/node-content-refine.md](../proposal/node-content-refine.md) —— 本次改造的提案
- [./annotation.md](./annotation.md) —— 批注层（图元模型、toolbar、触控笔与手势）；本文 §3 只写接入契约
- [./selectors.md](./selectors.md) —— cover / icon 选择器与 `NodeIcon` / `NodeCover` 的真源；本文 §2 只写头部结构与写回
- [../dataview/README.md](../dataview/README.md) §5.2 —— `views` 的全链路先例与两条陷阱（`z.object` 剥键、0 号迁移不重跑）
- [../dynamic-island/README.md](../dynamic-island/README.md) —— 本文体例样板
- 根 `AGENTS.md` —— dataview「Known gaps」、Tailwind `@source` 白名单、无测试基础设施
- `packages/services/AGENTS.md` —— `NodeService.upsert` 的乐观写语义
- `packages/editor/AGENTS.md` —— Tiptap 扩展组织方式
