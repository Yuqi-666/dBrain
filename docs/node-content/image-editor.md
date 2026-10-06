# 照片编辑（image-editor）设计文档

> 状态：**待实现**（本文件是 [proposal/node-content-refine.md](../proposal/node-content-refine.md) `## image` 行「照片编辑」的需求展开）
> 范围：**image 节点底图的编辑**——裁剪 / 旋转 / 翻转 / 导出（P0），调整与滤镜（P1），抠图与批量（P2）。**批注**是另一层，见 [annotation.md](./annotation.md)；两者的交集（裁剪与批注坐标）在本文 §6 定义。
> 新增运行时依赖：**`react-easy-crop`（P0，唯一）**——与 [selectors.md §3.3/§6.5](./selectors.md) 给图标 / 封面裁剪选的是同一个包，两处共用一份依赖。
> 相关文档：[node-content/README.md](./README.md) §1.2 / §3 / §4.2 / §8（宿主与全链路矩阵）、[../plan/image-editor.md](../plan/image-editor.md)（执行计划 M5.1 / G5.1）、[../plan/README.md §4/§5](../plan/README.md)（迁移与依赖台账）
> 一句话：照片编辑 = **原图永不被覆盖**的非破坏性配方（crop / rotate / flip / output）落 `content.imageEdits` + **保存时烘焙成一个新的 `files` blob 并写回 `content.url`**，因此全应用（编辑器 / preview 块 / 图库卡片 / dashboard）**零新增渲染契约**。

---

## 0. 实现现状与关键决策

### 0.1 今天的代码与数据是什么样

| 现有物        | 位置                                                                | 现状                                                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| image 宿主    | `packages/ui/src/components/dialog/editor/content/image-node-content.tsx:46-67` | 一个 `relative flex items-center p-4 overflow-hidden` 盒 + `<img object-contain>` + `absolute inset-0 z-10` 的加载层。**没有内容盒测量**，letterbox 由 CSS 决定     |
| 无图时的入口  | 同上 `:35-44`                                                       | 落 `FileDropZone`（`variant="image"`）                                                                                                                                                                |
| 空态之外的替换入口 | ——                                                             | **没有**。已有图之后只能改属性侧栏的「内容链接」，或者删节点重传                                                                                                    |
| 元数据        | `packages/interfaces/src/models/node/nodes/single/image.ts:5-13`     | `width` / `height` / `fileSize` 是**节点顶层字段**（不是 content），由上传路径写：`file-drop-zone.tsx:256-258`（预览尺寸）、`:324`                                     |
| 读图          | `packages/api-client/src/upload.ts:141`                              | `resolveFileUrl()`：相对 `/api/files/...` 解析成 PB origin 的绝对 URL（回环 `http://localhost:8090`，代理下 `<origin>/pb`，见 `packages/api-client/src/backend-urls.ts`） |
| 写图          | `packages/api-client/src/upload.ts:181`                              | `uploadAttachment(file, onProgress, signal) → IAttachment`（XHR，有进度、可中断；落 PB `files` 集合，`maxSize` 100MB，见 `pb/pb_migrations/1700000000_initial_schema.js:211-232`） |
| 渲染图的地方  | 三处，全部只读 `content.url`                                         | ① `image-node-content.tsx:58-65`（`object-contain`）；② `preview-block/previews/image-preview.tsx:19-24`（`aspect-video object-cover`，并显示 `node.width × node.height` 与 `fileSize`）；③ `preview-block/node-preview-cover.tsx:55`（dataview 图库卡片封面） |
| 内容半边写者  | `packages/ui/src/components/dialog/editor/content/use-node-content-writer.ts` | `patchContent(patch)`：读**活** content 合并、同 tick 合并成一次 upsert、串行 drain。`annotations` 就是靠它半边合并的 |
| 属性侧栏改 URL | `packages/ui/src/components/header/editor-header/attributes-sidebar.tsx:228-230` | `patchContent({ url })`——只点名 url 键，**不会**碰其它 content 字段（M1 的 R13 修复） |

