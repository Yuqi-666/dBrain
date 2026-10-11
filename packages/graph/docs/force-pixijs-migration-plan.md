# Force 模式迁移 PixiJS v8 改造方案

> 目标:将 Force 模式的渲染层从 **OffscreenCanvas 2D 即时模式**(每帧全量重绘、无批处理、无 Path2D 复用)迁移到 **PixiJS v8 WebGL 场景图**(批处理 draw calls、节点 Sprite 池、按需文本预算、LOD 剔除),同时**保留现有双线程架构、Comlink IPC、d3-force 模拟与 isDirty 静态帧跳过**。
>
> 参考实现:anytype-ts 的 graph worker(`dist/workers/graph.js`,PixiJS 8 + d3-force 在 worker 内,10k+ 节点 60fps)。其「PixiJS 进 worker」路径已生产验证:`DOMAdapter.set(WebWorkerAdapter)` + OffscreenCanvas + WebGL。

---

## 0. 为什么迁移(现状诊断)

当前 `canvas.ts` 是 **Canvas 2D 即时模式**渲染器(394 行),每渲染帧:

1. 全量清屏 → 网格 → viewport transform → 视锥剔除(PAD=50)→ 逐边 `beginPath/stroke` → 逐节点 `arc/fill/stroke/fillText`
2. **无 Path2D 复用、无批处理、无缓存层、无脏矩形** — 每帧重新提交全部可见元素的绘制指令
3. 文字:摄取时预截断 `__label`(二分查找 `measureText`)+ `fontCache`,但每可见节点每帧仍一次 `fillText`
4. 性能屏障完全依赖 `isDirty` 静态帧跳过(冷却期 CPU 归零)— 一旦模拟活跃(拖拽/布局),CPU 侧绘制成本即为瓶颈

**PixiJS v8 收益**:
- 边路径按样式分组 → 每风格一个 `Graphics`,批量 stroke,draw call 从 O(边数) 降到 O(风格数)
- 节点 → 池化 `Sprite` 共享一个圆形纹理 + `tint`,变换走 GPU
- 文本 → 按需 `Text` 池 + 预算 + zoom LOD,避免大图全量文字重绘
- 未来可加滤镜(阴影/发光)、Mesh、自定义 shader

---

## 1. 关键架构决策(D1–D8)

### D1 — 渲染层替换边界:保持 `canvas.ts` 公开表面不变 ⭐

`canvas.ts` 是 worker 内唯一的渲染接缝。**公开导出表面保持不变**,内部从 2D 重写为 PixiJS:

```
canvas.ts 公开表面(api.ts 依赖,不变):
  createCanvas(width, height): void
  setStyle(style): void
  setViewport(v): void
  getContext(): OffscreenCanvasRenderingContext2D | null   ← 返回隐藏的 2D 测量 canvas
  resizeCanvas(dims): void
  renderFrame(): void
  renderAndTransfer(): ImageBitmap | null
  truncateLabel(text, maxWidth, c): string                  ← 保持不变
```

- `api.ts` 的 `computeLabels()`(api.ts:222-232)依赖 `getContext()` 做 `measureText` — 保留一个**隐藏 2D canvas 仅用于文本度量**,不参与渲染。这样 `truncateLabel`/`__label` 预计算机制(AGENTS.md §10.3)**零改动**。
- `api.ts`、`force.worker.ts` 在 Phase 1 完全不动。

### D2 — PixiJS 在 worker 内的初始化方式(WebWorkerAdapter)

```ts
// pixi/app.ts 内,任何 Application 创建之前
import { DOMAdapter, WebWorkerAdapter } from "pixi.js";
DOMAdapter.set(WebWorkerAdapter);   // 必须在 app.init() 之前!

const app = new Application();
await app.init({
  canvas: offscreen,          // worker 自建的 OffscreenCanvas
  width, height,
  antialias: true,
  backgroundAlpha: 0,         // 背景由 stage 背景色或清屏 Graphics 处理
  resolution: 1,              // dpr 通过 stage.scale 管理(见 D7)
  preference: "webgl",
  autoStart: false,           // 禁用 Pixi ticker —— 手动渲染(见 D4)
  sharedTicker: false,
});
app.ticker.stop();
```

