# Functional Intents — Graph Package

**Document Version:** 1.0
**Date:** 2026-05-31
**Status:** Source of Truth for Migration
**Package:** `@workspace/graph`

> 本文件从原版 G6 实现中提取所有功能意图，与技术实现方案解耦。迁移施工前应先理解本文件。

---

## 1. Data Synchronization（数据同步）

### 1.1 Full Sync（全量同步）

当 view 或 viewId 变化时，使用当前 view 的 filter 配置过滤 nodes/edges，转换为渲染格式后渲染。

- **触发条件**：`view` 或 `viewId` prop 变化
- **效果**：数据完全重新加载，布局重新执行

### 1.2 Incremental Sync（增量同步）

每次 mutations 队列有内容时，逐一处理每个 mutation。

| Mutation 类型 | 处理逻辑 |
|-------------|---------|
| `upsertNode` | 节点已存在 → 仅更新；不存在 → 添加后重新布局 |
| `deleteNode` | 停止布局，移除节点，重新布局 |
| `upsertEdge` | 边已存在 → 仅更新；不存在 → 添加后重新布局 |
| `deleteEdge` | 停止布局，移除边，重新布局 |
| `upsertView` | 如果是当前 view → 全量同步 |
| `deleteView` | 无操作 |

---

## 2. Layout System（布局系统）

### 2.1 Supported Layouts（支持的布局）

| 布局类型 | 描述 | 布局后行为 |
|---------|------|----------|
| `dagre` | 有向分层布局（TB方向） | 布局后 fitCenter |
| `radial` | 放射状布局（同心圆） | 布局后 fitCenter |
| `D3force` | 力导向布局 | 不调用 fitCenter（自然展开） |

### 2.2 Layout Node Type Coupling（布局与节点类型耦合）

| 布局 | 节点渲染类型 |
|------|------------|
| `dagre` | `react-node`（完整自定义 React 组件） |
| `D3force` | `circle`（简单圆形节点） |
| `radial` | `circle`（简单圆形节点） |

### 2.3 Layout Switching（布局切换）

- 切换布局时，**不保留**前一个布局的节点 position
- 新布局从原始位置或自动计算位置开始

### 2.4 Layout Triggering（布局触发时机）

| 时机 | 触发布局 |
|------|---------|
| 增删节点/边 | ✅ 重新布局 |
| 更新节点/边（位置不变） | ❌ 不重新布局 |
| view 切换 | ✅ 全量重新布局 |

---

## 3. Node Rendering（节点渲染）

### 3.1 Node Types（节点类型）

所有节点都是 React 组件，通过 `nodeType` 字段区分：

| nodeType | 组件 |
|---------|------|
| `text` | TextNode |
| `image` | ImageNode |
| `video` | VideoNode |
| `rich-text` | RichTextNode |
| 其他 | TextNode（默认） |

### 3.2 Node Shape Coupling with Layout（节点形状与布局耦合）

节点的**几何形状**由当前布局类型决定：

| 布局 | 节点形状 | 说明 |
|------|---------|------|
| `dagre` | 矩形（rectangle） | 使用完整的自定义 React 组件（TextNode / ImageNode / VideoNode / RichTextNode） |
| `radial` | 圆形（circle） | 简单圆形节点，不渲染复杂内容 |
| `D3force` | 圆形（circle） | 简单圆形节点，不渲染复杂内容 |

**设计意图**：
- `dagre` 布局的节点承载完整的富文本/图片/视频内容，因此需要矩形空间
- `D3force` / `radial` 布局的节点仅作为力导向/放射状布局中的**位置标记**，不需要渲染复杂内容，使用轻量的圆形即可

**切换布局时的形状变化**：
- 从 `dagre` → `D3force/radial`：节点从矩形 React 组件变为圆形
- 从 `D3force/radial` → `dagre`：节点从圆形变回矩形 React 组件
- 形状变化跟随布局切换同步发生

### 3.3 Node Semantic Styling（节点语义样式）

