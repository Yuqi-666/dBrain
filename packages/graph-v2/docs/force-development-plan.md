# Force Mode 开发方案

> 基于 [架构审计报告](./force-architecture-audit.md) 的完整度分析，按依赖关系和优先级组织。

---

## 关键架构决策

### Canvas 渲染管线：方案选择

| 方案 | 描述 | 优点 | 风险 |
|---|---|---|---|
| **A. 修复 Hybrid** | `getContext` 在 `transferControlToOffscreen` 前获取 | 改动最小 | 语义矛盾（主 Canvas 失去控制权后仍画图），仍会二次调用崩溃 |
| **B. 纯 Auto-Compositing** | 移除 `__FRAME__` 通道，Worker 直接绘制到 transfer-controlled Canvas | 零传输开销 | 无法在主线程叠加覆盖层，与现有 `bitmap.close()` 范式冲突 |
| **C. 分离式 OffscreenCanvas** ⭐ | Worker 创建 `new OffscreenCanvas(w,h)`，每帧 `transferToImageBitmap()` 传回主线程，主 Canvas 保持独立 2D 上下文 | 主 Canvas 保持完整控制权，无 transfer 冲突，标准 Worker 渲染范式 | `__SET_CANVAS__` 通道简化，需调整 Worker 初始化 |

**选定方案 C**。实现路径：

```
Before (broken):
  Main Canvas ──transferControlToOffscreen()──→ OffscreenCanvas in Worker
  Main Canvas.getContext("2d") → null ❌
  Worker.renderFrame() → transferToImageBitmap() → __FRAME__ → null ctx ❌

After (方案 C):
  Main Canvas ── 保持独立 2D 上下文
  Worker 内部 new OffscreenCanvas(w, h) ── renderFrame() ── transferToImageBitmap()
       └── __FRAME__ → main ctx2d.drawImage(bitmap) ✓
```

影响范围：`ForceGraph.tsx:setupWorker()`、`force.worker.ts:initCanvas()`、`api.ts`

---

## Phase 0 — 管线复活（阻塞所有后续阶段）

> **目标**：Canvas 渲染可见 → 后续修复可被视觉验证  
> **预估**：2-3 天

### 0.1 切换为分离式 OffscreenCanvas [危急 🔴]

**文件**：`ForceGraph.tsx:168-231`、`force/worker/force.worker.ts:40-70`、`force/worker/api.ts`

**改动**：
1. `ForceGraph.tsx` `setupWorker()`：移除 `canvas.transferControlToOffscreen()`（L206），在 Worker 创建前获取 `ctx2d`
   ```ts
   // 先获取 ctx，再创建 Worker
   const ctx2d = canvas.getContext("2d");
   if (!ctx2d) throw new Error("Canvas 2D context unavailable");
   ```
2. `force.worker.ts`：移除 `initCanvas` 调用，改为 Worker self 创建 OffscreenCanvas
3. `api.ts`：`initData` / `setDimensions` 时创建/调整 Worker 内部 `OffscreenCanvas`
4. 移除 `__SET_CANVAS__` 原始通道（不再需要 transfer `OffscreenCanvas` 对象），改为发送 `{ type: "__SET_CANVAS__", width, height }` 仅传尺寸
5. `__FRAME__` 处理器保持，但 `ctx2d` 现在是有效值

**验证**：`pnpm --filter=@workspace/graph-v2 typecheck`，dev 模式下 Canvas 可见节点绘制

### 0.2 修复 Boot Effect 幂等性 [危急 🔴]

**文件**：`ForceGraph.tsx:324-396`

**改动**：
1. 在 `setupWorker()` 中加入 `canvasInitialized` 标记，防止重复初始化
2. 将 `subscribeStore` identity 变化时只做 `performFullSync`，不重建 Worker
3. 拆分为两个 effect：Worker 生命周期 (mount/unmount) 和 View 数据变化 (viewId change)
   ```ts
   // Effect 1: Worker 生命周期 — 仅 mount/unmount
   useEffect(() => { /* setupWorker + cleanup */ }, []);
   
   // Effect 2: 数据同步 — viewId / view 变化时 full-sync
   useEffect(() => { performFullSync(); }, [view, viewId, view.filterConfig]);
   ```

**验证**：视图切换不崩溃，Canvas 正常渲染

### 0.3 修复 StrictMode 竞态 + 僵尸 Worker [危急 🔴]

**文件**：`ForceGraph.tsx:144-145, 168-231`

