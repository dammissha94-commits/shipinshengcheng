import { getDateMarkers, solarToLunar, type FestivalInfo } from '@/lib/date/lunar';

interface TodayCardProps {
  /** 主标题（一句话总结今日家庭节点）*/
  title: string;
  /** 副标题（行动提示） */
  hint?: string;
  /** 公历日期（默认今天）*/
  date?: Date;
}

const MARKER_TONE: Record<FestivalInfo['source'], string> = {
  lunar: 'bg-[var(--terracotta)] text-white',
  solarTerm: 'bg-[var(--jade)] text-white',
  solar: 'bg-[var(--gold)] text-[var(--ink-1)]',
};

/**
 * TodayCard — 「今日家庭节点」单卡
 * 左：当日农历（真实计算 1900-2050）
 * 中：标题 + 提示 + 节气/节日徽标
 * 右：装饰光斑
 */
export default function TodayCard({ title, hint, date }: TodayCardProps) {
  const today = date ?? new Date();
  const lunar = solarToLunar(today);
  const markers = getDateMarkers(today);

  return (
    <div className="flex min-h-[68px] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--line-1)] bg-[var(--surface-2)]">
      <div className="flex w-[84px] shrink-0 items-center justify-center border-r border-[var(--line-1)]">
        <span className="rounded-lg border border-[var(--line-1)] bg-[var(--surface-1)] px-2 py-2 text-center leading-tight text-[var(--gold)]">
          <span className="block text-[11px] font-medium tracking-[0.16em]">农历</span>
          <span className="block font-serif text-[15px] font-bold">{lunar.monthLabel}</span>
          <span className="block font-serif text-[15px] font-bold">{lunar.dayLabel}</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center px-4 py-2">
        <p className="truncate text-[16px] font-bold text-[var(--ink-2)]">{title}</p>
        {hint && <p className="mt-1 text-[13px] text-[var(--ink-3)]">{hint}</p>}
        {markers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {markers.map((m) => (
              <span
                key={`${m.source}-${m.name}`}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${MARKER_TONE[m.source]}`}
              >
                {m.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div
        aria-hidden
        className="w-[80px] shrink-0 bg-[radial-gradient(circle_at_58%_44%,rgba(194,105,70,0.30),transparent_18%),radial-gradient(circle_at_74%_70%,rgba(111,138,121,0.22),transparent_28%)]"
      />
    </div>
  );
}
