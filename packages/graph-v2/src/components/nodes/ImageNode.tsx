import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { graphStore } from '@workspace/store';
import { LIGHT_THEME } from '../../theme/theme';
import type { GraphNodeData } from '../../types';

interface ImageNodeProps {
  data: GraphNodeData;
  selected?: boolean;
}

export const ImageNode = memo(function ImageNode({ data, selected }: ImageNodeProps) {
  const [imageError, setImageError] = useState(false);
  const getNodeSemantic = graphStore.getState().getNodeSemantic;
  const theme = LIGHT_THEME;
  const nodeSemantic = getNodeSemantic(data.semanticId);

  const imageUrl = data.imageUrl || (data as any).thumbnail;
  const fallbackEmoji = '🖼️';

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        style={{
          width: 120,
          height: 80,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: nodeSemantic?.color || theme.nodeColor,
          borderRadius: '8px',
          overflow: 'hidden',
          border: selected ? '2px solid #FF7D00' : '2px solid transparent',
          boxShadow: selected ? '0 0 8px rgba(255, 125, 0, 0.3)' : 'none',
        }}
      >
        <div style={{ flex: 1, backgroundColor: theme.background }}>
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={data.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                opacity: 0.5,
              }}
            >
              {fallbackEmoji}
            </div>
          )}
        </div>
        <span
          style={{
            color: theme.labelColor,
            fontSize: '10px',
            textAlign: 'center',
            padding: '4px',
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
