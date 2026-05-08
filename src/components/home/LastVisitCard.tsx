import Link from 'next/link';
import { BookOpenText, ChevronRight } from 'lucide-react';
import type { FamilyStory } from '@/types/domain';

interface LastVisitCardProps {
  /** 最近一段 active 故事（按 created_at 降序排序后取首条） */
  latestStory: FamilyStory | null;
}

/**
 * LastVisitCard — 「上次看到 / 继续阅读」轻量入口
 *
 * 简化策略（不引入新表）：
 * - 直接以"最近一篇 active 故事"作为继续阅读目标
 * - 无故事时不渲染（return null）
 * - 高度 ≤ 80px，不抢主操作焦点
 */
export default function LastVisitCard({ latestStory }: LastVisitCardProps) {
  if (!latestStory) return null;

  const yearLabel = latestStory.story_year ? `${latestStory.story_year} 年` : '岁月里';
  const href = `/family/stories/read?index=0`;

  return (
    <Link
      href={href}
      className="flex min-h-[68px] items-center gap-3 rounded-[var(--radius-md)] border border-[var(--line-1)] bg-[var(--surface-1)] px-4 py-3 shadow-warm-xs transition active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-3)] text-[var(--gold)]">
        <BookOpenText size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--ink-3)]">
          继续阅读
        </p>
        <p className="mt-0.5 line-clamp-1 text-[15px] font-semibold text-[var(--ink-1)]">
          {latestStory.title}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[12px] text-[var(--ink-3)]">{yearLabel}</p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-[var(--ink-3)]" />
    </Link>
  );
}
