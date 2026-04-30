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
        <h2 className="truncate text-base font-semibold tracking-wide text-charcoal">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {rightElement && <div className="shrink-0 text-sm font-medium text-gold">{rightElement}</div>}
    </div>
  );
}