**改动**：
1. 每个 Effect 实例用局部变量持有 Worker，不通过共享 `workerRef`/`apiRef`
2. cleanup 中的 terminate 使用闭包中的 worker 引用而非共享 ref
   ```ts
   useEffect(() => {
     let cancelled = false;
     let worker: Worker | null = null;  // 局部，非共享 ref
     let api: WorkerInbound | null = null;
     
     (async () => {
       const result = await setupWorker();
       if (cancelled) { result.worker.terminate(); return; }
       worker = result.worker;
       api = result.api;
       // ...
     })();
     
     return () => {
       cancelled = true;
       worker?.terminate();  // 使用闭包局部变量
     };
   }, []);
   ```

**验证**：React StrictMode 下无僵尸 Worker，DevTools Sources 面板无多余 Worker 线程

### 0.4 修复 Diff 订阅泄漏 + 管线污染 [危急 🔴]

**文件**：`ForceGraph.tsx:271-309, 379-396`

**改动**：在 `subscribeStore` 赋值后立即注册，且在 cleanup 中保证访问到：
```ts
let unsubDiff: (() => void) | null = null;

(async () => {
  const { api, worker } = await setupWorker();
  if (cancelled) { worker.terminate(); return; }
  
  await api.setEventHandler(Comlink.proxy(onWorkerEvent));
  await performFullSync();
  
  // 关键：在 cancelled 二次检查之前注册订阅
  if (cancelled) { worker.terminate(); return; }
  unsubDiff = subscribeStore();
  setIsReady(true);
})();

return () => {
  cancelled = true;
  unsubDiff?.();  // cleanup 可以访问到已赋值的 unsubDiff
  // ...
};
```

**验证**：多次切换 Force view 不积累订阅，diff 正常传递

---

## Phase 1 — 核心交互（让基础用法工作）

> **目标**：选的准、拖得动、缩得了  
> **预估**：3-4 天

### 1.1 修复选态同步 [高 🔴]

**文件**：`simulation.ts:587-687`、`eventHandler.ts:172-231`

**问题链**：
- pointer-down 选中 Worker 内部但不同步 UI store
- pointer-up 无条件 emit `canvas:click` → eventHandler 清空 UI store 选态
- `node:click` 仅右键 emit → 左键永远无法选中

**改动**：

1. **`simulation.ts`** 的 `pointer-down` 命中节点时，emit `node:click`（不再仅 `node:drag-start`）：
   ```ts
   case "pointer-down": {
     const target = hitTest(evt.x, evt.y);
     if (target) {
       if (evt.modifiers.alt) return;
       if (evt.modifiers.ctrl) return;
       setSelectedNodes([target.id]);
       setNodeFixed(target.id, true, target.x, target.y);
       // 新增：同步选态到 UI store
       emit({ type: "selection:changed", selectedNodeIds: [target.id], selectedEdgeIds: [] });
       emit({ type: "node:drag-start", nodeId: target.id, x: target.x ?? 0, y: target.y ?? 0 });
     }
     // ...
   }
   ```

2. **`simulation.ts`** 的 `pointer-up`：只在非节点拖动时 emit `canvas:click`：
   ```ts
   case "pointer-up": {
     const wasDragging = selectedNodeIds.size > 0;
     // ... release pins ...
     if (!wasDragging) {
       // 仅在点击空画布（无拖拽）时清空
       const target = hitTest(evt.x, evt.y);
       if (!target) {
         emit({ type: "canvas:click", x: evt.x, y: evt.y });
       }
     }
   }
   ```

3. **`simulation.ts`** 的 `clearSelection`：emit `selection:changed` 以同步 UI store：
   ```ts
   function clearSelection(): void {
     selectedNodeIds.clear();
     selectedEdgeIds.clear();
     recomputeNeighbors();
     recomputeUiStates();
     emit({ type: "selection:changed", selectedNodeIds: [], selectedEdgeIds: [] });
   }
   ```

**验证**：左键点击节点 → 选中高亮 + UI store 同步；点击空画布 → 清除选态

### 1.2 修复多选拖拽坍缩 [高 🔴]

**文件**：`simulation.ts:616-625`

**问题**：多选拖拽把所有节点移动到同一光标位置

