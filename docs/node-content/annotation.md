# 批注组件（annotation）设计文档

> 状态：**待实现**（提案见 [../proposal/annotation.md](../proposal/annotation.md)，两行来源见 [../proposal/node-content-refine.md:18](../proposal/node-content-refine.md) 与 [:33](../proposal/node-content-refine.md)）
> 范围：**image 与 pdf 两种 node-content 之上的一层手写批注**。交付三件东西：`toolbar`、批注层、触控笔与手势仲裁。底图的编辑（照片编辑、自定义 pdf 组件）**不在**本设计内。
> 新增运行时依赖：**`perfect-freehand`（P0，唯一）**、**`pdfjs-dist`（P1，浏览器侧）**——后者仓库里已经有一个（服务端），见 §0.2-③。
> 相关文档：[../proposal/node-content-refine.md](../proposal/node-content-refine.md)、[../dynamic-island/README.md](../dynamic-island/README.md)（本文件的体例来源）、`packages/graph/AGENTS.md`（多指手势与 `devicePixelRatio` 的既有先例）、`packages/editor/AGENTS.md`（Excalidraw 今天怎么被用的）、`packages/interfaces/src/AGENTS.md`

---

## 0. 实现现状与关键决策

### 0.1 今天的代码是什么样

批注要盖上去的两个底图，今天分别长这样：

| 现有物              | 位置                                                                            | 现状                                                                                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| image 底图          | `packages/ui/src/components/dialog/editor/content/image-node-content.tsx:58-65` | 一个 `<img className="aspect-auto rounded-sm object-contain">`，外面套 `relative flex items-center p-4 overflow-hidden`（`:47-52`）。**没有容器尺寸的显式测量**，图片按 `object-contain` 居中，letterbox 由 CSS 决定；加载态盖一层 `absolute inset-0 z-10`（`:53-57`），即"绝对定位覆盖层"这个写法在这个文件里已经存在 |
| pdf 底图            | `packages/ui/src/components/dialog/editor/content/pdf-node-content.tsx:44-53`   | **`<iframe src={url}>`**，外框 `flex-1 rounded-lg overflow-hidden bg-muted/30`（`:42`）。iframe 内部是**浏览器自带的 PDF 阅读器**（Chrome/Edge 的 PDFium 查看器），跨源且不暴露任何 API                                                                                                                                |
| 无文件时的入口      | 两者都落到 `FileDropZone`（`:37-43` / `:31-37`）                                | 上传后由 `@workspace/api-client` 的 `analyzePdf` / `transcodeVideo` 补齐元数据（`file-drop-zone.tsx:20-22`）                                                                                                                                                                                                           |
| 时间戳笔记的雏形    | `video-node-content.tsx` / `audio-node-content.tsx`                             | 两者都只是原生 `<audio controls>` / `<VideoPlayer>`（`:41-48` / `:84-92`），**没有**任何时间锚点或笔记数据结构 —— 提案里的「时间戳笔记」同样是待建物                                                                                                                                                                   |
| 宿主：全屏与 Dialog | `node-editor.tsx:44-66` / `:69-78`                                              | `mainViewType === "graph"` 时是 Dialog（`w-[1200px] h-[80vh]`，`:55`），`=== "editor"` 时是 `absolute inset-0 z-50`（`:72`）；两种形态共用 `NodeEditorContent`（`:92-114`），内容区是 `flex-1 overflow-y-auto`（`:105`）                                                                                               |
| 路由                | `node-content-editor.tsx:29-62`                                                 | `useMemo` + `switch (nodeType)` 分发，`case "image"` / `case "pdf"` 是 §9 要改的两处                                                                                                                                                                                                                                   |

批注要挂靠的数据形态（今天）：

| 类型           | 定义                                                                                                | 落库形态                                                                                                                                                                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| image          | `ImageContent { url: string }`（`packages/interfaces/src/models/node/nodes/single/image.ts:14-16`） | `nodes.content` 这个 **json 列**里存一个**裸字符串**：写 `content: node.content.url`（`backend/infrastructure/src/database/mappers/node.mapper.ts:481-491`），读 `new ImageContent(record.content \|\| "")`（`:272`）                                                                                                      |
| pdf            | `PdfContent { url: string; coverUrl: string }`（`.../single/pdf.ts:11-14`）                         | `content` 列存 url（同上 `:493-501`）、`coverUrl` 用**专用列**（`pb/pb_migrations/1700000000_initial_schema.js:142`），读 `new PdfContent(record.content \|\| "", record.coverUrl \|\| "")`（`node.mapper.ts:292`）                                                                                                        |
| 复杂类型的先例 | `RichTextContent { referencedNodes, docs }`（`.../complex/rich-text.ts:7-10`）                      | `referencedNodes` + `docs` 是**两个专用 json 列**（migration `:172-173`）。但 `docs` 存的**不是 Yjs 二进制**：`onContentChange` 拿到的是 `editor.getJSON()`（`packages/editor/components/tiptap-templates/notion-like/notion-like-editor.tsx:223-228`），写回见 `rich-text-node-content.tsx:20-30`（`{ debounce: true }`） |

其它与本次决策直接相关的事实：

- `nodes` 表的列用**长注释**登记了「复杂类型占用专用列」这条规则，并同时写死了迁移的坑（migration `:163-176`）。
- **协作是 mock**：`MockCollabProvider`（`packages/editor/lib/mock-collab.ts:48`）在 `collab-context.tsx:69` 被 new 出来，`connect()` 只 `queueMicrotask` 地自报 connected/synced（`mock-collab.ts:64-78`），**没有任何服务端通道**。`apps/server` 是占位包。
- **`packages/ui` 不引 `next/*`**：全包依赖里只有 `next-themes`（`packages/ui/package.json`），没有 `next/dynamic`；而 Excalidraw 的现有包装正是用 `next/dynamic`（`packages/editor/components/tiptap-node/excalidraw/excalidraw-wrapper.tsx:4-10`）。
- **`packages/graph` 已经写好了多指手势与 dpr 的答案**：canvas 带 `touch-action: none`（`ForceGraph.tsx:849`），双指缩放从原始 pointer 流重建（`eventListener.ts:184-206`），坐标注释明确写「CSS 像素偏移要乘 `devicePixelRatio` 才对得上 canvas backing store」（`eventListener.ts:32` / `:77` / `:119`）。
- **写回路径**：`NodeService.upsert(id, updates, options)`（`packages/services/src/graph/node.service.ts:38`），`{ debounce: true }` → 默认 500ms（`:22-25`），由 `DebounceScheduler` 实现：trailing-edge、按 key 合并、回滚快照取**窗口内第一个** payload（`packages/utils/src/debounce-scheduler.ts:30-62`），并且**带** `flush(key)`（`:104`）/ `cancel(key)`（`:130`）/ `cancelAll()`（`:141`）——`NodeService` 把它们暴露为 `flushPendingUpdate` / `cancelPendingUpdate`（`node.service.ts:145-152`），所以「离开页面前把最后一笔写掉」是现成能力。**没有 flush/cancel 的是另一个东西**：`packages/utils` 的轻量 `debounce()` 是 trailing-edge、无 cancel/flush（记在仓库根 `AGENTS.md` 的跨包契约表里；`packages/utils` 下没有 AGENTS.md）。

### 0.2 四条决策

#### ① 批注数据存哪里：**新增一个节点级 `annotations` json 列，挂在 `ImageContent` / `PdfContent` 上**

| 候选                                  | 协作/冲突                                 | 体积                                                 | 全链路改造面                                                                                                                                                                                         | 结论     |
| ------------------------------------- | ----------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **A. 结构化数组进 `content`（新列）** | 节点级 last-write-wins（`upsert` 已如此） | 归一化坐标 + 抽稀 → 一笔约 2–4 KB JSON（**待实测**） | domain VO 2 个 + application 4 处 + DTO mapper 2 个字面量 + infra mapper 读写 + PB 新列（新迁移）+ tRPC `add` schema 2 个                                                                            | **选用** |
| B. Yjs 文档（像 rich-text 的 `docs`） | 理论最优（CRDT 字符级合并）               | 二进制 update 比 JSON 小，但需要 compaction          | 需要**真实的** relay + 服务端 update 存储 + 前端 provider；而今天协作是 `MockCollabProvider`（`mock-collab.ts:48`），`docs` 本身也只是 Tiptap JSON —— 抄它只抄到「一个 json 列」，抄不到任何合并能力 | 排除     |
| C. 独立 `annotations` 表              | 行级并发安全                              | 与 A 相同，另加行开销                                | 新增 PB collection + repo + mapper + tRPC router + 领域事件 + `event-bridge` 映射（见 `backend/adapter-front/AGENTS.md` 的 15 个 emitter 表）+ 权限规则；还要处理「节点删除 → 批注孤儿」             | 排除     |

选 A 的三条理由：

1. **批注是底图的从属数据**，生命周期与节点完全一致（删节点 → 批注一起消失），没有任何独立查询需求（"找出所有含红笔批注的 PDF"不存在）。独立表要付一整套 DDD 分层的代价换一个用不到的查询能力。
2. **不能塞进现有的 `content`**。`content` 对 image/pdf 已经是一个**裸字符串**列（`node.mapper.ts:272` / `:292` 的 `record.content || ""`），把它改成对象会让既有记录读出 `"[object Object]"`，且是**静默**的错误（读路径的 `||""` 兜底不会报错）。用专用列与 `coverUrl`（migration `:142`）、`views`（`:168-176`）的既有惯例一致，且读路径可以 `?? []` 兜底 —— **老记录天然兼容，不需要数据迁移**。
3. **不进 Yjs**。批注是低冲突频率的数据（一个人写、另一个人看），CRDT 换来的是"并发字符级合并"，而代价是这条通道**今天根本不存在**（mock provider）。先做 A，把「图元 id 稳定 + 整体替换当前数组」这两个前提做好，将来要上真协作时，`annotations` 的内容形态（一个有 id 的数组）本身就是 CRDT-ready 的，可平滑升级为「操作日志」（§5）。

