# M6 — 媒体：播放器与时间戳笔记

> 状态：**待开工**（前提见 §1；G6 见 §M6.4）
> 覆盖：node-content 设计文档 P2 的 **audio/video 半步**——自绘音频播放器 + `<VideoPlayer>` 当前时间订阅 + 共享时间戳笔记（`Mod-Enter` 捕获、点笔记跳转、删除）。**image/pdf 批注属 M5/M7，不在本章**（[设计文档](../node-content/README.md) §5 P2 的另一半）
> 契约：[总纲](./README.md) §1 M6 行（后端＝否、新依赖＝否）、§9 R3（后端 M1 冻结）→ 本章**不改 `backend/**`、不改 `packages/interfaces/**`、不加迁移、不加依赖**；时间基准与数据形状由设计文档 §0.3-10 / §4.3-4 定死
> 相关：[node-content 设计文档](../node-content/README.md) §0.3-9/§0.3-10、§1.3、§1.4、§4.2-12、§4.3-4、§6、§7 手测 6–8、§8；[总纲](./README.md) §2–§4、§6、§8、§9；[gates.md](./gates.md)

---

## 0. 这一章要解决什么

今天这两类节点有播放、没有时间语义：

- `audio-node-content.tsx:38-49` 是一个原生 `<audio controls>`；`video-node-content.tsx:81-93` 是 `<VideoPlayer controls>` + 骨架屏。两者都没有时间轴标记，也没有「在当前播放位置记一句话」的通路。
- 时间基准不能直接落 `HTMLMediaElement.currentTime`（浮点秒，长播放会漂移）：设计文档 §0.3-10 已定为**整数毫秒 `timeMs`**，`TimestampNote { id; timeMs; text; createdAt; updatedAt }`。
- 笔记与 `content.url` 是同一个 `content` 的两半，写回必须走 M1 的共享写者（设计文档 §0.2-5、§4.3-4：整份数组读写）。

本章交付：`media/` 三个新文件 + 三处接线（两个 node-content、`<VideoPlayer>`）+ 一处**必须同批修的既有缺陷**（§M6.2-①）。判据 = §M6.4 的 8 条手测全过，且 `@workspace/ui` 的 `typecheck`/`lint` 相对基线无新增（总纲 §8）。

---

## 1. 依赖与开工前提

| 前提                                                                                     | 状态                                                                                       | 谁负责（引总纲 §）             |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------ |
| `nodes.timestampNotes` 列 + `TimestampNote` 类型 + audio/video content 半边 + 后端全链路   | **未落地**：`timestampNotes`/`TimestampNote`/`timeMs` 在 `packages/*/src`、`backend/*/src`、`pb/pb_migrations` 里 grep 均为零命中 | M1（§1、§4 `1700000001_node_extras.js`、§9 R3） |
| `content/use-node-content-writer.ts`（M6 唯一的写者入口）                                  | **文件不存在**（glob `content/*.ts*` 已核）→ 由 M1 交付                                     | M1（§2.2 未列入独占，可派子 agent） |
| `content/doc-normalize.ts` 的 `normalizeNotes(value)`（脏数组/缺 `timeMs` 丢弃并 warn）    | **文件不存在**（同上）→ 由 M1 交付；M6 只消费                                                | M1（设计文档 §4.2-14）         |
| `file-drop-zone.tsx` 的上传回填改为「读 live content + 合并本半边」                        | **未落地**：audio 分支今天直接写 `content: { url }`（`file-drop-zone.tsx:179-184`），会整包抹掉笔记 | **M2**（§9 R4）                |
| `attributes-sidebar.tsx` 的 content 写路径改读 live content（否则改一次「内容链接」就整包抹掉笔记） | **由 M1 交付**（§9 **R13**：M1 的 T5 白名单已含该文件；本批次把这条修复提前到 M1，好过 M5/M6/M7 各自打补丁） | **M1**（§9 R13）；M6 只做 G6-6 的回归验证 |
| `hls.js ^1.7.3` 已在 `packages/ui`                                                        | 已核（`packages/ui/package.json:33`）；M6 无新依赖（§5 无 M6 行）                            | 无需动作                       |
| M5 / M7（image、pdf 批注）                                                                 | 与本章文件零重叠，**不阻塞**；按 §1 执行顺序先于 M6                                          | 主 agent（§6.4）               |

