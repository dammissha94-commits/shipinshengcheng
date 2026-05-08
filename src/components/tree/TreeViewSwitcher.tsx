'use client';

import Link from 'next/link';
import { GitBranch, Network } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TreeViewSwitcherProps {
  /** 当前视图：'list' = 三代谱列表 / 'graph' = 关系图 */
  current: 'list' | 'graph';
  className?: string;
}

const VIEWS = [
  { value: 'list' as const, label: '三代谱', href: '/family/tree', icon: GitBranch },
  { value: 'graph' as const, label: '关系图', href: '/family/tree/graph', icon: Network },
];

/**
 * TreeViewSwitcher — 「三代谱 ↔ 关系图」segmented control
 *
 * 简单的两态切换器，放在 /family/tree 和 /family/tree/graph 顶部，
 * 让用户在两个视图之间无障碍切换。
 *
 * 设计：
 * - 暖色 surface-3 底 + 当前态 walnut 高亮
 * - 触控热区 ≥ 44px
 * - 用 Link 导航（自然支持浏览器后退/前进）
 */
export default function TreeViewSwitcher({ current, className }: TreeViewSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="家族关系视图"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-[var(--line-1)] bg-[var(--surface-1)] p-1 shadow-warm-xs',
        className
      )}
    >
      {VIEWS.map(({ value, label, href, icon: Icon }) => {
        const active = current === value;
        return (
          <Link
            key={value}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              'flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors',
              active
                ? 'bg-[var(--walnut)] text-white shadow-warm-sm'
                : 'text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-2)]'
            )}
          >
            <Icon size={15} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