**冲突策略明确写死**：节点级 last-write-wins。同一节点两个客户端同时批注 → 后写整体覆盖前写，**不合并**。这是取舍不是遗漏，见 §7。

#### ② 坐标如何归一化：**存"相对底图的 0–1 坐标"，pdf 再加 `pageIndex`；旋转与缩放都不进存储**

- **image**：`(u, v) ∈ [0,1]²`，相对**图片的实际显示矩形**（`object-contain` 去掉 letterbox 后的那个矩形），不是相对容器。
- **pdf**：`(pageIndex, (u, v) ∈ [0,1]²)`，页内归一化，相对**该页未旋转的 viewBox**。
- **缩放不进存储**：窗口尺寸、容器尺寸、用户缩放都在渲染时应用。存储值与 DPI、窗口、平板竖横屏**全部无关**，这是"不同设备打开同一份批注一致"的唯一实现方式。
- **旋转不进存储**：pdfjs 的 `getViewport({ scale, rotation })` 在省略 `rotation` 时取页面的 `/Rotate`（`node_modules/.pnpm/pdfjs-dist@4.10.38/node_modules/pdfjs-dist/types/src/display/api.d.ts:247-257`）。如果把"用户当前看到的旋转"烘进坐标，下次以 rotation=0 打开批注就歪了。所以**存未旋转空间**，渲染时施加同一个 viewport 矩阵；pdfjs 官方给了双向换算：`PageViewport.convertToViewportPoint` / `convertToPdfPoint` / `convertToViewportRectangle`（`.../types/src/display/display_utils.d.ts:168-198`）。
- **精度与线宽**：`u/v` 保留 4 位小数（≈ 1/10000 底图宽；1280px 底图上 0.13px 误差，肉眼不可见，同时把 JSON 体积压到最小）；`size` 是"相对底图**短边**的比例"而不是像素 —— 否则换设备后笔迹粗细不一致。

#### ③ PDF 用什么渲染：**P1 换成 `pdfjs-dist` 自绘 canvas**，iframe 只留作降级

**核心矛盾**：`pdf-node-content.tsx:44-53` 的 `<iframe>` 内部是浏览器自带的 PDF 阅读器。同源策略下（更不用说跨源）应用**拿不到**它的：滚动位置、缩放倍率、当前页码、页面尺寸、文本位置。于是"保留 iframe + 独立浮层"这条路的实际能力上限是：**能在 iframe 上画，但无法保证与 PDF 内容对齐，也无法知道用户翻到了第几页**。这不是精度问题，是可行性问题 —— 见 §0.3-1。

换成 pdfjs 的三条硬事实：

1. **依赖不是新的**。后端**已经在用** `pdfjs-dist@^4.10.38`（`backend/infrastructure/package.json:13`）做服务端 PDF 解析与封面栅格化（`backend/infrastructure/src/parsers/pdf-document-analyzer.ts:1-46`：`COVER_WIDTH=1280` / `MAX_SCALE=2` / `JPEG_QUALITY=85`，走 `pdfjs-dist/legacy/build/pdf.mjs` + `@napi-rs/canvas`）。浏览器侧引同一个库、同一个 major（4.10.38 恰好是 4.x 线的最新版，registry 实测）＝"同一库的第二个平台"，而不是引入未知依赖。
2. **可控性**：`getDocument → page.getViewport({scale, rotation}) → page.render({canvasContext, viewport})` 给到一个确定的坐标矩阵，批注层与底图共享它；官方换算 API 就在 `PageViewport` 上（决策 ② 引的 d.ts）。
3. **CORS 大概率没问题**：PDF 由 PocketBase 的 `files` 集合提供（public 规则），而基础设施的 AGENT 记录该集合的响应带 `Access-Control-Allow-Origin: *`（`backend/infrastructure/AGENTS.md:98`）。**待验证**：这条记录的上下文是 HLS 分段，PDF 是否同样带头需要真机确认；退一步可用 tRPC 同源代理。

**迁移成本与风险**：`pdf-node-content.tsx` 57 行基本重写，另加一个 `pdf-document-view.tsx`（逐页 canvas + 自建滚动/缩放容器，§9）。**不引入 pdfjs 的高层 viewer**：`pdfjs-dist/web/pdf_viewer.mjs` 确实提供了带文本层/注释层的 `PDFViewer`，但它的滚动容器是它自己的，要把第三方批注层精确叠进去反而要围着它绕；P1 用低层 `getDocument` + `page.render`，**只画 canvas、不做文本层**（文本选择/文字高亮不在本次范围，§7-7）。另外 pdfjs 需要客户端 worker（`pdfjs-dist/build/pdf.worker.min.mjs`），本项目是**第一次在客户端引 pdfjs**，Next 16 + Turbopack 下的 worker URL 写法属**待验证**（§0.3-10）。过渡方案：pdfjs 初始化失败时回落到今天的 iframe（能看不批注，而不是白屏）。

#### ④ 绘制引擎：**自研 Canvas 2D 分层 + 只借 `perfect-freehand` 的描边数学**

| 候选                                 | 评估                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 结论               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| **自研 Canvas 2D 分层**              | 批注层要叠在**别人的**底图上，且要能"只认笔、放行手指"（§4）。canvas 是唯一能精确控制这两件事的载体。成本集中在笔迹数学与命中测试两块，前者可外包（下一行）                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **选用**           |
| 复用 Excalidraw（依赖已在仓库）      | `@excalidraw/excalidraw@0.18.1` 的 npm 包 unpacked **46.8 MB / 1029 文件**（registry 实测，MIT）。`UIOptions` 只能定制 `canvasActions` / `welcomeScreen` / `tools` / `dockedSidebarBreakpoint`（官方 UIOptions 文档），**没有"只要 freehand"的入口**。仓库今天的用法是把它整个塞进 Dialog 当**图表块**（`packages/editor/components/tiptap-node/excalidraw/excalidraw-view.tsx`，保存时把整个场景 JSON 当附件上传）——那是"独立画布"语义，与"在 PDF 第 3 页的这句话上画一条线"不是一回事。它还不支持 SSR，必须客户端 dynamic import（官方 integration 文档），而 `packages/ui` 不能引 `next/dynamic`（§0.1） | 排除               |
| `perfect-freehand` 描边              | `getStroke(points, options)` 把输入点变成压力变宽的 outline polygon；输入点第三个数即笔压，`simulatePressure: false` 才用真实笔压；四个主旋钮 `size` / `thinning` / `smoothing` / `streamline`（README 实测）。**1.2.3 / unpacked 112 KB / 27 文件 / MIT**（registry 实测）。只借"点 → 轮廓"，渲染仍归自己的 canvas                                                                                                                                                                                                                                                                                         | **选用（仅此层）** |
| 朴素 `ctx.lineTo` + 分段 `lineWidth` | 省掉 112 KB，得到一节一节的"香肠"。书写观感是本功能的核心体验，不值得省                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 排除               |

> 未采「拿 Excalidraw 的导出工具烘图」：`@excalidraw/utils` 是另一个包，`exportToBlob` / `exportToSvg` 只对 Excalidraw 的场景元素有效，对"img + 我的手写图元"不适用。烘焙导出自己实现，见 §5。

### 0.3 必须知道的坑

