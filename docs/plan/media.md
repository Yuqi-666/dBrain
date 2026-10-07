# M6 — 媒体：播放器与时间戳笔记

> 状态：**待测**（第 1 轮：自检 + 真浏览器探针 24/24 全绿，等用户实测 G6；冻结/实现/接线提交与探针明细见 [gates.md](./gates.md) §5 的 G6 条目）
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

| 前提                                                                                                | 状态                                                                                                                                                                                                                                                                                    | 谁负责（引总纲 §）                              |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `nodes.timestampNotes` 列 + `TimestampNote` 类型 + audio/video content 半边 + 后端全链路            | **✅ 已落地（M1）**：`TimestampNote` 在 `packages/interfaces/src/models/node/nodes/single/timestamp-note.ts`，`AudioContent.timestampNotes?` / `VideoContent.timestampNotes?` 已声明                                                                                                    | M1（§1、§4 `1700000001_node_extras.js`、§9 R3） |
| `content/use-node-content-writer.ts`（M6 唯一的写者入口）                                           | **✅ 已落地（M1/M3）**：`packages/ui/src/components/dialog/editor/content/use-node-content-writer.ts`，导出 `useNodeContentWriter`（**实际签名是 3 个必填参数** —— `(nodeId, nodeType, fallback, label?)`，不是 §1 初稿写的 `(nodeId)`）与 `patchContent` / `patchNode` / `liveContent` | M1（§2.2 未列入独占，可派子 agent）             |
| `content/doc-normalize.ts` 的 `normalizeNotes(value)`（脏数组/缺 `timeMs` 丢弃并 warn）             | **✅ 已落地（M1）**：`doc-normalize.ts:90`，非数组 warn 后读作 `[]`，缺 `timeMs` 的成员丢弃                                                                                                                                                                                             | M1（设计文档 §4.2-14）                          |
| `file-drop-zone.tsx` 的上传回填改为「读 live content + 合并本半边」                                 | **✅ 已落地（M2）**：`:370` 用 `useNodeContentWriter` 的 `liveContent`（§9 R4）                                                                                                                                                                                                         | **M2**（§9 R4）                                 |
| `attributes-sidebar.tsx` 的 content 写路径改读 live content（否则改一次「内容链接」就整包抹掉笔记） | **✅ 已落地（M1）**：`:224` 已是 `const { liveContent, patchContent } = useNodeContentWriter<…>`，全文件无 `{ ...node.content, ... }`；M6 只做 G6-6 的行为回归                                                                                                                          | **M1**（§9 R13）；M6 只做 G6-6 的回归验证       |
| `hls.js ^1.7.3` 已在 `packages/ui`                                                                  | 已核（`packages/ui/package.json:33`）；M6 无新依赖（§5 无 M6 行）                                                                                                                                                                                                                       | 无需动作                                        |
| M5 / M7（image、pdf 批注）                                                                          | 与本章文件零重叠，**不阻塞**；按 §1 执行顺序先于 M6                                                                                                                                                                                                                                     | 主 agent（§6.4）                                |

M6 开工前由主 agent 冻结的两处签名 —— **已冻结（2026-10-07，§M6.1-1 落地）**：

1. `useNodeContentWriter(nodeId, nodeType, fallback, label?)` 提供 `patchContent(patch)`（读 live content → 展开 → 覆盖传入的半边 → 微任务 drain 串行发车）。M6 只用这一个方法写 `timestampNotes`。**与 §1 初稿的差异**：实际签名需要 `nodeType` 与 `fallback` 两个额外参数（`nodeType` 用于 `liveContent` 的类型守卫），初稿的单参形态从未存在 —— 就地按实际签名接线，不改 M1 的成品。
2. `MediaController`（`media/types.ts` 冻结）：`getCurrentTimeMs()` / `getDurationMs()` / `isPaused()` / `play()` / `pause()` / `seek(timeMs)` / `subscribe(listener)`。`seek` 内部 clamp 到 `[0, duration]`，`subscribe` 返回取消订阅。
3. **同批冻结的还有**：`createMediaController(element)`（唯一的控制器实现，audio 与 video 共用）、`formatTimeMs(ms)`、`sortTimestampNotes(notes)`（`timeMs` → `createdAt` → `id` 三级排序，返回新数组）、`createTimestampNote(timeMs, text?, now?)`（`note_<uuid>`），以及三个组件的 props 契约 `AudioPlayerProps` / `TimestampNotesProps` / `TimestampNoteMarksProps`（含 `TimestampAddRequest` 的 `Mod-Enter` 语义）。冻结文件零 React 运行时依赖（只 `import type { ReactNode }`），因此其纯函数部分被 `media/types.test.ts` 的 5 条测试钉住（`pnpm --filter=@workspace/ui test` 69 → **74/74**）。

---

### M6.1 工作分解（任务包）

