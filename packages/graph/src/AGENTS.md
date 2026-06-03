# AGENTS.md — @workspace/graph

**Package:** `@workspace/graph` · **Built on:** @antv/g6 v5 + @antv/g6-extension-react
**Consumers:** `apps/web/app/(main)/graph/page.tsx`

## Architecture

```
src/
├── graph.tsx           # Main React component (G6 Graph lifecycle, data sync)
├── transform.ts        # Domain → G6 data transformation
├── types.ts            # G6 module augmentation (NodeData, EdgeData extensions)
├── index.ts            # Public API exports
├── hooks/
│   ├── useGraphInstance.ts    # G6 Graph instantiation + options
│   └── useGraphEventHandlers.ts  # DOM events → UI store actions
├── options/            # G6 configuration builders
│   ├── layout.ts       # Layout configs (D3force, dagre, radial, compactBox, fishbone, mindmap)
│   ├── node.tsx        # Node options (circle vs react-node by layout type)
│   ├── edge.ts         # Edge options (line/quadratic/cubic by edgeType)
│   ├── behaviors.ts    # Behavior list (canvas-gesture, click-select, lasso, drag, create-edge)
│   ├── plugins.ts      # Plugin list (minimap)
│   └── theme.ts        # Light/dark theme tokens
└── extensions/
    ├── index.ts        # Registers all custom extensions with G6
    ├── behaviors/      # Custom G6 behaviors
    │   ├── custom-canvas-gesture.ts  # Pan/zoom (ctrl+wheel for pinch-zoom)
    │   ├── create-edge.ts            # Alt+drag edge creation
    │   ├── drag-element.ts           # Node drag (non-force layouts)
    │   └── drag-element-force.ts     # Node drag with d3-force position pinning
    └── custom-nodes/    # React-based custom node renderers
        ├── text-node.tsx
        ├── image-node.tsx
        ├── video-node.tsx
        └── rich-text-node.tsx
```

## Key Patterns

### G6 Version
Uses **@antv/g6 v5** (not v4). The API differs significantly — uses `graph.setData()`, `graph.setOptions()`, `graph.render()` pattern instead of old `graph.read()`.

### Data Sync
Graph syncs via **mutation queue** in `useDataStore`:
- `latestMutations: Mutation[]` — incremental updates (add/update/delete node/edge/view)
- `processMutations()` applies each mutation type to G6 in-place
- Full sync via `performFullSync()` when view changes

### Layout → Node Type Coupling
Layout type determines node renderer:
- `D3force`, `dagre`, `radial` → **circle** node (G6 default)
- `compactBox`, `fishbone`, `mindmap` → **react-node** (React component via @antv/g6-extension-react)

### Custom Extensions
All custom G6 extensions registered once via `registerExtensions()` (singleton, guards against double-registration):
```typescript
register(ExtensionCategory.BEHAVIOR, "custom-canvas-gesture", CustomCanvasGesture);
register(ExtensionCategory.NODE, "react-node", ReactNode);
// ...
```

### Edge Creation
Alt+drag interaction:
- No pre-selected nodes → drag from source node
- Has pre-selected nodes → drag from canvas to create edges from all selected
- Creates assist edge/node temporarily, calls `onCreateEdge` callback on drop

## Dependencies
- `@workspace/interfaces` — Domain types (NodeId, EdgeId, NodeData, EdgeData, View, LayoutType, etc.)
- `@workspace/store` — `useDataStore` (nodes, edges, views, mutations), `useGraphUIStore` (selection, context menu, preview)
- `@workspace/ui` — `GraphContextMenu`, `PreviewBlock`, design tokens
- `@workspace/utils` — `filterByViewFilterConfig` for view-based data filtering

## Commands
```bash
pnpm --filter=@workspace/graph typecheck
pnpm --filter=@workspace/graph lint
pnpm --filter=@workspace/graph format
```

## Anti-Patterns

- **Don't hardcode colors** — use `createThemeOptions()` tokens or CSS variables from `@workspace/ui`
- **Don't modify raw domain data** in `transform.ts` — return new G6-compatible objects
- **Don't import internal paths** — use `@workspace/graph` public exports only
- **Don't call `graph.render()` after every mutation** — use `graph.draw()` for incremental updates
- **Don't forget `graph.stopLayout()`** before adding/removing nodes during force layout