**PB 侧实测（本轮为写本文档现做的探针，可复现）**：临时上传一个 1×1 PNG 到 `files`，跨源 `GET /api/files/files/<id>/<name>` 的响应头是

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Cache-Control: max-age=2592000, stale-while-revalidate=86400
Content-Type: image/png
```

⇒ ① **`<img crossOrigin="anonymous">` 不会被 taint，canvas 烘焙 / `toBlob` 可行**（回环下页面 `:3000` 与 PB `:8090` 不同端口 = 跨源，所以这一条是必需的，不是理论问题）；② 缓存 30 天 ⇒ **必须用新 URL 表达新像素**（新 `files` 记录），不要指望覆盖同名文件后浏览器会立刻换图。探针记录已删（`files` 记录数回到 0）。

### 0.2 五条决策

**① 非破坏性配方 + 保存时烘焙新 blob（本文的核心决策）。**

`content.imageEdits` 存一份**配方**（原图 url + 裁剪矩形 + 90° 旋转 + 翻转 + 导出设置），`content.url` 永远指向**可直接渲染的最终像素**：编辑保存时把配方烘焙成一个新的 `files` blob，`url` 指向它，配方留在旁侧供**再次编辑**与**恢复原图**。

备选与为什么否掉：

| 方案 | 形状 | 否决 / 采纳理由 |
| --- | --- | --- |
| **A（采纳）** 配方落库 + 保存烘焙 | `url` = 烘焙后的新 blob，`imageEdits` = 配方 | 渲染路径只有一条（`url`）⇒ 编辑器 / preview 块 / 图库卡片 / dashboard **零改动**；原图保留 ⇒ 可无限次重新编辑（永远从原图重烘，无累积编码损失）、可「恢复原图」；与 `annotations` 列**同形**（content VO 字段 ↔ 专用 json 列，走同一个 `patchContent` 半边） |
| B 只烘焙、不存配方 | `url` = 结果，无 `imageEdits` | 零后端面，但**刷新后不可再次编辑**、**无法恢复原图**（旧 blob 变孤儿且无指针），且二次裁剪 = 二次 JPEG 编码。留作「用户否决动后端」时的退路（见 §7） |
| C 纯非破坏、不烘焙 | `url` 永远原图，配方在旁 | 要在 **4 个渲染点**（含 `object-cover` 卡片）各实现一遍 CSS 变换，且导出要解决 `ctx.filter` 与 CSS filter 的逐像素一致（Tauri 的 WebKitGTK 不支持 `ctx.filter`）。分享 / 其它消费方拿到的是原图，语义上更像「视图」而不是「编辑」 |

**② 变换顺序与坐标空间一次定死，且与 `react-easy-crop` 的语义对齐。**

顺序 = **旋转(90° 整数倍) → 翻转 → 裁剪**；`crop` 表达在**旋转+翻转之后**的源位图像素空间，整数矩形（`x/y/width/height`）。`react-easy-crop` 回传的 `croppedAreaPixels` 就是这个空间的矩形，**原样存、原样烘焙**，不做二次换算（这是「预览与保存一致」的最低成本做法）。

**③ 编辑器的预览与保存共用同一个烘焙函数。**

`bake.ts` 只有一个入口：`(源图, 配方, 目标尺寸) → canvas`。保存 = 同一函数 + `toBlob` + `uploadAttachment`。编辑态内部的裁剪面用 `react-easy-crop`（它必须自己画一遍才能有拖拽手感）⇒ **两次渲染**是既成事实，P0 的闸门里放了一条边界判据（贴边裁剪 + 极端比例，见 [plan §M5.1 闸门](../plan/image-editor.md) 第 3 条）。

**④ 没有「替换图片」入口这件事一并补上，但不扩大依赖。**

图片盒右上的宿主浮层操作组给 `编辑`（本设计）与 `替换`（复用 M2 的 `FileDropZone` 上传路径：`uploadAttachment` → `content.url` + `width/height/fileSize`）。`批注` 的开关归 M5 的 `AnnotationToolbar`，本设计只负责**模式互斥**（§5.3）。

**⑤ 属性侧栏改 URL = 换底图 ⇒ 同时清配方。**

`attributes-sidebar.tsx:228-230` 的 image 分支改成 `patchContent({ url, imageEdits: null })`。否则会出现「`url` 是别人的图，`imageEdits.originalUrl` 还是上一次编辑的原图」这种自相矛盾的状态。清空必须走 **`null` 哨兵**（M1 的 R29-定：PB 的 `update` 是部分更新，`undefined` = 保留旧值，只有 `null` 能清）。

### 0.3 必须知道的坑

1. **`undefined` 清不掉任何东西。** `imageEdits` 是可清空字段，形状必须是 `imageEdits?: ImageEditRecipe | null`；「恢复原图」= `{ url: imageEdits.originalUrl, imageEdits: null }`。**反向规矩同样重要**：`annotations` 的 `undefined` 是「保留旧值」的期望语义（半边合并），不要把这两个字段的处理写成一样。
2. **`width` / `height` / `fileSize` 会因编辑而失效**，而 preview 块正在显示它们（`image-preview.tsx:30-34`）。保存必须是**一次** upsert：`content`（url + imageEdits）**与**顶层 `width/height/fileSize` 一起写；分两次写会出现「尺寸已变、图还是旧的」的中间态。
3. **`content.url` 与外链。** 用户可以把 URL 改成任意外链（picsum、arxiv…）。烘焙只对**能解码**的图有意义：`<img>` 加载失败 → 编辑入口置灰（`naturalWidth === 0`）。外链图烘焙后会把字节**复制进** PB（这是好事：不再依赖外站），但要在 UI 上说清「保存会把它存到你的工作区」。
4. **EXIF 取向在解码时已被浏览器应用**（`naturalWidth/naturalHeight` 是旋正后的，annotation.md §3.4 同结论）⇒ 配方建立在**旋正后的位图**上；导出不带 EXIF（canvas 编码不写元数据）⇒ **GPS / 拍摄参数会被剥离**。这是隐私上的加分，但必须写进文案，且 `nodes.location` / `shootingTime`（`image.ts:9-10`）今天没被任何路径填充，不要顺手在编辑时回填。
5. **画布尺寸上限**：4 亿像素以上或超大画布的 `toBlob` 会失败（浏览器实现相关的硬上限，Android 上更紧）。导出**长边上限 4096**（默认，可配）等比缩放，既是性能保护也顺便省 PB 空间；缩放用两步降采样（或 `createImageBitmap` 的 `resizeQuality: "high"`），不做「只改 CSS 尺寸」的假缩小。
6. **`files` 记录是「一个记录 = 一个 blob」，被替换的旧 blob 不会自动回收。** 每次保存产生一个新记录；老的原图与老的烘焙结果都留在 `files` 里（孤儿）。P0 **不删**（删了就无法恢复原图，且无法确认没有别的节点/封面在引用同一个 URL），作为遗留登记，见 §7。
7. **包出口的通配只认 `.tsx`**：`packages/ui/package.json` 的 `exports["./components/*"] = "./src/components/*.tsx"` ⇒ 从**包外**只能 import `.tsx`；`recipe.ts` / `bake.ts` 这类纯函数文件走**包内相对 import**（与 `content/use-node-content-writer.ts` 一样的地位）。若 M12 要从 dataview 复用 `bake.ts`，先在 `exports` 里补具体子路径（主 agent 独占文件）。
8. **`react-easy-crop` 在模态 Dialog 里**：它是内联 DOM（不 portal），但拖拽表面要自己管 `touch-action`；宿主 Dialog 的内容区是 `overflow-y-auto`，平板上要先在裁剪面上压住滚动（照 `packages/graph` 的 `touch-action: none` 先例，`ForceGraph.tsx:849`）。G5.1 有一条专门的「一指拖动裁剪框而不是滚页面」判据。
9. **动图（GIF/APNG）不支持**：只取首帧，导出回落 PNG。写进 §7 的明确不做。
10. **WebP 只进不出，而且导出格式必须校验 `blob.type`。** HTML 规范规定 `toBlob` 遇到不支持的类型**静默回落 `image/png`**（不抛错、不返回 `null`），而 WebKit（**Linux 桌面的 Tauri 就是 WebKitGTK**）能解码 WebP 却从不支持 canvas **编码** WebP ⇒ 写得不对就会把 PNG 当 `.webp` 存进 PB。本设计因此**不提供 WebP 导出**（`output.format` 只有 jpeg / png）；`encode.ts` 仍然要断言 `blob.type === 请求的类型`，不一致就回落 JPEG，作为防御。
11. **JPEG 没有 alpha，规范规定 canvas 合成到黑底** ⇒ 透明 PNG 存成 JPEG 会出现**黑斑**。导出 JPEG 前必须**先 flatten 到白底**再编码（同一个 canvas 上先 `fillStyle = "#fff"` + `fillRect` 再 `drawImage`）。
12. **EXIF 方向有两种正解，选一种并写死**：① 直接 `drawImage` 一个 `<img>` 元素（浏览器解码时已应用取向，`naturalWidth/Height` 就是旋正后的）——最省事、兼容性最好；② `createImageBitmap(blob, { imageOrientation: "from-image" })`——显式、语义清楚。本设计取 ①（宿主本来就有一个已加载的 `<img>`），但 `bake.ts` 的 JSDoc 要写明**取的是旋正后的位图**，且导出**不写任何 EXIF**。
13. **编辑器要懒加载，不能进 image 节点的首屏 chunk。** `packages/ui` 不能 import `next/*`（annotation §0.3-10）⇒ 唯一合法方式是 `React.lazy(() => import(".../image-editor/image-editor").then((m) => ({ default: m.ImageEditor })))`（仓库既有的具名导出 + `React.lazy` 范式：`packages/dataview/src/registry.ts:80-91` 的 `defineRenderer`），外面套 `Suspense`。判据：打开一个 image 节点时 Network 面板**没有** `image-editor` chunk 请求（M7 §7.5-3 对 pdfjs 用的是同一条判据）。

---

## 1. 目标形态与分层

```text
image-node-content.tsx（宿主：内容盒 + 浮层操作组 + 写回）
├── 只读态：<img src=content.url object-contain>            ← 与今天逐字一致
├── 编辑态：<ImageEditor>                                    ← 新增（本设计）
│     ├── <CropSurface>        react-easy-crop：裁剪框 / 缩放 / 比例 / 90° 旋转 / 翻转
│     ├── 工具条                比例预设 · 旋转 · 翻转 · 重置 · 撤销/重做 · 保存 · 取消 · 恢复原图
│     └── （P1）<AdjustControls>  亮度 / 对比度 / 饱和度 / 色温 / 锐度 + 滤镜预设
├── 〈M5〉<AnnotationLayer> + <AnnotationToolbar>            ← 另一章，本设计只定模式互斥
└── bake.ts（纯函数，宿主与编辑器共用）
      renderRecipe(源图, 配方, 目标尺寸) → HTMLCanvasElement
      bakeRecipe(源图, 配方, 导出设置)     → Promise<{ blob, width, height }>
```

**分层纪律**：`recipe.ts` 与 `bake.ts` **零 React**（可被将来的 M12 裁剪、导出、服务端重放复用）；`image-editor.tsx` 只管装配；宿主只管「内容盒尺寸 + 浮层入口 + 一次 upsert」。

---

## 2. 功能范围与阶段

| 阶段 | 功能 | 说明 |
| --- | --- | --- |
| **P0** | 进入/退出编辑态（不写库） | 取消 / `Esc` 一律不落库 |
| | 裁剪：自由 + 预设比例（原图 / 1:1 / 4:3 / 3:2 / 16:9） | `react-easy-crop` 的比例与 `cropSize`；拖拽平移、滚轮 / 双指缩放、键盘 |
| | 旋转 90° 步进 ×n、水平 / 垂直翻转 | 整数倍旋转 ⇒ 烘焙是纯仿射，无重采样歧义 |
| | 实时预览 | 与保存同函数（§0.2-③） |
| | 保存：烘焙 → 上传 → **一次** upsert（url + imageEdits + width/height/fileSize） | 新 `files` 记录，**不覆盖原 blob** |
| | 恢复原图 | `{ url: originalUrl, imageEdits: null }` |
| | 导出：格式（默认 JPEG 0.92——**导出前 flatten 到白底**；PNG 可选，保留 alpha）+ 长边上限 4096 | 质量 / 尺寸进配方，可复现。**不提供 WebP 导出**（§0.3-10） |
| | 会话内撤销 / 重做（配方级，≥10 步） | 只回退配方，不重新上传 |
| | 有批注时的裁剪 / 旋转：二次确认 + 批注坐标随动（§6） | 无批注时无任何提示 |
| **P1** | 调整：亮度 / 对比度 / 饱和度 / 色温 / 锐度 + 灰度 | **导出与显示必须同源**：优先 `ctx.filter`，WebKitGTK 不支持时回落 ImageData/LUT（见 §9 待验证） |
| | 任意角度摆正（straighten）+ 自动裁掉空白角 | 用 `react-easy-crop` 的 `rotation` prop（6.2.4 确有，README 的 props 表第 105 行）；批注变换只对 90° 整数倍成立，任意角度要么禁止、要么只烘焙不回写批注 |
| | 替换图片入口；快捷键（`R` 旋转、`[`/`]` 比例、`⌘Z`/`⌘⇧Z`）；「按住看原图」 | |
| **P2** | 抠图（`@imgly/background-removal` 之类的 WASM/ONNX 模型，懒加载） | 模型体积数十 MB，必须懒加载 + 明确体积代价 |
| | 批量（多选节点批量裁剪 / 缩放） | 需要一个多选入口，属 dataview/dashboard 的地盘 |
| | 原图 GC（孤儿 `files` 回收）与缩略图生成 | 缩略图是 dashboard 卡片 / 大图库的性能项 |

**明确不做**：像素级修复（磨皮 / 内容感知填充 / 液化）、图层与蒙版、滤镜市场 / LUT 导入、文字与贴纸（批注层的文本图元已覆盖）、动图逐帧、**WebP 导出（§0.3-10）**、把编辑烘焙回 PDF（另一章：annotation.md P1）、把 EXIF 写回去（一律剥离）、服务端重编码（本机后端没有 sharp 之类的图像栈，加一个等于新增服务端依赖）。

---

## 3. 编辑配方（数据契约）

```ts
// packages/interfaces/src/models/node/nodes/single/image-edit.ts（新增）
import type { NodeId } from "../../types"; // 仅为示例性的类型位置说明，实际按 barrel 现状 import

/** 变换顺序固定为：rotate(90° 整数倍) → flip → crop（见 §0.2-②）。 */
export interface ImageEditRecipe {
  /** 原始 blob；永远不被覆盖，供再次编辑与「恢复原图」 */
  originalUrl: string;
  /** 原图（旋正后）的像素尺寸，配方校验与比例换算用 */
  original: { width: number; height: number };
  /** 源位图像素空间（旋转+翻转之后）的裁剪矩形；缺省 = 全图 */
  crop?: { x: number; y: number; width: number; height: number };
  /** 顺时针 90° 的整数倍；缺省 0。P1 的任意角度另开字段，不复用这个 */
  rotate?: 0 | 90 | 180 | 270;
  flipH?: boolean;
  flipV?: boolean;
  /** 导出设置；缺省 = 跟随原文件类型 + 长边 4096 */
  output?: {
    format?: "image/jpeg" | "image/png";
    quality?: number; // jpeg only, 0..1
    maxEdge?: number; // 长边上限
  };
  /** 配方版本；P1 加 adjust 时升到 2，读侧只认自己认识的版本 */
  version: 1;
}
```

```ts
// packages/interfaces/src/models/node/nodes/single/image.ts（修改）
export interface ImageContent {
  url: string;
  annotations?: AnnotationLayerData;
  /** 照片编辑配方：原图 + 变换。`null` = 显式清空（哨兵，见 §0.3-1） */
  imageEdits?: ImageEditRecipe | null;
}
```

**不变量**

1. `imageEdits === undefined`（旧记录 / 从未编辑）⇒ 编辑器以「url 就是原图」开局。
2. `imageEdits.crop` 一定落在 `original` 的尺寸内（读侧校验，越界按全图处理并 `console.warn`，不抛）。
3. `rotate` 只允许 90 的整数倍（P0/P1）。
4. 清空只认 `null`；读路径把 `null` 读回 `undefined`。

**落库形态**：新列 `nodes.imageEdits`（json，可选、非 required），与 `annotations` 同形——`node.content.imageEdits` ↔ `imageEdits` 列，由 `backend/infrastructure/src/database/mappers/node.mapper.ts` 的 image 分支分别写 `content`（url）/ `annotations` / `imageEdits`。全链路清单与执行计划在 [../plan/image-editor.md §M5.1](../plan/image-editor.md)。

---

## 4. 烘焙流水线

```text
原图 blob ──► <img crossOrigin="anonymous"> ──► 已解码位图（EXIF 已应用）
                                                   │
        recipe: rotate → flip → crop（源像素空间）  ▼
                              renderRecipe(源, 配方, 目标尺寸) → canvas
                                                   │
                    ┌──────────────────────────────┴───────────────┐
                    ▼                                              ▼
        编辑态预览（缩放到显示尺寸）                    bakeRecipe → canvas.toBlob(格式, 质量)
                                                                    │
                                                     new File / uploadAttachment → IAttachment.url
                                                                    │
                                      一次 NodeService.upsert：content{url,imageEdits} + width/height/fileSize