1. **iframe 里的 PDF 是黑盒，这是本设计的第一性问题。** 拿不到滚动位置、缩放、当前页，`iframe.onLoad` 只在文档加载完成时触发一次（`pdf-node-content.tsx:51`），内部翻页**没有任何事件**。推论要写进团队共识：**任何**"在浏览器自带 PDF 阅读器上叠批注层"的方案都无法保证对齐，包括用 CSS 给 iframe 加 `transform` 再蒙一层 —— 你不知道用户在里面滚到了哪。
2. **`touch-action` 与画布平移/缩放天然冲突。** 批注层必须 `touch-action: none` 才能拿到笔的原始移动（`perfect-freehand` README 的示例正是 `style={{ touchAction: "none" }}`），但这会**同时**吃掉双指缩放与页面滚动（浏览器不再发 `wheel`）。`packages/graph` 已经解过这道题：canvas 带 `touch-action: none`（`ForceGraph.tsx:849`），双指缩放**自己**从 pointer 流重建（`eventListener.ts:184-206`）——第二个 touch down 即把进行中的单指手势终止、并吞掉后续事件直到所有手指抬起，中途加入/离开的手指只做**无跳变重锚**（`:227-245`、`:296-330`）。批注层照抄这套仲裁，但**多一条**：`pointerType === "pen"` 永不参与 pinch。
3. **Pointer Events 的笔专属字段有真实的兼容性边界。** `pointerType` 取值 `"mouse" | "pen" | "touch"`，判不出设备时是空字符串（MDN，Baseline 广泛可用，2020-07 起）。`pressure` 对笔是真实值，对鼠标按下常为 0.5，对不支持压感的触屏是 0 或 1。取点策略：`pointerdown` **立即记一个点**（否则轻点一下会整笔丢失），`pointermove` 里**先用 `getCoalescedEvents()` 取出被合并掉的中间点**再渲染 —— MDN 明确说合并"会降低跟踪的粒度与精度"，而**绘图应用正是它点名的目标场景**；但 `getCoalescedEvents()` 与 `pointerrawupdate` 都是 **Limited availability（非 Baseline）**，且需要 secure context。**待验证**：平板经 `http://<IP>:3000` 访问不算 secure context，此时这两个 API 的行为是否一致（§8 有测法）。
4. **`pointerrawupdate` 与 `getPredictedEvents` 的取舍。** MDN 原文：`pointerrawupdate` "在空间和时间上并不比覆盖同一段移动的 `pointermove` 更精确"，只是频率更高、合并更少，且"跟不上会更卡"；它**非 Baseline**。`getPredictedEvents()` 是 **Baseline 2024（2024-12 起）**，返回估计的未来位置，用来"画在前面"降低**感知**延迟，代价是预测点可能落在真实轨迹之外、抬手时要丢弃。**结论：P0 只用 `pointermove` + `getCoalescedEvents()`（feature-detect，缺失即退化为单点），`getPredictedEvents()` 留作"跟手度实测不达标时的下一步"，`pointerrawupdate` 不用。**
5. **手掌误触（palm rejection）在应用层做不到，只能绕。** 规范层面只承诺"支持触摸+笔的设备**可以**在笔使用期间忽略触摸输入"（W3C Pointer Events 原文即称其为 palm rejection）——也就是说它是**设备/浏览器行为，不是应用可控的开关**。所以应用必须自己兜：① 笔的 pointerId 活跃期间，**忽略所有 `pointerType === "touch"` 的 down/move**（这就是 §4 的双输入分离）；② 不在 `pointerdown` 上尝试区分手掌与手指（做不到）；③ 提供显式的"手指=平移缩放 / 笔=书写"模式开关作为兜底（§2）。
6. **`devicePixelRatio` 与 canvas 模糊。** canvas 的 `width/height` 是**设备像素**、`style.width/height` 是 CSS 像素；只设后者会得到糊的笔迹。仓库的做法是 `const dpr = Math.max(1, globalThis.devicePixelRatio ?? 1)`（`ForceGraph.tsx:177` / `:226` / `:789`），并且 `eventListener.ts` 把"CSS 像素偏移要乘 `devicePixelRatio` 才对得上 canvas backing store"写成了注释（`:32` / `:77` / `:119`）。批注层必须复刻这条，且**离屏缓存 canvas 与可见 canvas 用同一个 dpr**，否则合成时会二次缩放。另外 dpr 会随窗口跨屏移动而变，改 dpr 必须**重建缓存**并重绘。
7. **撤销栈与增量同步互相缠绕。** canvas 没有 DOM 撤销栈，必须自己做；而它与"批量提交"的时序是耦合的：一次落笔是一步撤销，一次擦除也是一步，但持久化是防抖批量的（§5）。若栈里存**快照**，内存会炸（一笔 200 点 × N 笔）；若只存**反向操作**，套索/批注级联删除这类复合操作难以表述。**结论：栈里存操作记录**（`{ kind: "add" | "remove", ids, item? }`），持久化时把"当前全部图元"整体写回 —— 于是**撤销后不需要单独的同步动作**（写回的就是当前真值），"协作冲突 = 后写覆盖"的语义也保持简单（§7）。
8. **`pointercancel` 与指针丢失：最容易在真机上"写着写着断线"。** 滚动、切 tab、系统手势、Radix Dialog 的焦点陷阱、把指针移出窗口，都会让 `pointerup` 不来；只监听 `pointerup` 会让笔画永远处于"进行中"、笔迹停在半截。必须同时监听 `pointercancel` / `lostpointercapture`，并在 `pointerdown` 时 `setPointerCapture(e.pointerId)`（README 示例的写法）把后续事件锁到画布上；`visibilitychange` / `blur` 也要收笔。**本项目的特殊情况**：node-content 既在全屏编辑器也在 Dialog 里（`node-editor.tsx:55` / `:72`），Dialog 内容区是 `overflow-y-auto`（`:105`）——`touch-action: none` 只写在画布上，父层的滚动仍可能抢走某个方向的指针序列。
9. **PDF 的"页面旋转"与"用户旋转视图"是两回事。** `getViewport` 的 `rotation` 默认取页面 `/Rotate`；用户还能再叠一个旋转。存储必须落在**未旋转空间**（决策 ②），渲染时刻的 rotation 只影响 viewport 矩阵。把两者混在一起是"昨天画的圈今天歪了"的成因。
10. **`packages/ui` 不能引 `next/*`。** 全包没有 `next/dynamic`（`packages/ui/package.json`）。pdfjs 这种"必须客户端-only"的库在 `packages/ui` 里只能用 `React.lazy` + `"use client"`；pdfjs 的 worker 要用 `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)` 的形式喂给 `GlobalWorkerOptions.workerSrc`（Turbopack 认这个模式，`packages/graph` 的 `new Worker(new URL(..., import.meta.url), { type: "module" })` 是同类先例）——**待验证**。
11. **新增 PB 列必须开新迁移文件，不能改 0 号脚本。** migration 里已经用一条长注释把这个坑写死了（`pb/pb_migrations/1700000000_initial_schema.js:170-172`）：PocketBase 只按**文件名**去重迁移，不比对内容，所以对已执行过 0 号脚本的库，改它**不会**补列，写新字段直接 `unknown field`。`annotations` 列必须写在**新的**迁移文件里（如 `1700000001_node_annotations.js`）。
12. **Tailwind 的 `@source` 是静默失败的高发区。** 新组件若落在 `packages/ui/src/components/**`，`@source "../**/*.{ts,tsx}"`（`packages/ui/src/styles/globals.css:10`）已经覆盖，**不需要**改配置；若另起一个 workspace 包（如 `packages/annotation`），**必须**在同一个文件补一行 `@source`（`dataview` 就是这么处理的，`:16`），否则它独有的类名会静默消失。

---

## 1. 结构总览

### 1.1 目标与使用场景

| 目标           | 场景                                                                         | 宿主                     |
| -------------- | ---------------------------------------------------------------------------- | ------------------------ |
| **照片批注**   | 在照片上用笔圈重点、写批语、画箭头；导出带批注的图给人看                     | `ImageNodeContent`（P0） |
| **PDF 批注**   | 在讲义/论文上划重点、写旁注；缩放/翻页/旋转后批注仍贴在原来的位置            | `PdfNodeContent`（P1）   |
| **触控笔优先** | 目标设备是一加平板 + OPPO Pencil 类手写笔：笔书写、手指平移缩放，互不打架    | 两者                     |
| **不破坏底图** | 批注是**叠加层**，底图文件本身一个字节都不改（提案原文："覆盖一层批注组件"） | 两者                     |

成功标准（可验收）：

1. 笔迹跟手 ≤ 1 帧（§4、§8 有测法）。
2. 窗口从 1200×800 缩到 800×800、或把平板从横屏转竖屏，批注与底图的相对位置不变（归一化生效）。
3. 手指永远画不出线（除非显式打开"手指=书写"）。
4. 撤销/重做逐笔回退且不残留半截笔迹；刷新页面后批注仍在；关闭/打开 Dialog 三次不出现"批注层尺寸为 0"或"缓存的底图尺寸是上一次的"。

### 1.2 分层

同一时刻**只有一个元素是 pointer target**，这一点是整个结构的核心约束（否则笔的事件会被 toolbar 或文本层偷走）：

```text
宿主（image-node-content / pdf-document-view）的 relative 容器
│
├─ L0 底图层   image: <img object-contain>                        z-0
│              pdf:   N × <canvas>（一页一块，垂直堆叠滚动）
│
├─ L1 墨迹层   <canvas>  ← pointer target（touch-action: none）   z-10
│              ├─ committed 缓存（离屏 canvas / OffscreenCanvas）
│              └─ live 当前笔画（每帧 clear → drawImage → draw）
│
├─ L2 文本层   <div pointer-events-none>                          z-20
│              └─ 仅"正在编辑"的那个 textarea 是 pointer-events-auto
│                 （IME 必需：canvas 画不了中文输入法）
│
└─ L3 界面层   <AnnotationToolbar>                                z-30
               普通 DOM、touch-action: auto、半透明浮层，
               absolute top-2，不参与底图坐标系
```

三条边界（写进 JSDoc，与 graph 包的 JSDoc 契约风格一致）：

1. **批注层不知道宿主是谁**：它只吃 `items` + `onItemsChange` + `tool` + 一个 `getBaseRect()`；image 与 pdf 各自把自己的坐标变换喂给它（§3.4）。
2. **批注层不读 store、不写 store**：持久化由宿主（`ImageNodeContent` / `PdfDocumentView`）通过 `NodeService.upsert` 做，与 dataview"渲染器不写"的规则一致。
3. **批注层不注册全局键盘**：快捷键在 toolbar 与宿主层注册，组件只暴露回调。

### 1.3 image 与 pdf 两个宿主的差异

| 维度           | image                                        | pdf                                                    |
| -------------- | -------------------------------------------- | ------------------------------------------------------ |
| 底图           | 一个 `<img>`，`object-contain`，有 letterbox | N 个 `<canvas>`，一页一块，无 letterbox，垂直滚动      |
| 坐标空间与图元 | `(u, v) ∈ [0,1]²`，数组追加                  | `(pageIndex, (u, v) ∈ [0,1]²)`，数组追加 + `page` 字段 |
| 墨迹层数量     | **1 块** canvas 铺满图片显示矩形             | **每页 1 块**，尺寸严格等于该页 canvas                 |
| 缩放来源       | P0 只有容器尺寸变化（无用户缩放）            | 用户缩放（pinch / ⌘wheel）+ 滚动 + 翻页 + 页面旋转     |
| 命中测试       | 直接归一化                                   | 先由 `clientY + scrollTop` 定位页，再页内归一化        |
| 烘焙导出       | 一次 `drawImage(img)` 即可                   | 逐页导出，或只导当前页                                 |
| 降级           | 无                                           | pdfjs 初始化失败 → 回落 iframe（只能看，不能批注）     |

---

## 2. toolbar 详设

### 2.1 工具与状态

`AnnotationTool` 是一个判别字符串，toolbar 的状态就是它的一个超集：

