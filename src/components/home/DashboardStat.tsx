import type { ReactNode } from 'react';

type StatTone = 'terracotta' | 'jade' | 'walnut';

interface DashboardStatProps {
  icon: ReactNode;
  label: string;
  value: number;
  unit: string;
  tone?: StatTone;
}

const TONE_TEXT: Record<StatTone, string> = {
  walnut: 'text-[var(--walnut-light)]',
  jade: 'text-[var(--jade)]',
  terracotta: 'text-[var(--terracotta)]',
};

/**
 * DashboardStat — 「家堂数据看板」面板内的小统计单元
 */
export default function DashboardStat({
  icon,
  label,
  value,
  unit,
  tone = 'terracotta',
}: DashboardStatProps) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--line-1)] bg-[var(--surface-1)] p-3">
      <p className={`flex items-center gap-1 text-[12px] ${TONE_TEXT[tone]}`}>
        {icon}
        {label}
      </p>
      <p className="mt-2 font-serif text-[28px] leading-none text-[var(--ink-2)]">
        {value}
        <span className="ml-1 font-sans text-[12px] text-[var(--ink-3)]">{unit}</span>
      </p>
    </div>
  );
}
