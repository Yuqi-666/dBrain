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

### 二、文件清单（10 个文件，约 2800 行）

| 文件                          | 行数 | 职责                                             | 关键导出                                                                |
| ----------------------------- | ---- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `ForceGraph.tsx`              | 623  | 主线程编排器：启动 Worker、同步数据、渲染 canvas | `ForceGraph`(forwardRef)、`ForceGraphHandle`                            |
| `ForceGraphErrorBoundary.tsx` | 44   | React 错误边界                                   | `ForceGraphErrorBoundary`                                               |
| `eventListener.ts`            | 330  | DOM 事件捕获→序列化 + 延迟拖拽平移状态机         | `installDomEventProxy`、`screenToSimulation`                            |
| `styleConfig.ts`              | 188  | 主题 token + 7 态视觉调色板 + d3 默认参数        | `LIGHT_THEME`/`DARK_THEME`、`NODE_STATE_STYLES`、`DEFAULT_FORCE_CONFIG` |
| `transform.ts`                | 184  | 源数据→Worker 种子转换 + diff 提取               | `nodeDataToForceSeeds`、`edgeDataToForceSeeds`、`diffToForcePayload`    |
| `types.ts`                    | 391  | Force 私有类型系统 + Comlink RPC 契约            | `ProxiedDomEvent`、`UiState`、`WorkerInbound`、`WorkerEvent`            |
| `worker/api.ts`               | 204  | WorkerInbound 实现 + 帧循环调度                  | `api`                                                                   |
| `worker/canvas.ts`            | 360  | OffscreenCanvas 2D 渲染器                        | `renderAndTransfer`、`renderFrame`                                      |
| `worker/force.worker.ts`      | 69   | Worker 入口：Comlink.expose + 启动信号           | （无——入口文件）                                                        |
| `worker/simulation.ts`        | 947  | d3-force 核心：选择/悬停/hit-test/事件分发       | `createOrUpdate`、`applyDiff`、`hitTest`、`handleProxiedEvent`          |

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
  ▼
pushFrame() → renderAndTransfer()
  │
  ▼
canvas.ts renderFrame():
  1. 清空 + 填充背景色
  2. 网格线（50px 步长，仅当 viewport.scale > 0.5）
  3. setTransform(scale, 0, 0, scale, vp.x, vp.y)
  4. 绘制边（先于节点）：
     - hierarchy/association → 直线（association: 虚线 [6,4]）
     - flow → 二次贝塞尔 (mx, my-40)
     - interaction/bidirectional → 三次贝塞尔
     - 自环：节点上方弧线
     - 箭头：按 edge.direction 绘制 forward/reverse/bidirectional
     - 状态样式：EDGE_STATE_STYLES 的 stroke/lineWidth/shadow
  5. 绘制节点：
     - 圆形填充（semanticColor || 主题 nodeColor）
     - 圆形描边 + 阴影（NODE_STATE_STYLES）
     - 下方标签（二进制搜索 measureText 截断至约 100px）
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

### 六、7 态 UI 系统

`UiState` = `default | hover | selected | active | neighborActive | inactive | disabled`（force 私有，types.ts:107）

**recomputeUiStates() 每帧运行：**

**节点优先级：** selected+hovered→`active` > selected→`selected` > hovered→`hover` > neighbor→`neighborActive` > 有选中→`inactive` > 其他→`default`

**边优先级：** 显式选中→`selected` > 两端点均选中→`selected` > 单端点选中→`neighborActive` > 有选中→`inactive` > 其他→`default`

**视觉映射（NODE_STATE_STYLES / EDGE_STATE_STYLES）：**

| 状态           | 描边颜色     | 线宽 | 阴影                           |
| -------------- | ------------ | ---- | ------------------------------ |
| default        | currentColor | 2    | -                              |
| active         | #FF9500      | 4    | rgba(255,149,0,0.5), blur 8    |
| selected       | #FF7D00      | 3    | rgba(255,125,0,0.3), blur 5    |
| hover          | #4080FF      | 2.5  | rgba(22,93,255,0.2), blur 5    |
| neighborActive | #FFB266      | 2.5  | rgba(255,178,102,0.15), blur 5 |
| inactive       | #9ca3af      | 2    | -                              |
| disabled       | #d1d5db      | 1    | -                              |

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
