## Force Graph 架构全景分析

### 一、双线程架构

Force Graph 采用 **React 主线程 + Web Worker** 的双线程设计，通过 Comlink RPC + 原始 `postMessage` 通道通信。Worker 拥有 d3-force 物理模拟 + PixiJS WebGL 渲染（通过 `./pixi/*` 层），主线程负责数据供给、DOM 事件捕获和 Zustand Store 桥接。

```
┌─ 主线程 ──────────────────────────────────────────────────────┐
│  graph.tsx → ForceGraph.tsx (编排器)                           │
│    ├─ eventListener.ts    DOM事件 → ProxiedDomEvent 序列化     │
│    ├─ transform.ts        NodeData/EdgeData → 种子数据转换      │
│    ├─ styleConfig.ts      四层样式管线（defaults/business/client/render）│
│    └─ eventHandler.ts     WorkerEvent → useUIStore 写入        │
├────────────────────────────────────────────────────────────────┤
│  Comlink RPC + 原始 postMessage (__SET_CANVAS__ / __READY__)
├────────────────────────────────────────────────────────────────┤
│  Worker 线程                                                    │
│    ├─ force.worker.ts  Comlink.expose(api) + 启动握手          │
│    ├─ api.ts           WorkerInbound → sim/canvas 路由 + 帧循环 │
│    ├─ simulation.ts    d3-force + hit-test + 事件状态机         │
│    └─ canvas.ts        PixiJS WebGL facade → delegates to ./pixi/*
└────────────────────────────────────────────────────────────────┘
```

### 二、文件清单（10 个文件，约 3000 行）

| 文件                          | 行数 | 职责                                             | 关键导出                                                                |
| ----------------------------- | ---- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `ForceGraph.tsx`              | 623  | 主线程编排器：启动 Worker、同步数据、渲染 canvas | `ForceGraph`(forwardRef)、`ForceGraphHandle`                            |
| `ForceGraphErrorBoundary.tsx` | 44   | React 错误边界                                   | `ForceGraphErrorBoundary`                                               |
| `eventListener.ts`            | 330  | DOM 事件捕获→序列化 + 延迟拖拽平移状态机 + 双指捏合缩放 | `installDomEventProxy`、`screenToSimulation`                            |
| `styleConfig.ts`              | 188  | 四层样式管线 + d3 默认参数 | `NODE_DEFAULTS`/`EDGE_DEFAULTS`、`*_BUSINESS_RULES`、`*_RENDER_RULES`、`DEFAULT_FORCE_CONFIG`、`resolveBusinessStyle`、`getRenderAdjustment` |
| `transform.ts`                | 184  | 源数据→Worker 种子转换 + 四层 merge + diff 提取 | `nodeDataToForceSeeds`、`edgeDataToForceSeeds`、`diffToForcePayload`    |
| `types.ts`                    | 391  | Force 私有类型系统 + Comlink RPC 契约            | `ProxiedDomEvent`、`RenderState`、`WorkerInbound`、`WorkerEvent`            |
| `worker/api.ts`               | 240  | WorkerInbound 实现 + 帧循环调度 + 静态帧跳过      | `api`                                                                   |
| `worker/canvas.ts`            | 250  | PixiJS WebGL facade — 委托到 `./pixi/*` 层   | `createCanvas`、`createCanvasFromMain`、`renderFrame`、`truncateLabel`、`getContext`       |
| `worker/force.worker.ts`      | 69   | Worker 入口：Comlink.expose + 启动信号           | （无——入口文件）                                                        |
| `worker/simulation.ts`        | 1020 | d3-force 核心 + 性能优化（节点Map索引/α去重等）   | `createOrUpdate`、`applyDiff`、`hitTest`、`handleProxiedEvent`、`populateNodeLabels` |

### 三、初始化流程（端到端）

