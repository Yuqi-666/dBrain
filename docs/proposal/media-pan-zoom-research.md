# 图片 / PDF / Annotation 缩放平移检查与开源选型

检查日期：2026-10-09。范围：本地源码静态检查、数值复现、开源官方资料核查；没有运行浏览器体验测试。首轮调研未修改组件；后续按用户授权完成下述实施。

## 结论

图片优先验证 React Zoom Pan Pinch 作为 viewport 引擎；PDF 优先参考 PDF.js 官方 viewer 的页面缩放、滚动锚定和重绘调度。两者共享手势策略与坐标接口，但不强行使用同一种布局模型。保留 Annotation 的归一化存储、历史和绘制能力。

当前体验问题既包括手势缺失，也包括可确定的数学错误；只加一个动画库不会解决它们。

## 本地架构

- `image-node-content.tsx`：图片 CSS transform；`usePanZoom` 持有 scale/x/y；通过 `applyTransform` 给 AnnotationLayer 派生图片矩形。AnnotationCanvas 自己重绘批注，没有与图片一起放入同一个变换父节点。
- `pdf-node-content.tsx`：宿主持久化批注，PdfViewer 管理文档。PDF 是页面尺寸重布局 + scrollLeft/scrollTop，使用自己的手势控制，不使用图片的 usePanZoom。AnnotationLayer 将批注 canvas portal 到各页，page 使用 0-based 编号。
- 好的现有设计：单一 viewport 所有权、归一化标注、分页 portal、PDF 可见区域挂载、页面位图延后重绘、手写笔与触摸区分。这些可继续使用。

## 发现与证据

### 1. 图片继续缩放时锚点漂移：确定的数学错误

位置：`packages/ui/src/components/pan-zoom/transform.ts:118`。

当前公式 `x' = x + (s' - s) * (originX - pivotX)` 把屏幕上的 pivot 当成未变换的内容坐标。在已有放大或平移时不成立。保持屏幕锚点应为：

```text
r = s' / s
x' = r*x + (1-r)*(pivotX-originX)
y' = r*y + (1-r)*(pivotY-originY)
```

数值复现（未考虑边界约束）：origin=0，scale=2，x=-100，鼠标屏幕 x=200，继续放大 1.5 倍。鼠标下的内容坐标是 150。现有结果 scale=3、x=-300，将该点移到屏幕 150；正确 x=-250，才能保持屏幕 200。使用 Python 按源码公式复算，漂移为 50px。

`transform.test.ts` 的 “leaves the pivot exactly where it was” 测试比较的是原始内容点 pivot 变换前后的位置，并没有先反变换屏幕 pivot，因而会认可错误公式。pinch 测试只从 identity 开始，也覆盖不到这个错误。未来应测试已有 scale/translation 下的屏幕锚点不变。

### 2. 图片达到倍率上下限时偏移仍按未限制倍率计算

位置：`use-pan-zoom.ts:139-148`。先计算 wanted 的偏移，再只夹紧 scale，将不匹配的 x/y 交给 clampTransform。clampTransform 此时看到倍率已经合法，无法修正原先的缩放锚点。应该先限制目标倍率，再据实际倍率计算锚点，最后处理平移边界。

### 3. PDF 缩放只恢复一个轴

位置：`pdf-viewer.tsx:499-516` 的 anchorScroll、对应 useLayoutEffect、pinch 分支及 reanchor。zoomAnchor 只保存 `scroll`，由 horizontal 决定使用哪个轴；pdfPinchFrame 虽然计算两个轴，发生倍率变化时仍只保存一个。

结果：纵向阅读放大后横向位置没有同等锚定，横向阅读反之。仅平移、不变倍率的 pinch 分支反而会同时写两个轴，形成行为差异。

### 4. PDF 全文线性比例锚定忽略固定间距与居中布局

位置：`anchorScroll` 使用 `(scroll + offset) * ratio - offset`；scroller 的 `p-3/gap-3`、翻页模式的 `gap-6/p-4` 和 page row 的 auto margin 并不随 PDF scale 等比变化。`pdfPinchFrame` 同样假定所有内容坐标整体线性缩放。

推断：越靠后的页，固定页间距的误差可能越明显；从居中页面过渡到溢出页面也会改变偏移。需要浏览器复现量化。更可靠的锚点为“页号 + 页内点”，重布局后从真实页面框恢复两个滚动轴。

### 5. 桌面浏览入口不充分