M6 开工前必须由主 agent 冻结的两处签名（M1 未开工，今天无法读取，**不得在落码时猜**）：

1. `useNodeContentWriter(nodeId)` 必须提供 `patchContent(patch)`（读 live content → 展开 → 覆盖传入的半边 → 微任务 drain 串行发车）。M6 只用这一个方法写 `timestampNotes`。
2. `MediaController`（本章 §M6.1-1 冻结）：`getCurrentTimeMs()` / `getDurationMs()` / `isPaused()` / `play()` / `pause()` / `seek(timeMs)` / `subscribe(listener)`。`seek` 内部 clamp 到 `[0, duration]`，`subscribe` 返回取消订阅。

---

### M6.1 工作分解（任务包）

| #   | 任务                                                                                          | 文件白名单（新增/修改）                                                          | 执行主体                                             | 验收（编译器可判定的部分）                                                                 |
| --- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | 冻结 `MediaController` 契约 + `formatTimeMs(ms)`（`mm:ss` / `h:mm:ss` 展示格式）               | 新增 `packages/ui/src/components/media/types.ts`                                   | **主 agent**（跨组件形状，§2.1-2）                   | 该文件零 React 依赖；`pnpm --filter=@workspace/ui typecheck` 过                              |
| 2   | 自绘音频播放器：播放/暂停、可拖拽进度条、时间读数、速率（0.75/1/1.25/1.5/2）、`marks` 插槽      | 新增 `.../media/audio-player.tsx`                                                  | 子 agent（并行窗口 W5，§3.2 由主 agent 登记）         | 只 import `ui/button`、`ui/dropdown-menu`、`lucide-react`、`media/types`；typecheck/lint 过   |
| 3   | 共享笔记组件：`TimestampNoteMarks`（标记层 + 播放头 + 点击跳转）与 `TimestampNotes`（列表 + 加/改/删） | 新增 `.../media/timestamp-notes.tsx`                                               | 子 agent（W5）                                       | `TimestampNote` 只从 `@workspace/interfaces` 取；typecheck/lint 过                           |
| 4   | `<VideoPlayer>` 暴露当前时间订阅                                                              | 修改 `packages/ui/src/components/video-player/video-player.tsx`                    | 子 agent（W5）                                       | 新增 `onMediaController?` **必须可选**：`video-preview.tsx:63` 与 `video-node-content.tsx:84` 两个既有调用点不改即编译过 |
| 5   | 接线：audio/video node-content（控制器订阅、`patchContent({ timestampNotes })`、`Mod-Enter`）   | 修改 `.../content/audio-node-content.tsx`、`.../content/video-node-content.tsx`     | **主 agent**（跨文件行为 + 写者纪律，§2.1-4）         | 两文件只经 `patchContent` 写 content；`content` 不再出现整包字面量                            |
| 6   | **只验证不改**：属性侧栏的 content 写路径必须已由 M1 改读 live content（否则改 url 会整包覆盖笔记） | 无（M1 的白名单含 `packages/ui/src/components/header/editor-header/attributes-sidebar.tsx`，见 §9 R13）；若 M1 未按 R13 交付，**M6 就地停并回派 M1** | **主 agent**（§2.1-4：跑到 G6-6 才能判定） | 该文件不再出现 `{ ...node.content, ... }` 形状（`grep` 可判；G6-6 是行为判定） |
| 7   | HLS 时间轴验证（§M6.2-②）与其余 G6 手测                                                        | 无（只读 + gates.md 记录）                                                         | **主 agent**（§2.1-4：要用户肉眼/真机判断）           | ——                                                                                          |

**并行窗口 W5（本章新增，须由主 agent 登记进 [gates.md](./gates.md)，§3.2）**：`media/audio-player.tsx` ∥ `media/timestamp-notes.tsx` ∥ `video-player.tsx` 三者文件集不相交，前提是 §M6.1-1 的 `media/types.ts` **已冻结**（同 W2 的纪律）。任务 5–7 由主 agent 收口，W5 期间禁止任何 `pnpm add`/`pnpm install`（§3.2）。