- **`autoStart: false` + `ticker.stop()` 是硬性要求** — anytype 曾因 Pixi ticker 常驻导致「100% CPU at idle」(其 commit 909e1f5559 修复)。我们的 `isDirty` 守卫依赖「只有脏才渲染」。
- **CSP**:若部署环境禁 `unsafe-eval`,在 worker 入口首行加 `import "pixi.js/unsafe-eval"`(它安装静态 polyfill 替代 `new Function()` 编译 shader,不是启用 eval)。anytype 的备选方案是在构建配置注入 DOM shim(`vite.worker.config.ts` 的 `intro:`)— 我们作为 Next.js 打包的 module worker 大概率不需要,但保留为风险预案。
- **Worker 内不可用**:`DOMContainer`、`AccessibilitySystem`、FontFace 加载(文本用 `Text` 的默认字体 + 预截断即可,不引入 BitmapFont)。

### D3 — 帧传递:Phase 1 走 `transferToImageBitmap`,Phase 2 走直接转移

**Phase 1(桥接,零主线程风险)**:Pixi 渲染到 worker 自建的 OffscreenCanvas(WebGL 上下文),`app.render()` 后调用 `offscreen.transferToImageBitmap()` → 走现有 `__FRAME__` 通道 → 主线程 `drawImage` + `bitmap.close()`。
- **已验证可行**:MDN/WHATWG 规范明确 `transferToImageBitmap()` 对 WebGL 上下文在 worker 内可用(从当前 drawing buffer 捕获)。
- **注意**:transfer 会清空该 WebGL 绘制缓冲(spec 明确,`preserveDrawingBuffer` 无效)— 但我们的循环是「渲染→传输→下一帧重新渲染」,无影响。
- **主线程零改动**:ForceGraph.tsx 的 `__FRAME__` handler(ForceGraph.tsx:228-243)、`ctx2d`、resize 逻辑全部原样保留。

**Phase 2(性能收尾,anytype 生产路径)**:主线程 `canvas.transferControlToOffscreen()` → 恢复 `__SET_CANVAS__` 原始通道(AGENTS.md 记载但源码已删)→ worker 接收 OffscreenCanvas 后 `app.init({ canvas })` → **WebGL 绘制缓冲通过 placeholder canvas 自动呈现,无需 commit()**(`commit()` 仍在 flag 后,但 WebGL 上下文走自动呈现路径)。
- 消除每帧 `transferToImageBitmap` + postMessage + drawImage 一跳。
- **主线程改动**:`setupWorker()` 移除 `ctx2d` 获取(ForceGraph.tsx:189-190),新增 transfer 发送;移除 `__FRAME__` handler(228-243);**resize handler(ForceGraph.tsx:608-612)不能再写 `canvas.width/height`**(已 transfer,主线程失去控制权),只调 `api.setDimensions`。
- **风险**:主线程失去该 canvas 的 2D 上下文 — 现有 overlay(`GraphContextMenu`、`PreviewBlock`)均为 HTML 绝对定位,不依赖 canvas 2D,无影响。

**推荐路线**:Phase 1 先落地(可独立验证、可回滚),Phase 2 作为性能完成项。若 Phase 1 的 bitmap 传递实测开销可接受,Phase 2 可延后。

### D4 — 帧循环:保留 `isDirty` + `queueMicrotask` 合并 ⭐

`api.ts` 的帧循环(api.ts:80-99)**完全不变**:

```ts
function scheduleFrame(): void {
  if (pendingFrame) return;
  pendingFrame = true;
  queueMicrotask(() => {
    pendingFrame = false;
    if (isDirty) { isDirty = false; pushFrame(); }
  });
}
```

