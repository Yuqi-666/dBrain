import { memo } from 'react';
import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react';
import type { GraphEdgeData, RFEdge } from '../../types';

export const AssociationEdge = memo(function AssociationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
}: EdgeProps<RFEdge>) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const strokeColor = selected ? '#FF7D00' : '#91caff';
  const strokeWidth = selected ? 3 : 2;
  const direction = (data as GraphEdgeData)?.direction ?? 'undirected';

  const showEndArrow = direction === 'bidirectional';
  const showStartArrow = direction === 'bidirectional';

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: strokeColor,
        strokeWidth,
        strokeDasharray: '6, 4',
        filter: selected ? 'drop-shadow(0 0 4px rgba(255, 125, 0, 0.3))' : 'none',
      }}
      markerEnd={showEndArrow ? 'url(#arrowhead)' : undefined}
      markerStart={showStartArrow ? 'url(#arrowhead-start)' : undefined}
    />
  );
});
