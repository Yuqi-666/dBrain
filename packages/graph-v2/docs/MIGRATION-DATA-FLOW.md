# Module 2: Data Flow & Transform

**Parent Document:** [MIGRATION-OVERVIEW.md](./MIGRATION-OVERVIEW.md)

---

## 1. Data Flow Redesign

### Current G6 Data Flow

```
useDataStore (domain data)
    ↓ latestMutations queue
graph.tsx: processMutations()
    ↓ graph.addNodeData() / graph.updateNodeData() / graph.removeNodeData()
G6 Graph (imperative)
    ↓ graph.on() events
useGraphUIStore (selection, context menu, preview)
```

### New React Flow Data Flow

```
useDataStore (domain data)
    ↓ latestMutations queue
graph.tsx: applyMutationToRFState()
    ↓ setNodes() / setEdges() (controlled state)
React Flow (managed internal state)
    ↓ onNodesChange / onEdgesChange
graph.tsx: handleNodesChange() / handleEdgesChange()
    ↓ dispatch actions
useGraphUIStore (selection, context menu, preview)
    ↓ (read domain data via getState())
useDataStore (sync back node positions after layout)
```

---

## 2. TypeScript Interfaces

```typescript
// packages/graph/src/types.ts

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
export interface GraphNodeData {
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

export interface GraphEdgeData {
  semanticId: EdgeSemanticId;
  direction: EdgeDirection;
  edgeType: EdgeType;
  weight?: EdgeWeight;
  stateData?: Record<string, unknown>;
}

// React Flow types with domain data
export type RFNode = Node<GraphNodeData>;
export type RFEdge = Edge<GraphEdgeData>;

// Node change with domain sync
export type GraphNodeChange =
  | { type: 'position'; id: string; position: { x: number; y: number }; delta?: { x: number; y: number } }
  | { type: 'dimension'; id: string; dimensions: { width: number; height: number } }
  | { type: 'select'; id: string; selected: boolean }
  | { type: 'remove'; id: string }
  | { type: 'add'; item: RFNode }
  | { type: 'replace'; item: RFNode };

// Mutation types from useDataStore
export type GraphMutation =
  | { type: 'upsertNode'; payload: NodeData }
  | { type: 'deleteNode'; payload: { id: NodeId } }
  | { type: 'upsertEdge'; payload: EdgeData }
  | { type: 'deleteEdge'; payload: { id: EdgeId } }
  | { type: 'upsertView'; payload: View }
  | { type: 'deleteView'; payload: { id: ViewId } };
```

---

## 3. Transform Module

```typescript
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
  _view?: View
): RFNode {
  return {
    id: node.id,
    type: getNodeType(node.nodeType),
    position: (node.stateData as any)?.position || { x: 0, y: 0 },
    data: {
      nodeType: node.nodeType,
      title: node.title,
      abstract: node.abstract,
      semanticId: node.semanticId,
      tags: node.tags,
      isPinned: node.isPinned,
      stateData: node.stateData,
      // Content fields by type
      ...extractContentFields(node),
    },
    selected: false,
    dragging: false,
  };
}

// ----------------------------------------------------------------------
// Domain → React Flow Edge
// ----------------------------------------------------------------------
export function transformEdgeToRF(edge: EdgeData): RFEdge {
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
    rfEdges.push(transformEdgeToRF(edge));
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
```
