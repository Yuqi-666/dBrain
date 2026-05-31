import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { graphStore } from '@workspace/store';
import { LIGHT_THEME } from '../../theme/theme';
import type { GraphNodeData } from '../../types';

interface RichTextNodeProps {
  data: GraphNodeData;
  selected?: boolean;
}

export const RichTextNode = memo(function RichTextNode({ data, selected }: RichTextNodeProps) {
  const getNodeSemantic = graphStore.getState().getNodeSemantic;
  const theme = LIGHT_THEME;
  const nodeSemantic = getNodeSemantic(data.semanticId);

  const content = (data as any).content || (data as any).richText || '';

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        style={{
          width: 120,
          height: 60,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: nodeSemantic?.color || theme.nodeColor,
          borderRadius: '8px',
          padding: '8px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          border: selected ? '2px solid #FF7D00' : '2px solid transparent',
          boxShadow: selected ? '0 0 8px rgba(255, 125, 0, 0.3)' : 'none',
        }}
      >
        <div
          style={{
            flex: 1,
            color: theme.labelColor,
            fontSize: '12px',
            lineHeight: '1.4',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {content}
        </div>
        <span
          style={{
            color: theme.labelColor,
            fontSize: '10px',
            textAlign: 'center',
            opacity: 0.7,
            marginTop: '4px',
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
