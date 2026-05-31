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

let simulation: d3.Simulation<d3.SimulationNodeDatum> | null = null;
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

    const linkForce = d3.forceLink(simEdges as any)
      .id((d: any) => d.id)
      .distance(distance)
      .strength(strength);

    simulation = (d3.forceSimulation as any)(simNodes as d3.SimulationNodeDatum[])
      .force('link', linkForce as any)
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

    for (let i = 0; i < 300; i++) simulation?.tick();
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