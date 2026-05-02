import type { ReactNode } from 'react';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  rightElement?: ReactNode;
}

export default function SectionTitle({ title, subtitle, rightElement }: SectionTitleProps) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-gold/60" />
          <h2 className="truncate text-[16px] font-semibold tracking-[0.03em] text-charcoal">{title}</h2>
        </div>
        {subtitle && <p className="mt-1 ml-[15px] text-[13px] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {rightElement && <div className="shrink-0 text-[14px] font-medium text-gold">{rightElement}</div>}
    </div>
  );
}
