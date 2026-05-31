import type { Node, Edge } from '@xyflow/react';
import type {
  NodeData,
  EdgeData,
  NodeId,
  EdgeId,
  View,
  ViewId,
  LayoutType,
  NodeSemanticId,
  EdgeSemanticId,
  EdgeDirection,
  EdgeType,
  EdgeWeight,
} from '@workspace/interfaces';

// Domain-specific node data for React Flow
export interface GraphNodeData extends Record<string, unknown> {
  nodeType: NodeData['nodeType'];
  title: string;
  abstract?: string;
  semanticId: NodeSemanticId;
  tags?: string[];
  isPinned?: boolean;
  stateData?: Record<string, unknown>;
  // Node-type-specific content fields
  content?: Record<string, unknown>;
  width?: number;
  height?: number;
  imageUrl?: string;
  thumbnail?: string;
  duration?: number;
}

export interface GraphEdgeData extends Record<string, unknown> {
  semanticId: EdgeSemanticId;
  direction: EdgeDirection;
  edgeType: EdgeType;
  weight?: EdgeWeight;
  stateData?: Record<string, unknown>;
}

// React Flow types with domain data
export type RFNode = Node<GraphNodeData>;
export type RFEdge = Edge<GraphEdgeData>;

// Mutation types from graphStore
export type GraphMutation =
  | { type: 'upsertNode'; payload: NodeData }
  | { type: 'deleteNode'; payload: { id: NodeId } }
  | { type: 'upsertEdge'; payload: EdgeData }
  | { type: 'deleteEdge'; payload: { id: EdgeId } }
  | { type: 'upsertView'; payload: View }
  | { type: 'deleteView'; payload: { id: ViewId } };