- `pushFrame()`(api.ts:66-74)内部改为:`canvas.ts` 的 `renderFrame()` → **Pixi `app.render()`**(而非 2D 绘制)→ `transferToImageBitmap()`(Phase 1)/ 直接返回(Phase 2)。
- **绝不**用 Pixi 的 `app.ticker` 驱动渲染 — 那是 anytype 的 CPU 灾难源头。Pixi 只做「被动的绘制执行器」。
- 保留 `queueMicrotask` 而非 anytype 的 worker 内 rAF — 这是 AGENTS.md §10.5 的反回归约束(worker 内 rAF 不可靠、且 queueMicrotask 与 isDirty 配合达到冷却期零开销)。

### D5 — 场景图结构与批处理策略(对标 anytype)

```
app.stage (Container, isRenderGroup: true)
├── gridLayer      (Graphics, 仅 viewport 变化时重建)
├── edgesLayer     (Map<styleKey, Graphics> —— 按样式签名分桶)
├── nodeOutlinesLayer (Graphics —— 节点描边+阴影,与 Sprite 分离以保批处理)
├── nodesLayer     (Container —— 池化 Sprite,共享圆形纹理)
└── labelsLayer    (Container —— 预算内 Text 池)
```

- **边分桶**(`edges.ts`):每帧按**样式签名**分组 — 签名 = `strokeColor + strokeWidth×倍率 + dashPattern + shape + direction`。种子数据颜色来自少量调色板(defaults/business/semantic/client),风格数通常个位数。每风格一个 `Graphics`,组内 `moveTo/lineTo/bezierCurveTo` 后**一次** `stroke()`。箭头(填充三角形)与节点描边也汇入对应桶。→ draw call 从 O(边数) 降到 O(风格数)。
- **节点 Sprite 池**(`nodes.ts`):`app.renderer.generateTexture()` 生成 64×64 圆形纹理,池化 `Sprite`(Map keyed by nodeId),`tint = fillColor`(seed 已定,渲染规则从不改 fill — AGENTS.md §6.5),`scale = 2r/64`,`position` 每 tick 更新,视锥外 `visible = false`(data 级剔除已算好,不需要 CullerPlugin)。
- **节点描边分离**:描边+阴影(render rules 只调描边/阴影 — §6.5)绘制到独立的 `nodeOutlinesLayer Graphics`,避免给每个节点挂 Graphics 破坏 Sprite 批处理。按 (strokeColor, lineWidth, shadow) 分桶。
- **文本池**(`labels.ts`):预算内创建 `Text`,缓存,`resolution = dpr`(修模糊 — anytype commit e388bf90dd 踩过的坑),`scale = 1/k`(zoom 不变大小),LOD:`scale >= TRANSFORM_THRESHOLD` 才显示。

### D6 — 命中测试:保留 d3-quadtree,不走 Pixi 命中

`simulation.ts` 的 `hitTest`/`hitTestEdge`(四叉树 ≥2000 节点、100px 边预过滤)已高效且与渲染解耦。Pixi 场景图全 `eventMode = "none"`,命中完全由 worker 的 d3 数据层承担 — **零改动**。

### D7 — dpr / 缩放策略

- Pixi `resolution: 1`,dpr 由 stage 层变换统一处理:viewport 缩放 `stage.scale.set(k * dpr)`、位移 `stage.position.set(vp.x * dpr, vp.y * dpr)`(网格层除外 — 网格按屏幕像素绘制在屏幕空间 Graphics 上)。
- 坐标一致性:worker 内所有模拟坐标(SimNode.x/y、命中测试)仍是无 dpr 的模拟坐标;渲染层统一经 stage 变换输出。`eventListener.ts` 的 `screenToSimulation` 设备像素约定(AGENTS.md §五)不变。

### D8 — 样式系统:RenderState → Pixi 视觉映射

