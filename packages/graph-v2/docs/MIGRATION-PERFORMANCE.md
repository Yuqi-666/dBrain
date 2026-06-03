# Module 9: Performance Strategy

**Parent Document:** [MIGRATION-OVERVIEW.md](./MIGRATION-OVERVIEW.md)

---

## Key Optimizations

```typescript
// 1. onlyRenderVisibleElements - critical for large graphs
<ReactFlow onlyRenderVisibleElements={true} />

// 2. Memoize all custom nodes and edges
export const TextNode = memo(function TextNode(...) { ... });
export const nodeTypes = { text: memo(TextNode), ... };

// 3. Event handlers useCallback
const handleNodeClick = useCallback((event, node) => { ... }, []);

// 4. Default edge options memoized
const defaultEdgeOptions = useMemo(() => ({
  animated: false,
  type: 'hierarchy'
}), []);

// 5. Subscribe selectively to avoid unnecessary re-renders
const nodes = useDataStore((s) => s.nodes); // Not entire store

// 6. d3-force runs off main thread in Web Worker
// Main thread never blocked by force simulation ticks

// 7. Layout switching is async (await applyForceLayout / applyRadialLayout)
// UI remains responsive during layout computation
```