**不在白名单内的文件**：`packages/ui/src/components/index.ts`、`styles/globals.css`、`packages/interfaces/**`、`backend/**`、`pb/**` 一律不动。`media/**` 已被 `globals.css:10` 的 `@source "../**/*.{ts,tsx}"` 覆盖，**无需**加 `@source`（照 §9 R8 的核对方式）；不经 `components/index.ts` 导出（跨包无消费方，且该文件是主 agent 独占面，§2.2-4）。

---

### M6.2 关键决策与挡路的坑

**① 属性侧栏会整包覆盖 `content`，笔记会丢——这是本章必须同批修的既有缺陷（真读到的）。** `attributes-sidebar.tsx:216-223` 的 `handleContentUrlChange` 用**本次 render 的 `node.content` 快照**拼整包：

```ts
const content = { ...node.content, [field]: value } as any;   // :221
void NodeService.upsert(nodeId, { content }, { debounce: true });
```

对 audio/video 它有实际入口（`showContentUrl` 覆盖 audio/video/image/pdf/website，`:274-279`；输入框在 `:390`）。而 `NodeService.upsert` 是顶层浅合并（`node.service.ts:50-53`）、`content` 是整包替换（设计文档 §0.3-3），且 `debounce: true` 会在 500ms 后才发车、payload 在 schedule 时就已捕获（`node.service.ts:66-88`）。后果有两级：改 url 会抹掉这一帧之前的笔记；即便读了 live content，慢发车也可能把「发车后又加的笔记」盖回去。**处置（已收敛到 M1，见 §9 R13）**：把该函数的 content 写路径改走 M1 的共享写者 `patchContent`（`AttributesSidebar` 是组件，可以直接用该 hook），**由 M1 的 T5 一次做完**——因为 image（M5）与 pdf（M7）的批注也走这一个函数，放在 M6 做等于让三章各自面对同一个写入面冲突。顶层字段（`abstract`/`semanticId`/`tags`）今天各写各的、不碰 content，可不动。**M6 的职责因此是验证而不是修**：开工前置检查 = `grep -n '\.\.\.node\.content' packages/ui/src/components/header/editor-header/attributes-sidebar.tsx` 零命中，行为判定 = G6-6。若 M1 未按 R13 交付，**M6 就地停并回派 M1**，不许顺手改（§3.1 的 owner 纪律）。

**② HLS 时间轴（设计文档 §0.3-10 的待验证项）——可执行验证与回填规则。** 已读到的证据：打包命令**没有** `-ss`/`-copyts`/`-start_at_zero`（`ffmpeg-video-transcoder.ts:325-392`），并且专门用 `-muxdelay 0 -muxpreload 0` 把首段归零（该文件 `:371-380` 的注释就是这个目的；分段 4s，`:43`）。所以风险面很窄，但**未实测**。取数与判定：

1. 备好一个 `content.hlsUrl` 非空的 Video 节点（没有就上传一个 mp4，等「正在转码为 HLS…」结束，`file-drop-zone.tsx:305-322`）。
2. **t1（直链）**：PB 后台 `http://127.0.0.1:8090/_/` → `nodes` → 该记录，编辑 `content` JSON **临时删掉 `hlsUrl`** → 保存 → 刷新 web → 双击节点 → 播放 → 停在选定台词的第一个字 → `Mod-Enter` 加笔记 → 读列表里的 `timeMs`。
3. **t2（hls.js）**：后台把 `hlsUrl` 恢复 → 刷新 → 停在同一句 → `Mod-Enter` → 读 `timeMs`。
4. 判据：`|t1 − t2| ≤ 1000ms`（设计文档 §7 手测 7 的 ±1s）。两次读的是**同一个媒体元素**（`video-player.tsx:66-123` 只在 `src`/`hlsSrc` 变化时重装源），所以差异只可能来自时间轴本身。
5. 交叉证据（可选）：`ffprobe -show_entries format=start_time,duration` 对原文件与 `index.m3u8` 各跑一次，看 HLS 侧 `start_time` 是否为 0（本机 `/usr/bin/ffprobe` 存在）。
6. **回填规则**：≤1s → 通过，把设计文档 §0.3-10 的待验证项回填为实测值，不改码；**>1s** → 不阻塞 G6 其余项，但必须 ① 在总纲 §9 增一条偏差（**下一可用编号**：总纲 §9 当前最大是 R36，开工时以那时的最新编号为准，别再写死 R9）；② 回填 §0.3-10 与 §7 手测 7；③ 在 gates.md 遗留列登记；④ **不做运行时补偿**（偏移随源文件与打包参数变化，落常量等于埋雷），同时登记「回退路径（渐进 `url`）与 HLS 路径的笔记时间轴可能不一致」。**若归因指向打包参数本身**（例如需要 `-copyts`/`-start_at_zero` 或改 `HLS_SEGMENT_SECONDS`）——那是一处后端改动，**直接挑战总纲 R3 的「M6 不碰 backend」**：停手，写进报告与 gates.md，由主 agent 决策，**不许顺手改 `backend/`**。