| #   | 任务                                                                                                   | 文件白名单（新增/修改）                                                                                                                              | 执行主体                                      | 验收（编译器可判定的部分）                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | 冻结 `MediaController` 契约 + `formatTimeMs(ms)`（`mm:ss` / `h:mm:ss` 展示格式）                       | 新增 `packages/ui/src/components/media/types.ts`                                                                                                     | **主 agent**（跨组件形状，§2.1-2）            | 该文件零 React 依赖；`pnpm --filter=@workspace/ui typecheck` 过                                                          |
| 2   | 自绘音频播放器：播放/暂停、可拖拽进度条、时间读数、速率（0.75/1/1.25/1.5/2）、`marks` 插槽             | 新增 `.../media/audio-player.tsx`                                                                                                                    | 子 agent（并行窗口 W5，§3.2 由主 agent 登记） | 只 import `ui/button`、`ui/dropdown-menu`、`lucide-react`、`media/types`；typecheck/lint 过                              |
| 3   | 共享笔记组件：`TimestampNoteMarks`（标记层 + 播放头 + 点击跳转）与 `TimestampNotes`（列表 + 加/改/删） | 新增 `.../media/timestamp-notes.tsx`                                                                                                                 | 子 agent（W5）                                | `TimestampNote` 只从 `@workspace/interfaces` 取；typecheck/lint 过                                                       |
| 4   | `<VideoPlayer>` 暴露当前时间订阅                                                                       | 修改 `packages/ui/src/components/video-player/video-player.tsx`                                                                                      | 子 agent（W5）                                | 新增 `onMediaController?` **必须可选**：`video-preview.tsx:63` 与 `video-node-content.tsx:84` 两个既有调用点不改即编译过 |
| 5   | 接线：audio/video node-content（控制器订阅、`patchContent({ timestampNotes })`、`Mod-Enter`）          | 修改 `.../content/audio-node-content.tsx`、`.../content/video-node-content.tsx`                                                                      | **主 agent**（跨文件行为 + 写者纪律，§2.1-4） | 两文件只经 `patchContent` 写 content；`content` 不再出现整包字面量                                                       |
| 6   | **只验证不改**：属性侧栏的 content 写路径必须已由 M1 改读 live content（否则改 url 会整包覆盖笔记）    | 无（M1 的白名单含 `packages/ui/src/components/header/editor-header/attributes-sidebar.tsx`，见 §9 R13）；若 M1 未按 R13 交付，**M6 就地停并回派 M1** | **主 agent**（§2.1-4：跑到 G6-6 才能判定）    | 该文件不再出现 `{ ...node.content, ... }` 形状（`grep` 可判；G6-6 是行为判定）                                           |
| 7   | HLS 时间轴验证（§M6.2-②）与其余 G6 手测                                                                | 无（只读 + gates.md 记录）                                                                                                                           | **主 agent**（§2.1-4：要用户肉眼/真机判断）   | ——                                                                                                                       |

**并行窗口 W5（本章新增，须由主 agent 登记进 [gates.md](./gates.md)，§3.2）**：`media/audio-player.tsx` ∥ `media/timestamp-notes.tsx` ∥ `video-player.tsx` 三者文件集不相交，前提是 §M6.1-1 的 `media/types.ts` **已冻结**（同 W2 的纪律）。任务 5–7 由主 agent 收口，W5 期间禁止任何 `pnpm add`/`pnpm install`（§3.2）。

**不在白名单内的文件**：`packages/ui/src/components/index.ts`、`styles/globals.css`、`packages/interfaces/**`、`backend/**`、`pb/**` 一律不动。`media/**` 已被 `globals.css:10` 的 `@source "../**/*.{ts,tsx}"` 覆盖，**无需**加 `@source`（照 §9 R8 的核对方式）；不经 `components/index.ts` 导出（跨包无消费方，且该文件是主 agent 独占面，§2.2-4）。

---

### M6.2 关键决策与挡路的坑

**① 属性侧栏会整包覆盖 `content`，笔记会丢——这是本章必须同批修的既有缺陷（真读到的）。** `attributes-sidebar.tsx:216-223` 的 `handleContentUrlChange` 用**本次 render 的 `node.content` 快照**拼整包：

```ts
const content = { ...node.content, [field]: value } as any; // :221
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

1. `media 冻结：MediaController 契约 + createMediaController/formatTimeMs/sortTimestampNotes + 三个组件的 props + 5 条纯函数测试`（`5b5728e`，W5 前置）
2. `media 骨架：自绘音频播放器 + 共享时间戳笔记组件 + VideoPlayer 时间出口`（`a872bf0`，W5 两路交付）
3. `媒体笔记接线：audio/video node-content 接共享写者与 Mod-Enter，时间轴/列表入盒`（`c132e86`，主 agent 收口）
4. ~~`编辑器属性栏 修：content 写路径改读 live content`~~ —— **M1 已按 §9 R13 交付**，M6 只验证不改（§M6.1-6 的 grep 与 G6-6）；实测 `attributes-sidebar.tsx` 零命中 `{ ...node.content }`、`handleContentUrlChange` 走 `patchContent`。

（闸门未过的修复提交用 `<范围> 修：<失败项>`，与上一提交同章；总纲 §7 规定提交粒度 = 章节粒度。）

---

### M6.4 闸门 G6 — 用户操作清单

入口统一说明：主 agent 起 `pnpm dev:full`（§2.2-5 独占），web 在 `http://127.0.0.1:3000/graph`；建节点 = 左侧边栏「节点」Tab 悬停出现的 `+` → `Add Node` → `Audio`/`Video` → 选一个语义（`main-sidebar.tsx:186`；等价入口：画布右键 → `Add Node`，`graph-context-menu-canvas.tsx:44`）；打开编辑器 = 在图上**双击**该节点（`eventHandler.ts:173-178`）；属性侧栏 = 编辑器头部右侧的 ⓘ 按钮（`editor-header.tsx:50-56`）；全屏 = 头部左上角的「进入全屏」（`fullscreen-button.tsx:29`）；PB 后台 = `http://127.0.0.1:8090/_/`。

**前置说明（动手前先读，第 1 轮补）**：

