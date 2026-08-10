# Force 样式系统重构方案

## 目标

将 Force 模式的三层样式来源统一到新的架构：

1. **stateData.client** → transform 直接映射到 seed 视觉属性
2. **stateData.server** → transform 通过 styleConfig 规则映射
3. **Worker 内部状态** → canvas 渲染时通过 styleConfig 规则微调

消除当前的 `Theme`/`UiState`/`StateVisual` 间接层，使每个 seed 自带完整的视觉属性。

---

## 一、新数据结构

### ForceNodeSeed

```typescript
export interface ForceNodeSeed {
  id: NodeId;

  // === 视觉属性（transform 阶段确定）===
  fillColor: string;       // 填充色
  strokeColor: string;     // 描边色
  strokeWidth: number;     // 描边宽度 (px)
  label: string;           // 显示文本（原 title）
  labelColor: string;      // 标签色
  labelSize: number;       // 标签字号 (px)
  radius: number;          // 节点半径 (px)

  // === 布局属性 ===
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;

  // === 运行时状态（Worker 内部，不参与 seed 初始化）===
  nodeType?: NodeDataType;  // 保留（边权重计算 / 未来自定义渲染）
  viewId?: string;          // 保留（视图归属）
}
```

### ForceLinkSeed

```typescript
export interface ForceLinkSeed {
  id: EdgeId;
  source: NodeId;
  target: NodeId;

  // === 视觉属性 ===
  label: string;           // 边标签
  labelColor: string;      // 标签色
  labelSize: number;       // 标签字号
  shape: "straight" | "curve" | "s-curve";   // 路径形状
  strokeType: "solid" | "dotted" | "dashed"; // 线型
  strokeColor: string;     // 描边色
  strokeWidth: number;     // 描边宽度

  // === 数据属性 ===
  direction: EdgeDirection; // forward | reverse | bidirectional | undirected
  weight?: EdgeWeight;      // 1~5
}
```

### ForceStyle (精简)

移除了节点/边的颜色属性（已在 seed 上），仅保留 Canvas 全局属性：

```typescript
export interface ForceStyle {
  backgroundColor: string;
  gridColor?: string;
}
```

### SimNode

```typescript
export interface SimNode extends Omit<ForceNodeSeed, "fx" | "fy"> {
  x?: number;  y?: number;
  fx?: PinCoord;  fy?: PinCoord;
  vx?: number; vy?: number;
  index?: number;
  __label?: string;  // 缓存 truncate 结果
}
```

### SimLink

```typescript
export interface SimLink extends Omit<ForceLinkSeed, "source" | "target"> {
  source: SimNode;
  target: SimNode;
  index?: number;
}
```

---

## 二、styleConfig 重构

### 2.1 原结构（全部移除）

```
LIGHT_THEME, DARK_THEME, ThemeTokens, getThemeTokens()
NODE_STATE_STYLES, EDGE_STATE_STYLES, StateVisual
buildForceStyle()
ForceStyleOptions
```

### 2.2 新结构

`styleConfig.ts` 变为两个部分：

#### Part A: Client默认值

```typescript
export const NODE_CLIENT_DEFAULTS = {
  fillColor: "#165DFF",
  strokeColor: "#165DFF",
  strokeWidth: 2,
  labelColor: "#1f2937",
  labelSize: 14,
  radius: 8,
} as const;

export const EDGE_CLIENT_DEFAULTS = {
  strokeColor: "#91caff",
  strokeWidth: 2,
  labelColor: "#9ca3af",
  labelSize: 12,
  shape: "straight" as const,
  strokeType: "solid" as const,
} as const;
```

#### Part B: Server状态规则

```typescript
interface ServerStyleRule {
  /** stateData 中的路径，如 "isChecked" */
  field: string;
  /** 值 → 视觉属性的映射 */
  mapping: Record<string, Partial<NodeVisualProps>>;  // boolean 转为 "true"/"false" key
}

export const NODE_SERVER_RULES: ServerStyleRule[] = [
  {
    field: "isChecked",
    mapping: {
      "true":  { fillColor: "#22c55e", strokeColor: "#16a34a" },
      "false": { fillColor: "#ef4444", strokeColor: "#dc2626" },
    },
  },
  {
    field: "isToggled",
    mapping: {
      "true":  { strokeWidth: 4 },
    },
  },
];
```

#### Part C: Worker运行时渲染调整

