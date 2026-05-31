import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';

const elk = new ELK();

export async function applyRadialLayout(
  nodes: Node[],
  edges: Edge[],
  options: { centerX?: number; centerY?: number; radius?: number } = {}
): Promise<Node[]> {
  const { radius = 200 } = options;

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