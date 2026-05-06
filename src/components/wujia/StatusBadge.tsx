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
  default: 'bg-#F0E6D5 text-#8D6E63',
  success: 'bg-#F0E6D5 text-#8D6E63',
  warning: 'bg-amber-50 text-amber-700',
  muted: 'bg-stone-100 text-stone-500',
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
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-relaxed',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