```typescript
interface WorkerRenderRule {
  /** 触发条件 */
  condition: "selected" | "hover" | "active" | "neighbor" | "inactive";
  /** 视觉属性的倍率或绝对值覆盖 */
  adjust: Partial<{
    strokeWidthMultiplier: number;
    strokeColorOverride: string;
    shadow: { color: string; blur: number };
  }>;
}

export const NODE_RENDER_RULES: WorkerRenderRule[] = [
  { condition: "active",  adjust: { strokeWidthMultiplier: 2.0, shadow: { color: "rgba(255,149,0,0.5)", blur: 8 }, strokeColorOverride: "#FF9500" } },
  { condition: "selected", adjust: { strokeWidthMultiplier: 1.5, shadow: { color: "rgba(255,125,0,0.3)", blur: 5 }, strokeColorOverride: "#FF7D00" } },
  { condition: "hover",    adjust: { strokeWidthMultiplier: 1.25, shadow: { color: "rgba(22,93,255,0.2)", blur: 5 }, strokeColorOverride: "#4080FF" } },
  { condition: "neighbor", adjust: { strokeColorOverride: "#FFB266" } },
  { condition: "inactive", adjust: { strokeColorOverride: "#9ca3af" } },
];

export const EDGE_RENDER_RULES: WorkerRenderRule[] = [
  // 同理
];
```

---

## 三、修改清单

### 文件 1: `force/types.ts`

**删除**：
- `UiState` (line 107-114)
- `StateVisual` (从 styleConfig.ts 移出后删除)
- `ForceStyle` 中的 `nodeColor`, `edgeColor`, `labelColor`, `nodeRadius`, `edgeLineWidth`, `edgeDash` 字段

**修改**：
- `ForceNodeSeed`: 移除 `ui`, `semanticColor`, `title`, `weight`; 新增 `fillColor`, `strokeColor`, `strokeWidth`, `label`, `labelColor`, `labelSize`, `radius`
- `ForceLinkSeed`: 移除 `ui`, `semanticColor`, `edgeType`; 新增 `label`, `labelColor`, `labelSize`, `shape`, `strokeType`, `strokeColor`, `strokeWidth`
- `ForceStyle`: 仅保留 `backgroundColor`, `gridColor`
- `ProxiedDomEvent`: `modifiers` 保留, 移除 `selectedNodeIds`/`selectedEdgeIds` (不再需要往 worker 推选中状态——worker 内部自己维护)
- `WorkerEvent`: 保留, `selection:changed` 仅通知主线程（store 同步），不再影响 worker 样式计算
- `WorkerInbound`: 移除 `updateStyle(ForceStyle)` → 新增 `updateStyle({ backgroundColor, gridColor })`; 保留 `proxyEvent`, `initData`, `applyDiff`, `updateConfig`, `setViewport`, `setDimensions`, `stop`, `resume`, `reheat`, `setNodeFixed`, `setNodePosition`, `setEventHandler`; 新增 `updateRenderState(state)` 用于同步 worker 内部交互状态

### 文件 2: `force/styleConfig.ts`

**删除**：整个文件的现有内容。

**新增**：
- `NODE_CLIENT_DEFAULTS`, `EDGE_CLIENT_DEFAULTS`
- `NODE_SERVER_RULES`, `EDGE_SERVER_RULES` (可扩展)
- `NODE_RENDER_RULES`, `EDGE_RENDER_RULES`
- `applyServerRules(stateData: Record<string, any>, rules: ServerStyleRule[]): Partial<VisualProps>`
- `applyRenderRule(rule: WorkerRenderRule, base: VisualProps): VisualProps`
- `DEFAULT_FORCE_CONFIG` (保留，不变)

### 文件 3: `force/transform.ts`

**修改**：

- `TransformOptions` 增加 `serverRules?: ServerStyleRule[]`
- `nodeDataToForceSeeds()`:
  1. 读取 `node.stateData?.client` → 覆盖 `NODE_CLIENT_DEFAULTS`
  2. 读取 `node.stateData?.server` → `applyServerRules()` 覆盖
  3. 输出完整 `ForceNodeSeed`（含所有视觉属性）
  4. `label` = `node.title`, `radius` = `node.stateData?.weight ?? NODE_CLIENT_DEFAULTS.radius`
- `edgeDataToForceSeeds()`:
  1. 同理处理 edge 的 `stateData.client` / `stateData.server`
  2. 默认 `shape` 从原 `edgeType` 映射:
     - `hierarchy` → `"straight"`
     - `flow` → `"curve"`
     - `association` / `interaction` → `"s-curve"`
  3. 默认 `strokeType` 从原逻辑映射:
     - `association` → `"dashed"`
     - 其余 → `"solid"`
- `diffToForcePayload()`: 不变（内部调用已修改的函数）

### 文件 4: `force/worker/simulation.ts`

