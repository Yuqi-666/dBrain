// packages/graph/src/transform.ts

import type {
  NodeId,
  EdgeId,
  NodeData,
  EdgeData,
  View,
  LayoutType,
  EdgeSemanticId,
} from '@workspace/interfaces';
import { filterByViewFilterConfig } from '@workspace/utils';
import type { RFNode, RFEdge, GraphNodeData, GraphEdgeData } from './types';

// ----------------------------------------------------------------------
// Domain → React Flow Node
// ----------------------------------------------------------------------
export function transformNodeToRF(
  node: NodeData,
  view?: View
): RFNode {
  const isCircularLayout = view?.layout === 'D3force' || view?.layout === 'radial';

  return {
    id: node.id,
    type: isCircularLayout ? 'circle' : getNodeType(node.nodeType),
    position: (node.stateData as any)?.position || { x: 0, y: 0 },
    data: {
      nodeType: node.nodeType,
      title: node.title,
      abstract: node.abstract,
      semanticId: node.semanticId,
      tags: node.tags,
      isPinned: node.isPinned,
      stateData: node.stateData,
      ...extractContentFields(node),
    },
    selected: false,
    dragging: false,
  };
}

// ----------------------------------------------------------------------
// Domain → React Flow Edge
// ----------------------------------------------------------------------
export function transformEdgeToRF(edge: EdgeData, view?: View): RFEdge {
  const isCircularLayout = view?.layout === 'D3force' || view?.layout === 'radial';

  return {
    id: edge.id,
    source: edge.from,
    target: edge.to,
    type: getEdgeType(edge.edgeType),
    data: {
      semanticId: edge.semanticId,
      direction: edge.direction,
      edgeType: edge.edgeType,
      weight: edge.weight,
      stateData: edge.stateData,
      radial: isCircularLayout,
    },
    selected: false,
    animated: false,
  };
}

// ----------------------------------------------------------------------
// Full transform (nodes + edges)
// ----------------------------------------------------------------------
export function transformToRFData(
  nodes: Map<NodeId, NodeData>,
  edges: Map<EdgeId, EdgeData>,
  view?: View
): { nodes: RFNode[]; edges: RFEdge[] } {
  const { filteredNodes, filteredEdges } = filterByViewFilterConfig(
    nodes,
    edges,
    view,
  );

  const rfNodes: RFNode[] = [];
  filteredNodes.forEach((node) => {
    rfNodes.push(transformNodeToRF(node, view));
  });

  const rfEdges: RFEdge[] = [];
  filteredEdges.forEach((edge) => {
    rfEdges.push(transformEdgeToRF(edge, view));
  });

  return { nodes: rfNodes, edges: rfEdges };
}

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------
function getNodeType(nodeType: string | undefined): string {
  switch (nodeType) {
    case 'text':
      return 'text';
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    case 'rich-text':
      return 'richText';
    case 'collection':
      return 'text';
    default:
      return 'text';
  }
}

function getEdgeType(edgeType: string): string {
  switch (edgeType) {
    case 'hierarchy':
      return 'hierarchy';
    case 'flow':
      return 'flow';
    case 'association':
      return 'association';
    case 'interaction':
      return 'interaction';
    default:
      return 'hierarchy';
  }
}

function extractContentFields(node: NodeData): Record<string, unknown> {
  const base: Record<string, unknown> = {};

  switch (node.nodeType) {
    case 'image': {
      const imgNode = node as any;
      base.imageUrl = imgNode.content?.url;
      base.width = imgNode.width;
      base.height = imgNode.height;
      break;
    }
    case 'video': {
      const vidNode = node as any;
      base.thumbnail = vidNode.content?.url;
      base.duration = (vidNode as any).duration;
      break;
    }
    case 'rich-text': {
      const rtNode = node as any;
      base.content = rtNode.content?.docs;
      break;
    }
    case 'text': {
      const textNode = node as any;
      base.content = textNode.content?.docs;
      break;
    }
  }

  return base;
}
