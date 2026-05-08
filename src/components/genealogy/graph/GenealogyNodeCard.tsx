/* Adapted from pure-genealogy under MIT License (https://github.com/yunfengsa/pure-genealogy). */

'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { GenealogyGraphNode } from '@/lib/genealogy/graph-types';

type GenealogyNodeData = GenealogyGraphNode & { [key: string]: unknown };

function formatYearLabel(node: GenealogyGraphNode): string | null {
  if (!node.birthYear && !node.deathYear) return null;
  if (node.birthYear && node.deathYear) return `${node.birthYear} - ${node.deathYear}`;
  if (node.birthYear) return `${node.birthYear} 至今`;
  return `- ${node.deathYear}`;
}

function GenealogyNodeCardComponent({ data }: NodeProps) {
  const node = data as unknown as GenealogyNodeData;
  const isClaimed = node.claimStatus === 'claimed';
  const isDeceased = node.livingStatus === 'deceased';
  const yearLabel = formatYearLabel(node);
  const initial = node.label.charAt(0) || '家';
  const highlightState = node.highlightState ?? 'normal';

  return (
    <div
      className={cn(
        'relative w-[168px] rounded-2xl border bg-card px-3 py-2.5 shadow-sm transition-all duration-200',
        'cursor-pointer hover:shadow-md',
        isClaimed ? 'border-pine/40' : 'border-gold/40',
        isDeceased && 'opacity-90',
        highlightState === 'selected' && 'scale-[1.04] border-pine bg-pine/5 shadow-lg shadow-pine/15',
        highlightState === 'connected' && 'border-gold bg-gold/5 shadow-md',
        highlightState === 'dimmed' && 'opacity-25'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="!h-2 !w-2 !border !border-pine/40 !bg-cream"
      />
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
            isClaimed ? 'bg-pine text-cream' : 'bg-sand text-pine',
            highlightState === 'selected' && 'ring-2 ring-gold/70',
            highlightState === 'connected' && 'ring-2 ring-gold/40'
          )}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-charcoal" title={node.label}>
            {node.label}
          </p>
          {node.relationHint && <p className="mt-0.5 text-[11px] text-muted">{node.relationHint}</p>}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span
          className={cn(
            'rounded-full px-2 py-0.5',
            isClaimed
              ? 'bg-pine/10 text-pine'
              : node.claimStatus === 'disputed'
                ? 'bg-red-500/10 text-red-600'
                : 'bg-gold/10 text-gold'
          )}
        >
          {node.claimStatusLabel}
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5',
            isDeceased ? 'bg-charcoal/10 text-charcoal/80' : 'bg-pine/5 text-pine/80'
          )}
        >
          {node.livingStatusLabel}
        </span>
        {yearLabel && <span className="rounded-full bg-cream px-2 py-0.5 text-muted">{yearLabel}</span>}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted/80">
        <span>点击高亮亲属关系</span>
        <Link
          href={`/family/members/${node.id}`}
          onClick={(event) => event.stopPropagation()}
          className="shrink-0 font-medium text-pine min-h-[44px] inline-flex items-center"
        >
          查看档案
        </Link>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="!h-2 !w-2 !border !border-pine/40 !bg-cream"
      />
    </div>
  );
}

export const GenealogyNodeCard = memo(GenealogyNodeCardComponent);