节点的颜色、图标由 `semanticId` 决定：

```typescript
getNodeSemantic(semanticId) → { color, icon, ... }
```

- 每个 semanticId 对应一套视觉样式
- 节点使用 semantic 的颜色作为填充/边框色

---

## 4. Edge Rendering（边渲染）

### 4.1 Edge Types（边类型）

| EdgeType | 形状 | 路径函数 |
|---------|------|---------|
| `hierarchy` | 直线 | `getStraightPath` |
| `flow` | 二次贝塞尔 | `getQuadraticPath` |
| `interaction` | 三次贝塞尔 | `getBezierPath` |
| `association` | 直线 + 虚线 | `getStraightPath` |

### 4.2 Edge Directions（边方向）

每种 EdgeType 都支持 4 种方向：

| Direction | Start Arrow | End Arrow |
|-----------|------------|----------|
| `forward` | ❌ | ✅ |
| `reverse` | ✅ | ❌ |
| `bidirectional` | ✅ | ✅ |
| `undirected` | ❌ | ❌ |

### 4.3 Edge Semantic Styling（边语义样式）

边的颜色由 `semanticId` 决定：

```typescript
getEdgeSemantic(semanticId) → { color, ... }
```

---

## 5. Edge Creation（边创建）

### 5.1 Trigger（触发条件）

- **按键**：Alt 键按住
- **操作**：拖拽

### 5.2 Scenario 1（场景1：无预选节点）

- 无任何节点被选中
- 从单个节点开始拖拽
- 产生：一条边（source → target）

### 5.3 Scenario 2（场景2：有预选节点）

- 有多个节点被选中
- 从画布空白区域开始拖拽
- 产生：多条边（每个选中节点 → target）

### 5.4 Cancel（取消）

- Alt 键在拖拽过程中释放 → 取消创建

### 5.5 End on Empty Space（终点在空白区域）

当连接终点不在任何有效节点上时：

- **不创建边**
- 显示类型为 `add-edge` 的 context menu

---

## 6. Context Menu（右键菜单）

### 6.1 Trigger（触发）

- 右键点击节点 / 边 / 画布 / 多选区域

### 6.2 Menu Types（菜单类型）

| 类型 | 触发条件 |
|------|---------|
| `node` | 右键节点，无多选 |
| `edge` | 右键边 |
| `canvas` | 右键画布空白区域，无多选 |
| `groupSelect` | 右键画布，多选节点/边 |
| `add-edge` | Alt+拖拽结束在空白区域 |

### 6.3 Associated Behaviors（伴随行为）

- 右键任意位置 → **同时关闭** PreviewBlock
- 右键更新选择状态

---

## 7. Preview Block（预览块）

### 7.1 Show Trigger（显示触发）

- 鼠标进入节点区域，停留 **150ms** 后显示
- `isFocus` 状态为 `false`

### 7.2 Hide Triggers（隐藏触发）

| 事件 | 是否隐藏 |
|------|---------|
| 鼠标离开节点 | ✅ |
| 进入画布区域 | ✅ |
| 开始拖拽节点 | ✅ |
| 节点双击 | ✅ |
| `isFocus === true` 时 | ❌（锁定状态） |

### 7.3 Focus Mode（聚焦模式）

- 当 `isFocus: true` 时，preview 被锁定显示，不响应 hover/leave 事件
- 由外部操作（如打开编辑器）触发

---

## 8. Selection（选择）

### 8.1 Single Click（单击选择）

- 点击节点 → 仅选中该节点，清空边选择
- 点击边 → 仅选中该边，清空节点选择

### 8.2 Pane Click（画布点击）

- 点击画布空白处 → 清空所有选择

### 8.3 Right-Click（右键）

- 右键点击节点/边/画布 → 更新对应选择状态（不撤销已有选择）

---

## 9. Node Drag（节点拖拽）

### 9.1 D3force Layout（力导向布局下的拖拽）

