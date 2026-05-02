import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Page title (required) */
  title: string;
  /** Short description below the title */
  description?: string;
  /** Eyebrow text above the title (category / breadcrumb hint) */
  eyebrow?: string;
  /** Action slot — typically a button or link */
  action?: ReactNode;
  /** Back navigation slot */
  backSlot?: ReactNode;
  className?: string;
}

/**
 * PageHeader — consistent page title area with optional eyebrow,
 * description, and action slot. Pure presentational.
 */
export default function PageHeader({
  title,
  description,
  eyebrow,
  action,
  backSlot,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6 sm:mb-8', className)}>
      {eyebrow && (
        <p className="mb-1 text-xs font-medium tracking-widest text-stone-400 uppercase">
          {eyebrow}
        </p>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {backSlot && <div className="shrink-0">{backSlot}</div>}
            <h1 className="truncate text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              {title}
            </h1>
          </div>
          {description && (
            <p className="mt-1.5 text-sm text-stone-500 sm:text-base">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