```
graph.tsx
  │ 从 useDataStore 构建 getDataSnapshot / subscribeDiff / filter
  │ 通过 useGraphEventHandler() 构建 eventHandler
  ▼
ForceGraph.tsx (mount effect)
  │ 1. 按 devicePixelRatio 设置 <canvas> 后备尺寸
  │ 2. new Worker("./worker/force.worker.ts", {type:"module"})
  │ 3. 等待 __READY__ 消息（5 秒超时）
  │ 4. Comlink.wrap<WorkerInbound>(worker) → apiRef
  │ 5. `canvas.transferControlToOffscreen()` → postMessage `__SET_CANVAS__`
  │
  ├─ api.setEventHandler(Comlink.proxy(onWorkerEvent))
  │
  ├─ performFullSync():
  │     快照 → filter 过滤
  │     → buildSemanticColorMaps() 构建语义色 map
  │     → nodeDataToForceSeeds(nodes, {viewId, semanticColorMap, edgeSemanticColorMap})
  │     → api.initData(seeds, links, {width, height})
  │     → api.updateStyle({ backgroundColor: "#ffffff", gridColor: "#e5e7eb" })
  │     → api.updateConfig({...DEFAULT_FORCE_CONFIG, centerX/Y})
  │     → api.setViewport(0, 0, 1)
  │
  ├─ subscribeStore(): 订阅 store diff → 逐桶重新过滤 → diffToForcePayload → api.applyDiff
  │     + handleSemanticColorUpdate() — semantic 颜色变更独立处理
  │
  └─ installDomEventProxy(): 安装所有 DOM 监听器
```

**Worker 侧（`api.initData`）：**

1. `createCanvas(width, height)` — 内部创建 OffscreenCanvas + 2D 上下文
2. `createOrUpdate(seeds, links, dims)`：
   - 原位合并节点（当 `fx===null` 且已有坐标时保留运行中的 x/y）
   - 从 `stateData.client.position[viewId]` 回填位置（仅首次加载）
   - 强制 `seed.fx ?? null`（d3 期望 `number|null` 而非 `undefined`）
    - 创建/重建 `forceSimulation`：`forceLink`(距离 80)、`forceManyBody`(-300)、`forceCollide`(d.radius+4)、`forceCenter`(dims/2)
   - `alphaMin`: 0.001, `alphaDecay`: 0.0228, `velocityDecay`: 0.4
   - `alpha(1).restart()` — 完全重启

### 四、帧循环与渲染

```
d3 tick → onTick() → tickListeners.forEach(cb)
  │
  ▼
api.ts: onTickListener → scheduleFrame()
  │  queueMicrotask 合并（非 rAF——Worker 中 rAF 不可靠）
  │  isDirty 守卫：仅 alpha > 0.001 或 RPC 方法触发时执行渲染
  ▼
pushFrame() → renderFrame()
  │
  ▼
canvas.ts renderFrame():
  1. readSimulationState() → { nodes, links }
  2. syncGrid(viewport, dims, style)
  3. syncEdgeGraphics(links, viewport, dims) — 按样式签名分桶批量 stroke
  4. syncNodeOutlines(nodes, viewport, dims) — 节点描边+阴影
  5. syncNodeSprites(nodes, viewport, dims) — 池化 Sprite + tint
  6. syncLabels(nodes, links, viewport, dims) — 预算内 Text + LOD
  7. app.render()
  │
  ▼
Phase 2: 直接渲染到主线程传输的 OffscreenCanvas —— GPU 零拷贝合成
```

### 五、事件管线（DOM → Worker → Store）

**阶段一：DOM 捕获（主线程，`eventListener.ts`）**

- `pointerdown/move/up`、`wheel`、`contextmenu` 挂在 canvas 元素上
- `keydown/keyup` 挂在 `window` 上
- 所有监听器通过单一 `AbortController` 的 `{signal}` 附加
- 屏幕坐标→模拟坐标：`((clientX - rect.left) * dpr - vp.x) / vp.scale`

**延迟平移状态机**（关键的竞态防护）：