1. **素材已在库里**（2026-10-07 实测 `pb/pb_data/data.db`）：workspace 有 **4 个 audio** 节点（`Tech Podcast Episode` / `Team Meeting Recording` / `Developer Interview` / `M1 自检 · audio（可删）`，前三个都指向 `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`）与 **3 个 video** 节点（`Product Demo` / `Getting Started Tutorial` / `Team Meeting Record`，三个都指向 `https://www.w3schools.com/html/mov_bbb.mp4`，`hlsUrl` 列**为空**、`source=online`）。⇒ **G6-1/2/3/6/7 用现成的 audio 节点即可**；G6-4 需要浏览器能拉到那个外部 mp4（拉不动就本地上传一个）；**G6-5 必须自己上传一个视频并等「正在转码为 HLS…」结束**（现成三个视频都没有 `hlsUrl`）。
2. **视频没有自绘传输控件**，是设计决定（保留原生 `controls`）：`Space`/`←`/`→`/`F` 全走浏览器。M6 给视频的只有「同一元素的时间订阅 + 一条兄弟时间轴 + 笔记列表」，所以 G6-4 只需验「笔记落在同一个 `<video>` 上、点击跳转生效」。
3. **音频键盘**（`Space` 播放/暂停、`←`/`→` ∓5s、`Shift` 时 ∓30s）挂在播放器根盒上，点一下播放器（或它的任一按钮）拿到焦点后生效；**焦点停在播放/暂停按钮上时方向键也必须生效**（首轮实现曾在此失效，第 1 轮已修，探针 ② 有反例断言）。
4. **`Mod-Enter`** 挂在媒体内容根盒，不是 `document`：先点一下播放器/内容区再按；Linux/Windows = Ctrl+Enter，macOS = ⌘+Enter。
5. **时间基准是整数毫秒 `timeMs`**，列表里的 `mm:ss` 只是展示（向下取整：89 999ms 显示 `1:29`，与 2:00 总长一起看是预期的）。
6. **笔记的加/改/删都是整份数组写回**，走 M1 的共享写者（读 live content → 只覆盖 `timestampNotes` 半边 → 微任务串行发车）⇒ 改「内容链接」不会再抹掉笔记（G6-6 就是验这条）；`url`/`hlsUrl`/`coverUrl` 在任何笔记写入后都必须原样还在。
7. **标记层与进度条同盒**：标记横向位置 = `timeMs / duration`；点标记本身也能跳转（标记是 3px 宽的按钮，平板上建议点列表里的时间按钮，热区更大）。
8. **笔记行的「编辑 / 删除」**在桌面是悬浮/聚焦可见，触摸设备上恒定可见（`pointer-coarse:`，第 1 轮补）。
9. **列表内 `↑` / `↓`** 在各行时间按钮之间移动焦点（第 1 轮补）；编辑框内方向键仍归 caret。
10. **本章不改后端、不加依赖**（总纲 §1 M6 行、§9 R3）：`timestampNotes` 列与「zod / DTO mapper / infra mapper 三处点名」是 M1 的活 —— G6-2 刷新后数据还在，就说明那条链路是通的。
11. **G6-5（HLS 时间轴）是本轮唯一的「待验证项回填」**：按 §M6.2-② 的 6 步取 t1（直链）与 t2（hls.js）；>1s 时按那里的规则登记（§9 偏差 + 回填 §0.3-10 + gates 遗留），**不许在码里加常量补偿**。
12. **探针已经覆盖、你不必重复判定的部分**（只需看手感）：播放/暂停、拖拽 seek、键盘 ∓5s·∓30s、`Mod-Enter` 捕获与落库、一次手势一次写（无 auto-cancel）、点笔记跳转 ±0.5s、三条升序、删中间、刷新等价、标记与播放头比例、突发加删的串行写、两种宿主尺寸不溢出、无 url 分支、不可解码分支、视频笔记落在同一元素。**只能由你判的**：真机手感、HLS 时间轴（G6-5）、以及**真实上传的音视频文件**上的表现（探针用的是自造 WAV 与页内录制的 WebM）。

| #    | 用户做什么                                                                                                                        | 期望                                                           | 判据或证据                                                                                                                                                                       | 失败先看哪                                                                                           |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| G6-1 | 打开一个已上传音频的 Audio 节点 → 点播放器（拿到焦点）→ 拖到 1:30 → `Mod-Enter` → 输入文字 → `Enter` → 点这条笔记的时间           | 笔记入列并显示 `1:30`；点击后回到 1:30                         | 列表读数 `1:30`；跳转后暂停位置在 1:29.5–1:30.5（±0.5s）                                                                                                                         | `seek` 的 `timeMs/1000` 单位；捕获是否用 `Math.round(currentTime*1000)`；焦点是否在内容盒内          |
| G6-2 | 按 F5 刷新页面 → 重新双击该音频节点                                                                                               | 时间与文本都在，顺序按时间                                     | 逐条与刷新前一致（含 `mm:ss`）                                                                                                                                                   | `timestampNotes` 是否过了 DTO/zod/infra 三处点名（M1 的活）；是否读到 `undefined` 未按空数组处理     |
| G6-3 | 加 3 条（0:10 / 0:40 / 1:10）→ 删中间那条 → 刷新                                                                                  | 删掉的不再出现，其余仍按 `timeMs` 升序                         | 只剩 0:10 与 1:10，刷新后不变                                                                                                                                                    | 删除是否重写整份数组（§4.3-4）；`onChange` 是否基于 live content 而非渲染快照                        |
| G6-4 | 打开一个 `hlsUrl` 非空的 Video 节点 → 播放 → 在 1:00 处 `Mod-Enter` → 点这条笔记                                                  | 笔记落在视频上，点击跳转生效                                   | 暂停后读实际位置，与 1:00 之差 ≤ 1s（4s 分段，见 M6.2-③）                                                                                                                        | 笔记是否挂在同一个 `<video>`（`video-player.tsx:66-123` 只在源变化时重装）                           |
| G6-5 | HLS 时间轴对比：按 §M6.2-② 的 6 步取 t1（直链）与 t2（hls.js）                                                                    | 同一句台词两种路径的时间差 ≤ 1s                                | `\|t1 − t2\|` 的值记进 gates.md；>1s 按 §M6.2-②-6 回填 §9                                                                                                                        | 见 §M6.2-②；若归因是打包参数，停手并报主 agent（挑战 R3）                                            |
| G6-6 | 同一 Audio 节点上连续快速交替 >5 次「加笔记 → 删笔记 → 在属性侧栏改摘要」（每次间隔 <1s）                                         | 笔记不丢、不闪回；控制台干净                                   | DevTools Console 无 `The request was aborted (most likely autocancelled…)`；每次操作后列表即时反映且 1s 后不再变化                                                               | `attributes-sidebar.tsx:216-223` 是否已改读 live content；`useNodeContentWriter` 的 drain 是否真串行 |
| G6-7 | 把 G6-1 / G6-2 / G6-4 在**窗口模式**（`w-[1200px] h-[80vh]`，`node-editor.tsx:55`）与**全屏模式**（`node-editor.tsx:72`）各做一遍 | 两宿主下进度条、标记层、列表都在内容盒内，不溢出、无滚动条套娃 | 窗口模式下内容盒不出现竖向滚动条；标记位置与进度条填充坐标一致                                                                                                                   | 是否用了 `100vh`/固定像素高，漏了 `h-full min-h-0`（设计文档 §0.3-9）                                |
| G6-8 | 回归：新建一个**无 url** 的 Audio/Video 节点看上传区；打开一个 HEVC（不可解码）视频看降级提示；悬停一个 video 节点看预览          | 上传区仍在、降级提示仍在、悬停预览仍能播                       | 「点击添加音频/视频」仍在（`file-drop-zone.tsx:354-369`）；「当前浏览器无法解码…」仍在（`video-node-content.tsx:56-79`）；`video-preview.tsx:63` 不传 `onMediaController` 也正常 | `onMediaController` 被写成必填；其余见 §M6.5                                                         |

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