| 工具        | 图标（lucide）      | 快捷键       | 触屏入口           | 状态与行为                                                                                                           |
| ----------- | ------------------- | ------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| 笔          | `Pen`               | `P` / `1`    | 主按钮（默认）     | `size` / `thinning` / `smoothing` / `streamline` 四参由预设决定；`simulatePressure` 由输入源自动判定（§4）           |
| 荧光笔      | `Highlighter`       | `H` / `2`    | 有                 | 同 pen，但固定 `opacity: 0.35` + `globalCompositeOperation: "multiply"`，且 `thinning: 0`（等宽）                    |
| 橡皮        | `Eraser`            | `E` / `3`    | 有                 | **整笔删除**，不是像素擦除（理由见 §3.3）；命中半径 = `size * 2`                                                     |
| 套索        | `Lasso`             | `L` / `4`    | 有                 | 圈选 → 浮出「删除 / 改色」两个动作；**不做**移动/缩放选中的图元（§7）                                                |
| 文本框      | `Type`              | `T` / `5`    | 有                 | 点一下落一个 textarea，失焦提交；`Esc` 放弃                                                                          |
| 箭头        | `MoveUpRight`       | `A` / `6`    | 有                 | `from → to`，尾部带箭头（三角，非箭头线）                                                                            |
| 矩形 / 椭圆 | `Square` / `Circle` | `R` / `O`    | 在「形状」下拉里   | 拖动即定框，`filled` 默认 false                                                                                      |
| 颜色        | ——                  | `0`–`5`      | 6 个 swatch        | 6 个**令牌化**取值（下 §2.3），不存 hex                                                                              |
| 粗细        | ——                  | `[` / `]`    | 3 档 `ToggleGroup` | 细 / 中 / 粗，映射到归一化 `size`                                                                                    |
| 撤销 / 重做 | `Undo2` / `Redo2`   | `⌘Z` / `⌘⇧Z` | 有（左固定）       | 栈见 §0.3-7；无操作时 `disabled`                                                                                     |
| 清除        | `Trash2`            | `⌘⇧⌫`        | 在「更多」里       | **必须二次确认**（`AlertDialog` 或两段式按钮），且错误后可 `⌘Z` 恢复一笔（清除进撤销栈）                             |
| 隐藏批注    | `Eye` / `EyeOff`    | `\`          | 有（右固定）       | **只影响 L1/L2 的绘制**，数据一字不改；指针仍归批注层，所以隐藏后照样能平移/缩放看图（§4.6-2）。"要看原图"的高频动作 |
| 手指=书写   | ——                  | ——           | 在「更多」里       | 兜底开关（§0.3-5）；默认关                                                                                           |
| 导出图片    | `Download`          | ——           | 在「更多」里       | P2（§5）                                                                                                             |

### 2.2 两套交互

| 维度   | 触屏（`(pointer: coarse)`）                         | 键鼠（`(hover: hover)`）                                                        |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| 命中区 | 每个按钮 ≥ 44×44（WCAG 2.2 §2.5.8）                 | 32×32                                                                           |
| 提示   | 长按 400ms 出 `Tooltip`（无 hover）                 | hover 即出                                                                      |
| 布局   | 单行可横滚；窄屏（<640px）折叠为「当前工具 + 更多」 | 单行全展开                                                                      |
| 光标   | 不适用                                              | `crosshair`（笔/形状）/ `cell`（橡皮）/ `text`（文本）/ `move`（手指=平移模式） |
| 右键   | 不适用                                              | 画布右键 = 上下文菜单（撤销 / 清除 / 隐藏批注）                                 |

### 2.3 颜色的令牌化

新增 6 个 CSS 变量（放在 `packages/ui/src/styles/globals.css` 的 `:root` / `.dark`），toolbar 只读写令牌名，`Annotation.color` 存**令牌键**（如 `"red"`）而不是 hex：

```css
--annotation-1: oklch(...); /* 红 —— 批改 */
--annotation-2: oklch(...); /* 黄 —— 荧光笔默认 */
--annotation-3: oklch(...); /* 绿 */
--annotation-4: oklch(...); /* 蓝 */
--annotation-5: oklch(...); /* 紫 */
--annotation-6: oklch(...); /* 前景色（随主题反转） */
```

理由：暗色主题下"红色批注"必须换一个亮度才看得清；存 hex 就等于把主题写死在数据里。**注意**：`.dark` 下荧光笔的 `multiply` 混合会变暗，必须换 `screen`（必须在真机上验证的视觉细节，§8）。

### 2.4 折叠与降级

- `mainViewType === "graph"`（Dialog，`h-[80vh]`）时 toolbar **默认折叠**为「笔 + 橡皮 + 撤销 + 颜色 + 更多」，因为 Dialog 里垂直空间稀缺（`node-editor.tsx:55`）；`mainViewType === "editor"`（全屏）时默认展开。
- `readOnly`（未来只读分享）时整个 toolbar 不渲染，批注层只显示不接收 pointer。

---

## 3. 批注层详设

### 3.1 图元模型（TypeScript 草案）

放在 `packages/interfaces`（跨宿主、要落库），UI 侧只 import 类型：

```ts
// packages/interfaces/src/models/node/nodes/annotation.ts
/** 归一化坐标 + 可选笔压。x/y ∈ [0,1] 相对底图显示矩形；p ∈ [0,1]。 */
export interface AnnotationPoint {
  x: number;
  y: number;
  p?: number;
}
interface AnnotationBase {
  id: string;
  /** 页内层序。同 z 按数组顺序。 */
  z: number;
  /** 归一化 bbox [x0, y0, x1, y1]，命中测试与脏矩形用；必须外扩，见下。 */
  bbox: [number, number, number, number];
  /** 颜色令牌键（"red" | "yellow" | …），不存 hex —— §2.3。 */
  color: string;
  opacity: number;
  /** 0 基页码。image 必须 undefined；pdf 必须非负整数。 */
  page?: number;
  createdAt: number;
  /** P2 协作才写，P0 省略。 */
  authorId?: string;
}
export interface Stroke extends AnnotationBase {
  kind: "stroke";
  points: AnnotationPoint[];
  /** 归一化线宽（相对底图短边）—— 决策 ②。 */
  size: number;
  thinning: number;
  smoothing: number;
  streamline: number;
  simulatePressure: boolean;
}
export interface Highlight extends AnnotationBase {
  kind: "highlight";
  points: AnnotationPoint[];
  size: number;
  /** 亮色主题 "multiply" / 暗色主题 "screen" —— §2.3。 */
  blend: "multiply" | "screen";
}
export interface TextAnno extends AnnotationBase {
  kind: "text";
  x: number;
  y: number;
  text: string;
  /** 归一化字号（相对底图短边）。 */
  fontSize: number;
  align: "left" | "center";
}
export interface ArrowAnno extends AnnotationBase {
  kind: "arrow";
  from: [number, number];
  to: [number, number];
  size: number;
}
export interface ShapeAnno extends AnnotationBase {
  kind: "shape";
  shape: "rect" | "ellipse";
  from: [number, number];
  to: [number, number];
  size: number;
  filled: boolean;
}
export type Annotation = Stroke | Highlight | TextAnno | ArrowAnno | ShapeAnno;
/** 落库形态：带版本号，未来的迁移有抓手。渲染顺序即数组顺序。 */
export interface AnnotationLayerData {
  version: 1;
  items: Annotation[];
}
```

内容形态（`packages/interfaces/src/models/node/nodes/single/{image,pdf}.ts`）：

```ts
export interface ImageContent {
  url: string;
  /** 缺省 = 无批注（老记录天然兼容，决策 ①）。 */
  annotations?: AnnotationLayerData;
}
export interface PdfContent {
  url: string;
  coverUrl: string;
  annotations?: AnnotationLayerData;
}
```

三条不变量（写进 JSDoc 与 §8 的验收项）：

1. `id` **稳定**：一次落笔生成后永不改变，撤销再重做也复用同一个 `id`（这是 P2 走向操作日志 / CRDT 的前提）。
2. `bbox` 必须**外扩**：`perfect-freehand` 的轮廓会超出采样点包围盒，外扩量 ≈ `size/2 + smoothing 余量`。漏了外扩 → 命中测试与脏矩形都会漏。
3. image 的 `page` 必须是 `undefined`，pdf 的必须存在 —— 这条不变量由 `geometry.ts` 的两套变换函数把关，而不是靠调用者自觉。

### 3.2 渲染策略

```text
落笔 → push 采样点（仅内存，绝不 stringify）
     ↓ requestAnimationFrame
每帧：  live.clearRect(全幅)
        live.drawImage(committed, 0, 0)
        drawStroke(live, activeStroke)          ← perfect-freehand → Path2D → fill
     ↓ pointerup
收笔：  committed.ctx.fill(同一条 Path2D)         ← 一次性进缓存
        items.push(stroke)                        ← React 状态（用于撤销/toolbar 计数）
