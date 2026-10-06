# 执行计划：批注（M5 image 批注 · M7 PDF 自绘与 pdf 批注）

> 状态：**待开工**（前置 M0 → M1 未完成：本文件依赖 M1 落地的 `AnnotationLayerData` 形状与 `nodes.annotations` 列）
> 覆盖：**M5**（annotation:P0，仅「除字段链路」的部分）、**M7**（annotation:P1 + node-content:P3）；闸门 **G5**、**G7**
> 契约：[README.md](./README.md)（执行总纲；本文件写「总纲 §n」时指它）；[../node-content/annotation.md](../node-content/annotation.md)（设计契约——本文件里不带文件名的 `§n` 一律指它）；[../node-content/README.md](../node-content/README.md) §3 / §4.2 / §8
> 相关：[gates.md](./gates.md)（进度真相源）、[baseline.md](./baseline.md)（闸门判据 = 相对基线无新增失败）、[spine.md](./spine.md)（M1 是本文件的地基）
> 一句话：M5 在 image 上做出「归一化坐标 + Canvas 2D 分层 + 笔/手分离」的批注层与 toolbar；M7 用 pdfjs 自绘替掉 `<iframe>`，把**同一套**批注层升到多页 + 缩放/旋转空间。**M5 → M7 硬串行**（§6 明写 P1 会反向改写 P0 的 `geometry.ts` 接口）。

---

## 0. 这一章要解决什么

批注是本章唯一的主题，两个里程碑共用一套数据与一套坐标：

| | 底图 | 坐标 | 本章新增什么 |
| --- | --- | --- | --- |
| M5 | `image-node-content.tsx:46-66` 的 `<img object-contain>` | `(u,v) ∈ [0,1]²`，相对**图片显示矩形**（去 letterbox） | 批注层 + toolbar + pointer 状态机 + 持久化接线 |
| M7 | pdfjs 逐页 `<canvas>` 替掉 `pdf-node-content.tsx:41-55` 的 iframe | `(pageIndex, (u,v))`，相对**未旋转页盒** | `pdf-document-view.tsx` + 多页批注层 + 缩放/滚动/翻页/旋转 + 工具扩到六种 + iframe 降级 |

四条章级契约（与总纲对齐，不重复总纲正文）：

1. **`packages/interfaces` 是 M1 的冻结面，M5/M7 只读。** 图元判别联合与 `AnnotationLayerData` 由 M1 写进 `packages/interfaces/src/models/node/nodes/annotation.ts`（该文件**今天不存在**，已核实），`single/image.ts:14-16` / `single/pdf.ts:11-14` 今天也还没有 `annotations?` 字段。**若 M5/M7 发现形状需要改：停下来报主 agent，由主 agent 走总纲 §9 偏差登记后在 M1 的面上改；子 agent 禁止触碰 `packages/interfaces/**`。**
2. **每章开工第一步 = 主 agent 独自完成依赖与公共文件**：`packages/ui/package.json`（M5 加 `perfect-freehand`、M7 加 `pdfjs-dist`）与 `packages/ui/src/styles/globals.css`（`--annotation-1..6`）。总纲 §2.2 把这两类文件列为独占，§3.1 要求「每章开工时一次装完」。子 agent 一条包管理命令都不许跑。
3. **本章没有迁移。** `nodes.annotations` 列已合并在 M1 的 `1700000001_node_extras.js`（总纲 R2/R3，`pb/pb_migrations/` 今天只有 `1700000000_initial_schema.js`，已核实）。设计文档 §0.3-11 与 §9 里那个 `1700000001_node_annotations.js` **作废**——M5 不准新建任何迁移文件。
4. **写回只有一个通道：M1 交付的共享写者。** node-content/README §3-③ 与 §4.2-12 规定批注是 `content.annotations` 的**整份半边**，经 `patchContent({ annotations })` 走 `use-node-content-writer.ts`（M1 新增，今天不存在）。设计文档 §5.1 写的 `NodeService.upsert(..., { debounce: 2_000 })` 是那条链路的**内部实现**；M5 的义务是接线与 flush 时机，不是自己再写一条 upsert。兜底的 flush 原语已存在：`NodeService.flushPendingUpdate(id)`（`packages/services/src/graph/node.service.ts:145`，实现是 `DebounceScheduler.flush`，`packages/utils/src/debounce-scheduler.ts:104`）。

不做（设计 §7 已排除，本章不再讨论）：手写识别、形状识别、图层管理 UI、跨页批注、像素级擦除、烘焙回 PDF、PDF 文字层与文本高亮、笔锋。

---

## M5 — image 批注（annotation P0，除字段链路）

### 5.1 工作分解（任务包）

**开工即冻结（主 agent，串行，未完成不得开 W2）**：

