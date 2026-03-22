# Task-2 节点图组件落地规划

## 项目背景总结

### Task-1 完成情况

1. **接口类型定义** ✅
   - 9种节点类型 (7单数据 + 2复数据)
   - 4大类边类型 (层次/流向/关联/交互)
   - 视图类型 (静态/动态筛选)

2. **状态管理** ✅
   - 4个 API 模块 (graph, views, semantic-nodes, semantic-edges)
   - 4组 React Query Hooks
   - 1个 Zustand Store (graph-store)

### Task-2 架构设计 (来自 task-2.md)

节点图组件需要考虑四件事：

1. **显示范围** - 哪些节点需要显示（数据在View.scope中）
2. **布局算法** - 使用哪些布局方式（数据在View.layoutType中）
3. **渲染样式** - 节点/边样式配置（data和style的映射）
4. **用户交互** - 鼠标/键盘与节点/边/白板交互

## G6 技术调研总结

### 安装

```bash
npm install @antv/g6 --save
# 或
pnpm add @antv/g6
```

### 核心概念对应关系

| 需求                 | G6 对应配置                                          |
| -------------------- | ---------------------------------------------------- |
| 视图范围(Scope)      | data.nodes/edges + filters                           |
| 布局类型(LayoutType) | layout.type (force/d3-force/circular/dagre/tree等)   |
| 节点样式             | node.style (fill/stroke/label/size等)                |
| 边样式               | edge.style (stroke/lineWidth/endArrow等)             |
| 背景样式             | background / plugins.grid                            |
| 画布交互             | behaviors (drag-canvas/zoom-canvas等)                |
| 元素交互             | behaviors (drag-element/click-select/brush-select等) |
| 小地图               | plugins.minimap                                      |
| 主题                 | theme (light/dark)                                   |

### 布局类型映射

- `force` → d3-force / force (力导向)
- `timeline` → 需自定义 (时间线布局)
- `matrix` → grid (网格布局)
- `free` → 无布局 (自由拖拽)

### 交互类型

- 拖拽画布: drag-canvas
- 缩放: zoom-canvas
- 拖拽节点: drag-element
- 点击选择: click-select
- 框选: brush-select
- 创建边: create-edge
- 悬停高亮: hover-activate

## 项目现有结构

### 关键路径

- apps/web/app/ - Next.js 15 App Router 入口
- packages/ui/src/components/ - UI组件
- packages/interfaces/src/models/view.ts - View类型定义
- packages/store/src/slices/graph-store.ts - 图状态管理
- packages/api-client/src/hooks/ - React Query Hooks

## 规划决策点

1. **G6版本**: 使用G6 v5 (最新稳定版)
2. **React集成**: 使用G6的React渲染器 (@antv/g6-extension-react)
3. **自定义能力**: 需要自定义节点/边以支持9种节点类型
4. **状态同步**: G6实例与Zustand store的同步机制
5. **布局扩展**: timeline/matrix布局需要自定义实现
6. **组件结构**: 在packages/ui中创建Graph组件

## G6 核心技术要点

### 基础用法

```ts
import { Graph } from "@antv/g6";

const graph = new Graph({
  container: "container",
  autoFit: "view",
  data: { nodes, edges },
  node: { type: "circle", style: { size: 20, fill: "#e6f7ff" } },
  edge: { type: "line", style: { stroke: "#91d5ff" } },
  layout: { type: "d3-force" },
  behaviors: ["drag-canvas", "zoom-canvas", "drag-element"],
});
graph.render();
```

### React节点用法

```bash
npm install @antv/g6-extension-react
```

```ts
import { ExtensionCategory, register } from '@antv/g6';
import { ReactNode } from '@antv/g6-extension-react';

register(ExtensionCategory.NODE, 'react-node', ReactNode);

const graph = new Graph({
  node: {
    type: 'react-node',
    style: {
      component: (data) => <CustomNodeComponent data={data} />,
    },
  },
});
```

### 布局类型映射

- `force` → d3-force (力导向)
- `timeline` → 自定义
- `matrix` → grid (网格)
- `free` → 无布局 (自由)

### 交互配置

- drag-canvas: 拖拽画布
- zoom-canvas: 缩放画布
- drag-element: 拖拽元素
- click-select: 点击选择
- brush-select: 框选
- create-edge: 创建边
- hover-activate: 悬停高亮