**修改**：
- `SimNode`: 更新以匹配新 `ForceNodeSeed`
- `SimLink`: 更新以匹配新 `ForceLinkSeed`
- 移除 `recomputeUiStates()` (L115-140)
- 新增 `recomputeWorkerState()`: worker 内部维护 `selectedNodeIds`, `hoveredNodeId`, 并为每个 node/link 标记当前状态 (`"selected" | "hover" | "active" | "neighbor" | "inactive" | "default"`)
- `handleProxiedEvent`: 移除 `setSelectedNodes`/`setHoveredNode` 等外部写入接口——worker 内部自主管理交互状态
- `createOrUpdate` / `applyDiff`: 保留核心逻辑，移除 UiState 相关代码
- 保留: `setNodeFixed`, `setNodePosition`, `updateConfig`, `reheat`, `stopSimulation`, `resumeSimulation`, `nodeMap`, `qt`, tick 合并优化等

### 文件 5: `force/worker/canvas.ts`

**简化**：

- `drawNode()`:
  ```typescript
  // Before: 查 NODE_STATE_STYLES[node.ui]，处理 "currentColor"
  // After:
  const rule = getRenderRule(node.renderState, NODE_RENDER_RULES);
  const adjusted = applyRenderRule(rule, {
    fillColor: node.fillColor,
    strokeColor: node.strokeColor,
    strokeWidth: node.strokeWidth,
  });
  c.fillStyle = adjusted.fillColor;
  c.strokeStyle = adjusted.strokeColor;
  c.lineWidth = adjusted.strokeWidth;
  // shadow 同理
  c.font = `${node.labelSize}px sans-serif`;
  c.fillStyle = node.labelColor;
  ```
- `drawEdge()`: 同理，不再查 `EDGE_STATE_STYLES`
- `renderFrame()`: 移除 `currentStyle.nodeColor`/`currentStyle.edgeColor` 的全局查表，改用 per-element 值
- 保留: 视锥裁剪、网格线绘制、标签缓存、`truncateLabel`、箭头绘制

### 文件 6: `force/worker/api.ts`

**修改**：
- `updateStyle(style: ForceStyle)` → 参数类型缩小为 `{ backgroundColor, gridColor }`
- 移除 `computeLabels()` 中的 `getContext()` 依赖（label 已在 seed 上）
- `proxyEvent()`: 不再需要触发 `isDirty` — worker 内部交互状态变化由 simulation.ts 自行管理帧更新

### 文件 7: `force/ForceGraph.tsx`

**修改**：
- `performFullSync()`:
  - 移除 `buildForceStyle({ theme })` → 改为 `buildForceStyle()` (仅 backgroundColor + gridColor)
  - `TransformOptions` 传入 `serverRules: NODE_SERVER_RULES`
- 移除 `theme` prop → 不再需要（backgroundColor 从 `view.visualConfig` 读取）
- 移除 `useEffect([theme])` 中调 `buildForceStyle`
- `subscribeStore()`: 不变（diff 链路已有 transform 自动处理 stateData.client/server）

### 文件 8: `force/AGENTS.md`

全文重写第六节，反映新架构。

---

## 四、影响范围

| 影响 | 范围 |
|---|---|
| **破坏性** | 完全破坏 — seed DTO 不兼容，Worker RPC 契约变更 |
| **ForceGraph.tsx** | 移除 theme prop，简化 performFullSync |
| **transform.ts** | 重写 seed 构建逻辑，增加 stateData 解析 |
| **styleConfig.ts** | 完全重写 |
| **types.ts** | 重定义 ForceNodeSeed、ForceLinkSeed、ForceStyle |
| **canvas.ts** | 简化渲染路径 |
| **simulation.ts** | 替换 recomputeUiStates → recomputeWorkerState |
| **api.ts** | 小幅调整 updateStyle 签名 |
| **跨模块** | `eventHandler.ts` 不依赖 UiState（它只转发 WorkerEvent → useUIStore），无需改动 |
| **流模式** | 无影响（force/* 是独立模块）|

---

## 五、执行顺序

1. `force/types.ts` — 重定义 DTOs
2. `force/styleConfig.ts` — 新规则系统 + 移除旧常量
3. `force/transform.ts` — 新 seed 构建逻辑
4. `force/worker/simulation.ts` — SimNode/SimLink + recomputeWorkerState
5. `force/worker/canvas.ts` — 简化渲染
6. `force/worker/api.ts` — updateStyle 签名调整
7. `force/ForceGraph.tsx` — 移除 theme + 新 transform options
8. `force/AGENTS.md` — 文档更新
9. `pnpm --filter=@workspace/graph-v2 typecheck` — 验证
