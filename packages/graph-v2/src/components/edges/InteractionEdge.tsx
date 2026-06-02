import { memo } from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import type { GraphEdgeData, RFEdge } from '../../types';

const CIRCLE_RADIUS = 16;

export const InteractionEdge = memo(function InteractionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
}: EdgeProps<RFEdge>) {
  const edgeData = data as GraphEdgeData;
  const isRadial = edgeData.radial;

  let edgePath: string;
  if (isRadial) {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) {
      edgePath = '';
    } else {
      const ux = dx / dist;
      const uy = dy / dist;
      const sx = sourceX + ux * CIRCLE_RADIUS;
      const sy = sourceY + uy * CIRCLE_RADIUS;
      const tx = targetX - ux * CIRCLE_RADIUS;
      const ty = targetY - uy * CIRCLE_RADIUS;
      edgePath = `M ${sx} ${sy} L ${tx} ${ty}`;
    }
  } else {
    [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  }

  const strokeColor = selected ? '#FF7D00' : '#91caff';
  const strokeWidth = selected ? 3 : 2;
  const direction = edgeData.direction ?? 'forward';

  const showEndArrow = direction !== 'reverse' && direction !== 'undirected';
  const showStartArrow = direction !== 'forward' && direction !== 'undirected';

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: strokeColor,
        strokeWidth,
        filter: selected ? 'drop-shadow(0 0 4px rgba(255, 125, 0, 0.3))' : 'none',
      }}
      markerEnd={showEndArrow ? 'url(#arrowhead)' : undefined}
      markerStart={showStartArrow ? 'url(#arrowhead-start)' : undefined}
    />
  );
});
