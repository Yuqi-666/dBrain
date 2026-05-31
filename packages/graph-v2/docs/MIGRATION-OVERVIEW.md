# Migration Guide: @antv/g6 → @xyflow/react

**Document Version:** 1.0
**Date:** 2026-05-29
**Status:** Approved for Implementation
**Package:** `@workspace/graph`

---

## Table of Contents

| # | Module | Description |
|---|--------|-------------|
| 1 | [MIGRATION-OVERVIEW.md](./MIGRATION-OVERVIEW.md) | This file — executive summary, concept mapping, risks, phases |
| 2 | [MIGRATION-DATA-FLOW.md](./MIGRATION-DATA-FLOW.md) | Data flow redesign, TypeScript interfaces, transform module |
| 3 | [MIGRATION-NODES.md](./MIGRATION-NODES.md) | Custom node components (TextNode, ImageNode, VideoNode, RichTextNode) |
| 4 | [MIGRATION-EDGES.md](./MIGRATION-EDGES.md) | Custom edge components (HierarchyEdge, FlowEdge, AssociationEdge, InteractionEdge) |
| 5 | [MIGRATION-LAYOUTS.md](./MIGRATION-LAYOUTS.md) | Layout algorithms (dagre, d3-force, elk radial), node shape coupling |
| 6 | [MIGRATION-INTERACTIONS.md](./MIGRATION-INTERACTIONS.md) | Event handlers hook, edge creation hook |
| 7 | [MIGRATION-GRAPH-COMPONENT.md](./MIGRATION-GRAPH-COMPONENT.md) | Main Graph component |
| 8 | [MIGRATION-FILE-STRUCTURE.md](./MIGRATION-FILE-STRUCTURE.md) | New file structure, component mapping, files to delete |
| 9 | [MIGRATION-PERFORMANCE.md](./MIGRATION-PERFORMANCE.md) | Performance optimizations |
| 10 | [MIGRATION-APPENDICES.md](./MIGRATION-APPENDICES.md) | Dependencies, theme tokens, arrow markers |

---

## 1. Executive Summary

### What
Replace `@antv/g6` v5 with `@xyflow/react` (React Flow v12) as the graph visualization engine in the `@workspace/graph` package.

### Why
- **React-first architecture**: React Flow is built for React, eliminating the need for framework bridge extensions (`@antv/g6-extension-react`)
- **Simpler state management**: Native React hooks (`useNodesState`, `useEdgesState`) vs G6's imperative API
- **Better TypeScript support**: Clean generics for custom nodes/edges without module augmentation
- **Lighter bundle**: ~150KB vs G6's ~400KB (estimated)
- **Active maintenance**: React Flow has consistent releases and responsive community

### Scope
- **Package**: `packages/graph`
- **Consumer**: `apps/web/app/(main)/graph/page.tsx`
- **Dependencies to update**: Replace G6 imports with React Flow; add `@dagrejs/dagre`, `elkjs`, `d3-force`
- **Out of scope**: Backend changes, domain model changes, store schema changes

