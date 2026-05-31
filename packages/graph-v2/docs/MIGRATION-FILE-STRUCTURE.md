# Module 8: File Structure

**Parent Document:** [MIGRATION-OVERVIEW.md](./MIGRATION-OVERVIEW.md)

---

## 1. New File Structure

```
packages/graph/src/
├── graph.tsx                        # Main component - controlled React Flow
├── types.ts                         # RF generic types for domain data
├── transform.ts                     # Domain → RF data transformation
├── index.ts                         # Public API exports
│
├── hooks/
│   ├── useGraphEventHandlers.ts    # REWRITE: selection, context menu, preview
│   └── useEdgeCreation.ts          # NEW: Alt+drag edge creation
│
├── components/
│   ├── nodes/                       # Custom node components
│   │   ├── TextNode.tsx             # ADAPTED
│   │   ├── ImageNode.tsx             # ADAPTED
│   │   ├── VideoNode.tsx             # ADAPTED
│   │   ├── RichTextNode.tsx          # ADAPTED
│   │   └── index.ts
│   │
│   └── edges/                       # Custom edge components
│       ├── HierarchyEdge.tsx         # NEW: solid line, no arrow
│       ├── FlowEdge.tsx              # NEW: quadratic, endArrow
│       ├── AssociationEdge.tsx       # NEW: dashed, no arrow
│       ├── InteractionEdge.tsx       # NEW: cubic, bidirectional arrows
│       └── index.ts
│
├── layouts/                         # Layout algorithm implementations
│   ├── dagre.ts                     # Dagre layout with dagrejs
│   ├── elk.ts                        # ELK layout with elkjs (radial only)
│   ├── force.ts                      # Force layout main thread API
│   ├── force.worker.ts               # Web Worker: d3-force simulation
│   └── index.ts
│
├── theme/
│   └── theme.ts                      # PRESERVED from options/theme.ts
│
└── utils/
    └── treeToGraph.ts                # Tree → graph conversion for RF (if needed)
```

---

## 2. Files to DELETE (G6-specific)

```
packages/graph/src/
├── options/                          # All deleted → new structure
├── extensions/                        # All deleted → new structure
├── hooks/useGraphInstance.ts          # → useGraphState
├── types.ts                           # → new types.ts with RF generics
```

---

## 3. Component Mapping

| G6 File | RF Equivalent | Notes |
|---------|---------------|-------|
| `graph.tsx` | `graph.tsx` | Complete rewrite |
| `transform.ts` | `transform.ts` + `utils/treeToGraph.ts` | Adapt domain → RF types |
| `hooks/useGraphInstance.ts` | `hooks/useGraphState.ts` | `useNodesState` + `useEdgesState` |
| `hooks/useGraphEventHandlers.ts` | `hooks/useGraphEventHandlers.ts` | Rewrite event handlers |
| `options/layout.ts` | `layouts/*.ts` | dagre, elk, radial, force |
| `options/node.tsx` | `components/nodes/*.tsx` | Custom memoized nodes |
| `options/edge.ts` | `components/edges/*.tsx` | Custom memoized edges |
| `options/behaviors.ts` | `hooks/useEdgeCreation.ts` | Alt+drag edge creation |
| `options/plugins.ts` | `<MiniMap>` | Built-in component |
| `options/theme.ts` | `theme/theme.ts` | No change |
| `extensions/index.ts` | Deleted | No registration needed |
| `extensions/behaviors/custom-canvas-gesture.ts` | RF built-in | Pan/zoom built-in |
| `extensions/behaviors/create-edge.ts` | `hooks/useEdgeCreation.ts` | Rewrite as React hook |
| `extensions/behaviors/drag-element.ts` | RF built-in | Drag built-in |
| `extensions/behaviors/drag-element-force.ts` | `layouts/force.ts` (reheat/pin API) | Drag is RF built-in; force worker exposes `reheat()` and `setFixedPosition()` for drag interaction |
| `extensions/custom-nodes/*.tsx` | `components/nodes/*.tsx` | Add memo + Handle |
| `types.ts` | `types.ts` | Replace with RF generics |
