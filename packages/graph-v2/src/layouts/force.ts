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
          return {
            ...node,
            position: pos ?? node.position ?? { x: 0, y: 0 },
          };
        }) as Node[]
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

export function reheatForceSimulation(alpha = 0.3): void {
  getWorker().postMessage({ type: 'reheat', alpha });
}

export function setForceNodePosition(
  nodeId: string,
  x: number | null,
  y: number | null
): void {
  getWorker().postMessage({ type: 'setFixedPosition', nodeId, x, y });
}

export function onForcePositions(
  callback: (positions: PositionMap) => void
): () => void {
  positionCallback = callback;
  return () => {
    positionCallback = null;
  };
}