```
pointerdown → panPending=true, panCancelled=false, isPanning=false
pointermove → 若 pending && !cancelled && delta>6dpr: isPanning=true
            → 若 isPanning: 原地更新 viewport，通知 worker
pointerup   → isPanning=false, panPending=false, panCancelled=false
cancelPan() → panCancelled=true, isPanning=false（worker 检测到节点命中时调用）
```

这防止了 viewport 跳动：若 worker 发现命中节点，`cancelPan()` 在平移开始前阻断它。

**双指捏合缩放状态机**（触控屏，主线程拥有 viewport）：

触控屏不产生 `wheel` 事件（触控板捏合才会以 `wheel + ctrlKey` 到达），因此捏合由原始 touch 指针流重建：

```
touch#1 pointerdown → 正常单指行为（平移 / 拖拽节点）
touch#2 pointerdown → beginPinch(): 终止进行中的单指手势（cancelPan + 向 worker 补发一次
                      pointer-up，释放拖拽时 setNodeFixed(true) 造成的钉住），
                      记录 pinchStartDistance / pinchStartScale / 中点下的模拟坐标
pointermove (2 指)  → updatePinch(): scale = clamp(起始 scale × 距离比)，
                      vp = 当前中点 - scale × 锚点模拟坐标  ← 一条公式同时实现缩放 + 双指平移
所有 touch 事件        → 在 pinch 锁定期间全部吞掉（不下发 worker，不平移），手指全部抬起后解锁
pointercancel        → 与 pointerup 同路径（浏览器抢占手势时不会卡死状态机）
```

捏合期间某个手指加入/离开会**重新锚定**（用当前中点与当前 scale 重算锚点，视觉无跳变）。canvas 上的 `touch-action: none`（`ForceGraph.tsx`）是前提——否则浏览器会把手势用于页面缩放，第二个指针的 move 根本不会派发。

**阶段二：Worker 事件处理（`simulation.ts handleProxiedEvent`）**

| 事件           | 逻辑                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `pointer-down` | hitTest → 选中节点/边/清空选择。Alt/Ctrl 抑制。Shift=追加选择。双击检测（300ms 窗口）。设置 dragOffsets 用于多拖拽。 |
| `pointer-move` | 拖拽选中节点（通过偏移量计算 `setNodePosition`）。hit-test 检测 hover。发送 `node:drag` / `canvas:pointer-move`。    |
| `pointer-up`   | 释放拖拽。Ctrl=true 保持节点固定。发送 `node:drag-end`。释放前检查边命中，避免清空边选择。                           |
| `context-menu` | hitTest → 发送 `context-menu:node` / `context-menu:edge` / `context-menu:canvas`（携带 clientX/clientY）。           |
| `wheel`        | Worker 中无操作（viewport 平移/缩放由主线程控制）。                                                                  |

**阶段三：Store 桥接（`ForceGraph.tsx onWorkerEvent` → `eventHandler.handleWorkerEvent`）**

```
WorkerEvent → ForceGraph.onWorkerEvent:
  ├─ selection:changed → cancelPan()
  ├─ node:dblclick / node:drag-start / edge:click → cancelPan()
  ├─ context-menu:* → 本地状态（渲染 GraphContextMenu）
  └─ 所有事件 → eventHandler.handleWorkerEvent(event) → useUIStore 变更
```

### 六、样式系统（四层管线：defaults → business → client → worker）

Force 模式的样式系统采用四层管线（**优先级从低到高**），Layers 1–3 在 `transform.ts` 阶段确定，Layer 4 在 `canvas.ts` 渲染时微调。

