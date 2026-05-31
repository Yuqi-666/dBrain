import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { graphStore } from '@workspace/store';
import { LIGHT_THEME } from '../../theme/theme';
import type { GraphNodeData } from '../../types';

interface CircleNodeProps {
  data: GraphNodeData;
  selected?: boolean;
}

// Simple circle node used for D3force and radial layouts
// These layouts don't render complex content — circles are just position markers
export const CircleNode = memo(function CircleNode({ data, selected }: CircleNodeProps) {
  const getNodeSemantic = graphStore.getState().getNodeSemantic;
  const theme = LIGHT_THEME;
  const nodeSemantic = getNodeSemantic(data.semanticId);

  const backgroundColor = nodeSemantic?.color || theme.nodeColor;

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor,
          border: selected ? '2px solid #FF7D00' : '2px solid transparent',
          boxShadow: selected ? '0 0 8px rgba(255, 125, 0, 0.3)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={data.title}
      />
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});
