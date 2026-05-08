import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  /** Card title */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Optional action in the header row (button / link) */
  action?: ReactNode;
  /** Card body content */
  children: ReactNode;
  className?: string;
}

/**
 * SectionCard — a titled content card used to group related UI elements.
 * Consistent border, shadow, and spacing across all pages.
 */
export default function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-[var(--line-1)] bg-white shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[var(--surface-2)] px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--ink-1)] sm:text-lg">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-sm text-[var(--ink-3)]">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* Body */}
      <div className="px-5 py-4 sm:px-6 sm:py-5">{children}</div>
    </section>
  );
}