**改动**：记录 pointer-down 时的偏移量，drag 时应用偏移：
```ts
const dragOffsets = new Map<NodeId, { ox: number; oy: number }>();

case "pointer-down": {
  const target = hitTest(evt.x, evt.y);
  if (target) {
    // ...
    // 为所有选中节点记录偏移
    for (const id of selectedNodeIds) {
      const n = nodes.find((nn) => nn.id === id);
      if (n) dragOffsets.set(id, { ox: (n.x ?? 0) - evt.x, oy: (n.y ?? 0) - evt.y });
    }
  }
}

case "pointer-move": {
  if (selectedNodeIds.size > 0 && !evt.modifiers.alt && !evt.modifiers.ctrl) {
    for (const id of selectedNodeIds) {
      const offset = dragOffsets.get(id) ?? { ox: 0, oy: 0 };
      setNodePosition(id, evt.x + offset.ox, evt.y + offset.oy);
      emit({ type: "node:drag", nodeId: id, x: evt.x + offset.ox, y: evt.y + offset.oy });
    }
  }
  // ...
}
```

**验证**：多选节点拖拽时保持相对位置

### 1.3 实现 viewport 平移/缩放 [高 🔴]

**文件**：`ForceGraph.tsx:149`、`eventListener.ts:158-163`、`force/worker/api.ts:156-160`、`canvas.ts:37,74-76`

**问题**：`viewportRef` 从不更新，滚轮事件被吞但无效果

**改动**：

1. **`eventListener.ts`** 的 wheel handler 中计算新 viewport 并更新 `viewportRef`：
   ```ts
   const onWheel = (e: WheelEvent) => {
     e.preventDefault();
     const zoom = Math.exp(-e.deltaY * 0.001);
     const newScale = viewportRef.current.scale * zoom;
     const clamped = Math.max(0.1, Math.min(5, newScale));
     const mouse = getSimCoord(e);
     // 以鼠标位置为中心缩放
     viewportRef.current.x = mouse.x - zoom * (mouse.x - viewportRef.current.x);
     viewportRef.current.y = mouse.y - zoom * (mouse.y - viewportRef.current.y);
     viewportRef.current.scale = clamped;
     // 同步到 Worker
     apiRef.current?.setViewport(viewportRef.current.x, viewportRef.current.y, clamped);
   };
   ```

2. **`ForceGraph.tsx`** 中初始化带 `passive: false` 的 wheel handler，或将此逻辑移入 `installDomEventProxy`

3. **`canvas.ts`** 中 viewport transform 已正确使用 `setTransform(scale,0,0,scale,vx,vy)` → 无需改

**注意**：事件监听器需要在 cleanup 中正确移除（`AbortController` 已处理）

**验证**：滚轮缩放以鼠标为中心，Canvas 渲染跟随

### 1.4 实现 dblclick 编辑 [高 🔴]

**文件**：`simulation.ts:587-687`、`eventListener.ts`

**改动**：
1. `simulation.ts` 新增 dblclick 检测逻辑（记录上次 click 的时间戳和 nodeId）
2. 在 pointer-down 命中相同节点且间隔 < 300ms 时 emit `node:dblclick`
   ```ts
   let lastClickTime = 0;
   let lastClickNode: NodeId | null = null;
   
   case "pointer-down": {
     const target = hitTest(evt.x, evt.y);
     if (target) {
       const now = Date.now();
       if (target.id === lastClickNode && now - lastClickTime < 300) {
         emit({ type: "node:dblclick", nodeId: target.id });
         lastClickTime = 0;
         lastClickNode = null;
         return;
       }
       lastClickTime = now;
       lastClickNode = target.id;
       // ... 正常 click 逻辑
     }
   }
   ```

**验证**：双击节点 → 打开编辑器（`eventHandler` 已正确处理 `node:dblclick`）

---

## Phase 2 — 视觉正确性（让它看起来对）

> **目标**：节点状态区分明显，边渲染完整，画布美观  
> **预估**：2-3 天

### 2.1 区分 active vs selected 视觉 [高 🔴]

**文件**：`styleConfig.ts`、`canvas.ts`

**问题**：`active` 和 `selected` 样式完全相同（都是 `#FF7D00` stroke），且 `active` 从未被赋值

**改动**：
1. **`styleConfig.ts`**：给 `active` 添加独特样式（例如加粗 stroke + 发光色）：
   ```ts
   active: {
     stroke: "#FF9500",      // 橙黄，区别于 selected 的 #FF7D00
     lineWidth: 4,           // 加粗
     shadow: { color: "rgba(255,149,0,0.5)", blur: 8 },
   },
   ```
2. **`simulation.ts`** `recomputeUiStates`：被悬停的已选中节点设为 `active`：
   ```ts
   for (const node of nodes) {
     const isSelected = selectedNodeIds.has(node.id);
     const isHovered = hoveredNodeId === node.id;
     if (isSelected && isHovered) node.ui = "active";
     else if (isSelected) node.ui = "selected";
     else if (isHovered) node.ui = "hover";
     // ...
   }
   ```

