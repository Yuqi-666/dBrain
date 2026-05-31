import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { graphStore } from '@workspace/store';
import { LIGHT_THEME } from '../../theme/theme';
import type { GraphNodeData } from '../../types';

interface VideoNodeProps {
  data: GraphNodeData;
  selected?: boolean;
}

export const VideoNode = memo(function VideoNode({ data, selected }: VideoNodeProps) {
  const [imageError, setImageError] = useState(false);
  const getNodeSemantic = graphStore.getState().getNodeSemantic;
  const theme = LIGHT_THEME;
  const nodeSemantic = getNodeSemantic(data.semanticId);

  const thumbnailUrl = data.thumbnail || (data as any).poster;
  const duration = data.duration;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        style={{
          width: 120,
          height: 90,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: nodeSemantic?.color || theme.nodeColor,
          borderRadius: '8px',
          overflow: 'hidden',
          border: selected ? '2px solid #FF7D00' : '2px solid transparent',
          boxShadow: selected ? '0 0 8px rgba(255, 125, 0, 0.3)' : 'none',
        }}
      >
        <div style={{ position: 'relative', flex: 1, backgroundColor: theme.background }}>
          {thumbnailUrl && !imageError ? (
            <img
              src={thumbnailUrl}
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
              🎬
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: '#fff',
            }}
          >
            ▶
          </div>
          {duration && (
            <span
              style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: '#fff',
                fontSize: '10px',
                padding: '2px 4px',
                borderRadius: 2,
              }}
            >
              {formatDuration(duration)}
            </span>
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