| # | 任务 | 文件白名单（新增/修改） | 执行主体（主 agent / 子 agent / 并行窗口 W?） | 验收（编译器可判定的部分） |
| --- | --- | --- | --- | --- |
| 0 | 核实 M1 交付面：`AnnotationLayerData` / `Annotation` / `annotations?` 的形状、`use-node-content-writer.ts` 的签名（是否支持按次 debounce 覆盖、`flush` 时机） | 只读，不改文件 | 主 agent | 若形状与设计 §3.1 不符 → 走总纲 §9；若写者不支持 2s 覆盖 → 在本章 5.2 登记决策 |
| 1 | 装 `perfect-freehand ^1.2`；补 `--annotation-1..6` 到 `:root` 与 `.dark` | `packages/ui/package.json`、`packages/ui/src/styles/globals.css` | 主 agent（独占） | `pnpm --filter=@workspace/ui typecheck`；两个块里令牌成对出现 |
| 2 | 冻结 `annotation/types.ts`（`AnnotationTool`、toolbar 状态、layer props）与 `geometry.ts` 的**全部导出签名**（可先落桩实现） | `packages/ui/src/components/annotation/types.ts`、`.../geometry.ts` | 主 agent（独占） | `pnpm --filter=@workspace/ui typecheck` 通过；此后签名变更必须过主 agent |
| 3 | 装配点 `annotation-layer.tsx`：宿主无关外壳（`items` / `onItemsChange` / `tool` / `getBaseRect()`） | `.../annotation-layer.tsx` | 主 agent（独占） | 同上 |

**并行窗口 W2**（总纲 §3.2：`draw.ts`+`geometry.ts` ∥ `annotation-toolbar.tsx` ∥ `annotation-canvas.tsx`+`use-annotation-input.ts`；三个文件集互不相交）：

| # | 任务 | 文件白名单（新增/修改） | 执行主体（主 agent / 子 agent / 并行窗口 W?） | 验收（编译器可判定的部分） |
| --- | --- | --- | --- | --- |
| 4 | W2-a：`draw.ts`（`perfect-freehand` 包装 + 图元重放，无 React）与 `geometry.ts` 的函数体（`containRect` / 归一化⇄显示 / bbox 外扩 / 命中测试） | `.../draw.ts`、`.../geometry.ts`（仅函数体，签名冻结） | 子 agent（W2-a） | `pnpm --filter=@workspace/ui typecheck` + `lint`；`draw.ts` 不 import React |
| 5 | W2-b：`annotation-toolbar.tsx`（shadcn `ToggleGroup` / `Slider` / `Popover` 色板 / `Tooltip`，按 `types.ts` 的冻结类型） | `.../annotation-toolbar.tsx` | 子 agent（W2-b） | 同上 |
| 6 | W2-c：`annotation-canvas.tsx`（`committed` 离屏缓存 + `live` 每帧重绘 + dpr）与 `use-annotation-input.ts`（pointer 状态机：笔/手分离、pinch 仲裁、`pointercancel`/`lostpointercapture`） | `.../annotation-canvas.tsx`、`.../use-annotation-input.ts` | 子 agent（W2-c） | 同上 |

**收口（主 agent，串行）**：

| # | 任务 | 文件白名单（新增/修改） | 执行主体（主 agent / 子 agent / 并行窗口 W?） | 验收（编译器可判定的部分） |
| --- | --- | --- | --- | --- |
| 7 | 宿主接入：`image-node-content.tsx` 包一层 `relative` 容器挂 `<AnnotationLayer>` + `<AnnotationToolbar>`，`<img>` 供 `naturalWidth/naturalHeight`，`ResizeObserver` 重算 `baseRect` | `.../content/image-node-content.tsx`（修改） | 主 agent | `pnpm --filter=@workspace/ui typecheck` + `pnpm --filter=web typecheck` |
| 8 | 持久化接线：落笔 → `onItemsChange` → `patchContent({ annotations })`（整份替换）；`visibilitychange→hidden` / 关闭编辑器 / 卸载三处 flush | 同上 | 主 agent | 同上 |
| 9 | 桌面预跑（G5 的自检证据）：chromium + `localhost` + §8.2 的 getter 覆写脚本，截图 + console 错误 | 不新增文件 | 主 agent | 产出贴进 `gates.md` |

> 越界即停：白名单里没有 `packages/interfaces/**`、`packages/graph/**`、`packages/ui/src/components/dialog/editor/content/file-drop-zone.tsx`（总纲 R4 归 M2）；手势代码只允许写 `use-annotation-input.ts` 这一个文件。

### 5.2 关键决策与挡路的坑

只列会挡路的，设计文档已论证的不重复。

1. **真机 secure context —— 已核实，不需要 https。** `getCoalescedEvents()` / `pointerrawupdate` 要 secure context（§0.3-3），而「非 localhost 的 http」不是。本机核实结果：容器的 netns 是 `net:[4026531840]`（Linux **初始** netns 的 inode），且容器内能看到设备的 `wlan0 10.21.239.179/17` 与 VPN `vgate0 172.30.222.136`——即 Droidspaces 的 host 网络让**容器与安卓同一个网络命名空间**（PID ns 是独立的：`/proc/1/comm` = `bwrap`，这只说明进程隔离，不影响 netns 判断），因此平板上 `http://localhost:3000` 与桌面 `http://localhost:3000` 指的是同一个监听，而浏览器把 `http://localhost` 视作 potentially trustworthy origin ⇒ **localhost 就是 secure context，LAN IP 不是**。佐证：仓库自己的 PB baseUrl 也**硬编码 localhost**（`apps/web/app/providers.tsx:15` → `http://localhost:8090`），说明「用 localhost 访问」已是这个仓库的既有前提。
   **执行口径（按优先级）**：① **主路径**：真机与桌面都用 `http://localhost:3000`（G5 #1 第一件事就是在真机控制台确认 `isSecureContext === true`）；② 桌面专用兜底若必须用 LAN IP：`/usr/bin/chromium --unsafely-treat-insecure-origin-as-secure=http://10.21.239.179:3000 --user-data-dir=/tmp/anno-profile`（Chromium 152 已装，已核实）；③ **Android Chrome 没有可传命令行 flag 的入口**，所以 ② 对真机不适用——真机上若不成立只能把它记为「环境受限，降级验收」；④ `next dev --experimental-https` **不作为候选**：Next 16.1.6 的该分支调 `createSelfSignedCertificate`（`node_modules/.pnpm/next@16.1.6.../next/dist/cli/next-dev.js:314-326`），本机**没有 `mkcert`**（已核实），只有自带 key/cert 才走得通；给安卓装自签 CA 的成本远高于 ①。