```
┌─ Layer 1: Defaults（`styleConfig.ts`）──────────────────────────────┐
│  NODE_DEFAULTS / EDGE_DEFAULTS                                      │
│  → 基线视觉属性（fillColor, strokeColor, strokeWidth, ...）          │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 2: Business（`styleConfig.ts` + 外部 join 数据）              │
│  stateData.server → resolveBusinessStyle(NODE_BUSINESS_RULES)       │
│  例：{isChecked: true} → fillColor=#22c55e                          │
│  semanticColorMap[semanticId] → fillColor（外部 joined 的 semantic.color）│
├─────────────────────────────────────────────────────────────────────┤
│  Layer 3: Client（用户显式指定）                                     │
│  stateData.client.style → { fillColor, strokeColor, strokeWidth, ... }│
│  覆盖 business 和 defaults 的所有视觉属性                             │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 4: Worker Render（canvas.ts 渲染时 — 不在 seed 上）           │
│  交互态 → getRenderAdjustment(renderState, *_RENDER_RULES)          │
│  → strokeColorOverride, strokeWidthMultiplier, shadow                │
│  不改变 fill — 仅调整描边和投影                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**优先级：worker > client > business > defaults**

#### 6.1 数据结构

**ForceNodeSeed**（主线程全量确定的节点视觉属性）：

```typescript
interface ForceNodeSeed {
  id: NodeId;
  fillColor: string;       // 填充色（defaults → business → client → 最终值）
  strokeColor: string;     // 描边色
  strokeWidth: number;     // 描边宽度 (px)
  label: string;           // 显示文本
  labelColor: string;      // 标签色
  labelSize: number;       // 标签字号 (px)
  radius: number;          // 节点半径（也用于 forceCollide）
  x?, y?, fx?, fy?;       // 布局坐标
  nodeType?, viewId?;      // 身份标识
}
```

**ForceLinkSeed**（主线程全量确定的边视觉属性）：

```typescript
interface ForceLinkSeed {
  id: EdgeId;
  source, target: NodeId;
  label: string;
  labelColor, labelSize: ...;
  shape: "straight" | "curve" | "s-curve";    // 由此决定路径算法
  strokeType: "solid" | "dotted" | "dashed";  // 线型
  strokeColor, strokeWidth: ...;
  direction: EdgeDirection;
  weight?: EdgeWeight;
}
```

**ForceStyle**（全局 Canvas 属性，仅包含背景和网格）：

```typescript
interface ForceStyle {
  backgroundColor: string;
  gridColor?: string;
}
```

#### 6.2 Defaults

定义在 `styleConfig.ts`，作为所有节点/边的视觉基线：

| 属性 | 节点默认值 | 边默认值 |
| --- | --- | --- |
| `fillColor` | `#165DFF` | — |
| `strokeColor` | `#165DFF` | `#91caff` |
| `strokeWidth` | 2 | 2 |
| `labelColor` | `#1f2937` | `#9ca3af` |
| `labelSize` | 14 | 12 |
| `radius` | 8 | — |
| `shape` | — | `straight`（由 edgeType 映射）|
| `strokeType` | — | `solid`（`association`→`dashed`）|

**edgeType → shape/strokeType 映射**（`transform.ts`）：
- `hierarchy` → `straight` / `solid`
- `flow` → `curve` / `solid`
- `association` → `straight` / `dashed`
- `interaction` → `s-curve` / `solid`

#### 6.3 Business 层（stateData.server + semantic.color）

**stateData.server**：server 端运行时业务数据字段，通过 `NODE_BUSINESS_RULES` 映射为视觉属性：

```typescript
interface BusinessStyleRule {
  field: string;
  mapping: Record<string, Partial<NodeVisualProps>>;
}
// 例：{ field: "isChecked", mapping: { "true": { fillColor: "#22c55e" } } }
```

规则表默认空。添加规则：在 `styleConfig.ts` 的 `NODE_BUSINESS_RULES` / `EDGE_BUSINESS_RULES` 中追加。

**semantic.color**：外部 joined 的 NodeSemantic/EdgeSemantic 的 `color` 字段。ForceGraph 在 `performFullSync` 中从 `useDataStore.getState()` 构建 `semanticColorMap` / `edgeSemanticColorMap`，传入 `TransformOptions`。与 stateData.server 同属 business 层——transform 先 resolve business rules，再覆盖 semanticColor。

