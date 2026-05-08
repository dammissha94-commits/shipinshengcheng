import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface QuickActionCardProps {
  /** Action label */
  title: string;
  /** Short description */
  description?: string;
  /** Target route (renders as Next.js Link) */
  href: string;
  /** Optional icon (ReactNode) */
  icon?: ReactNode;
  /** Optional badge text shown at top-right */
  badge?: string;
  /** Optional badge variant for colour */
  badgeVariant?: 'default' | 'amber';
  className?: string;
}

const BADGE_CLASSES = {
  default: 'bg-[var(--surface-3)] text-[var(--walnut-light)]',
  amber: 'bg-amber-50 text-amber-700',
} as const;

/**
 * QuickActionCard — a tappable card that navigates to another page.
 * Use in grid layouts for action hubs.
 */
export default function QuickActionCard({
  title,
  description,
  href,
  icon,
  badge,
  badgeVariant = 'default',
  className,
}: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex flex-col rounded-2xl border border-[var(--line-1)] bg-white p-5 shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-[var(--line-2)] hover:shadow-md',
        'active:scale-[0.98]',
        className
      )}
    >
      {badge && (
        <span
          className={cn(
            'absolute right-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-medium',
            BADGE_CLASSES[badgeVariant]
          )}
        >
          {badge}
        </span>
      )}

      {icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-3)] text-[var(--walnut-light)]">
          {icon}
        </div>
      )}

      <h3 className="text-sm font-semibold text-[var(--ink-1)] group-hover:text-var(--ink-2)">
        {title}
      </h3>

      {description && (
        <p className="mt-1 text-xs leading-relaxed text-[var(--ink-3)]">
          {description}
        </p>
      )}
    </Link>
  );
}