2. **跟手延迟不能被自动化验收。** CDP/agent-browser 合成出来的 pointer 事件 `pointerType` 是 `mouse`、没有真实笔的 coalesced 行为与压感（§8.2 开头即写「DevTools 触摸仿真造不出笔、也造不出 pressure」）。所以：桌面预跑只覆盖**逻辑面**（分支、撤销、归一化、断线、持久化），**P95 延迟与笔感一律真机测**，由 G5 #2 判定；真机不可用时按总纲 §10 风险表登记「P95 一项：环境受限，未验收」。
3. **`types.ts` + `geometry.ts` 是被 W2 三条线共同消费的唯一接口面**，所以它必须由主 agent 先落签名再派人——否则三条线会各自发明一套 `baseRect` / `Tool` 形状，合并时整章返工（这正是总纲 §3.2 W2 前提那句话的意思）。`geometry.ts` 的**签名冻结只对 W2 有效**：M7 会反向改写它（见 7.2-1），因此 `geometry.ts` 的 JSDoc 必须写明「这是一次性接口，P1 会换成 `(rect + pageIndex + 旋转矩阵)`」，避免后来者以为它是稳定 API。
4. **`pointercancel` / `lostpointercapture` / `visibilitychange` / `blur` 四条监听是硬要求**（§0.3-8）。本项目的特殊处：node-content 既在 Dialog（`node-editor.tsx:55`，`w-[1200px] h-[80vh]`）也在全屏（`:72`，`absolute inset-0 z-50`），而 Dialog 的内容区是 `overflow-y-auto`（`:105`）——`touch-action: none` 只写在画布上，父层滚动仍可能抢走某个方向的指针序列。断线四条 + `setPointerCapture` 缺一个都会出现「写着写着停在半截」。
5. **dpr 必须贯穿到离屏缓存**：`committed` 与可见 canvas 用同一个 `Math.max(1, devicePixelRatio ?? 1)`，且 dpr 变化要**重建缓存并重绘**（仓库先例：`packages/graph/src/force/ForceGraph.tsx:177` / `:226` / `:789`，事件侧注释在 `eventListener.ts:32`/`:77`/`:119`）。只设 `style.width/height` 会得到模糊笔迹。
6. **抽稀只在写回前做**，渲染用全量点；输入回调里**只 push + 请求 rAF**（不 `JSON.stringify`、不写 store、不 setState）——这是「跟手 ≤ 1 帧」的先决条件，也是唯一能被 review 的硬规则。
7. **颜色令牌今天不存在**：`globals.css` 里没有任何 `--annotation-*`（已 grep），`:root` 在 `:19`、`.dark` 在 `:54`。M5 只加令牌；**不加** `@source`（总纲 R8：批注落在 `packages/ui/src/**`，`globals.css:10` 的 `@source "../**/*.{ts,tsx}"` 已覆盖）。
8. **依赖的好消息**：`perfect-freehand@1.2.0` **已在 pnpm store 里**（`@excalidraw/excalidraw` 的传递依赖，`pnpm-lock.yaml:8509` 的 snapshot 在 `:8532` 声明了它；`packages/editor/package.json:11` 声明了 excalidraw）。所以 `^1.2` 不需要新的网络下载，但这不改变总纲 §5 的纪律：`packages/ui` 必须**显式声明**（不能靠 editor 的传递依赖 —— 那会让 `@workspace/ui` 的 typecheck 依赖 node_modules 的提升行为），并且仍要过 M0 的 registry 可写性修复。
9. **`readOnly` 隐藏 toolbar（§2.4）今天无处可传**：`node-content-editor.tsx:26-34` 只传 `node` + `className`。M5 只在批注层留一个可选 prop 并把默认值定为 `false`，**不为它新建宿主链路**，G5 也不测它（登记为 §9 偏差候选，见 5.5）。

### 5.3 提交切分

1. `annotation 契约与依赖：冻结 UI 侧 types/geometry 签名，装 perfect-freehand，补 --annotation-1..6 令牌`
2. `annotation 绘制与输入：draw 纯函数 + committed/live 双层 canvas + pointer 状态机（笔手分离/pinch 仲裁/断线收笔）`
3. `image 批注接入：toolbar + 批注层挂进 image-node-content，annotations 半边经共享写者落库并在三处 flush`