**semantic.color 变更同步**：ForceGraph 通过 `SourceDiff.semanticDiffs` 接收语义实体变更。收到颜色变更时，查找所有引用该 semanticId 的节点/边，仅对这些受影响的元素重算视觉属性并通过 `applyDiff({ nodeUpserts, linkUpserts })` 推送。不重启仿真，不重新计算位置。

#### 6.4 数据流：ForceGraph → transform → seed

```
ForceGraph.tsx performFullSync()
  │
  ├─ useDataStore.getState().nodeSemantics → semanticColorMap
  ├─ useDataStore.getState().edgeSemantics → edgeSemanticColorMap
  │
  └─ nodeDataToForceSeeds(nodes, { viewId, semanticColorMap, edgeSemanticColorMap })
         │
         ▼ Per-node merge（later wins）:
           NODE_DEFAULTS                                      // Layer 1
             → resolveBusinessStyle(server, NODE_BUSINESS_RULES)  // Layer 2a
             → (if semanticColor) set fillColor                  // Layer 2b
             → { ...result, ...stateData.client.style }            // Layer 3
         │
         ▼ ForceNodeSeed { fillColor, strokeColor, ... }
         │ Comlink RPC: api.initData / api.applyDiff
         ▼
       Worker: SimNode 持有所有属性，零查表
```

优先级：**client > business > defaults**。Layer 4 (worker render) 在 canvas 渲染时再叠加。

#### 6.5 Worker Render Rules（交互态微调）

Worker 内部维护 `SimNode.renderState` / `SimLink.renderState`。渲染时查 `getRenderAdjustment()`：

| 状态 | strokeWidth 倍率 | strokeColor | 投影 |
| --- | --- | --- | --- |
| `active` | ×2.0 | `#FF9500` | blur 8, 50% |
| `selected` | ×1.5 | `#FF7D00` | blur 5, 30% |
| `hover` | ×1.25 | `#4080FF` | blur 5, 20% |
| `neighbor` | — | `#FFB266` | 浅投影 |
| `inactive` | — | `#9ca3af` | — |
| `default` | — | 取 seed.strokeColor | — |

Render rules **只调整描边和投影，不改变填充色**。填充色完全由 seed 数据决定。

**Worker 内交互态计算**（`simulation.ts recomputeWorkerState`）：
- 节点优先级：selected+hovered→`active` > selected→`selected` > hovered→`hover` > neighbor→`neighbor` > 有选中→`inactive` > 其他→`default`
- 边优先级：显式选中→`selected` > 两端点均选中→`selected` > 单端点选中→`neighbor` > 有选中→`inactive` > 其他→`default`

#### 6.6 关键设计决策

| 决策 | 说明 |
| --- | --- |
| 四层优先级 | worker > client > business > defaults — 每层可覆盖前层 |
| visual 属性前置到 seed | 每个 seed 自带完整视觉效果，Worker 零查表、零 JOIN |
| client 覆盖 business | `stateData.client` 是用户显式指定的显示属性，优先级高于 business 层的推断 |
| semantic.color 属 business 层 | 与 `stateData.server` 同级 merge，client 可覆盖它 |
| Worker 只做乘法 | 交互态不查固定颜色表，仅对 seed 上的属性做乘法和覆盖 |
| 解析后样式复用 interfaces 类型 | `NODE_DEFAULTS`/`EDGE_DEFAULTS` 与 `resolveBusinessStyle()` 使用 `Required<NodeClientStyle>` / `Required<EdgeClientStyle>`，不再维护 `*ResolvedStyle` 平行定义 |
| 边标签默认不渲染 | 仅在端点节点为 `hover/selected/active` 或边本身为 `selected` 时渲染（`labels.ts` `edgeLabelVisible`）；白色圆角 chip 位于边中点，描边复用 `edges.ts` 的 `resolveEdgeRenderStyle()`；LOD 门控与 `LABEL_BUDGET` 体系一致，另有 `EDGE_LABEL_BUDGET` 上限 |
| SimNode/SimLink 对称继承 | `SimLink extends Omit<ForceLinkSeed, "source" \| "target">` |
| Flow 模式无此系统 | RenderState 是 force 独有的概念 |