**验证**：选中+悬停时节点样式与仅选中明显不同

### 2.2 修复箭头渲染 [高 🔴]

**文件**：`canvas.ts:264-307`

**问题**：箭头画在 `(tx, ty)` 节点中心，被节点圆完全覆盖

**改动**：沿边方向偏移箭头到节点圆周上：
```ts
function drawArrow(c, link, sx, sy, tx, ty): void {
  const ARROW_SIZE = 8;
  const targetRadius = (link.target.weight ?? DEFAULT_RADIUS) + ARROW_SIZE;
  const sourceRadius = (link.source.weight ?? DEFAULT_RADIUS) + ARROW_SIZE;
  const dx = tx - sx, dy = ty - sy;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return; // 自环单独处理
  
  const ux = dx / dist, uy = dy / dist;
  
  // Forward arrow at target boundary
  if (link.direction === "forward" || link.direction === "bidirectional") {
    const ax = tx - ux * targetRadius;
    const ay = ty - uy * targetRadius;
    drawArrowHead(c, ax, ay, Math.atan2(dy, dx), ARROW_SIZE);
  }
  // Reverse arrow at source boundary
  if (link.direction === "reverse" || link.direction === "bidirectional") {
    const ax = sx + ux * sourceRadius;
    const ay = sy + uy * sourceRadius;
    drawArrowHead(c, ax, ay, Math.atan2(dy, dx) + Math.PI, ARROW_SIZE);
  }
}
```

**验证**：箭头可见，位于节点边界外

### 2.3 实现自环边 [高 🔴]

**文件**：`canvas.ts:210-265`

**问题**：`source === target` 时 path 退化

**改动**：在 `drawEdge` 中检测自环并使用专用路径：
```ts
if (link.source === link.target) {
  drawSelfLoop(c, link, sx, sy, nodeRadius);
  return; // 跳过标准 drawEdge 逻辑
}
```

```ts
function drawSelfLoop(c, link, x, y, r): void {
  const loopR = r + 12;
  c.beginPath();
  c.arc(x, y - loopR, 8, -Math.PI * 0.8, Math.PI * 0.8);
  c.stroke();
  // 自环箭头在弧顶
  drawArrowHead(c, x + 8, y - loopR - 8, -Math.PI / 2, 6);
}
```

**验证**：自环边显示为小圆弧

### 2.4 边 UiState 更新 [高 🔴]

**文件**：`simulation.ts:recomputeUiStates`

**问题**：`recomputeUiStates` 只更新节点，边永远 `default`

**改动**：在 `recomputeUiStates` 末尾加入边状态逻辑：
```ts
for (const link of links) {
  const srcSel = selectedNodeIds.has(link.source.id);
  const tgtSel = selectedNodeIds.has(link.target.id);
  if (srcSel && tgtSel) {
    link.ui = "selected";
  } else if (srcSel || tgtSel) {
    link.ui = "neighborActive";
  } else if (hasSelection) {
    link.ui = "inactive";
  } else {
    link.ui = "default";
  }
}
```

**验证**：选中节点时，连接边有醒目视觉；非相关边弱化

### 2.5 启用 grid 渲染 [中 🟡]

**文件**：`canvas.ts:96-120`、`styleConfig.ts:39-65`

**问题**：`gridColor` 已定义但未使用

**改动**：在 `renderFrame` 背景填充后、viewport 变换前添加网格绘制（仅在 zoom 足够大时显示）：
```ts
// After background fill, before viewport transform
if (viewport.scale > 0.5 && currentStyle.gridColor) {
  c.save();
  c.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.x, viewport.y);
  c.strokeStyle = currentStyle.gridColor;
  c.lineWidth = 0.5 / viewport.scale; // 线宽不随缩放变化
  const step = 50;
  // ... 绘制网格线
  c.restore();
}
```

---

## Phase 3 — 鲁棒性加固（让它可靠）

> **目标**：无静默失败、无内存泄漏、错误可追溯  
> **预估**：2-3 天

### 3.1 添加持久 Worker 错误监听 [高 🔴]

**文件**：`ForceGraph.tsx:192-202`、`force/worker/force.worker.ts`

**改动**：

1. 主线程注册持久 `worker.onerror`：
   ```ts
   worker.addEventListener("error", (ev) => {
     console.error("[ForceGraph] Worker error:", ev.message);
     setError(new Error(`Worker crash: ${ev.message}`));
   });
   ```

