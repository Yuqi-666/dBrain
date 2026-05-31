# Module 10: Appendices

**Parent Document:** [MIGRATION-OVERVIEW.md](./MIGRATION-OVERVIEW.md)

---

## Appendix A: New Dependencies

```json
{
  "dependencies": {
    "@xyflow/react": "^12.0.0",
    "@dagrejs/dagre": "^1.1.0",
    "elkjs": "^0.9.0",
    "d3-force": "^3.0.0"
  }
}
```

---

## Appendix B: Theme Tokens (Preserved)

```typescript
// packages/graph/src/theme/theme.ts

export const LIGHT_THEME = {
  background: '#ffffff',
  gridColor: '#f0f0f0',
  nodeColor: '#165DFF',
  edgeColor: '#91caff',
  labelColor: '#333333',
};

export const DARK_THEME = {
  background: '#1a1a1a',
  gridColor: '#333333',
  nodeColor: '#4080FF',
  edgeColor: '#69b1ff',
  labelColor: '#e5e5e5',
};
```

---

## Appendix C: Arrow Marker Definitions

Add to `graph.tsx` or a separate SVG defs component:

```tsx
<svg xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', width: 0, height: 0 }}>
  <defs>
    <marker
      id="arrowhead"
      markerWidth="10"
      markerHeight="7"
      refX="9"
      refY="3.5"
      orient="auto"
    >
      <polygon points="0 0, 10 3.5, 0 7" fill="#91caff" />
    </marker>
    <marker
      id="arrowhead-both"
      markerWidth="10"
      markerHeight="7"
      refX="9"
      refY="3.5"
      orient="auto"
    >
      <polygon points="0 0, 10 3.5, 0 7" fill="#91caff" />
    </marker>
    <marker
      id="arrowhead-start"
      markerWidth="10"
      markerHeight="7"
      refX="1"
      refY="3.5"
      orient="auto"
    >
      <polygon points="10 0, 0 3.5, 10 7" fill="#91caff" />
    </marker>
  </defs>
</svg>
```

---

## Appendix D: Layout Parameters (Source of Truth)

From `packages/graph/src/options/layout.ts`:

| Parameter | Value |
|-----------|-------|
| `link.distance` | `weight * 24 + 76` |
| `link.strength` | `1.4 - weight * 0.2` |
| `manyBody.strength` | `-500` |
| `center.strength` | `0.5` |
| `iterations` | `100` |
| `alphaDecay` | `0.04` |

These parameters are used in the `force.worker.ts` implementation.