### 七、Diff 增量更新 + 样式同步

```
Store 发出 diff → subscribeStore 回调:
  1. 通过视图过滤器重新过滤 nodes.added/updated
  2. collectEdgeEndpointIds(diff) → 查找端点节点
  3. 重新过滤 edges.added/updated（限定到端点范围）
  4. removed 原样透传（worker 是真理来源）
  5. diffToForcePayload() → {nodeUpserts, nodeRemovals, linkUpserts, linkRemovals}
  6. api.applyDiff(payload)

Worker applyDiff():
  1. 过滤掉已删除的节点/边，清理选择/悬停状态
  2. Upsert（已有节点原位合并视觉属性，新节点 push → hasTopologyChange=true）
  3. 若 hasTopologyChange → sim.alphaTarget(0.1).restart()
     否则 → 仅 sim.nodes/.links 同步引用（属性更新不含仿真重启）
  4. recomputeNeighbors() + recomputeWorkerState() + rebuildQuadtree()

Semantic 颜色同步（独立路径，不经过 NodeData diff）：
  SourceDiff.semanticDiffs → handleSemanticColorUpdate()
    → 查找所有引用变更 semanticId 的节点/边
    → transform 重算 → api.applyDiff({ nodeUpserts, linkUpserts })
    → hasTopologyChange=false → 不重启仿真
```

**仿真重启规则**：仅增删节点或增删边时触发 `alphaTarget(0.1).restart()`。属性更新（`stateData.client`、`stateData.server`、`semantic.color` 变更）只更新 Worker 内存中的值，位置不动。

### 八、消息协议（原始通道 + Comlink RPC）

| 通道                  | 方向      | 类型                                      | 说明                                                                    |
| --------------------- | --------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| `__READY__`           | worker→主 | `{type:"__READY__"}`                      | 启动信号，主线程 5 秒超时等待                                           |
| `__SET_CANVAS__`      | 主→worker | `{type:"__SET_CANVAS__", canvas, width, height}` | Phase 2——`transferControlToOffscreen()` → worker 接收 OffscreenCanvas（Comlink v4 无法传输） |
| `__PING__`/`__PONG__` | 双向      | 健康检查                                  | 挂在 self 上                                                            |
| `__ERROR__`           | worker→主 | `{type:"__ERROR__", message}`             | Canvas/Pixi 异常、未捕获异常                                            |
| Comlink RPC           | 双向      | 其他一切                                  | initData、applyDiff、proxyEvent、setViewport、setEventHandler 等        |

### 九、关键设计决策