| 待验证项（出处）                                                                               | 本章怎么验                                                                                         | 回填到哪                                                                                        |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| HLS 打包后时间轴是否与原始文件一致（[设计文档](../node-content/README.md) §0.3-10、§7 手测 7） | G6-5（§M6.2-② 的 6 步）                                                                            | §0.3-10 与 §7 手测 7 填实测 `\|t1−t2\|`；>1s 时另在总纲 §9 增一条偏差（编号取当时的下一可用值） |
| 「`VideoPlayer` 现在是纯 `forwardRef<HTMLVideoElement>` 风格」（设计文档 §1.4）                | **已核否**：`video-player.tsx:60` 是内部 `useRef`，该目录全仓无 `forwardRef`/`useImperativeHandle` | 回填 §1.4 为「内部 ref；M6 新增 `onMediaController` 作为唯一的对外时间出口」                    |
| `useNodeContentWriter` / `normalizeNotes` 的签名（设计文档 §4.2-12、§4.2-14）                  | M6 开工前核文件是否存在与签名（今天两者都不存在）                                                  | 本章 §1 前提表；签名与假设不符时就地适配并按 §6.3 判「设计缺陷」→ 记总纲 §9                     |
| 「`z.object` 会剥键、新字段必须三处点名」是否已在 M1 落实（设计文档 §0.3-4）                   | G6-2（刷新后仍在即证明链路通）                                                                     | 若丢字段 → 属实现缺陷回 M1 修，M6 不代改后端                                                    |

---

## 附二：时间戳数据统一（`timestampNotes` + `subtitles` → `timestamps`）

> 本节记录 M6/M7 之后的一次**数据契约收敛**：时间轴上的笔记与字幕合成一个类型、一列。M1–M7 各节描述的 `TimestampNote` / `SubtitleCue` / `timestampNotes` 列 / `subtitles` 列 / `normalizeNotes` / `normalizeSubtitles` / `sortTimestampNotes` / `sortSubtitleCues` **均已不存在**，读旧章节时以本节为准；M6 各节里「自绘音频播放器」「底部笔记列表」「`TimestampNote.text`」等描述在 video.js v10 迁移时就已经过时，与本节无关。
>
> 触发：用户要求「将 `timestampNotes` 和 `subtitles` 统一成 timestamp data 数据类型及表字段，shape 包括类型、时间戳、内容」。

### 附二.1 形状

`packages/interfaces/src/models/node/nodes/single/timestamp-data.ts`（新文件；`timestamp-note.ts` / `subtitle-cue.ts` 已删）：

```ts
type TimestampKind = "note" | "subtitle";

interface TimestampNoteData {
  id: string; // note_<uuid>，tick → 卡片的身份
  type: "note";
  timeMs: number; // 时间戳（整数毫秒，基准 = 实际播放的媒体）
  content: Record<string, any>; // Tiptap 单段文档
  createdAt: string;
  updatedAt: string;
}

interface TimestampSubtitleData {
  type: "subtitle";
  timeMs: number; // 时间戳：旧的 startMs
  endMs?: number; // 区间可选
  content: string; // 纯文本一行
}

type TimestampData = TimestampNoteData | TimestampSubtitleData;
```

- **`type` 就是判别式**：`content` 因此可以是两种形态（笔记＝文档，字幕＝一行文本），而不是一个「文档或字符串」的模糊联合。
- **`endMs` 可选**（用户选择「保留区间」）：它是可选的，所以 `normalizeTimestamps` 遇到 `endMs <= timeMs` 时**只丢区间、留字幕** —— 旧实现在这种脏数据上会整条丢掉一行台词。
- **`id` 只在笔记变体上**：字幕是只读的，VTT 也没有 id 可留；`TimestampNoteActivation` 只报告笔记 id。
- **进度条刻度只标笔记**（用户选择）：真实字幕成百上千条，全上刻度会把进度条铺满；`NoteMarks` 只吃 `notesOf(timeline)`，字幕从「字幕」页签进入。

### 附二.2 一列一类型，链路逐层