**③ 跳转判据要读「seek 之后的实际 `currentTime`」，不是写进去的值。** HLS 是 4s 分段（`:43`、`:381-388`），设 `currentTime` 后元素可能先落在分段边界再收敛。验收一律暂停后读实际位置；若读回值与目标差 > 0.5s（audio）/ 1s（video），先在 `seeked` 事件里**再设一次** `currentTime` 作为修复，仍不收敛才登记偏差。

**④ 键位归属：不做 `document` 级全局监听。** `Mod-Enter` 挂在媒体内容的根盒（`onKeyDown`，事件从播放器冒泡上来），不做 `document.addEventListener`——总纲 §2.2-5 之外的弹层（QuickPanel、搜索）会与全局键抢；且 `node-editor.tsx:53` 的 `autoFocus={false}` 已表明仓库有意不抢焦点。约定：点一下播放器（或 Tab 聚焦）后 `Mod-Enter` 生效；笔记输入框内 `Enter` 提交、`Shift-Enter` 换行、`Esc` 取消编辑。

**⑤ 视频的传输键交给浏览器默认。** 设计文档 §1.4 的交互表写「与 audio 相同（`Space`/`←`/`→`/`Mod-Enter`）」，但 video 用的是原生 `controls`（`video-node-content.tsx:88`），这几个键浏览器已实现，自己再挂一套会双重处理（双次 seek/双次 toggle）。因此 video 侧只新增 `Mod-Enter`，`F` 全屏沿用浏览器默认（设计文档 §1.4 边界已如此写）。登记为本章决策。

**⑥ `<VideoPlayer>` 不加 overlay 插槽，只加时间订阅。** 设计文档 §1.4 给的是「`children`/`overlay` 插槽**或** `onTimeUpdate` 回调」；`<VideoPlayer>` 的根节点就是那个 `<video>`（`video-player.tsx:125-140`），加插槽就要包一层 div，`className` 的落点会变（`video-node-content.tsx:89` 的 `w-full object-contain` 与 `hidden` 切换依赖它）。因此只加 `onMediaController?`，视频下方的时间轴条由 node-content 作为兄弟节点渲染。**同时纠正设计文档 §1.4 的一句**：它说 `VideoPlayer` 是 `forwardRef<HTMLVideoElement>` 风格，实测**不是**——`video-player.tsx:60` 是内部 `useRef`，该目录与两个 node-content 全仓无 `forwardRef`/`useImperativeHandle`，所以这不是「扩展既有出口」而是「新增出口」（见「附」）。

**⑦ 笔记的 id 与排序。** id 照 dataview 的既有前缀风格（`row_`/`fld_`/`opt_`，`row-utils.ts:19-43`）取 `note_${crypto.randomUUID()}`（回退 `note_${Date.now().toString(36)}_${random}`，同一写法）。排序键 `timeMs` 升序，**同值按 `createdAt` 升序**作显式 tiebreaker（不依赖 `Array.sort` 的稳定性）。展示格式 `mm:ss` / `h:mm:ss` 由 §M6.1-1 的 `formatTimeMs(ms)` 负责；`preview-block` 里的两个 `formatDuration(seconds)`（`video-preview.tsx:10`、`audio-preview.tsx:6`）是模块私有、不可复用，也不改它们。

**⑧ 为什么「笔记 + 上传」无法在同一节点同时发生（真读到的）。** audio/video 的 `FileDropZone` 只在**没有 url** 时渲染（`audio-node-content.tsx:27-36`、`video-node-content.tsx:37-46`），没有 url 就没有播放器、也就没法在播放位置加笔记——两者状态互斥。所以 §M6.4 的并发写者用手测**属性侧栏**（逐条写，`attributes-sidebar.tsx:169`、`:190-213`）作为第二写者；上传路径的整包覆盖归 M2（§9 R4），M6 只回归它。

