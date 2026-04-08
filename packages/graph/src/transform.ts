import type {
  NodeId,
  EdgeId,
  NodeData,
  EdgeData,
  NodeSemantic,
  EdgeSemantic,
  View,
} from "@workspace/interfaces";

import type {
  GraphData,
  NodeData as G6NodeData,
  EdgeData as G6EdgeData,
} from "@antv/g6";

export function filterByViewScope(
  nodes: Map<NodeId, NodeData>,
  edges: Map<EdgeId, EdgeData>,
  view?: View,
): {
  filteredNodes: Map<NodeId, NodeData>;
  filteredEdges: Map<EdgeId, EdgeData>;
} {
  if (!view || !view.scope) {
    return {
      filteredNodes: new Map(nodes),
      filteredEdges: new Map(edges),
    };
  }

  const filteredNodes = new Map<NodeId, NodeData>();

  if (view.scope.selectedNodeIds && view.scope.selectedNodeIds.length > 0) {
    const selectedSet = new Set(view.scope.selectedNodeIds);

    // Filter nodes by selectedNodeIds
    nodes.forEach((node, id) => {
      if (selectedSet.has(id)) {
        filteredNodes.set(id, node);
      }
    });

    // Filter edges where both from and to are in selected nodes
    const filteredEdges = new Map<EdgeId, EdgeData>();
    edges.forEach((edge, id) => {
      if (filteredNodes.has(edge.from) && filteredNodes.has(edge.to)) {
        filteredEdges.set(id, edge);
      }
    });

    return { filteredNodes, filteredEdges };
  }

  // TODO: Add filter config logic later
  // For now, return all nodes and edges when no selectedNodeIds
  return {
    filteredNodes: new Map(nodes),
    filteredEdges: new Map(edges),
  };
}
// TODO: 改造为对于不同布局，将源数据转换为不同形式的G6数据
// 如adaptNodesToD3Force、adaptNodesToFishbone
export function adaptNodesToG6(
  nodes: Map<NodeId, NodeData>,
): G6NodeData[] {
  const g6Nodes: G6NodeData[] = [];

  nodes.forEach((node) => {
    g6Nodes.push({
      id: node.id,
      nodeType: node.semanticId,
      title: node.title,
      abstract: node.abstract,
      semanticId: node.semanticId,
      tags: node.tags,
    });
  });

  return g6Nodes;
}

export function adaptEdgesToG6(
  edges: Map<EdgeId, EdgeData>,
): G6EdgeData[] {
  const g6Edges: G6EdgeData[] = [];

  edges.forEach((edge) => {
    g6Edges.push({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      semanticId: edge.semanticId,
      direction: "forward",
      name: edge.name,
      weight: edge.weight,
    });
  });

  return g6Edges;
}

export function transformToG6Data(
  nodes: Map<NodeId, NodeData>,
  edges: Map<EdgeId, EdgeData>,
  view?: View,
): GraphData {
  const { filteredNodes, filteredEdges } = filterByViewScope(
    nodes,
    edges,
    view,
  );
  const adaptedNodes = adaptNodesToG6(filteredNodes);
  const adaptedEdges = adaptEdgesToG6(filteredEdges);

  return {
    nodes: adaptedNodes,
    edges: adaptedEdges,
  };
}