| 层       | 文件                                                                         | 变化                                                                                                                                              |
| -------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 类型     | `packages/interfaces/.../single/timestamp-data.ts`                           | 新增；`AudioContent.timestamps?` / `VideoContent.timestamps?` 取代两个键                                                                          |
| 领域     | `backend/domain/.../value-objects.ts`                                        | `VideoContent` / `AudioContent` 各持一个 `_timestamps`，`withTimestamps()` 取代 `withTimestampNotes()` + `withSubtitles()`；`equals` 只比一个字段 |
| 应用     | `node.dto.ts`、`node-dto.mapper.ts`、`command.ts`、`node-command.service.ts` | DTO content 只点名 `timestamps`；create 与 update 半边各一条                                                                                      |
| 基础设施 | `database/mappers/node.mapper.ts`                                            | 记录接口只留一个 `timestamps?: TimestampData[] \| null`；读写都只碰这一列                                                                         |
| tRPC     | `adapter-front/.../router/node.ts`                                           | `timestampDataSchema`（`z.custom`，按 `type` 校验 `content` 形态）取代 `subtitleCueSchema`；**add 与 update 都收**                                |
| 迁移     | `pb/pb_migrations/1700000003_node_timestamps.js`                             | 加 `timestamps`，把两列折进去，删 `timestampNotes` / `subtitles`                                                                                  |
| 前端读   | `media-player/types.ts`                                                      | `normalizeTimestamps` / `sortTimestamps` / `notesOf` / `subtitlesOf` 取代两组 reader/sorter                                                       |
| 前端写   | `timestamp-sidebar/note-cards.tsx`                                           | **笔记写入现在重写整条时间轴**（笔记 + 字幕），不再只写「笔记半边」                                                                               |

**半边纪律的边界变了**：`content` 的独立半边现在是 `url` / `hlsUrl` / `coverUrl` / `annotations` / `timestamps` 这些**键之间**；`timestamps` 数组内部没有第二个写者（字幕只读，没有转写流程），所以笔记的一次手势 = 一次整数组写回，字幕原样带过去。`normalizeTimestamps` 的懒升级（M6 `text`、旧 `doc`、旧 cue 的 `startMs`）保持「读不写库」，第一次编辑才落新形状。

**顺带关掉的遗留**：`addSchema` 以前不收 `timestampNotes`（[gates.md](./gates.md) 遗留 1：新建时带笔记会被 zod 静默剥掉）。现在两种 kind 同形，`timestampDataSchema` 在 add 与 update 两侧都声明，`createNode` 直接把该数组塞进 content VO ⇒ audio/video 的「新建即带时间戳」这条链路已通。

### 附二.3 迁移与实测

`1700000003_node_timestamps.js`：`up` = 加列 → `findAllRecords("nodes")` 逐条把 `timestampNotes`（`doc`/`text` 都接受）与 `subtitles`（`startMs`/`endMs`/`text`）显式映射进 `timestamps` → 删两列；`down` = 重建两列 → 按 kind 拆回（字符串正文回 `text`、文档回 `doc`）→ 删 `timestamps`。

- **不能让 0/1/2 号迁移改一行**：PocketBase 只按**文件名**去重，`1700000002_node_subtitles.js` 在本机**已经执行过**（`_migrations` 有它、`nodes` 有 `subtitles` 物理列），所以 `subtitles` 是被这次的新文件删掉的，而不是「从没建过」。
- **PB JSVM 的坑（已实测）**：`record.get("<json 列>")` 拿到的是**原始 UTF-8 字节**（goja 把 Go 的字节切片暴露成数字数组，`JSON.stringify` 是 `[91,123,…]`），既不能直接当数组用、手写解码还会把中文变成乱码；`record.getString("<json 列>")` 才是 Go 侧解码过一次的 JSON 文本 ⇒ `JSON.parse(record.getString(...))` 是唯一可用的入口（`null` 列读成 `""`，即「没有时间戳」）。顺带：`app.db().newQuery(...).all()` 在迁移里直接 panic（`Invalid variable type: must be a pointer`），不要用。
- **实测证据**（在本机 `pb/pb_data` 的**副本**上跑 `pb/pocketbase migrate up/down --dir=/tmp/... --migrationsDir=...`，全程不碰用户的 8090 会话）：`up` 后 `nodes` 只剩 `timestamps` 列、两列物理消失；库里 5 条带笔记的记录全部折入（3 条 `doc` 文档 + 2 条 M6 `text`，`你好` / `记录` / `M1 自检笔记` 等中文逐字无损）；`down` 后两列回来、5 条仍在，`text` 形状的正文回到 `text` 键（旧版 reader 认这个键）。
- **上线前提**：迁移在下一次 PocketBase 启动时才会被拾取（PB 按文件名只跑一次）。**没跑迁移就打开媒体节点，时间轴会读成空**（列不存在 → `undefined`）——不是数据丢了，但要在 PB 重启后再看，否则会误判。**不建议**为此删 `pb/pb_data`（会丢全部本地数据）。

### 附二.4 回归面（本次）

1. `pnpm --filter=@workspace/ui test` **103/103**（`types.test.ts` 27 条覆盖统一 reader/sorter：混合 kind 排序、旧 `text`/旧 `doc`/字符串 `content` 三种懒升级、倒区间只丢区间、未知 `type` 丢弃、`notesOf`+`subtitlesOf` 不重不漏、刻度不吃字幕）。
2. `pnpm --filter=@workspace/ui typecheck` = **19 条既有 `../editor/**` 错误**（相对 baseline 无新增）；`lint` = **26 warnings / 0 errors**（同 baseline）。
3. `backend/{domain,application,infrastructure,adapter-front}` 与 `packages/{interfaces,store,services,api-client,hooks}` 的 `typecheck` 均无新增错误（`@workspace/interfaces` 单包仍报 `../utils/src/filter.ts` 找不到 `@workspace/interfaces`，是该包 `paths` 缺裸入口的既有问题，与本次无关）。
4. 数据面：迁移 `up`/`down` 双向实跑（附二.3）。
5. **浏览器侧未验**（本机无浏览器）：v10 播放/拖拽/刻度/热键、tick → 卡片聚焦、字幕页签空态。代码路径与纯函数层已由 1–3 覆盖。

---

## 附三：时间戳侧栏 UI 完善

> 本节记录「完善 timestamp sidebar UI」这一轮（附二之后）。触发：用户要求「完善 timestamp sidebar UI」，并从四个方向中选了 **视觉统一 + 空态**、**播放联动**、**编辑体验** 三项，另加一条要求「**笔记卡片用富文本编辑**」（字幕检索与导出未选，故不做）。
>
> 附二把两条时间轴合成了一列，侧栏因此第一次同时握着「笔记」和「字幕」两份数据；本节把这两份数据的**呈现**收成一套：一行一个时间栏条目、一条播放头、一种空态、一位写者。