`styleConfig.ts` 的 4 层管线与 `RenderState` 6 态(AGENTS.md §6)不动。`getRenderAdjustment()` 返回的 `strokeColorOverride / strokeWidthMultiplier / shadow` 直接映射为:
- 边/描边桶的 style 签名输入(颜色、线宽、阴影)
- 渲染规则**不改 fill** 的约束保留 — 节点 Sprite tint 静态(仅 upsert 时变)

新增常量(Phase 3):`LABEL_BUDGET = 100`、`TRANSFORM_THRESHOLD = 1`、`TRANSFORM_THRESHOLD_HALF = 0.5`(镜像 anytype)。

---

## 2. 目标架构对比

```
Before (现状, Canvas 2D 即时模式):
  Main Canvas ── 独立 2D ctx ── drawImage(bitmap) + bitmap.close()
  Worker: OffscreenCanvas(2d) ── renderFrame() 每帧全量重绘 ── transferToImageBitmap() ── __FRAME__
    ├─ 逐边 beginPath/stroke (无批处理)
    ├─ 逐节点 arc/fill/stroke/fillText
    └─ isDirty 跳过是唯一性能屏障

After Phase 1 (Pixi 内部替换, 主线程零改动):
  Main Canvas ── 独立 2D ctx ── drawImage(bitmap) + bitmap.close()   ← 不变
  Worker: OffscreenCanvas(webgl) + Pixi App(autoStart:false)
    ├─ Pixi app.render() (仅 isDirty 时)
    ├─ edgesLayer: 按样式签名分桶批量 stroke
    ├─ nodesLayer: 池化 Sprite + tint
    ├─ nodeOutlinesLayer: 批量描边/阴影
    ├─ labelsLayer: 预算 Text + LOD
    └─ transferToImageBitmap() ── __FRAME__                          ← 不变

After Phase 2 (直接转移, anytype 路径, 可选):
  Main Canvas ── transferControlToOffscreen() ── __SET_CANVAS__ 通道(恢复)
  Worker: Pixi App 直接 init 在转移的 OffscreenCanvas 上 → WebGL 自动呈现
    ├─ 无每帧 bitmap 传输
    └─ 主线程移除 __FRAME__ handler / ctx2d / canvas.width 写入
```

---

## 3. 文件级改动点

### 3.1 新增文件(NEW)

| 文件 | 职责 | 关键导出 |
|---|---|---|
| `src/force/worker/pixi/app.ts` | Pixi Application 生命周期:WebWorkerAdapter 设置、`app.init`、stage 层级构建、背景色、`resizeApp(dims)`(调 `renderer.resize`)、`destroyApp()`(`app.destroy({ releaseGlobalResources: true })`) | `createPixiApp(offscreen, dims)`, `resizeApp(dims)`, `destroyApp()` |
| `src/force/worker/pixi/nodes.ts` | 节点 Sprite 池:圆形纹理生成、`syncNodeSprites(simNodes, viewport)`,按 tick 更新 position/tint/visible;upsert 时更新 tint | `syncNodeSprites`, `upsertNodeStyle(node)` |
| `src/force/worker/pixi/edges.ts` | 边 Graphics 分桶:按样式签名分组重建路径、箭头、节点描边、自环;`syncEdgeGraphics(simLinks, viewport)` | `syncEdgeGraphics`, `getStyleKey(link)` |
| `src/force/worker/pixi/labels.ts` | 文本池:预算(LABEL_BUDGET)+ 优先级(selected > hover > root > degree)+ LOD 阈值;`syncLabels(simNodes, viewport, priorityOrder)` | `syncLabels` |
| `src/force/worker/pixi/grid.ts` | 网格 Graphics:仅 viewport 变化时重建(屏幕空间,scale > 0.5 才显示) | `syncGrid(viewport, dims, style)` |

### 3.2 修改文件(MODIFY)