2. Worker 内部添加全局错误捕获：
   ```ts
   // force.worker.ts
   self.addEventListener("error", (ev) => {
     console.error("[force-worker] Uncaught error:", ev.message);
   });
   self.addEventListener("unhandledrejection", (ev) => {
     console.error("[force-worker] Unhandled rejection:", ev.reason);
   });
   ```

3. 新增 `__ERROR__` 原始通道：Worker → Main 发送结构化错误：
   ```ts
   // api.ts
   function reportError(msg: string) {
     self.postMessage({ type: "__ERROR__", message: msg });
   }
   ```
   主线程 `onFrame` handler 同时处理 `__ERROR__` 和 `__FRAME__`

**验证**：Worker 内部模拟异常后 UI 显示错误提示而非静默冻结

### 3.2 绑定 proxyEvent Promise [高 🔴]

**文件**：`eventListener.ts:107, 123, 139, 158-163, 175-180`、`ForceGraph.tsx:345-376`

**改动**：在 `installDomEventProxy` 的每个 handler 调用中添加 `.catch()`：
```ts
proxyEvent: (ev) => {
  const api = apiRef.current;
  if (!api) return Promise.resolve();
  return api.proxyEvent(ev).catch((err) => {
    // Worker 已终止时的预期情况，仅 debug 级别
    if (import.meta.env.DEV) console.debug("[ForceGraph] proxyEvent rejected:", err);
  });
},
```

**验证**：Dev Console 无 `Unhandled Promise Rejection` 警告

### 3.3 NaN/Infinity 守卫 [中 🟡]

**文件**：`force/transform.ts:47-59`、`simulation.ts:hitTest`

**改动**：

1. `getPositionForView` 和 `getPositionForView`(flow 版本) 加入 Number 有效性检查：
   ```ts
   if (!Number.isFinite(entry.x) || !Number.isFinite(entry.y)) return null;
   ```

2. `hitTest` 中过滤 NaN 节点：
   ```ts
   const dx = x - (Number.isFinite(n.x) ? n.x! : 0);
   const dy = y - (Number.isFinite(n.y) ? n.y! : 0);
   ```

3. `canvas.ts` 的 `drawNode`/`drawEdge` 遇到 NaN 跳过渲染

**验证**：注入 NaN 位置数据不会使 Worker 崩溃/渲染错误

### 3.4 collisionRadius:0 短路修复 [中 🟡]

**文件**：`simulation.ts:applyConfig`

**改动**：使用 `!= null` 代替 `?` 判断：
```ts
forceCollide.radius((d) => {
  const weight = d.weight ?? 8;
  return weight + (cfg.collisionRadius != null ? cfg.collisionRadius - 8 : 4);
});
```

### 3.5 canvas-init 失败通道 [中 🟡]

**文件**：`api.ts`、`ForceGraph.tsx`

**改动**：`initCanvas` 失败时通过 `__ERROR__` 通道通知主线程，触发 error UI

### 3.6 Diff 回调 try/catch [中 🟡]

**文件**：`ForceGraph.tsx:272-309`

**改动**：包裹 `filter`/`diffToForcePayload` 调用：
```ts
try {
  const filteredNodesAdded = filter(diff.nodes.added, [], view).nodes;
  // ...
  api.applyDiff(payload).catch(console.error);
} catch (err) {
  console.error("[ForceGraph] subscribeDiff callback failed:", err);
}
```

### 3.7 stop/resume/setDimensions 日志 [中 🟡]

**文件**：`ForceGraph.tsx:426-465`

**改动**：将静默 `.catch(() => {})` 改为 `.catch((err) => console.debug(...))`

### 3.8 cleanup timer [低 🟢]

**文件**：`ForceGraph.tsx:201`

**改动**：添加 `clearTimeout`：
```ts
const timeoutId = setTimeout(() => reject(...), 5000);
// on success:
clearTimeout(timeoutId);
```

---

## Phase 4 — 清理抛光（收尾）

> **目标**：代码整洁，类型正确，无死代码  
> **预估**：1-2 天

### 4.1 移除 dead code

| 目标 | 位置 | 说明 |
|---|---|---|
| `@use-gesture/*` | `package.json` | 从不 import |
| `healthCheck` 导出 | `api.ts:185-188` | 从不被 import；如需保留则补齐 `WorkerOutbound` 签名 |
| `computeDegree` | `transform.ts:65-74` | 从未被调用 |
| `DEFAULT_FORCE_CONFIG` | `styleConfig.ts:175-182` | 补充 `centerX`/`centerY` |
| `viewCanvasViewport` 参数 | `simulation.ts:589` | 传参但未使用——移除参数或实现逻辑 |

