import type { NodeData, EdgeBase } from "@workspace/interfaces";

export interface GraphNodesResponse {
  nodes: NodeData[];
  total: number;
}

export interface GraphEdgesResponse {
  edges: EdgeBase[];
  total: number;
}

export interface GraphResponse {
  nodes: NodeData[];
  edges: EdgeBase[];
  nodeCount: number;
  edgeCount: number;
}

const MOCK_NODES: NodeData[] = [];
const MOCK_EDGES: EdgeBase[] = [];

export async function getGraph(): Promise<GraphResponse> {
  return Promise.resolve({
    nodes: MOCK_NODES,
    edges: MOCK_EDGES,
    nodeCount: MOCK_NODES.length,
    edgeCount: MOCK_EDGES.length,
  });
}

export async function getNodes(): Promise<GraphNodesResponse> {
  return Promise.resolve({
    nodes: MOCK_NODES,
    total: MOCK_NODES.length,
  });
}

export async function getNode(nodeId: string): Promise<NodeData | null> {
  const node = MOCK_NODES.find((n) => n.metadata.id === nodeId);
  return Promise.resolve(node ?? null);
}

export async function createNode(node: NodeData): Promise<NodeData> {
  const newNode = {
    ...node,
    metadata: {
      ...node.metadata,
      id: node.metadata.id || `node-${Date.now()}`,
    },
  };
  MOCK_NODES.push(newNode);
  return Promise.resolve(newNode);
}

export async function updateNode(
  nodeId: string,
  updates: Partial<NodeData>,
): Promise<NodeData> {
  const index = MOCK_NODES.findIndex((n) => n.metadata.id === nodeId);
  if (index === -1) {
    throw new Error("Node not found");
  }
  const existingNode = MOCK_NODES[index];
  if (!existingNode) {
    throw new Error("Node not found");
  }
  const updated = { ...existingNode, ...updates } as NodeData;
  MOCK_NODES[index] = updated;
  return Promise.resolve(updated);
}

export async function deleteNode(nodeId: string): Promise<void> {
  const index = MOCK_NODES.findIndex((n) => n.metadata.id === nodeId);
  if (index !== -1) {
    MOCK_NODES.splice(index, 1);
  }
  return Promise.resolve();
}

export async function getEdges(): Promise<GraphEdgesResponse> {
  return Promise.resolve({
    edges: MOCK_EDGES,
    total: MOCK_EDGES.length,
  });
}

export async function getEdge(edgeId: string): Promise<EdgeBase | null> {
  const edge = MOCK_EDGES.find((e) => e.id === edgeId);
  return Promise.resolve(edge ?? null);
}

export async function createEdge(edge: EdgeBase): Promise<EdgeBase> {
  const newEdge = { ...edge, id: edge.id || `edge-${Date.now()}` };
  MOCK_EDGES.push(newEdge);
  return Promise.resolve(newEdge);
}

export async function updateEdge(
  edgeId: string,
  updates: Partial<EdgeBase>,
): Promise<EdgeBase> {
  const index = MOCK_EDGES.findIndex((e) => e.id === edgeId);
  if (index === -1) {
    throw new Error("Edge not found");
  }
  const updated = { ...MOCK_EDGES[index], ...updates };
  MOCK_EDGES[index] = updated;
  return Promise.resolve(updated);
}

export async function deleteEdge(edgeId: string): Promise<void> {
  const index = MOCK_EDGES.findIndex((e) => e.id === edgeId);
  if (index !== -1) {
    MOCK_EDGES.splice(index, 1);
  }
  return Promise.resolve();
}