- 图片：`use-annotation-input.ts` 仅 touch 和 mouse 中键进入 viewport 手势；鼠标左键画笔。`annotation-layer.tsx:712-717` 不向单图片提供浏览开关，image host 也没启用 pointerToggle。缺少左键抓手 / 空格临时抓手。
- PDF：`pdf-viewer.tsx` 的 onPointerDown 直接拒绝所有 mouse；浏览模式能选文字，但没有自定义抓手拖动。不能与图片共用中键习惯。
- 图片只有 reset 控件，没有明确的倍率、放大缩小、实际像素 100%、适配宽度等浏览入口；fit 倍率 1 与原图像素 100% 是不同概念。
- 双指 / 三指轻点撤回重做与导航手势共处，误识别代价较大，应主要限定于批注模式。

### 6. 手动触摸滚动没有惯性

图片及 PDF 都由 pointer delta 直接更新位置，未见速度采样与结束后减速逻辑。PDF scroller 使用 `touchAction: none`，页面浏览与页间空白均放弃原生惯性。普通桌面 wheel 仍可走原生滚动，这个问题主要针对触摸拖动。

### 7. 标注重绘仍在缩放帧关键路径

位置：`annotation-layer.tsx` 的 measure/layout effect；`annotation-canvas.tsx:588` 的 replayCommitted layout effect。图片每个 transform 更新改变矩形并同步回放批注；PDF scale 进入 surfacesKey，每个可见页面 canvas 尺寸变化并同步重绘。PDF 位图已有延后清晰重绘，但批注未使用同样的暂态策略。

这是潜在性能瓶颈，尚无 profiling 数据。建议缩放过程中禁止新笔画并共同变换底图与已有批注，结束后刷新清晰 backing store；要明确中途笔落下时先结束暂态变换并恢复正确的输入反变换。

## 实施顺序与验收

1. 修正图片锚点公式及倍率限幅顺序；PDF 改为两个轴、页内锚点。加真正验证屏幕锚点的数学测试。
2. 建立浏览 / 抓手 / 批注的显式模式；默认浏览，空格或中键临时抓手，pen 书写独立仲裁。只允许一个组件消费拖动和 pinch。
3. 图片做库接入小样；PDF 参考官方 viewer 保持多页原生 scroll，测量惯性、双轴缩放和重绘成本。
4. 底图、文本、搜索高亮、批注共同验证；完成后才决定是否替换整个 PDF viewer。

验收覆盖：鼠标、触控板、触摸、pen；不同缩放起点与先平移后缩放；上下限、添加/抬起手指、失去捕获、窗口 resize；PDF 第 1/50/100 页、单双页、横纵方向、连续/翻页、混合页尺寸；重标注文档的缩放帧耗时；坐标与现有持久化格式兼容。

当前环境 shell 未找到 node/pnpm，未执行 JS 测试。实际仓库已有 Node 内置 test 文件与 ui 的 test 脚本，与提供的旧知识库“无测试”说明不同；迁移时应利用现有基础，而非新引入测试框架。

## 候选对比

| 项目                 | 许可与维护证据                                 | 可复用交互                                                                                                                                                            | annotation / PDF 适配判断                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| react-zoom-pan-pinch | MIT；发布页 latest v4.0.3，2026-04-07          | 发布版类型明确提供惯性参数、trackPadPanning、鼠标左/中/右键 pan 开关、activationKeys、pinch.allowPanning、边界对齐、双击 toggle/reset/zoomIn/zoomOut、分手势 excluded | 适合 React 图片与标注内容一起变换（本项目为 canvas，仍需改造容器及输入坐标）；绘制模式禁用左键 pan，保留中键 / 按键 pan；标注控件加入 excluded。它只负责 DOM 变换，PDF 多页渲染、文字选择及清晰度需要宿主处理。 |
| @panzoom/panzoom     | MIT；latest 4.6.2，2026-04-02                  | Pointer Events、触摸 pinch、zoomToPoint、wheel 焦点缩放、contain、panOnlyWhenZoomed、exclude / excludeClass                                                           | 适合保留现有 React 结构，effect 挂载并 destroy 清理。DOM 无 React peer 依赖，但适配代码仍须验证 StrictMode。官方列出的能力没有足以确认现成惯性和双击完整策略的证据，不能承诺直接获得这两者。                    |
| OpenSeadragon        | BSD 三条款；latest v6.1.1；官方站版本 6.1.1    | 专用图像 viewport、动画、坐标映射、overlay；6.1.0 release 新增 cooperative gesture handling                                                                           | 普通图片也能通过 ImageTileSource 加载；大型图像或瓦片更适合。已有图像像素坐标 annotation 可转为 viewport 坐标；多图应使用对应 TiledImage 映射。不能替代 PDF 文本层 / 搜索 / 原生 annotation 层。                |
| PDF.js viewer        | Apache-2.0；latest v6.4.299，发布页 2026-10-03 | 多页 scroll / spread、手形拖拽、page-width / page-fit、焦点缩放、分设备 wheel 处理、延迟清晰重绘                                                                      | 最适合 PDF 阅读机制参考或采用 PDFViewer 后按页挂自定义 annotation。原生 PDF annotation 与 dBrain 的外部 annotation 数据不是自动兼容，需要按页坐标适配。                                                         |