### 4.2 补齐 DEFAULT_FORCE_CONFIG

```ts
export const DEFAULT_FORCE_CONFIG: DefaultForceConfig = {
  strength: -300,
  collisionRadius: 12,
  linkDistance: 80,
  centerX: 0,   // 新增
  centerY: 0,   // 新增
  alphaMin: 0.001,
  alphaDecay: 0.0228,
  velocityDecay: 0.4,
};
```

`applyConfig` 中的 `centerX ?? currentDims.width / 2` fallback 在 `updateDims` 时自然覆盖

### 4.3 添加 ErrorBoundary

**文件**：新建 `src/force/ForceGraphErrorBoundary.tsx`

```tsx
"use client";
import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ForceGraphErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      return <div style={{ padding: 16, color: "#ef4444" }}>
        ForceGraph crashed: {this.state.error.message}
      </div>;
    }
    return this.props.children;
  }
}
```

在 `graph.tsx` 中包裹 `<ForceGraph>`：
```tsx
<ForceGraphErrorBoundary>
  <ForceGraph ... />
</ForceGraphErrorBoundary>
```

### 4.4 类型修复

- 为 `DEFAULT_FORCE_CONFIG` 添加 `as const satisfies ForceConfig`
- `WorkerOutbound` 签名与 `healthCheck` 对齐（如保留 healthCheck）

---

## 开发顺序依赖图

```
Phase 0 (管线复活)
├── 0.1 分离式 OffscreenCanvas  ←── 阻塞所有视觉验证
├── 0.2 Boot Effect 幂等性      ←── 阻塞视图切换测试
├── 0.3 StrictMode 竞态          ←── 可与 0.2 并行
└── 0.4 Diff 订阅泄漏            ←── 可与 0.2 并行

Phase 1 (核心交互)  ←─ 依赖 Phase 0
├── 1.1 选态同步 ─────────────── 依赖 0.2 (选态与 effect 生命周期耦合)
├── 1.2 多选拖拽坍缩 ─────────── 独立
├── 1.3 viewport 平移/缩放 ───── 独立
└── 1.4 dblclick 编辑 ────────── 独立

Phase 2 (视觉正确性) ←─ 依赖 Phase 0, 可并行于 Phase 1
├── 2.1 active vs selected ───── 独立
├── 2.2 箭头渲染 ─────────────── 独立
├── 2.3 自环边 ───────────────── 独立
├── 2.4 边 UiState ───────────── 独立
└── 2.5 grid 渲染 ────────────── 独立

Phase 3 (鲁棒性) ←─ 依赖 Phase 0, 可并行于 Phase 1/2
├── 3.1 Worker 错误监听 ──────── 独立
├── 3.2 proxyEvent Promise ───── 独立
├── 3.3 NaN/Infinity 守卫 ────── 独立
├── 3.4~3.8 小型修复 ─────────── 独立

Phase 4 (清理) ←─ 依赖 Phase 0-3 完成
├── 4.1 移除 dead code
├── 4.2 补齐配置
├── 4.3 ErrorBoundary
└── 4.4 类型修复
```

---

## 每次 Phase 后的验证命令

```bash
# Type check
pnpm --filter=@workspace/graph-v2 typecheck

# Lint
pnpm --filter=@workspace/graph-v2 lint

# 视觉验证（启动 web app）
pnpm --filter=web dev
# 打开 http://localhost:3000 的 Force view 页面

# Worker 泄漏检查
# Chrome DevTools → Sources → 左侧 Workers 面板 → 确认无多余线程
```

---

## 工时估算

| Phase | 任务数 | 预估 |
|---|---|---|
| Phase 0 | 4 | 2-3 天 |
| Phase 1 | 4 | 3-4 天 |
| Phase 2 | 5 | 2-3 天 |
| Phase 3 | 8 | 2-3 天 |
| Phase 4 | 4 | 1-2 天 |
| **总计** | **25** | **10-15 天** |

Phase 0 + Phase 1 完成后（5-7 天），Force 模式应达到**可演示**水平（基础交互可用 + 可视觉验证）。
Phase 0-2 完成后（7-10 天），达到**功能完整**水平。
Phase 0-4 全部完成后（10-15 天），达到**生产就绪**水平。