1. **Worker 零 DOM 访问** — 所有手势通过 Comlink 序列化为 `ProxiedDomEvent`
2. **OffscreenCanvas 从主线程传输**（Phase 2）—— `transferControlToOffscreen()` → `__SET_CANVAS__` 原始通道 → PixiJS 直接渲染到页面可见画布（GPU 零拷贝合成）。备选：Phase 1 路径是由 Worker 内部创建（`createCanvas` 用于 `initData`）
3. **帧合并用 `queueMicrotask`** 而非 `requestAnimationFrame` — Worker 中 rAF 不可靠
4. **四叉树阈值 2000 节点** — 低于此值用暴力遍历 hit-test，高于此值用 d3-quadtree
5. **Force 模式只读位置** — 读取 `stateData.client.position[viewId]` 作为初始布局，永不回写。不持久化 fx/fy
6. **Force 模式不持久化 viewport**（与 flow 模式不同）
7. **单一事件处理出口** — ForceGraph 绝不直接调用 `useUIStore` setter 或 `useGraph()` 回调
8. **修饰键隔离**：Alt=创建边、Ctrl=套索选择、Shift=追加选择 — 主线程处理视觉效果，Worker 抑制节点拖拽
9. **固定坐标强制转换**：`seed.fx ?? null` — 主线程发送 `number|undefined`，Worker 需要 `number|null` 适配 d3
10. **AbortController 清理**：单次 `abort()` 移除所有监听器（StrictMode 安全）
11. **错误韧性**：Worker 崩溃通过 `setError()` 暴露，显示红色错误横幅。Canvas 异常发送 `__ERROR__` 消息
12. **仿真仅拓扑变更时重启**：`applyDiff` 用 `hasTopologyChange` 标志——节点/边增删触发 `alphaTarget(0.1).restart()`，纯属性更新（颜色、stateData）仅更新内存值，不重启仿真
13. **视觉属性前置到 seed**：`ForceNodeSeed`/`ForceLinkSeed` 包含完整的 fillColor/strokeColor/strokeWidth/labelSize/... — Worker 零查表、零 JOIN
14. **四层样式管线**：defaults → business(stateData.server + semantic.color) → client(stateData.client) → worker(hover/select 交互态)。优先级：worker > client > business > defaults
15. **缩放有两个入口，都在主线程**：触控板的 `wheel + ctrlKey`，以及触控屏的双指捏合（由 `pointerType === "touch"` 指针流重建）。两者共用 `clampScale()` 的 0.1–5 边界；worker 只收到 `setViewport`。触控屏支持的前提是 canvas 的 `touch-action: none`

### 十、性能优化（2026-08 实施）

以下优化已落地到代码中。修改仿真或渲染代码时，**不要破坏这些优化**。

#### 10.1 节点 Map 索引（`simulation.ts`）

模块级 `let nodeMap: Map<NodeId, SimNode>`（L83），在 `createOrUpdate` 和 `applyDiff` 中与 `nodes` 数组同步维护。所有 `nodes.find((n) => n.id === xxx)` 已替换为 `nodeMap.get(xxx)` —— O(n) → O(1)。

**修改规则**：
- 新增节点路径（`createOrUpdate` / `applyDiff` 的 upsert 分支）必须同步更新 `nodeMap.set(id, node)`
- 删除节点路径（`applyDiff` 的 removal 分支）必须同步调用 `nodeMap.delete(id)`
- `createOrUpdate` 中在 `nodes = next` 后整表重建：`nodeMap = new Map(nodes.map(n => [n.id, n]))`
- **不要**在函数内创建局部变量 `nodeMap` ——它会遮蔽模块级变量（历史上发生过导致 Turbopack 构建报错）

#### 10.2 视锥裁剪（`canvas.ts` `renderFrame()`）

渲染前反算可见区域（利用 viewport 反变换 `invScale = 1/viewport.scale`），50px 边距。节点和边：仅当在可见区域内才绘制。边跳过规则：**两端点均不可见**才跳过（单端点不可见仍需绘制——边跨越视口边界）。

**关键参数**：`PAD = 50`（覆盖节点半径 + 标签高度）。

#### 10.3 标签预计算缓存（`canvas.ts` + `api.ts` + `simulation.ts`）

`SimNode.__label` 字段在数据摄入后预计算（`api.ts` `computeLabels()` → `simulation.ts` `populateNodeLabels(getLabel)`），避免每帧 `measureText` + 二分搜索。

**流程**：
1. `canvas.ts` 导出 `truncateLabel` 和 `getContext()`
2. `api.ts` `computeLabels()` 在 `initData` / `applyDiff` 之后调用，传入 canvas 上下文
3. `simulation.ts` `populateNodeLabels(getLabel)` 遍历全部节点填入 `__label`
4. `worker/pixi/labels.ts` 优先读 `node.__label`，fallback `node.label`

