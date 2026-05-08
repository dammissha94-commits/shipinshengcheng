import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StatusVariant = 'default' | 'success' | 'warning' | 'muted' | 'danger';

interface StatusBadgeProps {
  /** Visual variant */
  variant?: StatusVariant;
  /** Badge content */
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  default: 'border border-[var(--surface-2)] bg-[var(--surface-3)] text-[var(--walnut-light)]',
  success: 'border border-[var(--surface-3)] bg-[var(--surface-3)] text-[var(--jade)]',
  warning: 'bg-amber-50 text-amber-700',
  muted: 'border border-[var(--line-1)] bg-[var(--surface-2)] text-[var(--ink-3)]',
  danger: 'bg-red-50 text-red-600',
};

/**
 * StatusBadge — a small inline label for status, category, or tag.
 * Consistent sizing and rounding across all use cases.
 */
export default function StatusBadge({
  variant = 'default',
  children,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
