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