### 5.4 闸门 G5 — 用户操作清单

前置：主 agent 起 `pnpm dev:full`（PB 8090 + web 3000 + server 3001），确认 M1 迁移已跑（`nodes` 有 `annotations`），并把 3–10 的可自动化部分用桌面预跑跑过一遍。**真机与桌面要分别标注。**

| # | 用户做什么（必须含具体入口） | 期望 | 判据或证据 | 失败先看哪 |
| --- | --- | --- | --- | --- |
| 1 | **真机**：一加平板 Chrome 打开 `http://localhost:3000`（**不是** LAN IP）→ 页面能加载、节点数据能出来。要读 `isSecureContext` 就走**桌面侧**：在容器里用 chromium/`agent-browser` 打开同一个 `http://localhost:3000`，控制台执行 `isSecureContext`（`localhost` 的可信性判定是浏览器引擎级的，桌面与安卓 Chrome 同结论）。加强项（可选）：`adb` 连上平板后从桌面 `chrome://inspect` 远程调试真机页面直接读——**今天 `adb devices` 为空，需用户先打开 USB/无线调试** | 桌面侧读到 `true`；真机侧页面正常、能画 | 桌面控制台截图 + 真机页面截图 | 是否误用 `10.21.239.179`；`pnpm dev:full` 是否在跑；容器 netns 是否真为共享（5.2-1）。两者都不便时的**行为判据**：笔迹顺滑无分段折线（= coalesced 路径生效） |
| 2 | **真机**：打开一个已有 image 节点（侧栏/图库里任意图片节点 → 编辑器 → 图片内容），用**笔**连续书写 10s | 跟手：笔尖与墨迹无可感滞后，不掉帧、不糊 | DevTools Performance 录制无长任务；§8.3 的 `performance.mark/measure("ink")` 取 ≥60 次样本，P95 ≤ 16.7ms（120Hz 屏 ≤ 8.3ms） | 输入回调是否 setState / stringify；rAF 合帧是否写对；§0.3-4 的第一顺位 `getPredictedEvents()` 是否被误开 |
| 3 | 同一张图上：先**用指腹划**，再用**笔划**；随后手掌压屏用笔写字 | 手指不产生任何图元（默认）；笔能画；不出现「从掌心出发的直线」 | 撤销按钮的可用状态与目视图元数变化；手掌测试无直线 | `use-annotation-input.ts` 的 `pointerType` 分支与「pen 活跃期丢弃 touch」；`touch-action` 是否落在画布上 |
| 4 | 连画 5 笔 → `⌘Z` × 5 → `⌘⇧Z` × 5 | 逐笔消失、不留半截；重做后形状与原来**完全一致**（抽稀前后等价） | 目视 + 撤销/重做各步截图对比 | 撤销栈是否存操作记录（§0.3-7）；抽稀阈值是否改动了几何 |
| 5 | 画一笔 → 把编辑器窗口从 1200×800 拖到 800×600 → 再切「全屏」再切回窗口 | 笔迹始终贴在底图同一处（不改字体缩放、不整体偏移） | 两次尺寸下的截图叠加对比 | `containRect` 的算术；`ResizeObserver` 是否重算 `baseRect` 并重绘 committed |
| 6 | 书写**中途**分别：按 `Esc`、切到另一个 tab 再切回、把指针拖出窗口、在 Dialog 里先滚到底再写 | 都不留「永远进行中」的笔画；进行中的那一笔按已采样点收笔 | 松手后 toolbar 的图元计数稳定、没有停滞的半截线 | 四条监听（`pointercancel` / `lostpointercapture` / `visibilitychange` / `blur`）与 `setPointerCapture`；父层 `overflow-y-auto` 抢指针 |
| 7 | 画完**立刻**刷新（不等 2s）→ 再画一笔等 3s 再刷新 | 两种情况刷新后批注都在 | PB 后台 `nodes` 的 `annotations` 列非空且 `version:1`；**顺便**记录一笔的 JSON 体积（设计 §0.2-① 的 2–4KB 待实测） | 三处 flush 时机；共享写者的 debounce 是否真被覆盖成 2s |
| 8 | 点「隐藏批注」→ 再点回；点「清除」→ 二次确认 → `⌘Z` | 隐藏只改可见性、不动数据；清除需二次确认且能被一次 `⌘Z` 恢复 | 隐藏时刷新，批注仍在；清除后撤销，图元回来 | 隐藏是否被实现成「删数据」；清除是否进了撤销栈 |
| 9 | 极宽（4000×400）与极高（400×4000）的图各画一笔；再上传一张 `Orientation=6` 的照片，在某个可辨认物体的中心画一笔后刷新 | 无整体偏移；EXIF 旋转后的图仍对准 | 刷新前后同一物体的位置对比截屏 | `containRect` 与 `naturalWidth/naturalHeight`（设计 §3.4 说明它已应用 EXIF） |
| 10 | **桌面**：浏览器缩放 50% / 100% / 200% 各画一笔；（若有两块不同 DPI 屏）把窗口拖到另一块屏再画 | 笔迹不变糊；跨屏后不出现「旧的缓存尺寸」 | 三档缩放下笔迹边缘清晰度截图 | dpr 变化是否重建了 `committed`（§0.3-6） |
| 11 | 无需动手：看主 agent 的桌面预跑结论（注入 §8.2 的 `pointerType` / `pressure` getter 覆写脚本 + CDP 鼠标合成） | 3/4/5/6/7 的逻辑分支在桌面上先成立；`pointerType` 覆写成 `pen` 后能画、改成 `touch` 后不画 | 预跑截图 + console 无报错 | 覆写是否被 React 重渲染丢掉；`pressure` 覆写是否用了 `clientY/innerHeight` |
| 12 | **降级登记**（仅当 1 不成立或真机不可用）：按总纲 §6.3 把「P95 延迟」与「笔手感」判为「环境受限，未验收」 | 剩余逻辑面全部通过，缺口逐条写进 `gates.md` 的遗留列 | `gates.md` 的遗留列有具体条目 | 不许口头放过（总纲 §6.2-1） |

