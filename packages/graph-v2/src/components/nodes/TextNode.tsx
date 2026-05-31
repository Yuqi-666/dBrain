import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { graphStore } from '@workspace/store';
import { LIGHT_THEME } from '../../theme/theme';
import type { GraphNodeData } from '../../types';

interface TextNodeProps {
  data: GraphNodeData;
  selected?: boolean;
}

export const TextNode = memo(function TextNode({ data, selected }: TextNodeProps) {
  const getNodeSemantic = graphStore.getState().getNodeSemantic;
  const theme = LIGHT_THEME;
  const nodeSemantic = getNodeSemantic(data.semanticId);

  const backgroundColor = nodeSemantic?.color || theme.nodeColor;

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor,
          borderRadius: '8px',
          padding: '8px',
          boxSizing: 'border-box',
          border: selected ? '2px solid #FF7D00' : '2px solid transparent',
          boxShadow: selected ? '0 0 8px rgba(255, 125, 0, 0.3)' : 'none',
        }}
      >
        <span
          style={{
            color: theme.labelColor,
            fontSize: '14px',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.title}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});
