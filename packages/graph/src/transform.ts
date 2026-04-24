import type {
  NodeId,
  EdgeId,
  NodeData,
  EdgeData,
  View,
  EdgeSemanticId,
  LayoutType,
} from "@workspace/interfaces";

import { treeToGraphData } from "@antv/g6";
import { filterByViewFilterConfig } from "@workspace/utils";
import type {
  GraphData,
  NodeData as G6NodeData,
  EdgeData as G6EdgeData,
  TreeData as G6TreeData,
} from "@antv/g6";

const DEBUG_PREFIX = "[Transform]";

function debugLog(component: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : "";
  console.log(`${DEBUG_PREFIX}[${timestamp}][${component}] ${message}${dataStr}`);
}

export function adaptNodesToG6(nodes: Map<NodeId, NodeData>): G6NodeData[] {
  debugLog("adaptNodesToG6", "Adapting nodes to G6 format", { count: nodes.size });
  const g6Nodes: G6NodeData[] = [];

  nodes.forEach((node) => {
    g6Nodes.push({
      id: node.id,
      nodeType: node.nodeType,
      title: node.title,
      abstract: node.abstract,
      semanticId: node.semanticId,
      tags: node.tags,
      isPinned: node.isPinned || false,
      stateData: node.stateData,
    });
  });

  debugLog("adaptNodesToG6", "Nodes adapted", { count: g6Nodes.length });
  return g6Nodes;
}

export function adaptEdgesToG6(edges: Map<EdgeId, EdgeData>): G6EdgeData[] {
  debugLog("adaptEdgesToG6", "Adapting edges to G6 format", { count: edges.size });
  const g6Edges: G6EdgeData[] = [];

  edges.forEach((edge) => {
    g6Edges.push({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      semanticId: edge.semanticId,
      direction: edge.direction,
      data: {
        weight: edge.weight,
        stateData: edge.stateData,
      },
      edgeType: edge.edgeType,
      weight: edge.weight,
      stateData: edge.stateData,
    });
  });

  debugLog("adaptEdgesToG6", "Edges adapted", { count: g6Edges.length });
  return g6Edges;
}

export function adaptNodesToTree(
  nodes: Map<NodeId, NodeData>,
  edges: Map<EdgeId, EdgeData>,
  edgeSemanticId?: EdgeSemanticId,
): G6TreeData {
  // 1. Build adjacency map (parent -> children)
  const parentToChildren = new Map<NodeId, NodeId[]>();
  const childToParent = new Map<NodeId, NodeId>();

  edges.forEach((edge) => {
    // Use edgeSemanticId if specified, otherwise use category === 'hierarchy'
    const isHierarchyEdge = edgeSemanticId
      ? edge.semanticId === edgeSemanticId
      : edge.edgeType === "hierarchy";

    if (isHierarchyEdge) {
      const parent = edge.from;
      const child = edge.to;

      if (!parentToChildren.has(parent)) {
        parentToChildren.set(parent, []);
      }
      parentToChildren.get(parent)!.push(child);
      childToParent.set(child, parent);
    }
  });

  // 2. Identify root nodes (no incoming hierarchy edges)
  const roots: NodeId[] = [];
  nodes.forEach((_, nodeId) => {
    if (!childToParent.has(nodeId)) {
      roots.push(nodeId);
    }
  });

  // Handle case with no roots (cycle or all nodes have parents)
  if (roots.length === 0 && nodes.size > 0) {
    // Use first node as root, mark others as visited to avoid cycle
    const firstNodeId = nodes.keys().next().value;
    if (firstNodeId) roots.push(firstNodeId);
  }

  // 3. Build tree using DFS
  const buildTree = (nodeId: NodeId, path: Set<NodeId>): G6TreeData | null => {
    // Cycle detection
    if (path.has(nodeId)) {
      console.warn(`Cycle detected at node ${nodeId}, breaking cycle`);
      return null;
    }

    const node = nodes.get(nodeId);
    if (!node) return null;

    const children = parentToChildren.get(nodeId) || [];
    const treeData: G6TreeData = {
      id: node.id,
      nodeType: node.nodeType,
      title: node.title,
      semanticId: node.semanticId,
      tags: node.tags,
      stateData: node.stateData,
    };

    if (children.length > 0) {
      const newPath = new Set(path);
      newPath.add(nodeId);

      const childTrees = children
        .map((childId) => buildTree(childId, newPath))
        .filter((t): t is G6TreeData => t !== null);

      if (childTrees.length > 0) {
        treeData.children = childTrees;
      }
    }

    return treeData;
  };

  // 4. Return first root tree (or create artificial root for multiple roots)
  if (roots.length === 0) {
    throw new Error("No root nodes found in tree conversion");
  }

  // Multiple roots: create artificial root node
  if (roots.length > 1) {
    return {
      id: "virtual-root",
      children: roots
        .map((rootId) => buildTree(rootId, new Set()))
        .filter((t): t is G6TreeData => t !== null),
    };
  }

  // Single root
  const rootTree = buildTree(roots[0]!, new Set());
  if (!rootTree) {
    throw new Error("Failed to build tree from root node");
  }

  return rootTree;
}

export function transformToG6Data(
  nodes: Map<NodeId, NodeData>,
  edges: Map<EdgeId, EdgeData>,
  view?: View,
  layoutType?: LayoutType,
): GraphData {
  debugLog("transformToG6Data", "Transforming data to G6 format", { nodeCount: nodes.size, edgeCount: edges.size, layoutType, viewId: view?.id });
  const { filteredNodes, filteredEdges } = filterByViewFilterConfig(
    nodes,
    edges,
    view,
  );

  debugLog("transformToG6Data", "After filtering", { filteredNodeCount: filteredNodes.size, filteredEdgeCount: filteredEdges.size });

  const treeLayouts: LayoutType[] = ["compactBox", "fishbone", "mindmap"];
  const isTreeLayout = layoutType && treeLayouts.includes(layoutType);

  if (isTreeLayout) {
    debugLog("transformToG6Data", "Using tree layout", { layoutType });
    const treeData = adaptNodesToTree(filteredNodes, filteredEdges);
    const result = treeToGraphData(treeData);
    debugLog("transformToG6Data", "Tree layout transform complete", { nodes: result.nodes?.length, edges: result.edges?.length });
    return result;
  } else {
    debugLog("transformToG6Data", "Using graph layout", { layoutType });
    const adaptedNodes = adaptNodesToG6(filteredNodes);
    const adaptedEdges = adaptEdgesToG6(filteredEdges);

    debugLog("transformToG6Data", "Graph layout transform complete", { nodes: adaptedNodes.length, edges: adaptedEdges.length });
    return {
      nodes: adaptedNodes,
      edges: adaptedEdges,
    };
  }
}