```

- **为什么两层**：已完成图元**每帧重绘**是纯浪费。`committed` 是离屏 canvas，内容只在"收笔 / 撤销 / 擦除 / 远端更新 / dpr 变化 / 尺寸变化"时重画。
- **不做脏矩形**。简单版每帧 `clearRect` 整个 `live` + `drawImage` 一次。算一笔账：图片区最坏 1200×720 CSS px、dpr=2 → 2400×1440 ≈ 3.5M px，`clearRect` + `drawImage` 都是 GPU 合成的 blit，一帧完全够。**只在 §8 的实测掉帧时才升级**为"清 `activeStroke.bbox` 外扩区域 + 从 committed 局部重绘"：脏矩形会给每个图元类型都加一条正确性义务，而收益在正常尺寸下测不出来。
- **笔压 → 轮廓**：`getStroke(points.map(p => [p.x * w, p.y * h, p.p ?? 0.5]), { size: size * min(w, h), thinning, smoothing, streamline, simulatePressure })`。**注意**：像素坐标喂进去、像素 `size` 出来 —— 渲染是像素空间的事，归一化只是**存储**的事，两者不要混。
- **抽稀只在持久化前做**：落笔收集的点全量参与渲染；写回 store 前按距离阈值（建议 `0.002` 归一化单位）抽稀，能砍掉 50–70% 的点。**验收标准是"抽稀前后重绘结果肉眼等价"**（§8），因为抽稀会改变 `perfect-freehand` 的 `streamline` 输入。**性能前置条件**：输入回调里只做 push + 请求 rAF —— 不 `JSON.stringify`、不写 store、不 setState。

### 3.3 擦除与命中

| 操作             | 算法                                                                       | 复杂度 / 说明                                                                             |
| ---------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 整笔擦除（默认） | 擦除笔迹的采样点 × 每个图元的采样点，最近距离 < `擦除半径 + 图元半宽` 即删 | O(N×M)，但用 `bbox` 预筛后只有邻近图元进入内层循环；一笔 200 点、一页 20 笔量级完全无压力 |
| 点选             | `bbox` 包含点 → 精确测试（Stroke 用距离、Arrow/Shape 用点到线/边距离）     | O(图元数)                                                                                 |
| 套索             | 射线法（或 `Path2D.isPointInPath`）判断图元采样点是否在多边形内            | O(图元数 × 采样点)；`bbox` 预筛后同样廉价                                                 |

**为什么不做像素擦除**：像素擦除在归一化模型下要额外存一个 mask（或把底图区域烘成位图），体积、缩放一致性、跨 dpr 一致性会一起崩，而且它与"整笔撤销"的语义直接冲突（擦掉半笔之后，撤销该恢复什么？）。取舍写进 §7-5。

### 3.4 坐标变换链

```text
pointerEvent(clientX, clientY)
  ├─ 1. 找宿主矩形
  │     image : baseRect = <img> 的实际绘制矩形（object-contain 去 letterbox，见下）
  │     pdf   : pageIndex ← 命中哪一个页 canvas（clientY + scrollTop 与各页 rect 比对）
  │             baseRect = 该页 <canvas> 的 rect
  ├─ 2. 归一化
  │     u = (clientX - baseRect.left) / baseRect.width
  │     v = (clientY - baseRect.top)  / baseRect.height
  ├─ 3. [pdf] 旋转折回
  │     page.getViewport({ scale, rotation: pageRotate }) 的逆矩阵，
  │     或直接用 viewport.convertToPdfPoint(x, y) 得到未旋转空间
  └─ 4. 存储 (u, v) ∈ [0,1]²（越界钳制，允许轻微出界以便贴着边缘画）

渲染时反向： u * rect.width + rect.left  →  ctx.transform(...) 施加 canvas 自己的 dpr 与页内偏移
```

**image 的 `baseRect` 必须自己算**，因为今天的 `<img object-contain>` 的 letterbox 是 CSS 决定的、DOM 拿不到（`image-node-content.tsx:58-65`）：

```ts
function containRect(container: DOMRect, naturalW: number, naturalH: number) {
  const ar = naturalW / naturalH;
  const arBox = container.width / container.height;
  const w = ar > arBox ? container.width : container.height * ar;
  const h = ar > arBox ? container.width / ar : container.height;
  return {
    left: container.left + (container.width - w) / 2,
    top: container.top + (container.height - h) / 2,
    width: w,
    height: h,
  };
}
```

**`naturalWidth/naturalHeight` 是"已应用 EXIF orientation"之后的尺寸**（浏览器 `<img>` 的行为），所以这套计算天然与"用户看到的图"一致；但服务端栅格化（`pdf-document-analyzer.ts`）与任何后端缩略图走的可能不是同一个空间。P0 必须用一张 `Orientation=6` 的样张验证（§8）。

**文本图元为什么必须是 DOM**：canvas 画不了 IME（中文输入法候选、组合中状态、选区、光标）。所以 `TextAnno` 的编辑态是一个真实的 `<textarea>` 绝对定位在 `(x, y)`，`fontSize` 由归一化字号 × `baseRect` 换算；提交后才成为数据里的一个图元，并且**在 canvas 上也要重绘一份**（否则"隐藏批注"或导出时会漏掉文字）。字号换算要用 `getComputedStyle` 或固定 `line-height`，避免不同系统的默认行高导致文字在 canvas 与 DOM 两种渲染下高度不一致。

---

## 4. 触控笔与手势

### 4.1 输入源 × 手势 × 结果

| 输入源      | 手势                                   | 批注层（L1）               | image 底图 | pdf 底图    |
| ----------- | -------------------------------------- | -------------------------- | ---------- | ----------- |
| `pen`       | down + move + up                       | **起笔 / 描迹 / 收笔**     | ——         | ——          |
| `pen`       | hover（未接触，`pressure===0`）        | 光标预览（十字）           | ——         | ——          |
| `pen`       | 侧键 / `buttons & 2`                   | 临时切橡皮（P1 可选）      | ——         | ——          |
| `touch` × 1 | drag                                   | **不画**（默认）           | P1 平移    | 滚动 / 平移 |
| `touch` × 2 | pinch                                  | 不画（吞掉直到抬起）       | P1 缩放    | 缩放        |
| `touch` × 2 | 同向 drag                              | 不画                       | P1 平移    | 滚动        |
| `mouse`     | drag（左键）                           | 画（`simulatePressure`）   | ——         | ——          |
| `mouse`     | wheel / ⌘wheel                         | 不画                       | P0 无      | 滚动 / 缩放 |
| `mouse`     | 中键 drag                              | 不画                       | P0 无      | 平移        |
| `keyboard`  | `Space` + drag                         | 不画                       | P0 无      | 平移        |
| 任意        | `pointercancel` / `lostpointercapture` | **收笔**（按已采样点成笔） | ——         | ——          |

"手指=书写"开关打开后，`touch` × 1 这一行改为"画"，其余不变（这是兜底，不是主路径）。

### 4.2 `touch-action` / `pointer-events` 的取舍

| 元素           | `touch-action`     | `pointer-events`           | 理由                                                                             |
| -------------- | ------------------ | -------------------------- | -------------------------------------------------------------------------------- |
| L0 底图        | `none`             | `none`                     | 底图不该被点；它的滚动手势由外层滚动容器（pdf）或画布状态机（image）接管         |
| L1 墨迹 canvas | **`none`**         | `auto`                     | **必须**：否则浏览器会把笔的移动当滚动吞掉（§0.3-2）；代价是自己重建 pinch       |
| L2 文本层      | `auto`             | `none`（除正在编辑的那个） | 只有编辑中的 textarea 需要 DOM 事件（IME）                                       |
| L3 toolbar     | **`auto`**         | `auto`                     | 普通 DOM；**且必须与 canvas 同级而非其子级**，否则按钮上的点击会被画布状态机吃掉 |
| pdf 滚动容器   | `pan-y pinch-zoom` | `auto`                     | 页之间的滚动交给浏览器；缩放由画布层自己算（否则和 L1 的 `none` 打架）           |

### 4.3 双指缩放/平移与单笔书写的仲裁

直接复用 `packages/graph/src/force/eventListener.ts:184-206` 已经验证过的状态机语义，并加两条规则：

```text
touch #1 down                      → 记入 touchPoints；若"手指=书写"关闭则只用于 pan
touch #2 down                      → 进入 pinch：
                                     ① 终止进行中的单指手势
                                     ② 设置 touchGestureLocked = true
                                     ③ 吞掉所有 touch 事件，直到 touchPoints 为空
                                     ④ 中途加入/离开的手指 → 重新锚定（无跳变）
所有 touch up                       → touchGestureLocked = false
pen 任意 pointerdown（未 up）        → 【新增】丢弃所有 touch 的 down/move
pen 抬起                            → 【新增】解冻
```

`pinch` 的计算与 graph 完全一致：`scale = pinchStartScale * (distance / pinchStartDistance)`，并用"midpoint 下的那一点保持不动"避免跳变（`eventListener.ts:239-245`、`:273-284`）。批注层的不同点是缩放目标是**底图坐标系**而不是仿真世界坐标，所以 `pinchWorldX/Y` 换成"页内归一化坐标"。

### 4.4 书写延迟：目标与手段

**目标：笔迹跟手 ≤ 1 帧。** 60Hz 即 ≤ 16.7ms，一加平板 120Hz 即 ≤ 8.3ms。这里的"跟手"定义得可测：从 `pointermove` 回调入口到 `live` canvas 呈现 ≤ 1 帧。

| 手段                           | 采用  | 说明                                                                                                                     |
| ------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------ |
| 输入回调只 push + 请求 rAF     | ✅    | 硬要求。回调里不 stringify / 不写 store / 不 setState                                                                    |
| `getCoalescedEvents()`         | ✅    | 把被合并掉的中间点取回来，笔迹更顺。**非 Baseline**，需 feature-detect + 降级（§0.3-3）                                  |
| `pointerrawupdate`             | ❌    | MDN：不比 `pointermove` 更精确，只是更频繁；非 Baseline，跟不上反而更卡（§0.3-4）                                        |
| `getPredictedEvents()`         | ⏸     | Baseline 2024，能"画在前面"降**感知**延迟；P0 不开，留作实测不达标时的下一步（§8 有测法）                                |
| `streamline` 调大              | ⏸     | 会减小抖动但也增加"笔迹落后于笔尖"的感觉，默认 0.5（`perfect-freehand` 默认值）                                          |
| 离屏 canvas + 每帧只画当前笔画 | ✅    | §3.2                                                                                                                     |
| worker / OffscreenCanvas 渲染  | ❌ P0 | `packages/graph` 用它是因为 d3-force 也在 worker 里（`worker/canvas.ts:1-22`）；批注层没有同等的计算压力，先把复杂度省掉 |

`prefers-reduced-motion` 与书写**无关**：书写是直接操纵，不是装饰动画。要写进共识的是另一件事：**永远不要给笔迹加"生长 / 淡入"动画** —— 那会直接违反"跟手 ≤ 1 帧"。唯一合理的降级是低端机上关掉 `smoothing` / `streamline` 这类后处理。

### 4.5 `pressure` 的归一化

`PointerEvent.pressure` 的语义因设备而异（笔：真实值；鼠标按下：通常 0.5；不支持压感的触屏：0 或 1）。**收笔时判定一次**，不逐点判定：全部点的 `p` 相同、或首点为 `0` → `simulatePressure: true`（此时 `perfect-freehand` 按**速度**模拟压力 —— README 原文："By default, the `getStroke` function will simulate pressure based on the distance between input points"）。`tiltX` / `tiltY`（笔的倾角）**本次不用**：Web 上支持参差，且收益只在艺术笔刷（§7-8）。

### 4.6 视口手势（平移 / 缩放 / 恢复）—— 已实现

§4.1 的表是 P0 的口径（手指只用于将来平移）；本节是**已落地**的视口手势，底图与墨迹共用一套变换。设计新增一条硬约束：

> **底图与批注层不各自持有平移/缩放。** 宿主拥有唯一一个 `ViewportTransform`，用它画底图，并把由**同一组数字**算出的矩形交给批注层（`getBaseRect()`）。两侧因此不是"看起来对齐"，而是同一份数据的两次读。

模块落在 `packages/ui/src/components/pan-zoom/`（宿主无关，pdf 宿主可复用）：

| 文件               | 职责                                                                                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transform.ts`     | 纯数学：`applyTransform`（把底图矩形映射成变换后的矩形）、`zoomAbout` / `pinchTransform`、`clampTransform`（钳制）、`transformToCss`。零运行时依赖，`transform.test.ts` 逐条钉死                                  |
| `recognizer.ts`    | 纯决策：`centroidOf` / `spreadOf`（多指重锚用质心与平均半径，避免 3→2 指跳变）、`classifyTapEnd`（几指轻点 = 撤销/重做/单击）、`isDoubleTap`。`recognizer.test.ts` 钉死阈值                                       |
| `use-pan-zoom.ts`  | 状态的唯一所有者：`{ transform, controller }`。写入按帧合并（rAF），读走 `controller.current()`（含未提交值，连击不会互相吞掉）；原生非 passive `wheel`（普通滚轮平移、Ctrl/⌘+滚轮缩放）；`ResizeObserver` 重钳制 |
| `reset-button.tsx` | `<PanZoomResetButton {...panZoom} />`：**鼠标侧的"恢复位置大小"**，底部居中，只在 `!isIdentityTransform(transform)` 时渲染。宿主无关，pdf 宿主同样一行接入                                                        |

