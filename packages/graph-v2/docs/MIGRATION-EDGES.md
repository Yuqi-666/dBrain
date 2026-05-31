# Module 4: Custom Edge Components

**Parent Document:** [MIGRATION-OVERVIEW.md](./MIGRATION-OVERVIEW.md)

---

## 1. Edge Type by EdgeType Field

| `edge.edgeType` | G6 Type | RF Type | Shape | Arrow |
|-----------------|---------|----------|-------|-------|
| `hierarchy` | `line` | `hierarchy` | Straight | None |
| `flow` | `quadratic` | `flow` | Quadratic | endArrow |
| `association` | `line` | `association` | Straight (dashed) | None (bidirectional shows both) |
| `interaction` | `cubic` | `interaction` | Bezier | Both (bidirectional) |

---

## 2. Direction → Arrow Mapping

| Direction | endArrow | startArrow |
|-----------|----------|-----------|
| `forward` | ✅ | ❌ |
| `reverse` | ❌ | ✅ |
| `bidirectional` | ✅ | ✅ |
| `undirected` | ❌ | ❌ |

---

## 3. HierarchyEdge

```typescript
// packages/graph/src/components/edges/HierarchyEdge.tsx

import { memo } from 'react';
import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react';
import type { GraphEdgeData } from '../../types';

export const HierarchyEdge = memo(function HierarchyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
}: EdgeProps<GraphEdgeData>) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const strokeColor = selected ? '#FF7D00' : '#91caff';
  const strokeWidth = selected ? 3 : 2;
  const direction = data?.direction ?? 'forward';

  const showEndArrow = direction !== 'reverse' && direction !== 'undirected';
  const showStartArrow = direction !== 'forward' && direction !== 'undirected';

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: strokeColor,
        strokeWidth,
        filter: selected ? 'drop-shadow(0 0 4px rgba(255, 125, 0, 0.3))' : 'none',
      }}
      markerEnd={showEndArrow ? 'url(#arrowhead)' : undefined}
      markerStart={showStartArrow ? 'url(#arrowhead-start)' : undefined}
    />
  );
});
```

---

## 4. FlowEdge

```typescript
// packages/graph/src/components/edges/FlowEdge.tsx

import { memo } from 'react';
import { BaseEdge, getQuadraticPath, type EdgeProps } from '@xyflow/react';
import type { GraphEdgeData } from '../../types';

export const FlowEdge = memo(function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
}: EdgeProps<GraphEdgeData>) {
  const [edgePath] = getQuadraticPath({ sourceX, sourceY, targetX, targetY });
  const strokeColor = selected ? '#FF7D00' : '#91caff';
  const strokeWidth = selected ? 3 : 2;
  const direction = data?.direction ?? 'forward';

  const showEndArrow = direction !== 'reverse' && direction !== 'undirected';
  const showStartArrow = direction !== 'forward' && direction !== 'undirected';

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: strokeColor,
        strokeWidth,
        filter: selected ? 'drop-shadow(0 0 4px rgba(255, 125, 0, 0.3))' : 'none',
      }}
      markerEnd={showEndArrow ? 'url(#arrowhead)' : undefined}
      markerStart={showStartArrow ? 'url(#arrowhead-start)' : undefined}
    />
  );
});
```

---

## 5. AssociationEdge

```typescript
// packages/graph/src/components/edges/AssociationEdge.tsx

import { memo } from 'react';
import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react';
import type { GraphEdgeData } from '../../types';

export const AssociationEdge = memo(function AssociationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
}: EdgeProps<GraphEdgeData>) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const strokeColor = selected ? '#FF7D00' : '#91caff';
  const strokeWidth = selected ? 3 : 2;
  const direction = data?.direction ?? 'undirected';

  // Association is dashed; only bidirectional shows arrows
  const showEndArrow = direction === 'bidirectional';
  const showStartArrow = direction === 'bidirectional';

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: strokeColor,
        strokeWidth,
        strokeDasharray: '6, 4',
        filter: selected ? 'drop-shadow(0 0 4px rgba(255, 125, 0, 0.3))' : 'none',
      }}
      markerEnd={showEndArrow ? 'url(#arrowhead)' : undefined}
      markerStart={showStartArrow ? 'url(#arrowhead-start)' : undefined}
    />
  );
});
```

---

## 6. InteractionEdge

```typescript
// packages/graph/src/components/edges/InteractionEdge.tsx

import { memo } from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import type { GraphEdgeData } from '../../types';

export const InteractionEdge = memo(function InteractionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
}: EdgeProps<GraphEdgeData>) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  const strokeColor = selected ? '#FF7D00' : '#91caff';
  const strokeWidth = selected ? 3 : 2;
  const direction = data?.direction ?? 'forward';

  const showEndArrow = direction !== 'reverse' && direction !== 'undirected';
  const showStartArrow = direction !== 'forward' && direction !== 'undirected';

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: strokeColor,
        strokeWidth,
        filter: selected ? 'drop-shadow(0 0 4px rgba(255, 125, 0, 0.3))' : 'none',
      }}
      markerEnd={showEndArrow ? 'url(#arrowhead)' : undefined}
      markerStart={showStartArrow ? 'url(#arrowhead-start)' : undefined}
    />
  );
});
```

---

## 7. Edge Registration

```typescript
// packages/graph/src/components/edges/index.ts

import { memo } from 'react';
import { HierarchyEdge } from './HierarchyEdge';
import { FlowEdge } from './FlowEdge';
import { AssociationEdge } from './AssociationEdge';
import { InteractionEdge } from './InteractionEdge';

export const edgeTypes = {
  hierarchy: memo(HierarchyEdge),
  flow: memo(FlowEdge),
  association: memo(AssociationEdge),
  interaction: memo(InteractionEdge),
  default: memo(HierarchyEdge),
};

export { HierarchyEdge, FlowEdge, AssociationEdge, InteractionEdge };
```
