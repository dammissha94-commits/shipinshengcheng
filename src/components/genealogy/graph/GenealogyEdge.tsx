/* Adapted from pure-genealogy under MIT License (https://github.com/yunfengsa/pure-genealogy). */

'use client';

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, getStraightPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

interface GenealogyEdgeData extends Record<string, unknown> {
  relationType: string;
  label: string;
  isSameLevel?: boolean;
  highlightState?: 'normal' | 'connected' | 'dimmed';
}

export function GenealogyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
  markerEnd,
}: EdgeProps) {
  const edgeData = (data ?? {}) as GenealogyEdgeData;
  const isSameLevel = Boolean(edgeData.isSameLevel);
  const isDimmed = edgeData.highlightState === 'dimmed';
  const isConnected = edgeData.highlightState === 'connected';

  const [edgePath, labelX, labelY] = isSameLevel
    ? getStraightPath({ sourceX, sourceY, targetX, targetY })
    : getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 12,
      });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {edgeData.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            className={[
              'pointer-events-none rounded-full border px-1.5 py-0.5 text-[10px] shadow-sm',
              isConnected
                ? 'border-gold bg-gold/15 text-pine'
                : isDimmed
                  ? 'border-sand bg-cream/60 text-muted/40'
                  : 'border-sand bg-cream/95 text-muted',
            ].join(' ')}
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
