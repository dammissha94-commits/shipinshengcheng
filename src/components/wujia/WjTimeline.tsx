'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * WjTimeline — 通用时间线组件
 *
 * 用法：
 *  <WjTimeline>
 *    <WjTimeline.Item tone="gold" title="出生" meta="2024年" />
 *    <WjTimeline.Item tone="jade" title="考上大学" meta="2002年" />
 *  </WjTimeline>
 */

// ─── tone → dot colour ───────────────────────────────────────────────
const TONE_DOT: Record<string, string> = {
  gold:       'bg-[var(--gold)]',
  'gold-light': 'bg-[var(--gold-light)]',
  terracotta: 'bg-[var(--terracotta)]',
  jade:       'bg-[var(--jade)]',
  walnut:     'bg-[var(--walnut)]',
};

// ─── Timeline root ────────────────────────────────────────────────
interface WjTimelineProps {
  children: ReactNode;
  /** 是否显示左侧竖线（默认 true） */
  showLine?: boolean;
  className?: string;
}

function WjTimeline({ children, showLine = true, className }: WjTimelineProps) {
  return (
    <div className={cn('relative', className)}>
      {showLine && (
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[var(--line-1)]" />
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ─── Timeline.Item ─────────────────────────────────────────────
interface ItemProps {
  tone?: 'gold' | 'gold-light' | 'terracotta' | 'jade' | 'walnut';
  icon?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** 分组标签，设置后在该项上方显示分组标题（小圆点 + 标签） */
  groupLabel?: string;
  /** 分组小圆点的颜色类，默认 bg-amber-500，可传 bg-amber-300 / bg-[var(--line-2)] 等 */
  groupDotClass?: string;
}

function Item({ tone = 'gold', icon, title, meta, children, className, groupLabel, groupDotClass }: ItemProps) {
  const dotCls = TONE_DOT[tone] ?? TONE_DOT.gold;

  return (
    <div className={cn('relative flex gap-3 sm:gap-4', className)}>
      {groupLabel && (
        <div className="relative flex items-center gap-3 mb-2.5 pl-2 w-full">
          <div className={`relative z-10 flex h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white ${groupDotClass ?? 'bg-amber-500'}`} />
          <span className="text-xs font-semibold text-[var(--ink-3)] tracking-wide">{groupLabel}</span>
        </div>
      )}
      {/* Dot */}
      <div
        className={`relative z-10 mt-1.5 flex h-[10px] w-[10px] shrink-0 items-center justify-center rounded-full border-2 border-white ${dotCls}`}
      >
        {icon && <span className="-ml-px text-[10px] text-white/90">{icon}</span>}
      </div>

      {/* Content */}
      <div className="flex-1 pb-2 sm:pb-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[14px] font-medium leading-snug text-[var(--ink-1)]">{title}</span>
          {meta && (
            <span className="shrink-0 text-[12px] text-[var(--ink-3)]">{meta}</span>
          )}
        </div>
        {children && (
          <div className="mt-1 text-[13px] leading-6 text-[var(--ink-2)]">{children}</div>
        )}
      </div>
    </div>
  );
}

WjTimeline.Item = Item;
export default WjTimeline;