手势口径（全部在**墨迹画布**上识别，它是整个宿主唯一的指针目标）：

| 输入                   | 手势                  | 结果                                                             |
| ---------------------- | --------------------- | ---------------------------------------------------------------- |
| `touch` × 1            | 拖动                  | 平移（`panEnabled`；"手指=书写"打开时改为画线）                  |
| `touch` × 2+           | 捏合 / 同向拖动       | 以两指中点为锚缩放 + 随中点平移；手指增减只做**无跳变重锚**      |
| `touch` × 1            | 单指双击              | **恢复位置大小**（`controller.reset()`）                         |
| `mouse`                | 点击底部恢复按钮      | **恢复位置大小**（宿主渲染，见 §4.6-1；鼠标不做手势）            |
| `mouse` 中键           | 拖动                  | 平移                                                             |
| `wheel` / `Ctrl+wheel` | 滚动 / 缩放           | 平移 / 缩放                                                      |
| `keyboard` `0`         | ——                    | 恢复位置大小                                                     |
| `touch` × 2            | 轻点（<400ms、<10px） | **双指轻点撤回**（撤销一笔）                                     |
| `touch` × 3            | 轻点                  | **三指轻点重做**                                                 |
| `pen`                  | 任意                  | 永不属于视口手势（只画线）；笔按下期间触摸被吞（palm rejection） |

五条实现时必须知道的坑：

1. **恢复位置大小在桌面端是按钮，不是双击。** 鼠标单击必须落墨点（§4.6-4），而双击在浏览器里就是两次单击 —— 要让"双击恢复"不留墨点，只能把每一次单击延后一个双击窗口再提交，或者事后把第一个点删掉；两条都比一个按钮差。所以画布上**没有** `dblclick` 监听（早先那版有，已删）：桌面用 `<PanZoomResetButton>`，触屏用单指双击，键盘用 `0`。顺带一个实测结论记在这里，省得下次再试：Chrome 里合成鼠标 `pointerdown` 的 `PointerEvent.detail` 恒为 0，click count 本来也读不到。
2. **画布必须铺满宿主，而不是只铺底图矩形。** 2:1 的图在 16:9 宿主里左右各有几百像素 letterbox；画布若只盖住图，落在 letterbox 上的那根手指收不到事件，双指捏合会退化成单指平移。墨迹仍只画在 `box`（底图矩形）内，靠 `ctx.translate(box.left, box.top)` 定位，落笔必须命中底图（`inBounds`）。**同一条推论有两个副作用**：① 画布的 `pointer-events: auto` 是必需的（layer 根是 `pointer-events-none`，该属性会被继承，少写一行整个手势面静默消失）；② "隐藏批注"因此不能再靠 `pointer-events: none` 实现，它只停止绘制（`replayCommitted` 清空缓存、`renderFrame` 跳过在画的笔画）——隐藏后手势仍在，这正是"要看原图"时想做的前一步。
3. **缩放的锚点是宿主坐标系**：`origin` 是底图元素自身的 layout 左上角（即 CSS `transform-origin: 0 0`），`zoomAbout(t, f, pivot, origin)` 保证 pivot 不动。底图用 CSS 变换、墨迹用同一组数字重算矩形，两者在 `scale=1` 时都必须**逐像素**回到布局位置——`clampTransform` 对恒等变换直接短路，否则不对称 padding 会让"恢复"偏移半个 padding。
4. **鼠标单击就是墨点**：一次点击和笔尖轻点一样提交一个点，鼠标拖拽和笔一样提交一条笔画。因此恢复位置大小绝不能挂在鼠标双击上（见 §4.6-1）。这个按钮本身也有两条硬要求：外层 `pointer-events-none` + 按钮 `pointer-events-auto`（整条横带否则会从照片底部切走一条画笔够不着的死区），以及 `z-20`（墨迹画布是 `z-10`，压不住的话按钮看得见却点不着，每次点击都变成画布上的一个墨点）。
5. **断线要一起清**：`pointercancel` / `lostpointercapture` 只结束笔画，不判轻点；`visibilitychange→hidden` / `blur` 还要清空视口手势的指针表，否则下一次触摸会拿几分钟前的指距做基线。单指双击的窗口同样会被打断：任何**不是**干净单指轻点的触摸序列（拖动、长按、捏合、被取消）都会作废待定的第一下，所以"点一下 → 拖一下 → 再点一下"不会误判成双击。

**pdf 宿主怎么接（M7 的接口面）**：`PdfDocumentView` 只需 (a) 用 `usePanZoom({ containerRef, getBounds })` 建一个控制器，`getBounds().content` 给当前页（或整条页带）的未旋转盒；(b) 用 `transformToCss(transform)` 画页；(c) 把同一个 `controller` 传给 `<AnnotationLayer panZoom={controller} />`，并在同一个 `relative` 容器里渲染 `<PanZoomResetButton {...panZoom} />`。`recognizer.ts` 与 `geometry.ts` 都不含 image 概念，因此手势与命中测试不需要第二套实现。

---

## 5. 数据与持久化

### 5.1 写入时机

```text
pointerup / pointercancel
  → 图元 push 进内存（React state，用于撤销与 toolbar 计数）
  → NodeService.upsert(nodeId, { content: { ...content, annotations: { version: 1, items } } },
                      { debounce: 2_000 })         ← 由宿主执行，批注层不碰 store
  → visibilitychange → hidden / 关闭编辑器 / 组件卸载时 NodeService.flushPendingUpdate(nodeId)
```

- `NodeService.upsert` 的 debounce 是 **500ms** 默认（`node.service.ts:22-25`），由 `DebounceScheduler` 实现：trailing-edge、按 key 合并、回滚快照取窗口内**第一个** payload（`debounce-scheduler.ts:35-62`）。
- **不能每笔同步写，500ms 也还不够**：一笔 = 一次整条记录的 `update`，连笔时会打出一串写请求，而且服务端已关掉 `autoCancellation`（`backend/infrastructure/AGENTS.md` 记录：自动取消会静默中断同一记录的并发写并**丢数据**）。批注的节奏是 **2s 空闲**，通过 `upsert` 的 `options.debounce` 传毫秒数覆盖（`node.service.ts:22-25` 的 `resolveDebounceMs`）。
- **flush 是现成能力，不需要新建**：`DebounceScheduler` 带 `flush(key)` / `cancel(key)` / `cancelAll()`（`debounce-scheduler.ts:104` / `:130` / `:141`），`NodeService` 暴露为 `flushPendingUpdate(id)` / `cancelPendingUpdate(id)`（`node.service.ts:145-152`）——正是"离开页面前把最后一笔写掉"所需的 API。**注意别用错工具**：`packages/utils` 的轻量 `debounce()` 是 trailing-edge 且无 `cancel/flush`（仓库根 `AGENTS.md` 的跨包契约表有记录），它不是这条路径上的东西。P0 的义务只是**在最合适的时机调用 flush**：`visibilitychange → hidden`、关闭编辑器（`setCurrentEditingNodeId(null)`）与批注层卸载，三处都要。

### 5.2 冲突与协作

| 场景                     | 今天的行为                                         | 是否接受              |
| ------------------------ | -------------------------------------------------- | --------------------- |
| 同一客户端连续笔         | 内存即时、落库 2s 合并                             | ✅                    |
| 两个客户端同一节点       | **后写整体覆盖**（节点级 last-write-wins）         | ✅ 明确接受，§7       |
| 撤销后落库               | 写回的是"当前真值"，覆盖即可，无需增量同步         | ✅ §0.3-7             |
| 远端更新到达本地正在书写 | 本地 collection 未变，继续写；下次落库时以本地为准 | ✅（P2 再谈远端合并） |

P0/P1 必须做对的两个前提（否则 P2 无从下手）：① 图元 `id` 稳定；② 写回是**整体替换数组**，不是"追加"。形态上它已经是一个可 CRDT 化的"带 id 的集合"。

### 5.3 导出与分享