**失效规则**：`applyDiff` 中 upsert 已有节点时，必须将 `existing.__label = undefined`，让下一次 `computeLabels()` 重新计算。

#### 10.4 四叉树节流重建（`simulation.ts` `onTick()`）

原每 tick 无条件 `rebuildQuadtree()`（L555），现改为 `++tickCount % 5 === 0 || alpha > 0.01` 时才重建。冷却期只有 1/5 的开销。`createOrUpdate` 中重置 `tickCount = 0`。

#### 10.5 静态帧跳过（`api.ts`）

`scheduleFrame()` 新增 `isDirty` 守卫：仅在 `isDirty === true` 时才执行 `pushFrame()`，执行后复位为 `false`。

**脏标记设置规则**：
- `onTickListener`：`alpha > 0.001` 时置脏（表示仿真活跃中）
- 所有 API 方法（`initData`/`applyDiff`/`updateConfig`/`updateStyle`/`setNodeFixed`/`setNodePosition`/`reheat`/`proxyEvent`）：调用后置脏
- `setViewport`：仅当新值与当前值不同时置脏（避免相同 viewport 的重复渲染）
- `setDimensions`：调用后置脏

仿真冷却（alpha ≤ 0.001）且无其他交互时，帧循环停止——CPU 占用降为零。

#### 10.6 α 重启去重（`simulation.ts` `handleProxiedEvent` pointer-move）

`setNodePosition` 拆分为 `setNodePositionRaw`（纯位置更新，不重启仿真）和 `setNodePosition`（原 API，保持兼容）。pointer-move 拖拽循环改用 `setNodePositionRaw` 逐节点更新，循环结束后**统一调用一次** `sim.alpha(0.3).restart()`，替代原来的每节点一次重启（N:1 减少）。

#### 10.7 hitTestEdge 四叉树空间预过滤（`simulation.ts` `hitTestEdge()`）

当四叉树可用（n ≥ 2000）时，先用 `qt.visit()` 找到 hit 点周围 100px 半径内的候选节点，收集其 id 集合。遍历边时跳过两端点均不在候选集中的边，避免 O(m) 暴力检测。

**搜索半径 `100px`** = linkDistance(80) + threshold(10) + margin(10)，足以覆盖一条边跨越的最大距离。

#### 10.8 标签预算 + LOD（`styleConfig.ts` + `worker/pixi/labels.ts`，Phase 3）

`LABEL_BUDGET = 100` 和 `TRANSFORM_THRESHOLD = 1`（`styleConfig.ts`）。`syncLabels()` 按优先级排序节点(active > selected > hovered > root > degree > others)，仅渲染前 N 个标签。当 `viewport.scale < TRANSFORM_THRESHOLD` 时隐藏所有标签（LOD 门控）。

#### 10.9 样式键缓存（`worker/pixi/edges.ts`，Phase 3）

`styleKeyCache` / `outlineKeyCache` Maps（按 nodeId/edgeId 索引）。`edgeStyleKey()` 和 `nodeOutlineStyleKey()` 在首次未命中时计算并缓存样式签名字符串，在后续帧间持久化，避免每帧重新进行 `getRenderAdjustment().find()`。通过 `clearStyleKeyCaches()` 在 initData/teardown 上失效。

#### 10.10 反模式（禁止回退）

- **禁止**在拖拽循环内直接调用 `setNodePosition`（每节点一次 `alpha().restart()`）→ 用 `setNodePositionRaw` + 循环外单次 restart
- **禁止**在 `createOrUpdate` 内声明局部 `const nodeMap` —— 会遮蔽模块级 `let nodeMap`，导致 `nodeMap = new Map(...)` 对 const 赋值报错
- **禁止**移除 `renderFrame()` 中的视锥裁剪逻辑重新遍历全部节点/边
- **禁止**移除 `scheduleFrame()` 的 `isDirty` 守卫
- **禁止**在 `applyDiff` upsert 已有节点时不清除 `__label`（会导致标签不更新）