---

### M6.3 提交切分

1. `media 骨架：MediaController 契约 + 自绘音频播放器 + 共享时间戳笔记组件`
2. `媒体笔记接线：audio/video node-content 接共享写者，VideoPlayer 暴露当前时间订阅`
3. `编辑器属性栏 修：content 写路径改读 live content，媒体笔记不再被整包覆盖`

（闸门未过的修复提交用 `<范围> 修：<失败项>`，与上一提交同章；总纲 §7 规定提交粒度 = 章节粒度。）

---

### M6.4 闸门 G6 — 用户操作清单

入口统一说明：主 agent 起 `pnpm dev:full`（§2.2-5 独占），web 在 `http://127.0.0.1:3000/graph`；建节点 = 左侧边栏「节点」Tab 悬停出现的 `+` → `Add Node` → `Audio`/`Video` → 选一个语义（`main-sidebar.tsx:186`；等价入口：画布右键 → `Add Node`，`graph-context-menu-canvas.tsx:44`）；打开编辑器 = 在图上**双击**该节点（`eventHandler.ts:173-178`）；属性侧栏 = 编辑器头部右侧的 ⓘ 按钮（`editor-header.tsx:50-56`）；全屏 = 头部左上角的「进入全屏」（`fullscreen-button.tsx:29`）；PB 后台 = `http://127.0.0.1:8090/_/`。

| #     | 用户做什么                                                                                                                    | 期望                                                       | 判据或证据                                                                                              | 失败先看哪                                                                                     |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| G6-1  | 打开一个已上传音频的 Audio 节点 → 点播放器（拿到焦点）→ 拖到 1:30 → `Mod-Enter` → 输入文字 → `Enter` → 点这条笔记的时间         | 笔记入列并显示 `1:30`；点击后回到 1:30                      | 列表读数 `1:30`；跳转后暂停位置在 1:29.5–1:30.5（±0.5s）                                                 | `seek` 的 `timeMs/1000` 单位；捕获是否用 `Math.round(currentTime*1000)`；焦点是否在内容盒内       |
| G6-2  | 按 F5 刷新页面 → 重新双击该音频节点                                                                                            | 时间与文本都在，顺序按时间                                  | 逐条与刷新前一致（含 `mm:ss`）                                                                          | `timestampNotes` 是否过了 DTO/zod/infra 三处点名（M1 的活）；是否读到 `undefined` 未按空数组处理  |
| G6-3  | 加 3 条（0:10 / 0:40 / 1:10）→ 删中间那条 → 刷新                                                                                | 删掉的不再出现，其余仍按 `timeMs` 升序                      | 只剩 0:10 与 1:10，刷新后不变                                                                            | 删除是否重写整份数组（§4.3-4）；`onChange` 是否基于 live content 而非渲染快照                     |
| G6-4  | 打开一个 `hlsUrl` 非空的 Video 节点 → 播放 → 在 1:00 处 `Mod-Enter` → 点这条笔记                                                | 笔记落在视频上，点击跳转生效                                | 暂停后读实际位置，与 1:00 之差 ≤ 1s（4s 分段，见 M6.2-③）                                                | 笔记是否挂在同一个 `<video>`（`video-player.tsx:66-123` 只在源变化时重装）                       |
| G6-5  | HLS 时间轴对比：按 §M6.2-② 的 6 步取 t1（直链）与 t2（hls.js）                                                                  | 同一句台词两种路径的时间差 ≤ 1s                              | `\|t1 − t2\|` 的值记进 gates.md；>1s 按 §M6.2-②-6 回填 §9                                                  | 见 §M6.2-②；若归因是打包参数，停手并报主 agent（挑战 R3）                                       |
| G6-6  | 同一 Audio 节点上连续快速交替 >5 次「加笔记 → 删笔记 → 在属性侧栏改摘要」（每次间隔 <1s）                                        | 笔记不丢、不闪回；控制台干净                                | DevTools Console 无 `The request was aborted (most likely autocancelled…)`；每次操作后列表即时反映且 1s 后不再变化 | `attributes-sidebar.tsx:216-223` 是否已改读 live content；`useNodeContentWriter` 的 drain 是否真串行 |
| G6-7  | 把 G6-1 / G6-2 / G6-4 在**窗口模式**（`w-[1200px] h-[80vh]`，`node-editor.tsx:55`）与**全屏模式**（`node-editor.tsx:72`）各做一遍 | 两宿主下进度条、标记层、列表都在内容盒内，不溢出、无滚动条套娃 | 窗口模式下内容盒不出现竖向滚动条；标记位置与进度条填充坐标一致                                            | 是否用了 `100vh`/固定像素高，漏了 `h-full min-h-0`（设计文档 §0.3-9）                            |
| G6-8  | 回归：新建一个**无 url** 的 Audio/Video 节点看上传区；打开一个 HEVC（不可解码）视频看降级提示；悬停一个 video 节点看预览         | 上传区仍在、降级提示仍在、悬停预览仍能播                    | 「点击添加音频/视频」仍在（`file-drop-zone.tsx:354-369`）；「当前浏览器无法解码…」仍在（`video-node-content.tsx:56-79`）；`video-preview.tsx:63` 不传 `onMediaController` 也正常 | `onMediaController` 被写成必填；其余见 §M6.5                                                     |