- **烘焙成 PNG（P2，可行）**：底图是 `<img>` 或 pdfjs 的 `<canvas>`，两者都是 canvas 可绘制源。流程 = `OffscreenCanvas(w, h)` → `drawImage(base)` → 逐图元重放（**同一套绘制函数**，只是把归一化坐标乘上像素尺寸）→ `convertToBlob({ type: "image/png" })`。可行性的关键前提是"绘制函数接受 `(ctx, rect, items)` 三元组"，所以 §9 把纯绘制放在 `draw.ts`（不含 React）。pdf 逐页导出或只导当前页。
  **待验证**：跨源图片（PocketBase 在另一个端口）会让 canvas 被 taint，`toBlob` 抛 `SecurityError`。需要 `crossOrigin="anonymous"` 且服务端带 `Access-Control-Allow-Origin`（`backend/infrastructure/AGENTS.md:98` 记录了 `files` 集合有这个头，但上下文是 HLS 分段，**PDF/图片是否同样需要真机确认**）。兜底：走后端导出。
- **烘焙回 PDF（P2，不做）**：把批注写成真正的 PDF 注释需要 `pdf-lib` 之类的**新依赖**，或全部挪到服务端（那里已有 pdfjs + `@napi-rs/canvas`）。收益是"别人用任何阅读器都能看到批注"，成本与本次范围不匹配 —— §7-6。**分享**不需要新语义：批注是节点 `content` 的一部分，可见性跟随节点的 `permission`。

---

## 6. 分阶段路线图

| 阶段   | 交付                                                                                                                                                                                                                                                                                                                               | 验收                                                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **P0** | image 批注全链路：`annotation.ts`（类型）、`draw.ts` / `geometry.ts` / `use-annotation-input.ts` / `annotation-canvas.tsx` / `annotation-toolbar.tsx`、`image-node-content.tsx` 接入；`content.annotations` 贯通 domain VO → application → DTO mapper → infra mapper → **新 PB 迁移** → tRPC `add` schema；`perfect-freehand` 依赖 | 一加平板真机：笔迹跟手 ≤1 帧；手指画不出线；逐笔撤销/重做正确；刷新后批注在；窗口尺寸变化后位置不变；`typecheck` + `lint` 全绿 |
| **P1** | pdf 批注：`pdfjs-dist` 客户端自绘（`pdf-document-view.tsx`）、多页批注层、缩放/滚动/翻页/旋转；toolbar 扩展到荧光笔 / 套索 / 文本 / 箭头 / 形状；iframe 降级路径                                                                                                                                                                   | 在第 3 页画的线，缩放、翻页、旋转后仍贴在同一句话上；pdfjs 失败时 iframe 仍能看；第一次进入不出现白屏或 worker 404             |
| **P2** | 协作与导出：图元级操作日志 + 远端合并策略（或明确保持 LWW）；PNG 烘焙导出（image / 当前页 pdf）；可选 `annotations` 的版本号迁移规约                                                                                                                                                                                               | 两个客户端同时批注不出现"整份批注消失"（按策略覆盖可接受）；导出的 PNG 与屏幕所见像素级一致                                    |

阶段之间不并行推进：P1 的坐标变换链会**反向改写** P0 的 `geometry.ts` 接口（从"一个 rect"变成"rect + pageIndex + 旋转矩阵"），先冻结 P0 的接口再动手会返工。

---

## 7. 边界与取舍

**不做**（本设计明确排除）：

1. **手写识别**（笔迹 → 文字 / OCR）。它要么引服务端模型、要么引 WASM 运行时，与"批注"这个功能不是一回事。
2. **形状识别**（手画一个圆 → 变成真圆）。经典的自由绘制增强，但需要识别器 + "是否替换"的交互决策，本次不做。
3. **图层管理 UI**（多图层、重命名、显隐、排序、锁定）。数据模型里的 `z` 是为它留的，但 P0–P2 不给 UI。
4. **跨页批注**（一条线从第 3 页画到第 4 页，或跨页箭头）。页码是坐标的一部分，跨页会把"一条笔迹"变成"每页一段"，模型与渲染都要改。
5. **像素级擦除**（§3.3）。代价是 mask 存储与跨 dpr 一致性。
6. **把批注烘焙回 PDF 文件**（§5.3）。需要新依赖或服务端实现。
7. **PDF 文字层与文本高亮**（选中一句话 → 高亮）。需要 pdfjs 的文本层 + 文本坐标索引，是独立且不小的一块；本次的"荧光笔"是**手绘**的宽笔迹，不是文字锚定的高亮。
8. **笔的倾斜/笔锋**（`tiltX` / `tiltY` 驱动笔刷角度）。Web 支持参差，收益只在艺术笔刷。
9. **手机（窄屏）适配、协作光标 / 在场感**。目标设备是平板，`<640px` 只保证不崩；在场感属于真协作的一部分，P2 之后再说。

**已知取舍**：

- 归一化 + 抽稀会牺牲极端放大时的精度（1280px 底图上 0.13px，但放大 8 倍就是 1px 级）。
- 整笔擦除意味着"擦掉半笔"做不到；换来的是撤销语义干净、数据体积可控。
- toolbar 浮在内容上，会挡住图片/PDF 顶部一条 —— 靠半透明 + 全屏态可折叠缓解，**不做**"为 toolbar 预留 padding"（那会让底图尺寸随 toolbar 显隐变化，进而让 `baseRect` 抖动）。
- **pdfjs 是本次最大的一笔体积支出**：浏览器侧新增约 1MB 级 parser + 一个 worker（pdfjs-dist 4.10.38 已装在仓库里供服务端使用，浏览器侧要引的是 `build/pdf.worker.min.mjs`）。换来的是"批注能对齐"这一条不可让渡的能力。
- 协作保持节点级 last-write-wins：同一节点两人同时批注会互相覆盖。这是**接受的**，不是遗漏（§5.2 已写死）。

---

## 8. 验证方法

项目**没有测试基础设施**（无 vitest/jest，无 `*.test.*`），验证 = 类型 + lint + 浏览器/真机手测。

```bash
pnpm --filter=@workspace/ui typecheck
pnpm --filter=@workspace/ui lint
pnpm --filter=@workspace/interfaces typecheck
cd backend/domain && pnpm typecheck
cd backend/application && pnpm typecheck
cd backend/infrastructure && pnpm typecheck
cd backend/adapter-front && pnpm typecheck
pnpm --filter=web dev                    # http://localhost:3000
```

### 8.1 手测清单

P0：

1. **跟手**：连续书写 10s，DevTools Performance 录制 —— 不掉帧；延迟测量见 §8.3，目标 P95 ≤ 16.7ms（平板 120Hz 则 ≤ 8.3ms）。
2. **手指不画线**：用指腹在图上划，只平移/不产生图元；用笔在同一位置划，产生图元。
3. **手掌误触**：手掌压住屏、用笔写字，笔迹不出现"从掌心出发的直线"。
4. **撤销/重做**：连画 5 笔 → `⌘Z`×5 → 逐笔消失且不留半截；`⌘⇧Z`×5 全部回来且**形状完全一致**（抽稀前后等价的验收点）。
5. **清除 + 恢复**：清除 → 二次确认 → `⌘Z` 恢复。
6. **归一化**：画一笔 → 把 Dialog 从 1200×800 拖到 800×600 → 笔迹仍贴在底图的同一处。
7. **letterbox 与 EXIF**：极宽（4000×400）与极高（400×4000）的图各画一笔，确认没有整体偏移（`containRect` 的算术）；再上传一张 `Orientation=6` 的照片，在某个可辨认物体的中心画一笔，刷新后仍在中心。
8. **dpr**：浏览器缩放 50% / 100% / 200% 各画一笔，笔迹不得变糊；把窗口拖到另一块不同 DPI 的屏幕上重复。
9. **断线**：书写中途按 `Esc`、切 tab、把指针拖出窗口、在 Dialog 里先滚到底再写 —— 都不留"永远进行中"的笔画。
10. **持久化**：画完立刻刷新（不等 2s）、画完等 3s 再刷新，两种都要在。

P1 追加：

11. **PDF 对齐**：在第 3 页某句话上画圈 → 缩放 200% → 翻到第 5 页再翻回来 → 旋转视图 90° 再转回 → 圈都还贴在那句话上。
12. **worker 与降级**：首屏 Network 面板确认 `pdf.worker.*.mjs` 被加载（不是 404 后回落假 worker）；再把 PDF url 改成 404，确认落到 iframe 分支而不是白屏。
13. **CORS / taint**：调 `canvas.toBlob` 确认不抛 `SecurityError`（这是 §5.3 的前提）。

视口手势（§4.6，已实现）追加：

14. **重叠一致**：画一笔 → 双指捏合放大 → 单指从图中间拖到旁边：笔迹必须**始终贴在底图的同一个位置**（不是"大致跟着"）。再单指双击恢复，笔迹回到原位。
15. **letterbox 上的手势**：找一张很宽（或很高）的图，让左右（或上下）出现大片空白；一只手的两根手指**一根落在空白上**做捏合 —— 仍要缩放（这是 §4.6-2 的判据），不是只平移。
16. **鼠标单击落墨点**：鼠标在图上依次点三下 → 三个点（双击**不**恢复视图，两下就是两个点，见 §4.6-1/4）；同一个位置用笔尖点一下 → 同样一个点。
17. **双指/三指轻点**：画两笔 → 双指轻点一次 → 少一笔；三指轻点一次 → 回来，且形状与原来一致。三个手指**快速**落下抬起才算轻点，拖着走只会平移/缩放。
18. **恢复位置按钮**：拖动或缩放后，宿主**底部居中**出现"恢复位置大小"按钮；点它 → 底图与墨迹同时回位、按钮消失；在恒等状态下不应出现该按钮。按钮只占那一个小胶囊：**按钮左右两侧的照片仍能用笔画**（§4.6-4）。单指双击与键盘 `0` 都要与按钮效果完全一致。另外确认"点一下 → 拖着平移一段 → 再点一下"不会误判为双击（§4.6-5）。

### 8.2 触摸与笔的仿真

