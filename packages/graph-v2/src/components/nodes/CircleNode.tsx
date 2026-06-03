import { memo } from 'react';
import { useDataStore } from '@workspace/store';
import { LIGHT_THEME } from '../../theme/theme';
import type { GraphNodeData } from '../../types';
import { Handle } from '@xyflow/react';

interface CircleNodeProps {
  data: GraphNodeData;
  selected?: boolean;
}

// Simple circle node used for D3force and radial layouts
// These layouts don't render complex content — circles are just position markers
export const CircleNode = memo(function CircleNode({ data, selected }: CircleNodeProps) {
  const getNodeSemantic = useDataStore.getState().getNodeSemantic;
  const theme = LIGHT_THEME;
  const nodeSemantic = getNodeSemantic(data.semanticId);

  const backgroundColor = nodeSemantic?.color || theme.nodeColor;

  return (
    <>
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
      <Handle
        id="target"
        type="target" // 或 "source"，或两个都加
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'none',
          border: 'none',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <Handle
        id="source"
        type="source" // 或 "source"，或两个都加
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'none',
          border: 'none',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </>
  );
});
