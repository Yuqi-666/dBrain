# Module 5: Layout System

**Parent Document:** [MIGRATION-OVERVIEW.md](./MIGRATION-OVERVIEW.md)

---

## 1. Layout Type Mapping

| G6 Layout | RF Implementation | Node Shape |
|-----------|---------------------------|-----------|
| `dagre` | `@dagrejs/dagre` | Rectangle (full React components) |
| `radial` | `elkjs` `radial` algorithm | Circle (simple marker) |
| `D3force` | `d3-force` + Web Worker | Circle (simple marker) |
| `compactBox` | ❌ Deleted | — |
| `fishbone` | ❌ Deleted | — |
| `mindmap` | ❌ Deleted | — |

---

## 2. Node Shape Coupling with Layout

The node's **geometric shape** is determined by the current layout type:

| Layout | Node Shape | Description |
|--------|-----------|-------------|
| `dagre` | Rectangle | Full custom React components (TextNode / ImageNode / VideoNode / RichTextNode) |
| `radial` | Circle | Simple circle node, no complex content |
| `D3force` | Circle | Simple circle node, no complex content |

**Design rationale:**
- `dagre` nodes carry rich text/images/video content → need rectangular space
- `D3force` / `radial` nodes are **position markers** in force/radial layout → use lightweight circles

**Shape change on layout switch:**
- `dagre` → `D3force/radial`: nodes transform from rectangle React components to circles
- `D3force/radial` → `dagre`: nodes transform from circles back to rectangle React components

---

## 3. Dagre Layout

```typescript
// packages/graph/src/layouts/dagre.ts

import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 172;
const NODE_HEIGHT = 40;

interface LayoutOptions {
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  nodesep?: number;
  ranksep?: number;
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): Node[] {
  const { direction = 'TB', nodesep = 30, ranksep = 50 } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep, ranksep });

  nodes.forEach((node) => {
    const width = (node.measured as any)?.width ?? (node as any).width ?? NODE_WIDTH;
    const height = (node.measured as any)?.height ?? (node as any).height ?? NODE_HEIGHT;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    if (!nodeWithPosition) return node;

    const width = (node.measured as any)?.width ?? (node as any).width ?? NODE_WIDTH;
    const height = (node.measured as any)?.height ?? (node as any).height ?? NODE_HEIGHT;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });
}
```

---

## 4. d3-force Layout (Web Worker)

The worker maintains a **persistent simulation** (not one-shot) to support drag interaction:
- `run` — initialize simulation, run to steady state, return positions
- `reheat` — reheat simulation (alphaTarget) during drag
- `setFixedPosition` — pin/unpin a node during drag

```typescript
// packages/graph/src/layouts/force.worker.ts

import * as d3 from 'd3-force';

interface SimNode {
  id: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface RunMessage {
  type: 'run';
  nodes: SimNode[];
  edges: Array<{ source: string; target: string }>;
  options?: {
    strength?: number;
    distance?: number;
  };
}

interface ReheatMessage {
  type: 'reheat';
  alpha?: number;
}

interface SetFixedMessage {
  type: 'setFixedPosition';
  nodeId: string;
  x: number | null;
  y: number | null;
}

type WorkerInMessage = RunMessage | ReheatMessage | SetFixedMessage;

let simulation: d3.Simulation<SimNode, undefined> | null = null;
let simNodes: SimNode[] = [];
let simEdges: Array<{ source: string; target: string }> = [];

function sendResult() {
  self.postMessage({
    type: 'result',
    nodes: simNodes.map((n) => ({ id: n.id, x: n.x ?? 0, y: n.y ?? 0 })),
  });
}

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  if (msg.type === 'run') {
    const { nodes, edges, options = {} } = msg;
    const { strength = -300, distance = 200 } = options;

    simNodes = nodes.map((n) => ({ ...n }));
    simEdges = edges;

    simulation = d3.forceSimulation(simNodes as any)
      .force('link', d3.forceLink(simEdges)
        .id((d: any) => d.id)
        .distance(distance)
        .strength(strength))
      .force('charge', d3.forceManyBody().strength(strength * 0.5))
      .force('center', d3.forceCenter(400, 300))
      .force('collision', d3.forceCollide().radius(80))
      .on('tick', () => {
        self.postMessage({
          type: 'positions',
          nodes: simNodes.map((n) => ({ id: n.id, x: n.x ?? 0, y: n.y ?? 0 })),
        });
      })
      .stop();

    for (let i = 0; i < 300; i++) simulation.tick();
    sendResult();
    return;
  }

  if (msg.type === 'reheat' && simulation) {
    simulation.alphaTarget(msg.alpha ?? 0.3).restart();
    setTimeout(() => simulation?.alphaTarget(0), 500);
    return;
  }

  if (msg.type === 'setFixedPosition' && simulation) {
    const node = simNodes.find((n) => n.id === msg.nodeId);
    if (node) {
      node.fx = msg.x;
      node.fy = msg.y;
      simulation.alpha(0.1).restart();
    }
    return;
  }
};
```