| 阶段 | 行为 |
|------|------|
| 拖拽开始 | 加热仿真（alphaTarget: 0.3），固定被拖节点位置 |
| 拖拽中 | 持续更新被拖节点位置到仿真 |
| 拖拽结束 | 仿真冷却（alphaTarget: 0），解除节点固定 |

### 9.2 Other Layouts（其他布局下的拖拽）

- 标准拖拽行为（React Flow 内置）

---

## 10. Node Editor（节点编辑器）

### 10.1 Open Trigger（打开触发）

- 节点双击

### 10.2 Associated Behaviors（伴随行为）

- 打开节点编辑器 → 同时关闭 PreviewBlock

---

## 11. Mutations（数据变更）

### 11.1 Supported Mutation Types（支持的变更类型）

| Mutation | 说明 |
|---------|------|
| `upsertNode` | 添加或更新节点 |
| `deleteNode` | 删除节点 |
| `upsertEdge` | 添加或更新边 |
| `deleteEdge` | 删除边 |
| `upsertView` | 添加或更新视图配置 |
| `deleteView` | 删除视图配置 |

---

## 12. Theme（主题）

### 12.1 Supported Themes（支持的主题）

| 主题 | 说明 |
|------|------|
| `light` | 浅色主题 |
| `dark` | 深色主题 |

### 12.2 Theme Tokens（主题令牌）

包含但不限于：

- `background`：背景色
- `nodeColor`：默认节点色
- `edgeColor`：默认边色
- `labelColor`：标签文字色

---

## 13. Graph Instance（Graph 实例）

### 13.1 Lifecycle（生命周期）

- 挂载时初始化 Graph 实例
- 卸载时销毁 Graph 实例

### 13.2 Resize（容器大小变化）

- 容器尺寸变化时，更新 Graph 尺寸

---

## 14. Deleted Features（已删除功能）

以下功能在迁移后不再支持：

| 功能 | 原布局类型 | 移除原因 |
|------|----------|---------|
| `compactBox` | compact-box | elkjs 无此布局 |
| `fishbone` | fishbone | elkjs 不支持 |
| `mindmap` | mindmap | elkjs 无对应实现 |
| Tree data conversion | — | 树形布局删除后不再需要 |

---

## Appendix A: Intent → Component Mapping（意图与组件对应）

| 功能意图 | 原版实现位置 | 备注 |
|---------|------------|------|
| 全量同步 | `graph.tsx: performFullSync()` | view 变化时触发 |
| 增量同步 | `graph.tsx: processMutations()` | mutation 队列消费 |
| 布局执行 | `graph.tsx: applyLayout()` | 按布局类型分支 |
| 节点渲染 | `options/node.tsx` | 布局决定节点类型 |
| 边渲染 | `options/edge.ts` | type + direction 决定形状和箭头 |
| 右键菜单 | `useGraphEventHandlers.ts` | 5 种类型 |
| 预览块 | `useGraphEventHandlers.ts` | 150ms hover 延迟 |
| 选择状态 | `useGraphEventHandlers.ts` | 单选/多选 |
| 边创建 | `create-edge.ts` | Alt+拖拽 |
| 力导向拖拽 | `drag-element-force.ts` | 加热/固定/释放 |
| 节点编辑 | `useGraphEventHandlers.ts: handleNodeDBClick()` | 双击打开 |
| 主题切换 | `graph.tsx` | 仅影响背景色 |
| Resize | `useGraphEventHandlers.ts` | ResizeObserver |

---

## Appendix B: Open Questions（待确认问题）

以下问题需要在施工阶段确认：

1. **Context Menu 渲染层级**：应渲染在 React Flow 容器内部还是外部？
2. **PreviewBlock 定位**：相对于视口还是画布？缩放/平移后如何处理？
3. **isPinned 状态**：迁移后如何表达"节点被固定"这一状态？
4. **Connection 终点检测**：`onConnectEnd` 的 event.target 在 RF DOM 中的实际结构？
5. **多源连接线**：Scenario 2 中多条 connection line 如何渲染？

