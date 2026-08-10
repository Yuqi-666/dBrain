## Force Graph 架构全景分析

### 一、双线程架构

Force Graph 采用 **React 主线程 + Web Worker** 的双线程设计，通过 Comlink RPC + 4 条原始 `postMessage` 通道通信。Worker 拥有 d3-force 物理模拟 + OffscreenCanvas 2D 渲染，主线程负责数据供给、DOM 事件捕获和 Zustand Store 桥接。

```
┌─ 主线程 ──────────────────────────────────────────────────────┐
│  graph.tsx → ForceGraph.tsx (编排器)                           │
│    ├─ eventListener.ts    DOM事件 → ProxiedDomEvent 序列化     │
│    ├─ transform.ts        NodeData/EdgeData → 种子数据转换      │
│    ├─ styleConfig.ts      主题 + 7态视觉调色板                  │
│    └─ eventHandler.ts     WorkerEvent → useUIStore 写入        │
├────────────────────────────────────────────────────────────────┤
│  Comlink RPC + 原始 postMessage (ImageBitmap / __READY__)      │
├────────────────────────────────────────────────────────────────┤
│  Worker 线程                                                    │
│    ├─ force.worker.ts  Comlink.expose(api) + 启动握手          │
│    ├─ api.ts           WorkerInbound → sim/canvas 路由 + 帧循环 │
│    ├─ simulation.ts    d3-force + hit-test + 事件状态机         │
│    └─ canvas.ts        OffscreenCanvas 2D → transferToImageBitmap│
└────────────────────────────────────────────────────────────────┘
```

### 二、文件清单（10 个文件，约 3000 行）

| 文件                          | 行数 | 职责                                             | 关键导出                                                                |
| ----------------------------- | ---- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `ForceGraph.tsx`              | 623  | 主线程编排器：启动 Worker、同步数据、渲染 canvas | `ForceGraph`(forwardRef)、`ForceGraphHandle`                            |
| `ForceGraphErrorBoundary.tsx` | 44   | React 错误边界                                   | `ForceGraphErrorBoundary`                                               |
| `eventListener.ts`            | 330  | DOM 事件捕获→序列化 + 延迟拖拽平移状态机         | `installDomEventProxy`、`screenToSimulation`                            |
| `styleConfig.ts`              | 188  | 主题 token + 7 态视觉调色板 + d3 默认参数        | `LIGHT_THEME`/`DARK_THEME`、`NODE_STATE_STYLES`、`DEFAULT_FORCE_CONFIG` |
| `transform.ts`                | 184  | 源数据→Worker 种子转换 + diff 提取               | `nodeDataToForceSeeds`、`edgeDataToForceSeeds`、`diffToForcePayload`    |
| `types.ts`                    | 391  | Force 私有类型系统 + Comlink RPC 契约            | `ProxiedDomEvent`、`UiState`、`WorkerInbound`、`WorkerEvent`            |
| `worker/api.ts`               | 240  | WorkerInbound 实现 + 帧循环调度 + 静态帧跳过      | `api`                                                                   |
| `worker/canvas.ts`            | 405  | OffscreenCanvas 2D 渲染 + 视锥裁剪 + 标签缓存     | `renderAndTransfer`、`renderFrame`、`truncateLabel`、`getContext`       |
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
  │ 5. 注册 __FRAME__ 监听器（ImageBitmap → ctx.drawImage → bitmap.close()）
  │
  ├─ api.setEventHandler(Comlink.proxy(onWorkerEvent))
  │
  ├─ performFullSync():
  │     快照 → filter 过滤 → nodeDataToForceSeeds / edgeDataToForceSeeds 转换
  │     → api.initData(seeds, links, {width, height})
  │     → api.updateStyle(buildForceStyle({theme}))
  │     → api.updateConfig({...DEFAULT_FORCE_CONFIG, centerX/Y})
  │     → api.setViewport(0, 0, 1)
  │
  ├─ subscribeStore(): 订阅 store diff → 逐桶重新过滤 → diffToForcePayload → api.applyDiff
  │
  └─ installDomEventProxy(): 安装所有 DOM 监听器