### 5.5 回归面

逐条可测，全部相对 [baseline.md](./baseline.md)：

1. **上传不吞批注**：给一个已有批注的 image 节点重新走 `FileDropZone` 上传 → 批注仍在（走的是 M2 的 `file-drop-zone.tsx` 半边合并，M5 没碰它）。
2. **无批注的旧记录**：一个 `content` 只有 `{url}` 的旧 image 节点打开不报错、toolbar 可用（`annotations` 为 `undefined` → 空数组）。
3. **画布不吃界面事件**：toolbar 按钮、颜色 popover、Dialog 关闭按钮都能点；图片上右键/长按仍能出既有菜单（§4.2 的层级契约：L3 与 canvas 同级而非子级）。
4. **其它 9 种 node-content 不受影响**：database / collection / text / rich-text 各打开一次无变化（共享写者是 M1 的，M5 只消费）。
5. **`@workspace/graph` 的双指语义逐字不变**：`/graph` 页的双指缩放/平移与 M5 的手感一致（§8.2 末尾的要求），且 M5 没有改 `packages/graph/**`。
6. **静态检查**：`pnpm --filter=@workspace/ui typecheck` / `lint` / `pnpm --filter=web typecheck` 相对基线无新增失败。

---

## M7 — PDF 自绘与 pdf 批注（annotation P1 + node-content P3）

### 7.1 工作分解（任务包）

**开工即冻结（主 agent，串行）**：

| # | 任务 | 文件白名单（新增/修改） | 执行主体（主 agent / 子 agent / 并行窗口 W?） | 验收（编译器可判定的部分） |
| --- | --- | --- | --- | --- |
| 0 | 装 `pdfjs-dist ^4.10`（同 major 硬约束）；核实现装版本 | `packages/ui/package.json` | 主 agent（独占） | `pnpm --filter=@workspace/ui typecheck` |
| 1 | 冻结 `PdfDocumentView` 的 props 与 `geometry.ts` 的 **P1 新签名**（`rect + pageIndex + 旋转/缩放矩阵`），并把它作为 M5 冻结面的**显式解冻点**写入 JSDoc | `.../content/pdf-document-view.tsx`（新增，先签名/壳）、`.../annotation/geometry.ts`（改签名） | 主 agent（独占） | 同上；解冻后 W2 的三条线已合并，无并发写者 |
| 2 | worker 加载方案落地（`workerPort`，见 7.2-2）并验证不 404 | `.../content/pdf-document-view.tsx` | 主 agent | `pnpm --filter=web build` 通过（总纲 §10 对 M4 用同一条命令压依赖风险） |

**并行窗口：不开。** M7 的三个工作面（渲染 / 批注坐标 / toolbar 扩展）都改 `geometry.ts` 或 `annotation-canvas.tsx`，文件集相交（总纲 §3.2 的并行前提不成立）。若要拆，只能按「先渲染层、后批注层」串行拆子章（`M7.1`/`M7.2`），且各自过闸——**不推荐**，G7 的对齐判据本来就要求两者同时在位。

| # | 任务 | 文件白名单（新增/修改） | 执行主体（主 agent / 子 agent / 并行窗口 W?） | 验收（编译器可判定的部分） |
| --- | --- | --- | --- | --- |
| 3 | pdfjs 逐页渲染：`getDocument` → `page.getViewport({scale, rotation})` → `page.render({canvasContext, viewport})`，自建滚动容器 + 翻页 + 缩放（pinch/⌘wheel）+ 旋转 | `.../content/pdf-document-view.tsx` | 子 agent（签名已冻结） | `pnpm --filter=@workspace/ui typecheck` + `lint` |
| 4 | 多页批注层：每页一块 L1 canvas（尺寸严格等于该页 canvas），命中测试先定位页再页内归一化 | `.../annotation/annotation-canvas.tsx`、`.../annotation/annotation-layer.tsx` | 子 agent | 同上 |
| 5 | 坐标升维：`geometry.ts` 施加 `PageViewport` 逆矩阵，存储落在**未旋转空间** | `.../annotation/geometry.ts` | 子 agent | 同上 |
| 6 | 在 M5 的「笔 / 橡皮」之外补上设计 §2.1 的其余工具（荧光笔 / 套索 / 文本框 / 箭头 / 矩形·椭圆）+ 文本图元的 DOM/IME 层 | `.../annotation/annotation-toolbar.tsx`、`.../annotation/annotation-text-layer.tsx`（新增） | 子 agent | 同上 |
| 7 | 宿主切换到自绘视图，`<iframe>` 退为失败兜底 + 懒加载 | `.../content/pdf-node-content.tsx`（修改） | 主 agent | `pnpm --filter=@workspace/ui typecheck` |
| 8 | CORS / taint 探测（§5.3 的前置）与桌面预跑 | 不新增文件 | 主 agent | 结论贴进 `gates.md` |