```typescript
// packages/graph/src/layouts/force.ts

import type { Node, Edge } from '@xyflow/react';

interface PositionMap {
  [nodeId: string]: { x: number; y: number };
}

// Lazy-init worker
let forceWorker: Worker | null = null;
let positionCallback: ((positions: PositionMap) => void) | null = null;

function getWorker(): Worker {
  if (!forceWorker) {
    forceWorker = new Worker(
      new URL('./force.worker.ts', import.meta.url),
      { type: 'module' }
    );
    forceWorker.addEventListener('message', (e) => {
      if (e.data.type === 'positions' && positionCallback) {
        positionCallback(
          Object.fromEntries(e.data.nodes.map((n: any) => [n.id, { x: n.x, y: n.y }]))
        );
      }
    });
  }
  return forceWorker;
}

const DEFAULT_OPTIONS = {
  strength: -300,
  distance: 200,
};

/**
 * Run force layout and return final positions.
 */
export function applyForceLayout(
  nodes: Node[],
  edges: Edge[],
  options = DEFAULT_OPTIONS
): Promise<Node[]> {
  return new Promise((resolve) => {
    const worker = getWorker();

    const handleMessage = (e: MessageEvent) => {
      if (e.data.type !== 'result') return;
      worker.removeEventListener('message', handleMessage);

      const positionMap = new Map(
        e.data.nodes.map((n: any) => [n.id, { x: n.x, y: n.y }])
      );

      resolve(
        nodes.map((node) => {
          const pos = positionMap.get(node.id);
          return { ...node, position: pos ?? node.position };
        })
      );
    };

    worker.addEventListener('message', handleMessage);

    worker.postMessage({
      type: 'run',
      nodes: nodes.map((n) => ({ id: n.id, x: n.position?.x, y: n.position?.y })),
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
      options,
    });
  });
}

/**
 * Reheat the simulation (call during drag to keep force active).
 */
export function reheatForceSimulation(alpha = 0.3): void {
  getWorker().postMessage({ type: 'reheat', alpha });
}

/**
 * Pin or unpin a node position during drag.
 */
export function setForceNodePosition(
  nodeId: string,
  x: number | null,
  y: number | null
): void {
  getWorker().postMessage({ type: 'setFixedPosition', nodeId, x, y });
}

/**
 * Subscribe to live position updates during simulation (for drag preview).
 */
export function onForcePositions(
  callback: (positions: PositionMap) => void
): () => void {
  positionCallback = callback;
  return () => {
    positionCallback = null;
  };
}
```

---

## 5. ELK Layout (radial)

> **Note**: `compactBox`, `fishbone`, and `mindmap` have been **removed** — elkjs does not support these layouts. ELK is retained solely for `radial` layout.

```typescript
// packages/graph/src/layouts/elk.ts

import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';

const elk = new ELK();

export async function applyRadialLayout(
  nodes: Node[],
  edges: Edge[],
  options: { centerX?: number; centerY?: number; radius?: number } = {}
): Promise<Node[]> {
  const { centerX = 400, centerY = 300, radius = 200 } = options;

  const elkNodes = nodes.map((node) => ({
    id: node.id,
    width: (node.measured as any)?.width ?? (node as any).width ?? 172,
    height: (node.measured as any)?.height ?? (node as any).height ?? 40,
  }));

  const elkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'radial',
      'elk.direction': 'DOWN',
      'elk.radial.radius': String(radius),
      'elk.radial.centerOnRoot': 'true',
      'elk.spacing.nodeNode': '50',
    },
    children: elkNodes,
    edges: elkEdges,
  };

  const layoutedGraph = await elk.layout(graph);

  return nodes.map((node) => {
    const layoutedNode = layoutedGraph.children?.find((n: any) => n.id === node.id);
    if (!layoutedNode) return node;

    return {
      ...node,
      position: {
        x: layoutedNode.x ?? 0,
        y: layoutedNode.y ?? 0,
      },
    };
  });
}
```

> **Data structure**: elkjs accepts **flat** node/edge data directly — no tree conversion needed. elkjs builds the spanning tree internally for radial layout.

---

## 6. Layout Entry Point

```typescript
// packages/graph/src/layouts/index.ts

export { applyDagreLayout } from './dagre';
export { applyRadialLayout } from './elk';
export { applyForceLayout, reheatForceSimulation, setForceNodePosition, onForcePositions } from './force';
```
