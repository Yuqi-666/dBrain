import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import type { ViewId, View } from '@workspace/interfaces';
import { nodeTypes } from './components/nodes';
import { edgeTypes } from './components/edges';
import type { Node, Edge } from '@xyflow/react';

const initialNodes: Node[] = [
  { id: '1', type: 'circle', position: { x: 0, y: 0 }, data: { title: '1', semanticId: "t7kdkl63twbj3a1" } },
  { id: '2', type: 'circle', position: { x: 0, y: 100 }, data: { title: '2', semanticId: "t7kdkl63twbj3a1" } },
];
const initialEdges: Edge[] = [{ id: 'e1-2', type: 'flow', source: '1', sourceHandle: 'source', target: '2', targetHandle: 'target', data: { radial: true, direction: 'forward' } }];

export interface GraphProps {
  viewId?: ViewId;
  view?: View;
  theme?: 'light' | 'dark';
  enableMinimap?: boolean;
  enableGrid?: boolean;
  enableFisheye?: boolean;
  enableNodeDragging?: boolean;
  enableEdgeInteractions?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (graph: any) => void;
}

function GraphInner({
  viewId,
  view,
  theme = 'light',
  enableMinimap = true,
  enableGrid = true,
  className,
  style,
  onLoad,
}: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      />
      <svg
        style={{ position: 'absolute', width: 0, height: 0 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#91caff" />
          </marker>
          <marker
            id="arrowhead-start"
            markerWidth="6"
            markerHeight="6"
            refX="1"
            refY="3"
            orient="auto"
          >
            <polygon points="6 0, 0 3, 6 6" fill="#91caff" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
export function Graph(props: GraphProps) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}