**文件落点决策（新增，总纲未定）**：pdfjs 视图落在 `packages/ui/src/components/dialog/editor/content/pdf-document-view.tsx`（设计 §9 的路径），若需拆子模块则用同目录的 `pdf-*` 前缀。**不新建 `packages/ui/src/components/pdf/`**——node-content/README §8 给的 `components/pdf/*` 是同一件事的另一种落点，两个入口会立刻产生「哪个是真入口」的问题，而 `node-content-editor.tsx:29-62` 只认得 `content/` 目录。

### 7.2 关键决策与挡路的坑

1. **M5 → M7 硬串行，且要说清「冻结什么、允许改什么」。** 设计 §6 末句：P1 的坐标变换链会**反向改写** P0 的 `geometry.ts` 接口（从「一个 rect」变成「rect + pageIndex + 旋转矩阵」）。据此分工：
   - **M5 冻结（G5 通过前不许动）**：`annotation/types.ts` 的全部导出、`annotation-layer.tsx` 的宿主契约（`items` / `onItemsChange` / `tool` / `getBaseRect()`）、`geometry.ts` 的签名（**仅 W2 期间**，G5 通过后自动解冻）。
   - **M7 允许改**：`geometry.ts` 的导出签名与实现（升维到 `rect + pageIndex + 缩放/旋转矩阵`）、`annotation-canvas.tsx` 的页内偏移与缓存 key、`annotation-layer.tsx` 的 props（新增 page/rotation 输入）、`annotation-toolbar.tsx`（扩工具）。
   - **M7 不许改**：`Annotation` / `AnnotationLayerData` 的形状（属 `packages/interfaces`，M1 冻结，要改只能主 agent 走 §9）；`use-annotation-input.ts` 的手势仲裁语义（改它等于让 G5 的 #3/#6 全部重测）；`draw.ts` 的绘制语义（`draw.ts` 无 React、无页概念，pdf 只是把归一化坐标乘上不同的像素尺寸）。
2. **worker 加载：用 `workerPort`，不要赌 `workerSrc` 的字符串解析。** 仓库既有范式是 `new Worker(new URL("./worker/force.worker.ts", import.meta.url), { type: "module" })`（`packages/graph/src/force/ForceGraph.tsx:239`），它让打包器把 worker 当资源处理。pdfjs 4.10.38 提供了两个正规绕过口：`GlobalWorkerOptions.workerPort`（类型注释原文「Overrides the `workerSrc` option」，`pdfjs-dist/types/src/display/worker_options.d.ts:8`）与 `new PDFWorker({ port })`（`.../api.d.ts:1442`）。**主路径**：按仓库范式 `new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), { type: "module" })` → 赋给 `workerPort`（该文件在包内确实存在：`node_modules/.pnpm/pdfjs-dist@4.10.38/node_modules/pdfjs-dist/build/pdf.worker.min.mjs`，已核实；另一个 `pdf.mjs` 也是浏览器构建）。**兜底**：把 worker 拷成静态资源 + 设 `workerSrc` 为普通路径——注意 `apps/web/public/` **今天不存在**（已核实），走这条路要新建目录，属于跨包改动，由主 agent 决策。**再兜底**：iframe（见 7.2-5）。`packages/ui` **不能引 `next/*`**（§0.3-10），懒加载只能用 `React.lazy` + `"use client"`。
3. **同 major 是硬约束。** `backend/infrastructure/package.json:13` 已锁 `^4.10.38`（服务端走 `pdfjs-dist/legacy/build/pdf.mjs`，`backend/infrastructure/src/parsers/pdf-document-analyzer.ts:32`、`:46`），本机 store 里就是 **4.10.38**（已核实）。`packages/ui` 必须显式声明 `^4.10`，否则会出现两份 pdfjs。
4. **旋转与缩放都不进存储。** `getViewport` 省略 `rotation` 时取页面 `/Rotate`（`pdfjs-dist/types/src/display/api.d.ts:242-247` 的型注释），用户还能再叠一层视图旋转；故**存未旋转空间**，渲染时施加同一个 viewport 矩阵。官方双向换算就在 `PageViewport` 上：`convertToViewportPoint` / `convertToViewportRectangle` / `convertToPdfPoint`（`.../display_utils.d.ts:179` / `:187` / `:197`）。把「用户当前看到的旋转」烘进坐标 = 「昨天画的圈今天歪了」（§0.3-9）。
5. **降级要覆盖四类失败，不能只覆盖 404。** `getDocument` 的 `PasswordException` / `InvalidPDFException` 有既有分类（`pdf-document-analyzer.ts:108-117` 是服务端的同一套 name 判定），加上 worker 构造失败与 CORS 失败，四类都要落到 iframe 分支（能看不批注，而不是白屏）。
6. **缓存失效的 key 必须含 `(pageIndex, scale, rotation, dpr)`。** `annotation-canvas.tsx` 的 `committed` 离屏缓存与 dpr（5.2-5）在 pdf 上多两个维度：页内缩放与旋转。少一个就会出现「缩放后批注层还是旧尺寸」——这正是设计 §1.1 成功标准 4 里的「关闭/打开 Dialog 三次不出现批注层尺寸为 0 或缓存的底图尺寸是上一次的」。
7. **taint 的真实风险面是 image，不是 pdf。** pdfjs 的页 canvas 是用**解析出的字节**画的，本身不会污染画布；会污染的是 image 宿主的 `drawImage(<img src=PocketBase>)`——`packages/api-client/src/upload.ts:141` 的 `resolveFileUrl` 会把相对路径解析成 **PB origin 的绝对 URL**（`apps/web/app/providers.tsx:15` = `http://localhost:8090`），对 `:3000` 的页面即**跨源**，因此需要 `crossOrigin="anonymous"` + 服务端 `Access-Control-Allow-Origin`（`backend/infrastructure/AGENTS.md:98` 记载了 `files` 集合带头，但上下文是 HLS 分段，PDF/图片**待验证** → G7 #5 结案）。
8. **文本图元必须是 DOM**（canvas 画不了 IME，§3.4）：`annotation-text-layer.tsx` 是设计 §9 里标 P1 的文件，恰好在 M7。提交后才成为数据里的一个图元，**并且在 canvas 上也要重绘一份**（否则「隐藏批注」/导出会漏文字）；字号与行高必须与 canvas 侧一致，否则两种渲染下高度不同。
9. **`annotation-layer.tsx` 与 `annotation-canvas.tsx` 是 M5 的产物、M7 的改动面**，因此这两个文件在 M7 必须有唯一 owner（主 agent 指定一人），不能同时派给两个子 agent。

