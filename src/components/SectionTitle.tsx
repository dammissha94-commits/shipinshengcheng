import type { ReactNode } from 'react';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  rightElement?: ReactNode;
}

export default function SectionTitle({ title, subtitle, rightElement }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h2 className="text-base font-semibold text-charcoal tracking-wide">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      {rightElement && (
        <div className="text-sm text-gold font-medium">{rightElement}</div>
      )}
    </div>
  );
}