**DevTools 触摸仿真**只能造出 `pointerType === "touch"`，**造不出笔**、也造不出 `pressure`。验证"笔专属分支"要用 getter 覆写（本环境唯一可行的做法）：

```js
// 控制台：把当前所有 pointer 事件伪造成 pen。返回一个还原函数。
function forcePointerType(type = "pen") {
  const desc = Object.getOwnPropertyDescriptor(
    PointerEvent.prototype,
    "pointerType",
  );
  Object.defineProperty(PointerEvent.prototype, "pointerType", {
    get: () => type,
    configurable: true,
  });
  return () =>
    Object.defineProperty(PointerEvent.prototype, "pointerType", desc);
}
// 压感同理（真实压力只能靠真机）：用 y 坐标伪造 0→1 的笔压，
// 验证 thinning / simulatePressure 两个分支。
Object.defineProperty(PointerEvent.prototype, "pressure", {
  get() {
    return Math.min(1, Math.max(0, this.clientY / innerHeight));
  },
  configurable: true,
});
```

- **真机**：一加平板 + OPPO Pencil 打开 `http://<容器IP>:3000`。**注意**：非 localhost 的 http **不是 secure context**，而 `getCoalescedEvents()` / `pointerrawupdate` 都要求 secure context（MDN）—— 行为差异**待验证**。若确认有差异，本机开发需要本地 https（或 Chrome 的 `--unsafely-treat-insecure-origin-as-secure`）。
- `packages/graph` 的既有手势代码（`eventListener.ts:184-330`）可以直接在 `/graph` 页对照：两处的 pinch 语义必须一致，否则用户在两个页面上的双指习惯会打架。

### 8.3 延迟测量

在 `pointermove` 回调入口 `performance.mark("ink-in")`，在 rAF 绘制完成后 `performance.mark("ink-out")` + `performance.measure("ink", …)`；取 60 次以上的 P95 与最大值，目标 P95 ≤ 16.7ms（120Hz 屏 ≤ 8.3ms）。**P95 不达标时第一顺位是打开 `getPredictedEvents()`**（§0.3-4），第二顺位才是把渲染挪进 worker。

---

## 9. 文件与依赖清单

**新增**

| 路径                                                                     | 说明                                                                       | 阶段 |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---- |
| `packages/interfaces/src/models/node/nodes/annotation.ts`                | 图元判别联合 + `AnnotationLayerData`（image/pdf 共用）                     | P0   |
| `packages/ui/src/components/annotation/annotation-toolbar.tsx`           | §2（`ToggleGroup` + `Slider` + `Popover` 色板 + `Tooltip` 组合）           | P0   |
| `packages/ui/src/components/annotation/annotation-layer.tsx`             | 宿主无关的外壳：吃 `items` / `onItemsChange` / `tool` / `getBaseRect()`    | P0   |
| `packages/ui/src/components/annotation/annotation-canvas.tsx`            | 墨迹 canvas + rAF 循环 + committed 缓存 + dpr 处理                         | P0   |
| `packages/ui/src/components/annotation/annotation-text-layer.tsx`        | 文本图元的 DOM / IME 层（§3.4）                                            | P1   |
| `packages/ui/src/components/annotation/use-annotation-input.ts`          | pointer 状态机：笔/手指分离、pinch 仲裁、`pointercancel`、flush            | P0   |
| `packages/ui/src/components/annotation/draw.ts`                          | **纯函数**：`perfect-freehand` 包装 + 图元重放（无 React，导出复用同一份） | P0   |
| `packages/ui/src/components/annotation/geometry.ts`                      | 归一化 ⇄ 显示坐标、`containRect`、bbox、命中测试                           | P0   |
| `packages/ui/src/components/annotation/types.ts`                         | UI 侧类型（`Tool`、toolbar 状态）                                          | P0   |
| `packages/ui/src/components/annotation/export.ts`                        | P2：canvas 烘焙 → Blob                                                     | P2   |
| `packages/ui/src/components/dialog/editor/content/pdf-document-view.tsx` | P1：pdfjs 逐页渲染 + 滚动/缩放容器 + iframe 降级                           | P1   |
| `pb/pb_migrations/1700000001_node_annotations.js`                        | 新增 `annotations` json 列（**不得**改 0 号脚本，§0.3-11）                 | P0   |

**修改**

| 路径                                                                       | 改动                                                                                                                                                                                                                | 阶段  |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `packages/ui/package.json`                                                 | `+ perfect-freehand ^1.2`；P1 `+ pdfjs-dist ^4.10`（与服务端同 major）                                                                                                                                              | P0/P1 |
| `packages/interfaces/src/models/node/nodes/single/image.ts`                | `ImageContent.annotations?`（`:14-16`）                                                                                                                                                                             | P0    |
| `packages/interfaces/src/models/node/nodes/single/pdf.ts`                  | `PdfContent.annotations?`（`:11-14`）                                                                                                                                                                               | P1    |
| `packages/ui/src/components/dialog/editor/content/image-node-content.tsx`  | 包一层批注层 + toolbar（`:46-66`）                                                                                                                                                                                  | P0    |
| `packages/ui/src/components/dialog/editor/content/pdf-node-content.tsx`    | iframe → `<PdfDocumentView>`，保留 iframe 兜底（`:44-53`）                                                                                                                                                          | P1    |
| `packages/ui/src/styles/globals.css`                                       | `+ --annotation-1..6`（§2.3）。**若**批注落在新 workspace 包才需补 `@source`，本方案不需要                                                                                                                          | P0    |
| `backend/domain/src/models/node/value-objects.ts`                          | `ImageContent`（`:167`）/ `PdfContent`（`:186`）收 annotations                                                                                                                                                      | P0    |
| `backend/application/src/commands/node/node-command.service.ts`            | `:96` / `:112` / `:348` / `:355` 四处构造 VO 时传 annotations                                                                                                                                                       | P0    |
| `backend/application/src/dto/node-dto.mapper.ts`                           | `:48-53`（image）与 `:61-69`（pdf）两个 content 字面量补 `annotations`；**漏了就是 `hlsUrl` 的翻版**（该文件 `:15-24` 的注释警告过这件事）                                                                          | P0    |
| `backend/infrastructure/src/database/mappers/node.mapper.ts`               | 读 `:272` / `:292`，写 `:481-491` / `:493-501`，各自带上 `annotations` 列                                                                                                                                           | P0    |
| `backend/adapter-front/src/trpc/router/node.ts`                            | `add` 路径的 `imageContentSchema`（`:23-25`）/ `pdfContentSchema`（`:27-30`）补字段。**注意**：`update` 路径的 `content` 是 `z.any()`（`:268`），不会被 strip —— 两条路径行为不同，容易只改一处就"能保存但读不出来" | P0    |
| `packages/ui/src/components/dialog/editor/content/node-content-editor.tsx` | `case "image"`（`:33-34`）/ `case "pdf"`（`:35-36`）改为传批注所需的 props（若批注层需要宿主注入的话）                                                                                                              | P0/P1 |

---

## 参考

- MDN · Pointer events（指针事件模型的基础）：<https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events>
- MDN · `PointerEvent.pointerType`（`"mouse" | "pen" | "touch"`，判不出时为空串；Baseline 2020-07）：<https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerType>
- MDN · `getCoalescedEvents()`（合并损失精度、绘图应用是目标场景；**Limited availability，需 secure context**）：<https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents>
- MDN · `getPredictedEvents()`（估计未来位置以降低感知延迟；**Baseline 2024**）：<https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getPredictedEvents>
- MDN · `pointerrawupdate`（频率更高，但"空间与时间上不比 `pointermove` 更精确"，跟不上会更卡；**Limited availability**）：<https://developer.mozilla.org/en-US/docs/Web/API/Element/pointerrawupdate_event>
- W3C · Pointer Events Level 3（palm rejection 的规范表述：设备**可以**在笔使用期间忽略触摸输入）：<https://www.w3.org/TR/pointerevents3/>、<https://w3c.github.io/pointerevents/>
- `perfect-freehand` README（`getStroke` 输入/输出、`[x, y, pressure]` 与 `simulatePressure: false`、四个主旋钮、`touchAction: "none"` + `setPointerCapture` 示例）：<https://github.com/steveruizok/perfect-freehand>
- `pdfjs-dist` 的 `PageViewport` / `getViewport` / 换算 API（本机 4.10.38 的 d.ts 已核对：`types/src/display/display_utils.d.ts`、`types/src/display/api.d.ts`）：<https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFPageViewport.html>
- PDF.js 的层结构（canvas 层 / 文本层 / 注释层各自职责）与 React 中自建 viewer 的思路：<https://www.nutrient.io/blog/pdfjs-react-viewer-setup/>、<https://dev.to/9haroon/understanding-pdfjs-layers-and-how-to-use-them-in-reactjs-586m>
- Excalidraw · Integration（不支持 SSR，必须客户端 dynamic import + `"use client"`）/ `UIOptions`（只能定制 `canvasActions` / `welcomeScreen` / `tools` / `dockedSidebarBreakpoint`，**没有"只要 freehand"的入口**）/ Export Utilities（`exportToBlob` 只对 Excalidraw 场景元素有效）：<https://docs.excalidraw.com/docs/@excalidraw/excalidraw/integration>、<https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/ui-options>、<https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export>
- `react-pdf-highlighter`（PDF.js 之上，只有**文本/图片 highlight + popover**，没有 freehand；latest 8.0.0-rc.0，最后一次发版 2024-09）与 `pdf-annotate.js`（latest 1.0.0，最后发版 2022-06，已停更）：<https://github.com/agentcooper/react-pdf-highlighter>、<https://github.com/highkite/pdfAnnotate>

> 包体数字（`@excalidraw/excalidraw` 46.8 MB / `perfect-freehand` 112 KB / `pdfjs-dist` 4.x 最新 4.10.38、6.x 最新 6.4.299）取自 npm registry 的 `dist.unpackedSize` / `dist-tags`，测量时间为写作当日；这些数字会随发版变化。