### 7.3 提交切分

1. `pdf 自绘：客户端接入 pdfjs-dist，worker 走 workerPort，逐页 canvas + 滚动/缩放/翻页/旋转`
2. `pdf 批注：geometry 升到 rect+pageIndex+旋转矩阵，多页批注层贴合，toolbar 补齐荧光笔/套索/文本/箭头/形状并补文本层`
3. `pdf 降级：getDocument/worker 失败回落 iframe，首屏懒加载不拖慢`

### 7.4 闸门 G7 — 用户操作清单

前置：主 agent 起 `pnpm dev:full`；先用桌面 chromium（`http://localhost:3000`）打开一个 pdf 节点做预跑。

| # | 用户做什么（必须含具体入口） | 期望 | 判据或证据 | 失败先看哪 |
| --- | --- | --- | --- | --- |
| 1 | 打开一个 pdf 节点，DevTools Network 面板筛 `pdf.worker` | worker **200 且是 JS**，不是 404 后回落假 worker（假 worker 会明显卡主线程） | Network 里 `pdf.worker.min.mjs` 的请求条目截屏 + 首屏无长任务 | `workerPort` 是否在 `getDocument` **之前**赋值（7.2-2）；Turbopack 是否把 `new URL(...mjs, import.meta.url)` 当资源 |
| 2 | 同一个多页 PDF：滚动到第 3 页、翻到第 5 页再翻回、缩放 200%、旋转 90° 再转回 | 页盒尺寸正确、翻页正确；**第 3 页画的圈始终贴在同一句话上** | 四种状态下同一处的截图对比（这是设计 §6 P1 的核心验收） | `convertToPdfPoint` 有没有用（存的是未旋转空间？）；缓存 key 是否含 scale/rotation；命中测试是否先定位页 |
| 3 | 缩放/翻页/旋转后各画一笔新批注，刷新页面 | 新笔迹贴合；刷新后全部仍在 | 刷新前后对比截屏 + PB 后台 `annotations` 非空 | 页内归一化基准是不是「该页未旋转 viewBox」 |
| 4 | 把该节点的 pdf url 改成 404（或断开 PB），重新打开 | 落到 **iframe 分支**：能看/能提示，不白屏、不无限加载 | 截图 + console 无未捕获异常 | 降级是否只覆盖了 404 而漏了 worker/CORS/加密三类（7.2-5） |
| 5 | `canvas.toBlob` 不抛 `SecurityError`：**image 节点**打开时在控制台跑下面的脚本；再对 **pdf 页 canvas** 跑一遍取 canvas 的那两行 | 两次都不抛；若 image 抛 → 记录为「PB `files` 的 CORS 头缺失/不透传」并登记 §9 | 控制台输出的一行结论（见下方脚本） | 是否漏了 `crossOrigin="anonymous"`（7.2-7）；`files` 集合是否真的带头（AGENTS.md:98 的上下文是 HLS） |
| 6 | 退出绘制模式后：在 PDF 上框选文字、滚轮滚动、双指缩放 | 页面仍可选中/滚动（`pointer-events` + `touch-action` 恢复），不出现「画布吃掉一切」 | 目视 + 滚动条行为 | §4.2 的层级表格是否照抄；`touch-action` 是否在退出画笔后没复原 |
| 7 | 同一个 pdf 节点分别在**窗口模式**（Dialog `w-[1200px] h-[80vh]`）与**全屏模式**各做一遍 1–3 | 两种模式下批注位置一致，不出现内部滚动条套娃 | 两模式截图对比 | `node-editor.tsx:55` / `:72` / `:105` 的宿主差异；`baseRect` 是否随容器尺寸重算 |
| 8 | 桌面预跑结论：设计 §2.1 的工具逐个各画一笔；`pointerType`/`pressure` 覆写脚本走一遍 | 逻辑面先成立 | 预跑截图 + console 无报错 | 同 G5 #11 |