---

### M6.5 回归面

1. `audio-node-content` 的无 url 分支与骨架屏不变：仍是 `FileDropZone`（`:27-36`）与 `LoadingPlaceholder variant="audio"`（`:40`）。
2. `video-node-content` 的不可解码分支不变：`videoWidth === 0 && videoHeight === 0`（`:48-54`）仍给出提示与「下载原文件」（`:56-79`）。
3. `<VideoPlayer>` 的两条回退路径不变：无 `hlsSrc` → 渐进 `src`（`video-player.tsx:81-84`）；有 `hlsSrc` 但 MSE 不可用 → 原生 HLS（`:110-114`）。
4. `preview-block` 的 audio/video 预览不受影响（两个 preview 用各自的私有 `formatDuration`，本章不改它们）。
5. 属性侧栏的其余字段（摘要 `:169`、语义 `:173`、标签 `:190-213`）行为不变；image/pdf/website 的 url 写路径随 ① 同批改成 live content 后不退化（自动化可判定的部分 = typecheck/lint；行为部分见 G6-8）。
6. `database` / `collection` 节点内容与 dataview 七视图不受影响（本章不碰 `packages/dataview`）。
7. `pnpm --filter=@workspace/ui typecheck` 与 `lint` 相对 [baseline.md](./baseline.md) **无新增失败**（不是「干净」，§8）。
8. `packages/ui/src/components/index.ts`、`styles/globals.css`、`packages/interfaces/**`、`backend/**`、`pb/**` 的 `git diff` 为空（§3.1 所有权核对）。

---

## 附：本章「待验证」回填清单

| 待验证项（出处）                                                                 | 本章怎么验                                        | 回填到哪                                                                                     |
| -------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| HLS 打包后时间轴是否与原始文件一致（[设计文档](../node-content/README.md) §0.3-10、§7 手测 7） | G6-5（§M6.2-② 的 6 步）                            | §0.3-10 与 §7 手测 7 填实测 `\|t1−t2\|`；>1s 时另在总纲 §9 增一条偏差（编号取当时的下一可用值）                              |
| 「`VideoPlayer` 现在是纯 `forwardRef<HTMLVideoElement>` 风格」（设计文档 §1.4）    | **已核否**：`video-player.tsx:60` 是内部 `useRef`，该目录全仓无 `forwardRef`/`useImperativeHandle` | 回填 §1.4 为「内部 ref；M6 新增 `onMediaController` 作为唯一的对外时间出口」                    |
| `useNodeContentWriter` / `normalizeNotes` 的签名（设计文档 §4.2-12、§4.2-14）     | M6 开工前核文件是否存在与签名（今天两者都不存在）  | 本章 §1 前提表；签名与假设不符时就地适配并按 §6.3 判「设计缺陷」→ 记总纲 §9                     |
| 「`z.object` 会剥键、新字段必须三处点名」是否已在 M1 落实（设计文档 §0.3-4）        | G6-2（刷新后仍在即证明链路通）                     | 若丢字段 → 属实现缺陷回 M1 修，M6 不代改后端                                                  |