| 文件 | Phase | 改动点 | 说明 |
|---|---|---|---|
| `package.json` | 1 | 新增 `"pixi.js": "^8.x"`(实现时锁定最新 8.x,anytype 用 ^8.16.0) | 无新 script;`typecheck`/`lint` 直接覆盖 |
| `src/force/worker/canvas.ts` | 1 | **重写为 facade**:保留 `createCanvas/setStyle/setViewport/getContext/resizeCanvas/renderFrame/renderAndTransfer/truncateLabel` 公开表面;内部委托 `pixi/*`;`getContext()` 返回隐藏 2D 测量 canvas;`renderFrame()` = 各层 sync + `app.render()` | 核心替换点;api.ts 契约不变 |
| `src/force/worker/api.ts` | 1 | **零改动**(canvas.ts facade 保持契约) | — |
| `src/force/worker/api.ts` | 2 | `pushFrame()`(api.ts:66-74)移除 `transferToImageBitmap`/`__FRAME__`,仅 `renderFrame()` | — |
| `src/force/worker/force.worker.ts` | 1 | (可选)首行 `import "pixi.js/unsafe-eval"` 当部署启用 CSP | — |
| `src/force/worker/force.worker.ts` | 2 | 新增 `__SET_CANVAS__` raw channel 处理器(接收 OffscreenCanvas,init Pixi) | 恢复 AGENTS.md 记载的通道 |
| `src/force/ForceGraph.tsx` | 2 | `setupWorker()`(L169-249):移除 `ctx2d` 获取(L189-190)、`__FRAME__` handler(L228-243)、`bitmap.close()`;新增 `canvas.transferControlToOffscreen()` + raw `__SET_CANVAS__` 发送 | Phase 1 零改动 |
| `src/force/ForceGraph.tsx` | 2 | resize handler(L608-612):**移除 `canvas.width/height` 写入**(transfer 后主线程失去控制权),仅 `api.setDimensions`;canvas.style 尺寸保留 | — |
| `src/force/types.ts` | 2 | (可选)为 raw 通道补类型:`__SET_CANVAS__` / `__FRAME__` 消息联合(当前 raw 消息未在 types.ts 建模,补一个 `RawWorkerMessage` 提升可维护性) | — |
| `src/force/styleConfig.ts` | 3 | 新增 `LABEL_BUDGET`/`TRANSFORM_THRESHOLD`/`TRANSFORM_THRESHOLD_HALF` 常量 | 渲染规则/默认值不动 |

### 3.3 不改动(UNTOUCHED)

| 文件 | 原因 |
|---|---|
| `src/force/worker/simulation.ts` | d3-force、命中、事件状态机、nodeMap/quadtree/α 去重优化(AGENTS.md §10)与渲染解耦,零依赖 |
| `src/force/transform.ts` | 种子已含全部视觉属性,worker 零查表(AGENTS.md §6.6) |
| `src/force/eventListener.ts` | DOM 事件捕获、延迟平移状态机、`screenToSimulation` 不变 |
| `src/force/eventHandler.ts` | 共享桥接层,force/flow 共用 |
| `src/force/types.ts`(RenderState/WorkerInbound/WorkerEvent/ForceNodeSeed 等) | RPC 契约与数据结构不变(除 Phase 2 可选 raw 通道类型) |
| `src/types.ts` / `src/index.ts` | 交叉类型与公共 API |
| `src/graph.tsx` / `src/flow/*` | Flow 模式无关联 |

---

## 4. 实施阶段与依赖图