```

**Worker 侧（`api.initData`）：**

1. `createCanvas(width, height)` — 内部创建 OffscreenCanvas + 2D 上下文
2. `createOrUpdate(seeds, links, dims)`：
   - 原位合并节点（当 `fx===null` 且已有坐标时保留运行中的 x/y）
   - 从 `stateData.position[viewId]` 回填位置（仅首次加载）
   - 强制 `seed.fx ?? null`（d3 期望 `number|null` 而非 `undefined`）
   - 创建/重建 `forceSimulation`：`forceLink`(距离 80)、`forceManyBody`(-300)、`forceCollide`(weight+4)、`forceCenter`(dims/2)
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
pushFrame() → renderAndTransfer()
  │
  ▼
canvas.ts renderFrame():
  1. 清空 + 填充背景色
  2. 网格线（50px 步长，仅当 viewport.scale > 0.5）
  3. setTransform(scale, 0, 0, scale, vp.x, vp.y)
  4. 计算可见区域（invScale 反变换 + 50px 边距），绘制边（跳过两端均不可见者）：
      - hierarchy/association → 直线（association: 虚线 [6,4]）
      - flow → 二次贝塞尔 (mx, my-40)
      - interaction/bidirectional → 三次贝塞尔
      - 自环：节点上方弧线
      - 箭头：按 edge.direction 绘制 forward/reverse/bidirectional
      - 状态样式：EDGE_STATE_STYLES 的 stroke/lineWidth/shadow
  5. 绘制节点（仅可见区域内）：
      - 圆形填充（semanticColor || 主题 nodeColor）
      - 圆形描边 + 阴影（NODE_STATE_STYLES）
      - 标签（优先读 SimNode.__label 预计算缓存，fallback 二分搜索 measureText）
  │
  ▼
transferToImageBitmap() → 原始 postMessage({type:"__FRAME__", bitmap}, [bitmap])
  │
  ▼
主线程: ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close()
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

### 六、样式系统（两层架构：Theme + UiState）

Force 模式的样式系统是两层叠加架构，定义在 `styleConfig.ts`（188 行），最终由 Worker 的 OffscreenCanvas 渲染器消费。修改样式时必须同步更新 `styleConfig.ts` 和 `canvas.ts` 的消费逻辑。

```
┌─ 第一层：Theme（主题层）────────────────────────────────────────────┐
│  ThemeTokens: backgroundColor / nodeColor / edgeColor / labelColor  │
│  LIGHT_THEME ← "light"    DARK_THEME ← "dark"                      │
│  提供全局色彩基调，不随交互状态变化                                    │
├──────────────────────────────────────────────────────────────────────┤
│  "currentColor" 引用 ← 状态层通过此关键词引用主题层的 nodeColor       │
├──────────────────────────────────────────────────────────────────────┤
│  第二层：UiState（状态层）                                           │
│  7 态枚举 → StateVisual { stroke, fill?, lineWidth, shadow? }       │
│  覆盖描边/线宽/阴影，不改变填充色                                     │
└──────────────────────────────────────────────────────────────────────┘
```

#### 6.1 主题层：ThemeTokens

```typescript
interface ThemeTokens {
  backgroundColor: string;  // Canvas 背景填充
  nodeColor: string;        // 默认节点填充色
  edgeColor: string;        // 默认边描边色
  labelColor: string;       // 标签文字色
  gridColor?: string;       // 网格线色（可选）
}
```

| 属性 | Light (`#ffffff` 背景) | Dark (`#0a0a0a` 背景) |
| --- | --- | --- |
| `nodeColor` | `#165DFF` | `#4080FF` |
| `edgeColor` | `#91caff` | `#69b1ff` |
| `labelColor` | `#1f2937` | `#f3f4f6` |
| `gridColor` | `#e5e7eb` | `#262626` |

`getThemeTokens(theme: Theme): ThemeTokens` — `Theme` 是跨 force/flow 共享的 `"light" | "dark"` 枚举（定义在 `../types.ts`），`styleConfig.ts` 消费它但不重新导出。

#### 6.2 状态层：7 态 UiState → StateVisual

`UiState` = `default | hover | selected | active | neighborActive | inactive | disabled`（force 私有，`types.ts:107`）。状态顺序有意义——`simulation.ts` 中 `recomputeUiStates()` 按优先级覆盖（如 `active` 覆盖 `selected`）。

每个状态映射到 `StateVisual`：

```typescript
interface StateVisual {
  stroke: string;                                // 描边色（"currentColor" = 用主题 nodeColor）
  fill?: string;                                 // 可选填充覆盖
  lineWidth: number;                             // 描边宽度（px）
  shadow?: { color: string; blur: number };      // 可选 CSS 风格投影
}
```

`NODE_STATE_STYLES` 和 `EDGE_STATE_STYLES` **内容相同**（字节一致），但各自独立定义：