```

**规则**

1. **源图只解码一次**（宿主已加载的 `<img>` 元素直接当 `drawImage` 源；不要再 `new Image()`）。
2. **`crossOrigin="anonymous"` 必须挂在用于烘焙的 `<img>` 上**（§0.1 的实测头保证它可用）。外链图若不带 CORS 头 → 烘焙时 `toBlob` 抛 `SecurityError` → 保存失败要**明确提示**（「该图片不允许本地处理，请先替换为上传的图片」），不是静默失败。
3. **长边上限**：`maxEdge`（默认 4096）按等比缩放，缩放比 < 0.5 时走两步降采样。
4. **格式**：默认**跟随源类型**——源是 PNG → PNG（保 alpha）、其余 → JPEG `quality 0.92`；`output.format` 显式覆盖默认。**一旦选了 JPEG 而源带 alpha，必须先白底 flatten**（§0.3-11，否则透明区变黑斑）。编码统一走 `encode.ts`：`toBlob` → **断言 `blob.type`**（§0.3-10）→ 不一致回落 JPEG 并告警。动图只取首帧并回落 PNG（§0.3-9）。
5. **文件名**：`<原文件名去扩展名>-edited-<时间戳>.<ext>`，只影响 PB 后台可读性（PB 会在前面再拼记录 id 与随机串）。
6. **失败处理**：解码失败 / `SecurityError` / `toBlob` 返回 `null` 三种都要有可见错误条，且**不写库**。

---

## 5. 集成与契约

### 5.1 宿主（`image-node-content.tsx`）

- 只读态**逐字不变**（`<img object-contain>` + 加载层），只在盒上加一个 `relative` 的浮层操作组（右上角）：`替换` / `编辑`（`批注` 由 M5 的工具条提供）。
- 编辑态把只读 `<img>` 换成 `React.lazy` 加载的 `<ImageEditor>`（§0.3-13；`Suspense` 的 fallback 就是既有的 `LoadingPlaceholder`），并给编辑态一个**明确尺寸的盒**（`h-full w-full`），`baseRect` 的测量逻辑与 M5 共用一个 `ResizeObserver` 出口（M5 落地时对齐一次，避免两个 observer 各测一遍）。
- 保存回写：**一次** upsert，`content` 用 `liveContent()` 拼（保住 `annotations` 与任何未知键），顶层带 `width/height/fileSize`。不要用 `patchContent`（它只写 content 半边，会漏元数据）。
- 卸载 / 关闭编辑器时若有未保存的编辑：只丢弃内存态，不写库、不提示（与批注的 flush 语义不同——批注是即时写，编辑是显式保存）。

### 5.2 其它消费方（零改动，本文档的价值所在）

| 消费方 | 今天读什么 | 编辑后 |
| --- | --- | --- |
| `preview-block/previews/image-preview.tsx` | `content.url` + `node.width/height/fileSize` | 无需改：url 是烘焙结果，元数据已同步 |
| `preview-block/node-preview-cover.tsx`（图库卡片封面） | `content.url` | 无需改 |
| dashboard 卡片（M10 的 `NodeBodyRouter`） | 走 preview 块 | 无需改 |
| 属性侧栏「内容链接」 | `content.url` | 显示新 URL（用户可见「已替换为工作区文件」） |

### 5.3 与批注（M5）的模式互斥

- 同一时刻只有一个「激活表面」：编辑态或批注态。进入编辑态时批注层 `pointer-events: none` + 不渲染批注工具条；退出后恢复。
- 编辑态**不渲染**批注笔迹（避免「以为笔迹也会被裁掉」的误解）——但保存时会按 §6 变换批注数据。
- 两个入口都在宿主浮层组里，位置固定、不因模式变化而跳动（沿用 dataview 的「功能组定宽」纪律）。

### 5.4 与 M12（图标 / 封面裁剪）的复用

`selectors.md §6.5` 的 P2 裁剪与本文是**同一个技术动作**（裁剪 → 另存新文件 → 写字段）。M5.1 先落地 `react-easy-crop` + `bake.ts`；M12 直接复用 `bake.ts`（包内相对路径 import）与裁剪面的比例预设，只换写回目标（`cover` / `icon` 而非 `content.url`）。**先做 M5.1 会让 M12 少一个依赖决定与一套 UI**。

---

## 6. 与批注的交互（裁剪 / 旋转如何作用于已有批注）

批注坐标是**归一化到底图显示矩形的 0..1**（annotation.md §3.4），而 image 的显示矩形 = 整张图（`object-contain` 的 letterbox 不算在内）⇒ 批注坐标空间与「源位图空间」只差一个等比缩放。因此 P0 的三个变换都是仿射，**可以精确重写**：

```
flipH:      (u,v) → (1-u, v)
flipV:      (u,v) → (u, 1-v)
rotate 90°CW:(u,v) → (1-v, u)
crop(u0,v0,u1,v1): (u,v) → ((u-u0)/(u1-u0), (v-v0)/(v1-v0))
（按 §0.2-② 的顺序：先旋转、再翻转、最后裁剪）
```

**P0 口径（写进闸门，不许含糊）**

1. 保存时若配方含裁剪或旋转，且 `annotations.items.length > 0` → **二次确认**：「批注会随图片一起被裁剪/旋转，落在裁剪范围外的部分会丢失」。
2. 确认后按上面的公式重写每个图元的点集；**落在裁剪范围外的点被丢弃**（`stroke`/`highlight` 的折线在边界处会直连成一条弦，`text`/`note` 的锚点在外则整条丢弃）。`bbox` 重新计算，`z` 不变。
3. 取消确认 ⇒ 不保存，不改批注。
4. **任意角度摆正（P1）不参与批注变换**：该模式下禁止「保存并保留批注」，只能二选一（烘焙成结果并把批注栅格化进图 = 明确不做；或拒绝编辑）。
5. 有批注时若只想调整导出格式/尺寸，**不触发**确认（不改几何）。

**为什么不做「禁止裁剪」**：批注是覆盖层，底图裁剪是更基本的权力；把冲突交给一次明确的确认 + 可预测的坐标变换，好过悄悄禁止一个功能。

**与批注契约的关系（说清楚，避免误读）**：annotation.md 的「容器尺寸变化 → 重算 `baseRect`，批注坐标不动」说的是**显示容器**（letterbox）变化——那不会改变图像内容，所以坐标确实不该动。本章的裁剪/旋转改变的是**图像内容本身**，等价于「换了一张底图」，因此必须显式迁移批注数据；不迁移就会出现「旧笔迹贴在新画幅的错误位置」。两者不矛盾。

**回退口径（B 计划，写进闸门）**：若 G5.1 #9 证明「界外点丢弃」在真实笔迹上不可接受（例如需要沿裁剪边界精确切割折线），就把 P0 降级为**方案 (a)：`annotations` 非空时禁用裁剪/旋转并提示「请先清除批注」**（一行判断 + 一句文案），把仿射变换整体挪到 P1。这条降级不需要动数据模型，也不会让闸门卡住。

---

## 7. 边界与取舍

- **原图永远保留**（这是 A 方案的地基）：`imageEdits.originalUrl` 是唯一指针。代价是每次保存都新增一个 blob，`files` 里会有孤儿；P0 不回收（§0.3-6），登记为遗留。
- **不做无损几何编辑**：JPEG 旋转 90° 也走「解码 → 画布 → 重编码」（无损旋转需要 JPEG 变换表，属独立工程）。因为每次都从**原图**重烘，反复编辑不会累积损失；但「保存 → 再编辑 → 保存」的第二轮仍是一次额外编码，这是 P0 的已知代价。
- **外链图会被复制进工作区**（保存时上传）。用户若只想引用外链、不想复制，就别点保存——文案要说清。
- **不做服务端图像处理**：本机后端只有 pdfjs（`backend/infrastructure/src/parsers/pdf-document-analyzer.ts`），没有 sharp/jimp；加一个等于新增服务端依赖 + 部署面，收益（大图缩略图、批量）留到 P2 再评。
- **`width` / `height` 的语义**：始终是**当前 `content.url` 那张图的像素尺寸**（即烘焙结果的尺寸），不是原图尺寸；原图尺寸在 `imageEdits.original` 里。这样 `image-preview.tsx` 的 `W × H` 不用改口径。
- **回退退路（B 方案）**：若用户否决「新增 `nodes` 列 + 动后端」，则砍掉 `imageEdits` 与迁移，只保留「烘焙 → 上传 → 写 url + 元数据」，并把「不可恢复原图 / 不可再次编辑」写进遗留。此时本设计的 §2 P0 里第 6、8 条与 §6 全部作废。

---

## 8. 验证方法

项目没有测试基础设施（无 vitest/jest、无 `*.test.*`），验证 = 类型 + lint + 浏览器/真机手测。静态检查：

```bash
pnpm --filter=@workspace/interfaces typecheck
cd backend/domain && pnpm typecheck
cd backend/application && pnpm typecheck
cd backend/infrastructure && pnpm typecheck
cd backend/adapter-front && pnpm typecheck
pnpm --filter=@workspace/ui typecheck   # 相对 baseline 无新增
pnpm --filter=@workspace/ui lint
bash docs/plan/baseline.sh
```

**手测清单**（执行版在 [../plan/image-editor.md](../plan/image-editor.md) 的闸门 G5.1，含入口、判据与失败先看哪）：

1. 进入 / 退出编辑态：取消与 `Esc` 都不写库。
2. 裁剪：自由 + 四种预设比例；鼠标、触摸、笔都能拖动与缩放（平板上不能把页面滚走）。
3. **贴边判据**：把裁剪框贴住一个可辨认物体的右下角 → 保存后该物体正好在右下角（验 §0.2-③ 的两次渲染一致）。
4. 旋转 90° / 翻转后保存 → 像素方向正确；再次进入编辑器，配方被读回（裁剪框位置与上次一致）。
5. 保存后立刻刷新：编辑器 / preview 块 / 图库卡片三处都是新图；`W × H` 与 `fileSize` 是新值。
6. PB 后台：新 `files` 记录 + `nodes.content` 是新 `/api/files/...`（无 `.pb` 之类拼接错误）、`imageEdits` 非空、**旧记录的 blob 仍在**。
7. 恢复原图 → url 回原图、`imageEdits` 变 `null`（PB 后台核对）、刷新后仍是原图。
8. 有批注时裁剪 → 出现确认；确认后落在界外的笔迹消失、界内的位置正确（用画在四角的四笔判：裁掉右下 → 只剩三笔）。
9. 长边 4096：给一张 6000px 的图保存 → 落库文件的长边 ≤ 4096，`width/height` 同步。
10. 失败面：外链图（无 CORS）保存 → 明确错误条且**不写库**；解码失败的 URL → 编辑入口置灰。
11. 属性侧栏改 URL → `imageEdits` 被清空（PB 后台核对），编辑器回到「url 即原图」。
12. 懒加载：打开一个 image 节点、**不进编辑态**时 Network 面板没有 `image-editor` chunk 请求（§0.3-13）。
13. 透明 PNG 选 JPEG 导出 → 透明区是**白底**（不是黑斑），PB 里的文件名后缀是 jpg（§0.3-10/11）。
14. 回归：上传替换 / 批注三连（G5 的 #3/#6/#7）/ 其它 9 种 node-content / `/graph` 双指语义 / 静态检查无新增。

---

## 9. 文件与依赖清单

**新增**

| 路径 | 说明 | 阶段 |
| --- | --- | --- |
| `packages/interfaces/src/models/node/nodes/single/image-edit.ts` | `ImageEditRecipe`（+ barrel 导出） | P0 |
| `packages/ui/src/components/image-editor/types.ts` | 会话状态与 props 契约（`ImageEditorProps` / `EditorSession` / `CropPreset`） | P0 |
| `packages/ui/src/components/image-editor/recipe.ts` | 默认值、校验与归一化、仿射变换数学（**零 React**，§6 的公式实现地） | P0 |
| `packages/ui/src/components/image-editor/bake.ts` | `renderRecipe` / `bakeRecipe`（**零 React**，预览与保存共用） | P0 |
| `packages/ui/src/components/image-editor/encode.ts` | `toBlob` 的包装：白底 flatten、`blob.type` 断言与回落（**零 React**） | P0 |
| `packages/ui/src/components/image-editor/crop-surface.tsx` | `react-easy-crop` 包装（比例预设 / 缩放 / 旋转 / 翻转 / `touch-action`） | P0 |
| `packages/ui/src/components/image-editor/image-editor.tsx` | 编辑态外壳（工具条 + 裁剪面 + 保存/取消/恢复原图） | P0 |
| `packages/ui/src/components/image-editor/use-image-editor.ts` | 会话状态 + 撤销/重做栈 + 保存流水线（上传 + 一次 upsert） | P0 |
| `packages/ui/src/components/image-editor/annotations.ts` | §6 的批注坐标变换与界外丢弃 | P0 |
| `packages/ui/src/components/image-editor/adjust-controls.tsx` | 调整滑块 + 滤镜预设 | P1 |
| `pb/pb_migrations/1700000002_node_image_edits.js` | `nodes` 加 `imageEdits` json 列（编号见 [plan §4](../plan/README.md)） | P0 |

**修改**

| 路径 | 改动 | 阶段 |
| --- | --- | --- |
| `packages/interfaces/src/models/node/nodes/single/image.ts` | `ImageContent.imageEdits?` | P0 |
| `packages/ui/package.json` | `+ react-easy-crop ^6.2.4`（M12 复用同一份） | P0 |
| `packages/ui/src/components/dialog/editor/content/image-node-content.tsx` | 浮层操作组（替换/编辑）+ 编辑态挂载 + 一次 upsert 回写 | P0 |
| `packages/ui/src/components/header/editor-header/attributes-sidebar.tsx` | image 分支改 URL 时 `imageEdits: null` | P0 |
| `backend/domain/src/models/node/value-objects.ts` | `ImageContent` 收 `imageEdits` + getter + `withImageEdits()` + `equals` | P0 |
| `backend/application/src/commands/node/node-command.service.ts` | image 分支构造 VO 时透传 `imageEdits` | P0 |
| `backend/application/src/dto/node-dto.mapper.ts` | image content 字面量点名 `imageEdits`（漏了就是 `hlsUrl` 的翻版） | P0 |
| `backend/infrastructure/src/database/mappers/node.mapper.ts` | image 读写两处带上 `imageEdits` 列 | P0 |
| `backend/adapter-front/src/trpc/router/node.ts` | `update` 路径 `content` 是 `z.any()`（不 strip，天然放行）；`add` 路径的 `imageContentSchema` 补字段（否则「新建时带配方」会被剥掉，同 G1 遗留 1） | P0 |
| `packages/ui/src/components/dialog/editor/content/file-drop-zone.tsx` | **不动**：上传替换已验证与 `imageEdits` 互不影响（它只 patch 点名键）；回归面各测一次 | —— |

**依赖**：`react-easy-crop@^6.2.4`（M0 已核实该版本存在；MIT；与 [plan §5](../plan/README.md) 里 M12 记的是同一个包，**总依赖数不增加**）。`perfect-freehand`（M5）与本设计无关。

**待验证（实现期间结案，结论文本回填本表）**

| # | 待验证项 | 由哪一条结案 | 可能结论 |
| --- | --- | --- | --- |
| 1 | `react-easy-crop` 的 `croppedAreaPixels` 与 canvas 烘焙是否逐像素一致（含旋转态） | G5.1 #3 | 一致 / 需按 §0.2-② 修正顺序定义 |
| 2 | `crossOrigin="anonymous"` + PB `files` 的 CORS 头在**真实大图**上成立 | G5.1 #4/#10 | 成立（本文档已用 1×1 探针确认头部存在） / 需 server 侧补头 |
| 3 | 模态 Dialog 内 `react-easy-crop` 的 `touch-action` 是否压得住宿主滚动 | G5.1 #2（平板） | 需在裁剪面加 `touch-action: none`（预期） |
| 4 | `ctx.filter` 在 Tauri 的 WebKitGTK 上是否可用（P1 的调整导出） | M5.1 之后 P1 开工第一步 | 可用 / 回落 ImageData + LUT |
| 5 | 一次 upsert 同时写 content 与顶层 `width/height/fileSize` 是否被 DTO / 白名单放行 | G5.1 #5（PB 后台核对元数据） | 放行（上传路径就这么写）/ 需在白名单补字段 |
| 6 | `React.lazy` 的 `image-editor` chunk 是否真的不进 image 节点首屏 | G5.1 #13（Network 面板） | 不进（预期）/ 需把 `react-easy-crop` 挪到更深的动态 import |
| 7 | 透明 PNG 存成 JPEG 的白底 flatten 是否生效（WebKitGTK / Android Chrome 各一次） | G5.1 #14 | 白底 / 需改 flatten 顺序 |
| 8 | `react-easy-crop@6.2.4` 的 `rotation` prop 形态（P1 straighten 用） | **已核实**：props 表有 `rotation: number`（deg）与 `onRotationChange` | 存在，P1 可直接用 |

---

## 10. 附：候选库调研（为什么只有 `react-easy-crop`）

调研范围 = 「浏览器里对一张照片做几何 + 色彩编辑」这个问题的全部主要候选；结论是**只加一个 7KB 级依赖**，其余全部排除。体积是 bundlephobia 的 gzip 实测值（未返回的标「未测」），版本是 2026-10 的实测值。

| 候选 | 版本 | License | 体积 (gz) | 为什么不用 |
| --- | --- | --- | --- | --- |
| **`react-easy-crop`** | **6.2.4** | MIT | **7.2 KB** | **采纳**：只给裁剪坐标（源像素空间的 `croppedAreaPixels`，正是配方的形状）；触摸 / 键盘 / 比例 / `rotation` 都有；**M12 的图标/封面裁剪本来就计划用它**，两处共用一份依赖 |
| `cropperjs` | 2.2.0 | MIT | 12.8 KB | v2 重写成 `<cropper-*>` 自定义元素，在 React 19 + shadcn Dialog 里挂自定义元素的集成摩擦大于它多给的 `$toCanvas`/`$rotate`（各约 40 行自研）；且无色彩调整 |
| `fabric` | 7.4.0 | MIT | **91.9 KB** | 场景图 / 笔刷 / 文字 / WebGL 滤镜全套，对一个裁剪过重（92KB 买一个矩形） |
| `konva` + `react-konva` | 10.7.1 / 19.3.0 | MIT | 55.6 KB | **`react-konva@19.3.0` 的 peer 是 `react ^19.3.0`，本仓 `packages/ui` 声明 `^19.2.4`、`packages/editor` 钉死 `19.2.4` ⇒ peer 不满足**，装它要动全仓 React 版本 |
| `tui-image-editor` | 3.15.3 | MIT | 188 KB | **停更**（2022-04 最后发布）、依赖 `fabric@^4`、无 `types` / `exports` |
| `@toast-ui/react-image-editor` | 3.15.2 | MIT | —— | **停更**（2021-10），peer `react ^17` ⇒ 与 React 19 不兼容 |
| `@pqina/pintura` | 8.100.4 | **商业** | —— | npm 包自述「for testing purposes only」，需付费授权，无免费档 |
| `image-js` | 1.7.1 | MIT | 未测 | 纯算法零 UI；1348 文件 / 11.7MB unpacked，拖进 20+ `ml-*` |
| `jimp` | 1.6.1 | MIT | 未测 | 纯算法零 UI；3.3MB unpacked（有 `browser` 条件导出，浏览器可用但同样零 UI） |
| `@mediapipe/tasks-vision` | 1.0.1 | Apache-2.0 | WASM 36MB | 抠图/分割用（P2）；默认从 `cdn.jsdelivr.net` + `storage.googleapis.com` 拉 wasm 与 `.tflite`，Tauri 离线下必须自托管 |
| `@imgly/background-removal` | 1.7.0 | **AGPL-3.0** | WASM | **AGPL 对闭源应用是硬阻断**；peer 钉 `onnxruntime-web` dev 版；默认拉 40–80MB 模型；README 自称只支持 Next 15（本仓 Next 16） |
| `glfx` / WebGL 滤镜 | —— | —— | —— | 事实上停更，且只做滤镜（裁剪/旋转仍要自己写） |
| **纯 Canvas 2D + CSS `filter`（0 依赖）** | —— | —— | 0 | 本设计的**烘焙路径**就是它；但它做不了裁剪/旋转/调整 UI，`filter` 也缺 exposure / warmth / sharpness，所以 UI 仍要一个裁剪库 |

**浏览器编码侧的实测结论**（决定 §0.3-10/11 的两条硬规矩）：

| API | Chrome | Firefox | Safari / WebKitGTK |
| --- | --- | --- | --- |
| `canvas.toBlob(type, q)` | 50 | 18 | 11 |
| `OffscreenCanvas.convertToBlob` | 69 | 105 | 16.4（WebKitGTK 2.44+ 支持 WebCodecs） |
| `createImageBitmap` 的 `imageOrientation` | 52 | 93 | 15 |
| `ImageDecoder`（WebCodecs） | 94 | 133 | 仅 preview ⇒ **不可依赖** |
| canvas **编码** WebP | ✅ | ✅ | ❌（静默回落 PNG，见 §0.3-10） |

**结论**：依赖账本只增加 `react-easy-crop@^6.2.4`；`perfect-freehand`（M5）与 `pdfjs-dist`（M7）都进不了本章；`@excalidraw/excalidraw` 是 `packages/editor` 的依赖，`packages/ui` 不能借它做任何事。

---

## 参考

- `react-easy-crop`（裁剪 / 缩放 / 旋转 / 触摸 / 键盘，输出源像素空间的裁剪矩形）：<https://github.com/ValentinH/react-easy-crop>
- `HTMLCanvasElement.toBlob()` 与「不支持的类型静默回落 `image/png`」：<https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob>
- canvas 请求 WebP 却在 Safari / WebKit 拿到 PNG（§0.3-10 的出处）：<https://dev.to/harshit_katheria/ask-canvas-for-a-webp-in-safari-and-you-silently-get-a-png-5hn6>
- `createImageBitmap()` 的 `imageOrientation` / `resizeQuality`（EXIF 取向与高质量降采样）：<https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap>
- `CanvasRenderingContext2D.filter`（P1 的调整导出与浏览器支持差异）：<https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter>
- 浏览器兼容数据来源：[@mdn/browser-compat-data](https://github.com/mdn/browser-compat-data)、[caniuse · WebCodecs](https://caniuse.com/webcodecs)
- WebKitGTK 2.44 起支持 WebCodecs（Linux 桌面壳的 WebView 能力）：<https://www.webkitgtk.org/2024/03/27/webkigit-2.44.html>
- PocketBase 文件字段与 `?thumb=`（P2 缩略图候选）：<https://pocketbase.io/docs/files-handling/>