```
Phase 0 (准备, 0.5天)
├── 0.1 安装 pixi.js 依赖 + 空 pixi/ 目录骨架
└── 0.2 worker 内 Pixi 最小可行性验证 (spike):
        OffscreenCanvas(webgl) + WebWorkerAdapter + app.init + 画一个圆 + transferToImageBitmap
        → 验证目标浏览器 (Chrome 首选) 下 Phase 1 关键路径可用

Phase 1 (桥接替换, 2-3天) ←─ 依赖 Phase 0
├── 1.1 pixi/app.ts: Application 生命周期 + stage 层级 + 背景色
├── 1.2 pixi/nodes.ts: 圆形纹理 + Sprite 池 + syncNodeSprites (先不接入边/文本)
├── 1.3 pixi/edges.ts: 样式分桶 + 箭头 + 节点描边 + 自环
├── 1.4 pixi/labels.ts: Text 池 + LOD (预算先放满, Phase 3 收紧)
├── 1.5 pixi/grid.ts: 网格层
├── 1.6 canvas.ts 重写为 facade, 内部委托 pixi/* (保留 truncateLabel + 隐藏 2D 测量 canvas)
└── 1.7 像素级视觉对比验收 (见 §5 Phase 1 验证)

Phase 2 (直接转移, 1-2天, 可选) ←─ 依赖 Phase 1
├── 2.1 ForceGraph.tsx: transferControlToOffscreen + __SET_CANVAS__ 发送; 移除 ctx2d/__FRAME__
├── 2.2 force.worker.ts: __SET_CANVAS__ 处理器; api.ts pushFrame 精简
├── 2.3 ForceGraph.tsx resize handler 调整 (不再写 canvas.width/height)
└── 2.4 主线程帧路径回归验收

Phase 3 (性能调优, 1-2天) ←─ 依赖 Phase 1 (可与 Phase 2 并行)
├── 3.1 标签预算 LABEL_BUDGET=100 + 优先级 + TRANSFORM_THRESHOLD LOD
├── 3.2 样式分桶签名缓存 (避免每帧重复构建 key)
├── 3.3 大图 (5k/10k 节点) 性能基准 + draw call 统计
└── 3.4 行为变化确认: 大图下部分标签隐藏 (需产品确认)

Phase 4 (加固收尾, 1天) ←─ 依赖 1-3
├── 4.1 WebGL context lost 监听 → __ERROR__ 通道 → 错误横幅
├── 4.2 app.destroy({ releaseGlobalResources }) 挂到 worker 终止路径 (如未来复用 worker)
├── 4.3 全量回归 (§5) + AGENTS.md 文档更新 (__SET_CANVAS__/RenderState 偏差修正)
└── 4.4 移除遗留 2D 渲染死代码 (若 Phase 2 完成) / 保留 facade 开关 (若 Phase 2 未做)
```

**总预估:5-8 天**(Phase 2 可选,不做则 4-6 天)。

---

## 5. 验证方案(每阶段)

### 通用命令(每个 Phase 收尾必跑)

```bash
pnpm --filter=@workspace/graph typecheck   # 最近似 CI 的检查
pnpm --filter=@workspace/graph lint
pnpm --filter=web dev                          # 打开 Force view 页做视觉验证
```

### Phase 1 验证(关键:像素级对比)

1. **功能对照**:同一份数据(dev mock,`@workspace/dev`)在迁移前后各截图,逐项对比:
   - 节点:圆形填充色(含 semantic 色)、描边色/宽、标签文本与位置、`weight` 决定半径
   - 边:straight/curve(二次贝塞尔)/s-curve(三次)、bidirectional 箭头、dashed/dotted、自环
   - 交互态:选中/悬停/active/neighbor/inactive 的描边色、宽度倍率、阴影(render rules 表)
   - 网格(scale > 0.5 时)、背景色
2. **交互回归**:单击选中、多选拖拽(保持相对位置)、滚轮缩放(以鼠标为中心)、平移、双击编辑、Alt 创建边 / Ctrl 套索 / Shift 追加
3. **数据流回归**:live diff(增删节点/边)、semantic 颜色变更(不重启仿真)、viewId 切换、窗口 resize
4. **技术验收**:Performance 面板确认冷却期 CPU ~0(isDirty 生效)、拖拽期帧率;Chrome DevTools Sources 确认无僵尸 worker(StrictMode 反复挂载)