| UiState | stroke | lineWidth | shadow | 语义 |
| --- | --- | --- | --- | --- |
| `default` | `currentColor` | 2 | — | 无交互 |
| `hover` | `#4080FF` | 2.5 | `rgba(22,93,255,0.2)` blur 5 | 鼠标悬停 |
| `selected` | `#FF7D00` | 3 | `rgba(255,125,0,0.3)` blur 5 | 已被选中 |
| `active` | `#FF9500` | 4 | `rgba(255,149,0,0.5)` blur 8 | 选中+悬停（最显眼） |
| `neighborActive` | `#FFB266` | 2.5 | `rgba(255,178,102,0.15)` blur 5 | 选中节点的邻居 |
| `inactive` | `#9ca3af` | 2 | — | 有选中，但自身未被选 |
| `disabled` | `#d1d5db` | 1 | — | 被禁用/不可交互 |

`"currentColor"` 在 Canvas 渲染时被解析为当前主题的 `nodeColor`（`canvas.ts:212-214`）：

```typescript
c.strokeStyle = stateStyle.stroke === "currentColor"
  ? style.nodeColor
  : stateStyle.stroke;
```

**recomputeUiStates() 每帧运行：**

**节点优先级：** selected+hovered→`active` > selected→`selected` > hovered→`hover` > neighbor→`neighborActive` > 有选中→`inactive` > 其他→`default`

**边优先级：** 显式选中→`selected` > 两端点均选中→`selected` > 单端点选中→`neighborActive` > 有选中→`inactive` > 其他→`default`

#### 6.3 数据流：主线程 → Worker

```
ForceGraph.tsx (main thread)
  │
  ├─ performFullSync() / theme useEffect:
  │     buildForceStyle({ theme })          ← 组装 ForceStyle 载荷
  │     ├─ getThemeTokens(theme)            ← 选 light/dark 令牌
  │     ├─ 合并默认值：nodeRadius=8, edgeLineWidth=2, edgeDash=[6,4]
  │     └─ 返回 ForceStyle { theme, backgroundColor, nodeColor,
  │                          edgeColor, labelColor, nodeRadius,
  │                          edgeLineWidth, edgeDash, gridColor }
  │
  └─ api.updateStyle(stylePayload)          ← Comlink RPC 发送
        │
        └─ worker/canvas.ts: setStyle()     ← Worker 侧存储到模块级
               currentStyle: ForceStyle | null
```

**触发时机**：
- 初始化：`performFullSync()` 在 Worker 启动后调用一次
- 主题切换：`useEffect([theme])` — ForceGraph.tsx:481-487 自动响应
- 未来扩展：可通过 `buildForceStyle()` 的 `ForceStyleOptions` 覆盖 `nodeRadius`/`edgeLineWidth`

#### 6.4 Canvas 渲染消费

**节点绘制**（`canvas.ts drawNode`, L185-227）：
1. **Fill** — `node.semanticColor ?? style.nodeColor`（语义色优先）
2. **Stroke + Shadow** — 查 `NODE_STATE_STYLES[node.ui]`，`"currentColor"` → `style.nodeColor`
3. **Label** — 14px sans-serif，`style.labelColor`，优先读 `node.__label` 缓存，fallback `truncateLabel()` 截断到 ~100px

**边绘制**（`canvas.ts drawEdge`, L259-321）：
1. **Path Shape** — 根据 `edgeType` 选择路径：`interaction`/bidirectional → 三次贝塞尔，`flow` → 二次贝塞尔(mx, my-40)，其余 → 直线
2. **Stroke** — `link.semanticColor ?? style.edgeColor`
3. **Dash** — `association` 且非 bidirectional → `[6, 4]` 虚线
4. **Arrow** — `drawArrow()` 按 `edge.direction` 绘制单向/双向箭头
5. **Self-loop** — 自环绘制节点上方弧线 + 箭头

边描边的线宽和阴影来自 `EDGE_STATE_STYLES[link.ui]`，不直接使用 `style.edgeLineWidth`（后者仅在 `StateVisual` 的 fallback 路径中作为备选）。

#### 6.5 语义色覆盖（Semantic Color）

节点和边的 seed DTO（`ForceNodeSeed` / `ForceLinkSeed`）都有可选的 `semanticColor?: string` 字段。当存在时，在 Canvas 渲染中**覆盖主题默认色**（填充色或边描边色）：

- 节点：`fillStyle = node.semanticColor ?? style.nodeColor`
- 边：`strokeStyle = link.semanticColor ?? style.edgeColor`

语义色独立于 7 态系统——节点可以同时拥有蓝色填充（语义色）和橙色描边（selected 状态）。语义色来自 `NodeData` 源数据，由 `transform.ts` 的 `nodeDataToForceSeeds()` 传入。

