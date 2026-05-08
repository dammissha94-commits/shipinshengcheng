import type { ReactNode } from 'react';

type MetricTone = 'walnut' | 'jade' | 'terracotta';

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  unit: string;
  tone?: MetricTone;
}

const TONE_STYLES: Record<MetricTone, string> = {
  walnut: 'bg-[var(--surface-3)] text-[var(--walnut)]',
  jade: 'bg-[var(--success-light)] text-[var(--jade)]',
  terracotta: 'bg-[var(--warning-light)] text-[var(--terracotta)]',
};

/**
 * MetricCard — 首页顶部三连指标卡（家人数、已认领、三代谱）
 */
export default function MetricCard({ icon, label, value, unit, tone = 'walnut' }: MetricCardProps) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] px-4 py-4 shadow-warm-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-full ${TONE_STYLES[tone]}`}>
          {icon}
        </span>
        <div>
          <p className="text-[15px] text-[var(--ink-2)]">{label}</p>
          <p className="mt-1 font-serif text-[34px] leading-none text-[var(--ink-2)]">
            {value}
            <span className="ml-2 font-sans text-[13px] text-[var(--ink-3)]">{unit}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