### react-zoom-pan-pinch：要以发布版核查

[官方 README](https://github.com/BetterTyped/react-zoom-pan-pinch) 展示 TransformWrapper / TransformComponent / useControls；[v4.0.3 类型](https://github.com/BetterTyped/react-zoom-pan-pinch/blob/v4.0.3/src/models/context.model.ts) 是上述按钮限制、excluded、双击和惯性能力的直接依据。[发布页](https://github.com/BetterTyped/react-zoom-pan-pinch/releases) 确认版本日期。

[v4.0.3 package.json](https://github.com/BetterTyped/react-zoom-pan-pinch/blob/v4.0.3/package.json) 的 React / ReactDOM peer 是 `*`，允许安装在 React 19；这不能证明 React 19 + StrictMode + Next.js + Tauri 实际兼容。开发类型仍是 React 18，建议验证 ref 生命周期、mount/unmount 清理、图片异步加载与 ResizeObserver。

注意 [master 类型](https://github.com/BetterTyped/react-zoom-pan-pinch/blob/master/src/models/context.model.ts) 已有 clientToContent、contentToClient、fitToView、keyboard 等新增接口，而 v4.0.3 没有，不能把它们当已发布能力。v4.0.3 annotation 指针反变换需自己计算：客户端坐标减 wrapper 起点，再减平移，再除 scale；图片与本项目的 annotation canvas 共用内容盒子。旋转存在时需逆矩阵而非只除比例。以上是适配推导。

### @panzoom/panzoom：轻量但仍需补产品策略

[官方 README/API](https://github.com/timmywil/panzoom) 明确描述 CSS transform、Pointer Events、focal point、excludeClass、zoomWithWheel 及 canvas PDF 放大模糊问题；[发布页](https://github.com/timmywil/panzoom/releases) 确认版本。API 文档提醒 contain 下连续同步 zoom/pan 可能依赖绘制后的尺寸，因此不能只替换现有数学公式后直接宣告完成。

适配推导：图片和 annotation 一起变换；绘制模式通过 disablePan 或自行路由 handleDown 控制。默认 HTML transform-origin 为中心，已有坐标系统若假定左上角，需要明确统一 origin 和矩阵。与 React 的 cleanup、外部 setTransform 和缩放读数桥接仍归宿主负责。

### OpenSeadragon：图像阅读器而非 PDF 阅读器

[Viewport API](https://openseadragon.github.io/docs/OpenSeadragon.Viewport.html) 有 pointFromPixel、pixelFromPoint、imageToViewportCoordinates、viewerElementToImageCoordinates、旋转和 zoomTo。动画期间 current / target 坐标不同，标注命中和绘制应使用当前坐标。[overlay 官方例子](https://openseadragon.github.io/examples/ui-overlays/) 展示随图缩放 overlay、固定屏幕大小 overlay、旋转模式及 MouseTracker 事件集成；其事件系统意味着现有 React SVG 标注不能假定原事件逻辑原样成立。

[普通图片例子](https://openseadragon.github.io/examples/tilesource-image/) 不要求预生成瓦片。[许可证](https://github.com/openseadragon/openseadragon/blob/master/LICENSE.txt) 是 BSD 三条款，[发布页](https://github.com/openseadragon/openseadragon/releases) 提供 6.1.1 / 6.1.0 的维护与 cooperative gesture handling 证据。

### PDF.js：重点参考实现

[web/pdf_viewer.js](https://github.com/mozilla/pdf.js/blob/master/web/pdf_viewer.js) 的 panBy 通过 scrollLeft / scrollTop 平移并保留亚像素残差；#setScaleUpdatePages 在重设页面尺寸后按 origin 修正滚动，支持 drawingDelay；currentScaleValue 提供 page-width / page-height / page-fit / auto。它依赖真实页面布局，适合作为固定页间距、padding、多尺寸页的锚点模型参考。

[web/app.js](https://github.com/mozilla/pdf.js/blob/master/web/app.js) 的 onWheel 区分 Ctrl/Meta wheel 和触控板 pinch：读取 deltaMode，按像素 / 行 / 页归一化，累积 tick 与比例误差，再传鼠标 origin。普通 wheel 留给阅读滚动。这里不能把 ctrlKey 当唯一触控板判据。

[web/grab_to_pan.js](https://github.com/mozilla/pdf.js/blob/master/web/grab_to_pan.js) 可参考手形鼠标拖拽、滚动条排除与监听清理。[PageViewport](https://github.com/mozilla/pdf.js/blob/master/src/display/page_viewport.js) 提供 PDF 坐标与 viewport 坐标互转，涵盖缩放与旋转；自定义标注以 pageId / pageNumber + 未缩放页坐标保存更稳妥。

[项目与使用入口](https://github.com/mozilla/pdf.js)、[发布页](https://github.com/mozilla/pdf.js/releases)、[许可证](https://github.com/mozilla/pdf.js/blob/master/LICENSE)。此处源码参考链接为 master，落地时应锁定具体 tag / commit；采用整个 viewer 或升级 pdfjs-dist 是另一项工作，不是改手势必须同时完成的步骤。

## 实施结果

- 图片使用锁定的 React Zoom Pan Pinch 4.0.3，新增 `components/image-viewer/image-viewer.tsx`。图片和 annotation canvas 是同一变换容器的子元素，工具栏 portal 到固定容器；浏览默认启用，左键抓手、中键和空格临时抓手、Ctrl/Meta 滚轮缩放、触控板平移、pinch、双击切换倍率、缩放按钮、适配与实际像素 100%。小图片的最小倍率允许回到实际像素大小。
- annotation 支持精确内容盒子的 `selfMeasured` 模式，保持画布布局坐标不变，只测量输入时的真实屏幕矩形。缩放期间共同变换已有位图，停止约 160ms 后按倍率刷新批注密度，受 8MP 每个 backing store 的预算约束；原有归一化数据和持久化保持兼容。
- PDF 保留当前 pdfjs-dist 4.10.38 渲染器。`pdf-anchor.ts` 以页号、页内点、视口偏移记录锚点，并从真实页面布局恢复两个滚动轴；待提交缩放也可重新锚定。普通左键保留文字选择，中键或空格拖动抓手，触摸增加可中断惯性，尊重 reduced-motion。缩放、画笔、滚轮、导航、失焦和卸载会停止惯性。
- 混合尺寸 PDF 在 fit 模式跳页先立即定位，待目标页倍率布局完成再定位一次；避免长距离 smooth 导航经过中间页时改变倍率而落错页。
- 修复旧 `zoomAbout` 的屏幕锚点公式、usePanZoom 倍率限幅顺序和加载期间滚轮拦截；旧 hook 留给仍使用其契约的宿主。

### 验证

- 直接通过 Node 内置 test 导入 pan-zoom、pdf-viewer、annotation 的现有和新增测试：117 项通过。
- 改动涉及的 UI 文件 ESLint 无输出；Prettier 与 `git diff --check` 通过。
- 使用 TypeScript compiler host 对 Git HEAD 的原文件与当前文件分别检查：baseline 19 个诊断，当前 19 个，无新增。现有错误主要在 editor；因此整个 UI 包 typecheck 仍未通过。
- 本地 Next.js + React 19 的浏览器验证，包含 StrictMode：图片实际像素 100% 与拖动后，img/canvas 屏幕矩形完全相同；批注左键拖动只增加一笔、不移动图像；浏览拖动不增加笔画；PDF 60 页混合尺寸文档渲染成功；第 50 页从 150% 放大到 200% 保持同一页内中心点（仅亚像素舍入）；fit 模式从第 1 页跳到第 50 页定位正确；PDF 卸载重挂未出现 console error。
- 临时验证路由已清理。未进行真实触摸屏、触控板、手写笔或 Tauri WebView 实机测试，不能将鼠标浏览器结果当作这些设备的体验保证。