### Risks
- **High**: Layout algorithm equivalence (G6's `D3force` behavior vs d3-force Web Worker)
- **Medium**: Edge creation interaction (Alt+drag pattern)
- **Low**: Performance with very large graphs (>1000 nodes)

---

## 2. G6 Implementation Analysis

### What Is Graph Logic (To Preserve)

| Logic | Location | Description |
|-------|----------|-------------|
| Domain → G6 transformation | `transform.ts` | `adaptNodesToG6`, `adaptEdgesToG6`, `filterByViewFilterConfig` |
| Node type by layout | `options/node.tsx` | `dagre` → `react-node`; `D3force` and `radial` → `circle` (tree layouts removed) |
| Layout configs | `options/layout.ts` | D3force, dagre, radial (compactBox/fishbone/mindmap removed) |
| Edge type by direction | `options/edge.ts` | `line` (hierarchy), `quadratic` (flow), `cubic` (bidirectional/interaction) |
| Edge direction arrows | `options/edge.ts` | `endArrow`/`startArrow` based on `forward/reverse/bidirectional/undirected` |
| Node semantics styling | `options/node.tsx` | `getNodeSemantic(data.semanticId!)` for color/icon |
| Edge semantics styling | `options/edge.ts` | `getEdgeSemantic(data.semanticId!)` for color |
| Theme tokens | `options/theme.ts` | `LIGHT_THEME`, `DARK_THEME` |
| Mutation processing | `graph.tsx` | `upsertNode`, `deleteNode`, `upsertEdge`, `deleteEdge`, `upsertView` handling |
| Selection state | `graphUIStore` | `selectedNodeIds`, `selectedEdgeIds` |
| Context menu | `graphUIStore` | `contextMenu` with types: `node`, `edge`, `canvas`, `groupSelect`, `add-edge` |
| Preview block | `graphUIStore` | Hover preview with `isFocus` flag |
| Edge creation flow | `create-edge.ts` | Alt+drag, assist edge/node, `onCreateEdge` callback |
| Force drag pinning | `drag-element-force.ts` | `invokeLayoutMethod("setFixedPosition")` with d3-force simulation |

### What Is G6-Specific (To Replace)

| G6 Pattern | RF Equivalent |
|-----------|---------------|
| `new G6Graph({ container })` | `<ReactFlow>` with controlled state |
| `graph.setData(g6Data)` | `useNodesState` / `useEdgesState` |
| `graph.setOptions({...})` | `nodeTypes` + `edgeTypes` + props |
| `graph.render()` | Automatic on state change |
| `graph.addNodeData()` / `graph.updateNodeData()` / `graph.removeNodeData()` | `onNodesChange` + `applyNodeChanges` |
| `graph.addEdgeData()` / `graph.updateEdgeData()` / `graph.removeEdgeData()` | `onEdgesChange` + `applyEdgeChanges` |
| `graph.stopLayout()` | Layout re-run triggered manually |
| Custom behaviors (registered via `register()`) | Event handlers on `<ReactFlow>` |
| `graph.on(EVENT, handler)` | `onNodeClick`, `onNodeDrag`, etc. |
| Module augmentation `declare module "@antv/g6"` | Generic types `Node<T>`, `Edge<T>` |
| `@antv/g6-extension-react` ReactNode | Built-in `memo()` + `Handle` components |
| `treeToGraphData()` | Not needed | Tree layouts removed — flat data passed directly to layout |

---

## 3. React Flow Architecture

### G6 → React Flow Concept Mapping

| G6 Concept | React Flow Equivalent |
|------------|----------------------|
| `Graph` instance | `<ReactFlow>` component |
| `graph.setData()` | `nodes` + `edges` state |
| `graph.setOptions()` | `nodeTypes` + `edgeTypes` + props |
| `NodeData` (augmented) | `Node<T>` generic with `data: T` |
| `EdgeData` (augmented) | `Edge<T>` generic with `data: T` |
| Behavior | Event handler prop |
| Plugin (Minimap) | `<MiniMap>` component |
| Custom node (ReactNode) | `memo()` component with `Handle` |
| `graph.on(EVENT, handler)` | `onEvent={handler}` prop |
| `graph.getElementData(id)` | Direct from state |
| Layout algorithm | Standalone function applied to positions |

### React Flow Controlled State Pattern

```typescript
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';

// Initial data
const initialNodes: Node[] = [...];
const initialEdges: Edge[] = [...];

function Graph() {
  // Controlled state - React Flow manages position/selection changes
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle connection (new edge)
  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // React Flow handles position, dimension, select, remove changes
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
    />
  );
}
```

### NodeChange Types (G6 → RF Mapping)

| G6 Change | RF `NodeChange` |
|-----------|-----------------|
| Node added | `{ type: 'add', item: Node }` |
| Node removed | `{ type: 'remove', id: string }` |
| Node position changed | `{ type: 'position', id: string, position: XYPosition, delta?: XYPosition }` |
| Node dimensions changed | `{ type: 'dimension', id: string, dimensions: { width, height } }` |
| Node selected | `{ type: 'select', id: string, selected: boolean }` |
| Node replaced | `{ type: 'replace', item: Node }` |

---

## 4. Migration Phases

### Phase 1: Foundation (Day 1-2)
- Install `@xyflow/react`, `@dagrejs/dagre`, `elkjs`, `d3-force`
- Create new file structure
- Implement `TextNode`, `ImageNode`, `VideoNode`, `RichTextNode`
- Implement `HierarchyEdge`, `FlowEdge`, `AssociationEdge`, `InteractionEdge`
- Create `types.ts` and `transform.ts`

### Phase 2: Controlled State (Day 3-4)
- Implement `useGraphState` hook (inline in `graph.tsx` for simplicity)
- Subscribe to `latestMutations`
- Connect to consumer app
- Test basic CRUD operations

### Phase 3: Event Handlers (Day 5-6)
- Selection, context menu, preview, double-click handlers
- Alt+drag edge creation hook

### Phase 4: Layout Integration (Day 7-8)
- Dagre layout implementation (`@dagrejs/dagre`)
- d3-force Web Worker for D3force (forceLink + forceManyBody + forceCenter)
- ELK radial layout for `radial` (elkjs `radial` algorithm)

### Phase 5: Polish & Cleanup (Day 9-10)
- MiniMap, Background, Controls, theme support
- Delete old G6 files
- Full integration testing

### Phase 6: Performance & Edge Cases (Day 11-12)
- `onlyRenderVisibleElements`, memoization, debouncing
- Large graph testing (>1000 nodes)
- Edge case handling

---

## 5. Risk Assessment

### High Risks

| Risk | Mitigation |
|------|------------|
| **D3force fidelity** | Test d3-force parameters (strength, distance, iterations) against G6's default simulation; may need iteration count tuning |
| **Multi-source edge creation (Scenario 2)** | `useEdgeCreation` hook handles this via `onConnectStart`/`onConnectEnd`; test Alt+drag from canvas with multiple selected nodes |
| **Direction-based arrow rendering** | Edge components updated to read `data.direction` and show/hide markers accordingly; test reverse/bidirectional/undirected arrows |

### Medium Risks

| Risk | Mitigation |
|------|------------|
| **Position persistence** | Ensure `stateData.position` ↔ RF `position` sync |
| **Web Worker bundling** | Use `new Worker(new URL(...), { type: 'module' })` pattern for Vite compatibility |

### Low Risks

| Risk | Mitigation |
|------|------------|
| **Bundle size** | Tree-shake d3-force; dagre-only for MVP |
| **TypeScript errors** | Allocate time for type fixes |

---

## 6. G6 → React Flow Quick Reference

| G6 | React Flow |
|----|------------|
| `new G6Graph({ container })` | `<ReactFlow>` |
| `graph.setData(data)` | `useNodesState` + `useEdgesState` |
| `graph.addNodeData()` | `setNodes((nds) => [...nds, newNode])` |
| `graph.updateNodeData()` | `setNodes((nds) => nds.map(...))` |
| `graph.removeNodeData()` | `setNodes((nds) => nds.filter(...))` |
| `graph.on(EVENT, h)` | `onEvent={h}` |
| `graph.fitCenter()` | `fitView({ padding: 0.2 })` (non-D3force only) |
| `graph.stopLayout()` | Not needed in RF — layouts are functions, not running simulations |
| `graph.render()` | Automatic on state change |
| `graph.draw()` | Not needed in RF |
| Context menu (node/edge/canvas/groupSelect) | `onNodeContextMenu` / `onEdgeContextMenu` / `onPaneContextMenu` |
| `add-edge` context menu type | Triggered in `onConnectEnd` when connection ends on empty space |
| Multi-source edge creation (Scenario 2) | Custom `useEdgeCreation` hook with `onConnectStart`/`onConnectEnd` |
| Custom behavior | Event handler hook |
| Module augmentation | Generic types `<T>` |
| `@antv/g6-extension-react` | `memo()` + `Handle` |
| `treeToGraphData()` | N/A — tree layouts removed, flat data passed directly to layout |