`toBlob` 探测脚本（G7 #5，image 节点上执行；pdf 节点上只跑「取 canvas」那两行）：

```js
// image 节点：用一张带 crossOrigin 的新 Image 重放，判断 CORS 头是否真在
const el = [...document.images].sort(
  (a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight,
)[0];
const img = new Image();
img.crossOrigin = "anonymous";
img.src = el.src;
await img.decode();
const c = document.createElement("canvas");
c.width = img.naturalWidth;
c.height = img.naturalHeight;
c.getContext("2d").drawImage(img, 0, 0);
c.toBlob((b) => console.log("image toBlob ok", b?.size), "image/png");
// pdf 节点：跳过 img 三步，直接对页 canvas 取 c 并 toBlob：
//   const c = document.querySelector("canvas"); c.toBlob(b => console.log("pdf toBlob ok", b?.size));
```

### 7.5 回归面

1. **image 批注全链路**：抽 G5 的 #3（手指不画线）、#6（断线）、#7（持久化）各复测一次——M7 改了 `geometry.ts` 与 `annotation-canvas.tsx`，image 是它们最大的既有消费者。
2. **上传与分析链路**：无 pdf 时仍走 `FileDropZone`（`pdf-node-content.tsx:29-38`）；`analyzePdf` 的服务端封面流程不受影响（`pdf-document-analyzer.ts` 一行未改）。
3. **懒加载生效**：打开 text / image 节点时 Network 面板**没有** `pdf.*` 请求（首屏不被 1MB 级 parser 拖慢，设计 §6 P1 验收之一）。
4. **打包**：`pnpm --filter=web build` 通过（pdfjs 只允许出现在动态 import 的路径上；总纲 §10 用同一条命令压 M4 的依赖风险）。
5. **其它宿主**：database / collection / text / rich-text 打开无变化；`/graph` 页双指语义不变。
6. **静态检查**：`pnpm --filter=@workspace/ui typecheck` / `lint` / `pnpm --filter=web typecheck` 相对基线无新增失败。

---

## 附：本章「待验证」回填清单

执行期间**不许改设计文档正文**，只在闸门通过后就地回填设计文档末尾的「待验证」条目（总纲 §2.2-7）。本章要结案的清单：

| # | 待验证项（出处） | 由哪一条结案 | 可能结论 |
| --- | --- | --- | --- |
| 1 | `getCoalescedEvents()` / `pointerrawupdate` 在非 secure context 下的行为（§0.3-3、§8.2） | G5 #1 | **已提前收敛**：localhost 即 secure ⇒ 该问题在本机不存在；结论写成「用 localhost 访问即可，LAN IP 会退化」 |
| 2 | 一笔批注的 JSON 体积是否在 2–4KB（§0.2-①） | G5 #7 | 实测值 + 抽稀阈值（0.002）的影响 |
| 3 | Turbopack 下 pdfjs worker 的写法（§0.3-10、总纲 §10） | G7 #1 | `workerPort` 成立 / 或退回静态资源 + `workerSrc` |
| 4 | `files` 集合的 CORS 头是否覆盖 PDF 与图片（§0.2-③、§5.3） | G7 #5 | 「带头」或「不带头 → 登记 §9，导出走后端」 |
| 5 | 抽稀前后重绘是否肉眼等价（§3.2） | G5 #4 | 等价 / 需调阈值 |
| 6 | 暗色主题下荧光笔的 `multiply` 是否要换 `screen`（§2.3） | G7 #3（§2.1 的工具齐了之后再看暗色） | 视觉结论 + 是否按主题切换 blend |
| 7 | dpr 跨屏与三档缩放（§0.3-6、§8.1-8） | G5 #10 | 无双屏则记「单屏已验证」 |
| 8 | 「手指=书写」兜底开关与窗口态 toolbar 默认折叠的取舍（§2.1、§2.4） | G5 #3 / 用户手感 | 保留 / 调默认 |
| 9 | M1 的共享写者是否支持按次 debounce 覆盖与三处 flush（§5.1） | 5.1 #0（开工前，不在闸门内） | 支持 / 需主 agent 扩展（扩展即改 M1 的文件，须计入本章白名单） |
| 10 | §2.4 的 `readOnly` 隐藏 toolbar | **不结案** | 今天无宿主可传（`node-content-editor.tsx:26-34`），本轮只留 prop；登记 §9 偏差候选 |

> 本章**不引入**任何总纲之外的新依赖、新迁移、新测试框架。上面「文件落点决策」（7.1）与「`readOnly` 不建链路」（5.2-9）是本章相对设计文档的两处就地决策，M5 开工第一步由主 agent 决定是否登记进总纲 §9。