### Phase 2 验证

- 主线程无 `__FRAME__`/`bitmap.close()` 路径;resize 后渲染跟随;事件坐标不偏移(`screenToSimulation` 依赖的 canvasRect 仍由 canvas 元素提供)
- 对比 Phase 1 帧传递延迟(Performance 面板 transfer 耗时)

### Phase 3 验证(性能基准)

| 规模 | 期望 |
|---|---|
| 1k 节点 / 2k 边 | 60fps,拖拽流畅 |
| 5k 节点 / 10k 边 | ≥45fps,draw call < 100 |
| 10k 节点 / 25k 边 | ≥30fps(对标 anytype 10k+ @60fps,按硬件浮动) |
| 冷却期 | CPU ~0(所有规模) |

---

## 6. 风险与回滚

| 风险 | 等级 | 缓解 |
|---|---|---|
| `transferToImageBitmap()` on WebGL 在各浏览器差异 | 中 | Phase 0 spike 先验证目标浏览器;Phase 2 提供直接转移备选(anytype 生产路径) |
| PixiJS 全量体积(~500KB min) | 中 | 用 `pixi.js/webworker` 子路径(自动省略 accessibility/dom/events)+ tree-shaking;worker 由 Next.js 打包 |
| CSP `unsafe-eval` 阻断 shader 编译 | 低-中 | worker 入口 `import "pixi.js/unsafe-eval"`;备选构建期 DOM shim(anytype 方案) |
| 标签模糊 | 中 | `Text.resolution = dpr`(anytype 踩坑修复点) |
| CJK/emoji 标签 | 中 | 用 `Text` 不用 `BitmapText`(CJK 字形集超出单 atlas 容量) |
| 行为变化:大图标签预算/LOD 隐藏 | 中 | Phase 3.4 显式做产品确认;可先 `LABEL_BUDGET = Infinity` 保留现行为 |
| WebGL context lost | 低 | Phase 4.1 监听 → `__ERROR__` 通道 → 错误横幅(复用现有错误 UI) |
| 批量分桶破坏视觉正确性 | 中 | Phase 1.7 像素级对比验收前置 |
| **回滚** | — | Phase 1 主线程零改动,`canvas.ts` facade 使 2D 实现可从 git 历史恢复;整个迁移在 feature branch 进行,`git revert` 即回滚 |

---

## 7. 范围外(Out of Scope, 后续独立议题)

- 节点图片支持(`ForceNodeSeed.imageUrl` + `Texture.from(ImageBitmap)` — anytype 有,当前 force 无)
- `d3-force-cluster` 聚类力(anytype 独有的一族力)
- 边标签渲染(当前 `drawEdge` 不绘制 edge.label,维持现状)
- Flow 模式(`@xyflow/react`)任何改动
- 更新 AGENTS.md 中已发现的文档-代码偏差(`RenderState` 6 态 vs 声称的 7 态 `UiState`、`__SET_CANVAS__` 已删、`canvas:wheel`/`frame`/`tick` 声明但未 emit)— Phase 4.3 顺带修正

---

## 8. 参考

- anytype-ts:`dist/workers/graph.js`(2229 行,PixiJS 8.16 + d3-force worker)、`src/ts/workers/pixi-worker-entry.ts`、`vite.worker.config.ts`(DOM shim)
- 本包:`src/force/worker/canvas.ts`(394 行,被替换)、`src/force/worker/api.ts`(帧循环,不变)、`src/force/worker/simulation.ts`(d3-force,不变)
- PixiJS v8 技能(项目内 `.agents/skills/pixijs-*`):`pixijs-environments`(WebWorkerAdapter)、`pixijs-performance`(批处理/池化/剔除)、`pixijs-scene-text`(Text vs BitmapText)、`pixijs-scene-core-concepts`(场景图/isRenderGroup)