#### 6.6 关键设计决策

| 决策 | 说明 |
| --- | --- |
| 两层分离 | 主题层管全局基调，状态层管交互反馈。两层解耦，修改主题不影响状态映射 |
| `"currentColor"` 占位 | 状态层的 `default` 状态描边用 `"currentColor"` 而非硬编码色值——确保主题切换时自动适配 |
| byte-identical 双表 | `NODE_STATE_STYLES` 和 `EDGE_STATE_STYLES` 内容完全一致但独立定义——为未来节点/边差异化提供扩展点 |
| 主题非同步推送到 Worker | 主题变化时只发 `updateStyle(ForceStyle)`，不重建仿真，不丢失节点状态 |
| ForceStyle 是 Worker 的单一真理来源 | Worker 不维护独立主题副本，不推断主题——完全由主线程推送 |
| Flow 模式无 UiState | `UiState` 是 force 独有的概念。Flow 依赖 ReactFlow 内置的 `selected` prop（`.rf-selected` CSS 类），无等价 7 态系统 |

### 七、Diff 增量更新

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
  2. Upsert（已有节点原位合并，新节点 push）
  3. sim.nodes(nodes); force("link").links(links)
  4. recomputeNeighbors() + recomputeUiStates() + rebuildQuadtree()
  5. sim.alphaTarget(0.1).restart() — 小幅能量注入让新布局平稳过渡
```

### 八、消息协议（4 条原始通道 + Comlink RPC）

| 通道                  | 方向      | 类型                                      | 说明                                                                    |
| --------------------- | --------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| `__READY__`           | worker→主 | `{type:"__READY__"}`                      | 启动信号，主线程 5 秒超时等待                                           |
| `__FRAME__`           | worker→主 | `{type:"__FRAME__", bitmap: ImageBitmap}` | 原始 postMessage + transfer list（ImageBitmap 非 Comlink Transferable） |
| `__PING__`/`__PONG__` | 双向      | 健康检查                                  | 挂在 self 上                                                            |
| `__ERROR__`           | worker→主 | `{type:"__ERROR__", message}`             | Canvas 异常、未捕获异常                                                 |
| Comlink RPC           | 双向      | 其他一切                                  | initData、applyDiff、proxyEvent、setViewport、setEventHandler 等        |

### 九、关键设计决策

1. **Worker 零 DOM 访问** — 所有手势通过 Comlink 序列化为 `ProxiedDomEvent`
2. **OffscreenCanvas 在 Worker 内部创建**（非传递）—— Comlink v4 限制，通过 RPC 传尺寸参数创建
3. **帧合并用 `queueMicrotask`** 而非 `requestAnimationFrame` — Worker 中 rAF 不可靠
4. **四叉树阈值 2000 节点** — 低于此值用暴力遍历 hit-test，高于此值用 d3-quadtree
5. **Force 模式只读位置** — 读取 `stateData.position[viewId]` 作为初始布局，永不回写。不持久化 fx/fy
6. **Force 模式不持久化 viewport**（与 flow 模式不同）
7. **单一事件处理出口** — ForceGraph 绝不直接调用 `useUIStore` setter 或 `useGraph()` 回调
8. **修饰键隔离**：Alt=创建边、Ctrl=套索选择、Shift=追加选择 — 主线程处理视觉效果，Worker 抑制节点拖拽
9. **固定坐标强制转换**：`seed.fx ?? null` — 主线程发送 `number|undefined`，Worker 需要 `number|null` 适配 d3
10. **AbortController 清理**：单次 `abort()` 移除所有监听器（StrictMode 安全）
11. **错误韧性**：Worker 崩溃通过 `setError()` 暴露，显示红色错误横幅。Canvas 异常发送 `__ERROR__` 消息

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
4. `canvas.ts` `drawNode()` 优先读 `node.__label`，fallback `truncateLabel(...)`

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

#### 10.8 反模式（禁止回退）

- **禁止**在拖拽循环内直接调用 `setNodePosition`（每节点一次 `alpha().restart()`）→ 用 `setNodePositionRaw` + 循环外单次 restart
- **禁止**在 `createOrUpdate` 内声明局部 `const nodeMap` —— 会遮蔽模块级 `let nodeMap`，导致 `nodeMap = new Map(...)` 对 const 赋值报错
- **禁止**移除 `renderFrame()` 中的视锥裁剪逻辑重新遍历全部节点/边
- **禁止**移除 `scheduleFrame()` 的 `isDirty` 守卫
- **禁止**在 `applyDiff` upsert 已有节点时不清除 `__label`（会导致标签不更新）