### 附三.1 一屏结构（两个页签同一副骨架）

```
┌─ 字幕 12 ─┬─ 笔记 3 ─┐   TabsList（计数在标签里，空则不显示）
│ 0:42 / 3:10   ⌖  跟随 │   工具行：播放头读数 + 定位 + 本页签自己的动作
├──────────────────────┤
│ 0:12  – 0:15   ▍台词… │   ← 正在播的那句：中性底色 + 左侧竖条
│ 0:15  – 0:18    台词… │
└──────────────────────┘
```

笔记页签同一副骨架，工具行的右侧换成「加笔记」，列表里多两样东西：一条**播放头虚线**（插在播放头在当前列表中的位置）和删除后的**撤销条**。

| 新增文件（`packages/ui/src/components/timestamp-sidebar/`） | 作用                                                                                                                                                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timestamp-row.tsx`                                         | 两个页签共用的行：`w-11` 右对齐时间栏 + 正文列 + 悬停/聚焦才出现的动作区。`onActivate` 给整行动作时渲染 `<button>`（字幕，整行 seek），否则渲染 `<div tabIndex=-1>`（笔记，行内自带控件） |
| `use-playhead.ts`                                           | `controller.subscribe` → 量化到 **250 ms** 的播放头；只在**派生值变化**时才 `setState`                                                                                                    |
| `sidebar-controls.tsx`                                      | `PlayheadReadout`（`0:42 / 3:10`）、`LocateButton`（定位到播放位置）、`FollowToggle`（跟随）                                                                                              |
| `sidebar-empty.tsx`                                         | 页签空态：图标 + 一句缺什么 + 一句怎么办                                                                                                                                                  |
| `list-nav.ts`                                               | ↑/↓ 走行（`data-nav-row`，不绕回），两页签共用；文本输入目标（笔记编辑器）保留光标键                                                                                                      |
| `media-player/types.ts`（改）                               | 新增两个纯查询：`activeCueIndex`（谁在说话，空隙为 -1）、`playheadRowIndex`（播放头在列表中的插入位）                                                                                     |

### 附三.2 决策

- **播放联动只订阅一次，并按 250 ms 量化**。`MediaController.subscribe` 在播放时是**每帧**回调（v10 store 的 rAF 循环）；把原始 `currentTimeMs` 放进 React state 等于让一张上千行的字幕表每秒重渲 60 次。`usePlayhead` 把值量化到 250 ms，并且**只在 `{timeMs, label, durationLabel}` 真的变了**才 setState —— `mm:ss` 读数本来最多每秒变一次，字幕切句最多晚 250 ms，代价与收益差距是三个数量级。订阅**只此一处**（Radix 的 `Presence` 会卸载非活动面板，每页签各订一次会随切页签反复挂/卸）。
- **「谁在说话」的边界写在纯函数里，可测**。`activeCueIndex(cues, t)`：`[timeMs, endMs)` 命中；**没有 `endMs` 的 cue 一直说到下一句开始**（最后一句说到无穷），**有 `endMs` 的 cue 到点就停**，所以真实空隙就是空隙（返回 -1）。`playheadRowIndex(items, t)` 返回「t 之前有多少条」= 新条目会插到哪儿，永不返回 -1。两条都在 `types.test.ts` 里钉了边界（起点含、终点不含、空隙、最后一句不过期、同刻两条）。
- **笔记页签画的是「播放头行」，不是「当前笔记高亮」**。笔记是**点**不是段，「离播放头最近的那条」是个没有定义的答案；「你在这两条之间」才是诚实的读法，而且它顺便回答了「现在按 ⌘/Ctrl+Enter 会插到哪」。它用同一条 `playheadRowIndex`，所以显示的插入位和实际插入位**由构造保证一致**，不是两处相似代码。
- **跟随默认开，且随 `scrollIntoView({block:"nearest"})`**。transcript 面板的常态就是「边听边读」；`nearest` 让已经在屏内的句子**不被重新居中**，所以跟随不会和「往下读几行」打架，想自由翻阅就关掉它，回来靠「定位到播放位置」。开关状态**提到 `TimestampSidebar`**：Radix 会卸载非活动面板，放在页签里会每次切回来都忘掉。
- **删除是「先做后确认」，不是弹窗**。侧栏里唯一一次点击就不可逆的动作是删除，而被删的那条是唯一的副本；撤销条给的是**事后**确认（8 秒、只留最近一次、纸条不是回收站），比拦截式 dialog 少一次点击。恢复 = 按时间重排插回，字幕原样带过。
- **空态：图标 + 标题 + 一句怎么办**。笔记空态**不再挂第二个「加笔记」按钮** —— 工具行里那个是常驻、定宽的动作位（页签切换时它不出现/消失），空态再放一个会在 24px 内出现两个同义按钮；字幕空态没有动作可给（没有转写流程，字幕是只读的），所以只说明它会从哪来。
- **笔记卡片用富文本编辑**：`NoteEditor` 包的是 `packages/editor` 的单段 Tiptap（`SingleBlockEditor`），**加粗/斜体/下划线/删除线/行内代码/链接/文字色/高亮/上下标/对齐/行内公式**都在，选区气泡（`SingleBlockToolbar`）随编辑器一起出现；卡片内**原地**进入编辑（同一行、同一时间栏、同一字号），不是弹窗、不是 textarea。三件模板没给的东西由这一层补齐：**Enter 提交 / Esc 取消**（IME 的确认 Enter 先让给输入法；Esc 不冒泡，免得顺手关掉外层节点编辑窗口）、**草稿自动聚焦**、**屏上的「保存 / 取消」**（鼠标/触摸用户无从发现快捷键）。
- **「保存」是提交手势，不只是写库**。空正文没有可存的东西（也不能覆盖真笔记），**没改过**的正文也没有新东西可存：两种情况都直接把编辑收起来，不落到一次只为 `updatedAt` 的 upsert。按钮的 `disabled` 只看「有没有正文」，所以打开就点保存不会像是坏的。按钮与 `Enter` 走同一个 `finish()`。
- **长正文折叠用字符数，不用测量高度**：> 220 字折成 `line-clamp-6` + 「展开 / 收起」。同一个笔记在任何侧栏宽度下折法一致，每张卡片不需要 `ResizeObserver`；浏览器若不认 `line-clamp`，退化成「全显示」，也就是今天的行为。
- **图标按钮用 `Tooltip` 而不是 `title`**，`TooltipProvider` 只挂一次（`timestamp-sidebar.tsx`，`delayDuration=200`）：Radix 的 tooltip context 没有默认值，而「每张卡片一个 provider」就是「每行一个 provider」。
- **活动行不用 `--primary`**：竖条与底色都走中性 token（`bg-muted` + `bg-foreground/30`）。本仓把 `--primary` 留给**用户主动进入**的状态（选中、勾选、激活的筛选），「播放到这儿」不是用户点的。
- **两个页签各自一个 `ScrollArea`**：面板本来就不同时挂载，滚动位置随页签一起消失——从字幕页签的第九分钟切走再切回来回到顶部，这才是切页签该有的意思。

### 附三.3 回归面（本次）

1. `pnpm --filter=@workspace/ui test` **106/106**（原 103 条 + 新增 3 条：`activeCueIndex` 边界、无 `endMs` 说到下一句、`playheadRowIndex` 插入位）。
2. `pnpm --filter=@workspace/ui typecheck` = **19 条既有 `../editor/**` 错误**，`timestamp-sidebar/**`与`media-player/**` **零错误**；`lint` = **26 warnings / 0 errors**（同 baseline，新增文件零告警）。
3. `pnpm --filter=web build`：`✓ Compiled successfully`，随后只剩既有的 `graph/page.tsx` `theme` 类型错误（与本次无关）。
4. **浏览器侧未验**（本机无 Chrome/Chromium/Firefox/Playwright）：跟随时自动滚动的手感、`scrollIntoView` 在 Radix `ScrollArea` 视口内的边界、选区气泡在 ~300px 侧栏里的换位、`line-clamp` 的实际折行数、`Tooltip` 与滚动容器的关系。纯函数与类型面已由 1–2 覆盖。
5. **想看到字幕联动，需要手工造一条字幕**：库里现在没有任何 `type:"subtitle"` 的条目（没有转写流程）。在 PB 后台给某个 audio/video 节点的 `timestamps` 里加一条 `{"type":"subtitle","timeMs":1000,"endMs":4000,"content":"…"}`，播放到 1s 就能看到高亮与跟随。

---

## 附四：侧栏重写（`timestamp-sidebar` → `media-sidebar`）

> 本节记录「删除 `timestamp-sidebar`，重新开发 `media-sidebar` 作为替代」这一轮。**附三描述的全部文件都已删除**（`timestamp-sidebar.tsx` / `timestamp-row.tsx` / `sidebar-controls.tsx` / `sidebar-empty.tsx` / `list-nav.ts` / `note-editor.tsx` / `note-cards.tsx` / `subtitle-cards.tsx` / `use-playhead.ts`）——读附三时以本节为准。附二的数据契约、`media-player/**` 的 reader/writer 与 `use-media-timestamps` 的「一手势一写」纪律**不变**。

### 附四.1 新的形状

```
packages/ui/src/components/media-sidebar/
├── media-sidebar.tsx        根：字幕 / 笔记 / AI 总结 三个页签 + 唯一一次 usePlayhead + TooltipProvider
├── use-playhead.ts          播放头订阅（照搬附三，仍是 250ms 量化 + 派生值比较）
├── subtitle-stream.tsx      字幕流：默认自动跟随；用户接管即脱离并浮出「当前位置」
├── subtitle-card.tsx        一张字幕卡片（默认无样式 / hover / 按下 / 当前帧主题色）
├── note-cards.tsx           笔记页签：唯一的写者 + 加笔记 + 撤销条
├── note-card.tsx            按 note.nodeId 分派：文本卡片 / 节点引用卡片
├── note-text-card.tsx       文本卡片：标题 + 定位 + 更多（转化为节点 / 删除）+ 富文本正文
├── note-reference-card.tsx  节点引用卡片：节点 icon + 节点名（点击打开）+ 取消引用
├── note-card-shell.tsx      两种卡片共用的外框（时间戳本身就是「定位」按钮）
├── note-body-editor.tsx     packages/editor 的单段富文本 + 自动提交
├── use-auto-commit.ts       防抖写入 + blur / unmount flush
└── media-sidebar-empty.tsx  空态（字幕空态带「生成字幕」）
```

宿主侧只有三处改动：`media-node-layout.tsx`（改用 `<MediaSidebar>`，转发转化 / 打开 / 生成三个意图）、`use-media-timestamps.ts`（签名从 `(nodeId, nodeType, content)` 改为 `(node, content)`，并新增 `onCreateNodeFromNote` / `onOpenNode`）、两个 node-content 各一行。

### 附四.2 数据契约：两个可选键，无后端改动

`TimestampNoteData` 增加两个**可选**键：

| 键          | 含义                                                                 |
| ----------- | -------------------------------------------------------------------- |
| `title?`    | 卡片标题；缺省时 `noteTitle()` 用正文首行兜底，但**不写回**库        |
| `nodeId?`   | 有值 = 节点引用卡片；无值 = 文本卡片（这就是两种卡片类型的判别式）   |

`timestamps` 在 tRPC 侧是 `z.custom`（逐字节透传）、在 domain 侧是不透明 JSON、在 PB 侧是 JSON 列，`updateSchema.content` 又是 `z.any()` ⇒ **不需要迁移、不需要改 `backend/**`**。`normalizeTimestamps` 只在键真的存在时带上它们，旧笔记读进来仍是老形状（读不写库，第一次编辑才落新键）。`note-marks.tsx` 的刻度 tooltip 改用 `noteTitle(note)`，节点引用卡片因此也显示标题而不是那份不再展示的草稿。

### 附四.3 决策

- **字幕页签不再有「跟随」开关。** 默认自动跟随（`scrollIntoView({block:"nearest"})`，屏内不重新居中）；`wheel` / `touchmove` / 滚动键 / 拖原生滚动条视为「用户接管」→ 脱离跟随并浮出「当前位置」；点它滚回播放头并**重新跟随**。脱离判定挂在**手势**上而不是 `scroll` 事件上：`scrollIntoView` 自己也会触发 `scroll`，用 scroll 判定会让第一次程序化跟随把自己关掉。
- **当前帧字幕用 `--primary`（`text-primary`）**。附三曾刻意避开 `--primary`，本轮按需求「当前所在帧的字幕字体标主题色」改掉：默认无底色、hover `bg-muted/60`、按下 `active:bg-muted`、当前帧 `bg-muted/40` + 主题色文字 + `aria-current`。
- **字幕页签没有工具行。** 「定位」由「当前位置」按钮承担、「跟随」隐式，读数只留在笔记页签。
- **文本笔记没有「展示态」，卡片即编辑器。** 标题是非受控 `<Input>`（`defaultValue`，避免 store 回显把光标顶到行尾——`node-content-header.tsx` 的 `useEchoSafeText` 解决的是同一个问题，这里不受控是更便宜的答案）；正文是 `SingleBlockEditor`，两者都走 `useAutoCommit`（防抖 600ms + blur / unmount flush）。`SingleBlockRenderer` 不再参与笔记页签，附三点到的 SSR 首屏降级问题随之消失。
- **加笔记开的是「未落库草稿」，空草稿自动取消创建**。卡片本身就是编辑器，没有提交动作，所以新笔记先只存在于组件里；三条边决定它的去向：① **第一次产生真实内容**（`isBlankNote` 判空：标题与正文都只有空白 → 空）即落库，走和其他编辑同一个 `write`；② **没有内容就离开卡片**（点别的笔记 / 播放器 / 任意处）即丢弃——它从未进过库，没有东西要清；③ **有内容时离开卡片即落库**，因为内层编辑器在校验 `blur` 之前先 flush 了自己的防抖（React 的 blur 是内→外冒泡）。草稿渲染的就是同一个 `NoteCard`（排在自己的时间位置上），只是没有「更多」菜单——空笔记的「转化为节点」没有意义。
  - 落库后草稿**不会立刻从本地列表撤下**：`patchContent` 只把 upsert 排进微任务 drain，而 React 会在同一个事件里先 flush，如果这时就把本地副本清掉，会出现「注释实体两边都不存在」的一帧——卡片被卸载、光标丢失。所以本地副本要等 `sorted` 里出现同一个 id 才退休（`draftCommittedRef` 防止重复写入），退休时 key 不变 ⇒ 卡片原地更新、光标保留。
- **一个 `write(updater)` 组合在最新数组的 ref 上**，而不是组合在 `props.timestamps` 上。否则两张卡片各自防抖的正文提交（或同卡片标题 + 正文）会各自从「排程那一帧」重建数组，后发的那次会抹掉先发的。ref 在每次写时乐观前移，store 回显之前也能叠加。
- **删除保留事后撤销条**（8 秒、单层）。「取消引用」与「删除」走同一个删除手势（用户选择：取消引用 = 删除这条笔记，节点保留），所以它同样可撤销。
- **「转化为节点」** 创建 `rich-text` 节点：`title = noteTitle(note)`、`content.docs = note.content`、`semanticId` 沿用媒体节点，然后给笔记写回 `nodeId`。节点由宿主创建（`use-media-timestamps.ts` 的 `onCreateNodeFromNote`），侧栏只发意图并负责写回 `nodeId`，所以创建失败时笔记原样保留、不会变成指向空气的引用。
- **「打开节点」** 走宿主的 `useUIStore.handleNodeEdit`，与 dataview 的 `onOpenNode` 同形。
- **「生成字幕」只预留回调 + 一句提示**：仓库里没有任何转写 / ASR 链路（只有视频转码 `transcodeVideo`）。点击时调用 `onGenerateSubtitles?.()` 并在空态下显示「转写能力尚未接入」，**不做 mock 数据**。
- **AI 总结页签留空**，不放占位文案。

### 附四.4 回归面（本次）

1. `pnpm --filter=@workspace/ui test` **110/110**（原 106 + 4 条：`normalizeTimestamps` 只按存储带上 `title`/`nodeId`、空 `nodeId` 读作无引用、`noteTitle` 的「标题优先 / 正文兜底 / 空正文命名」、`isBlankNote` 的空判（含纯空白与空文档））。
2. `pnpm --filter=@workspace/ui typecheck` = **19 条既有 `../editor/**` 错误**（相对 baseline 无新增）；`lint` = **26 warnings / 0 errors**（同 baseline）；`media-sidebar/**` 零告警。
3. `pnpm --filter=web build`：`✓ Compiled successfully`，随后仍是既有的 `graph/page.tsx` `theme` 类型错误（与本次无关）；`apps/web` 的 `tsc --noEmit` 全量输出里没有任何 `media-sidebar` / `media-player` / `media-node-layout` / `use-media-timestamps` 相关错误。
4. **浏览器侧未验**（本机无浏览器探针）：自动滚动的实际手感、`scrollIntoView` 在窄侧栏里的边界、每张文本卡片一个 Tiptap 实例在长笔记列表下的开销、`转化为节点` 后 `NotionEditor` 对单段文档的还原度、`Tooltip` 与滚动容器的关系。
5. **想看到字幕流，需要手工造一条字幕**（同附三.5）：库里没有 `type:"subtitle"` 条目。在 PB 后台给某个 audio/video 节点的 `timestamps` 加一条 `{"type":"subtitle","timeMs":1000,"endMs":4000,"content":"…"}`，播放到 1s 就能看到主题色高亮与自动跟随。
