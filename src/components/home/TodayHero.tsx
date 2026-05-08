'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { solarToLunar, type FestivalInfo } from '@/lib/date/lunar';
import type { FocusItem, TodayFocus } from '@/lib/home/today-focus';

interface TodayHeroProps {
  focus: TodayFocus;
  /** 用于底部统计行 */
  totalMembers: number;
  claimedMembers: number;
  /** 公历日期（默认今天） */
  date?: Date;
  /** 用户邮箱回退 — 当 selfName 缺失时使用 */
  userFallbackName?: string;
}

const MARKER_TONE: Record<FestivalInfo['source'], string> = {
  lunar: 'bg-[var(--terracotta)] text-white',
  solarTerm: 'bg-[var(--jade)] text-white',
  solar: 'bg-[var(--gold)] text-[var(--ink-1)]',
};

const FOCUS_CHIP_LABEL: Record<FocusItem['type'], string> = {
  'birthday-today':    '🎂 今日生日',
  'birthday-upcoming': '🎂 即将生日',
  'event-today':       '📅 今日节点',
  'event-upcoming':    '📅 即将到来',
  'festival':          '🏮 传统节日',
  'solarTerm':         '🌿 节气',
  'solarHoliday':      '🎉 公历节日',
  'progress':          '🌱 小进度',
};

/**
 * TodayHero — 数字家堂首页"今日"主卡（重构版）
 *
 * 设计原则：
 * - 单层卡，不再 card-in-card
 * - 顶行：问候 + 自报家门
 * - 中行：日期（公历 + 农历）+ 节气节日徽标（横向并列）
 * - 主行：今日聚焦（来自 today-focus.ts，可点击）
 * - 末行：薄统计条「家人 N 位 · 已认领 X 位」（合并 MetricCard ×3 信息）
 *
 * 不再用「{姓}老早」这种方言式称谓，也不再有"今天是个好日子"的兜底套话。
 */
export default function TodayHero({
  focus,
  totalMembers,
  claimedMembers,
  date,
  userFallbackName,
}: TodayHeroProps) {
  const today = date ?? new Date();
  const lunar = solarToLunar(today);
  const dateLabel = `${today.getMonth() + 1}月${today.getDate()}日`;

  const callTo = focus.selfName ?? userFallbackName ?? '家人';
  const chipLabel = FOCUS_CHIP_LABEL[focus.primary.type];

  return (
    <section className="relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--surface-3)] to-[var(--surface-2)] p-5 shadow-warm-sm">
      {/* 暖光斑 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-[var(--gold-light)]/22"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-[var(--jade)]/12"
      />

      {/* 1. 问候 */}
      <header className="relative">
        <p className="font-serif text-[20px] font-bold tracking-[0.04em] text-[var(--ink-2)]">
          {focus.greeting}，<span className="text-[var(--ink-1)]">{callTo}</span>
        </p>

        {/* 2. 日期 + 节气节日徽标 */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-[var(--ink-3)]">
            {dateLabel} · 农历{lunar.monthLabel}{lunar.dayLabel}
          </span>
          {focus.markers.slice(0, 2).map((mk) => (
            <span
              key={`${mk.source}-${mk.name}`}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${MARKER_TONE[mk.source]}`}
            >
              {mk.name}
            </span>
          ))}
        </div>
      </header>

      {/* 3. 主聚焦 — 可点击 */}
      <FocusRow item={focus.primary} chipLabel={chipLabel} />

      {/* 4. 统计薄条 */}
      <div className="relative mt-4 flex items-center justify-between border-t border-[var(--line-1)]/70 pt-3 text-[12px] text-[var(--ink-3)]">
        <span>
          家堂里 <span className="font-semibold text-[var(--ink-2)]">{totalMembers}</span> 位家人
          {totalMembers > 0 && (
            <>
              {' '}·{' '}
              <span className="font-semibold text-[var(--ink-2)]">{claimedMembers}</span> 位已认领
            </>
          )}
        </span>
        {focus.secondary.length > 0 && (
          <span className="text-[var(--ink-3)]">还有 {focus.secondary.length} 件待办</span>
        )}
      </div>
    </section>
  );
}

function FocusRow({ item, chipLabel }: { item: FocusItem; chipLabel: string }) {
  const Inner = (
    <div className="relative mt-4 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--line-1)] bg-[var(--surface-1)] px-4 py-3 shadow-warm-xs">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--ink-3)]">
          {chipLabel}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[16px] font-bold text-[var(--ink-1)]">
          {item.title}
        </p>
        {item.subtitle && (
          <p className="mt-0.5 line-clamp-1 text-[12px] text-[var(--ink-3)]">{item.subtitle}</p>
        )}
      </div>
      {item.href && (
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-3)] text-[var(--walnut)]"
        >
          <ChevronRight size={18} />
        </span>
      )}
    </div>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="block transition active:scale-[0.99]"
        aria-label={item.title}
      >
        {Inner}
      </Link>
    );
  }
  return Inner;
}
