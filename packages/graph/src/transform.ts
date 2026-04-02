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
    filteredEdges.forEach((edge, id) => {
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

export function adaptNodesToG6(
  nodes: Map<NodeId, NodeData>,
  nodeSemantics: Map<string, NodeSemantic>,
): G6NodeData[] {
  const g6Nodes: G6NodeData[] = [];

  const defaultStyle = {
    fill: "#165DFF",
    stroke: "#fff",
    radius: 8,
  };

  nodes.forEach((node) => {
    const semantic = nodeSemantics.get(node.type);
    let style = { ...defaultStyle };

    if (semantic && semantic.color) {
      style.fill = semantic.color;
    }

    // Merge any custom style properties if they exist
    const semanticWithStyle = semantic as { style?: Record<string, any> };
    if (semanticWithStyle.style) {
      style = { ...style, ...semanticWithStyle.style };
    }

    g6Nodes.push({
      id: node.id,
      data: {
        originalId: node.id,
        nodeType: node.type,
        title: node.title,
        abstract: node.abstract,
        semanticType: node.type,
        tags: node.tags,
      },
      style,
    });
  });

  return g6Nodes;
}

export function adaptEdgesToG6(
  edges: Map<EdgeId, EdgeData>,
  edgeSemantics: Map<string, EdgeSemantic>,
): G6EdgeData[] {
  const g6Edges: G6EdgeData[] = [];

  const defaultStyle = {
    stroke: "#91caff",
    lineWidth: 2,
    endArrow: true,
  };

  edges.forEach((edge) => {
    const semantic = edgeSemantics.get(edge.type);
    let style = { ...defaultStyle };

    // Merge any custom style properties if they exist
    const semanticWithStyle = semantic as { style?: Record<string, any> };
    if (semanticWithStyle.style) {
      style = { ...style, ...semanticWithStyle.style };
    }

    g6Edges.push({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      data: {
        originalId: edge.id,
        edgeType: edge.type,
        direction: "forward",
        name: edge.name,
        weight: edge.weight,
      },
      style,
    });
  });

  return g6Edges;
}

export function transformToG6Data(
  nodes: Map<NodeId, NodeData>,
  edges: Map<EdgeId, EdgeData>,
  nodeSemantics: Map<string, NodeSemantic>,
  edgeSemantics: Map<string, EdgeSemantic>,
  view?: View,
): GraphData {
  const { filteredNodes, filteredEdges } = filterByViewScope(
    nodes,
    edges,
    view,
  );
  const adaptedNodes = adaptNodesToG6(filteredNodes, nodeSemantics);
  const adaptedEdges = adaptEdgesToG6(filteredEdges, edgeSemantics);

  return {
    nodes: adaptedNodes,
    edges: adaptedEdges,
  };
}
