import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';

interface EmptyStateProps {
  /** Short title — keep under 12 characters */
  title: string;
  /** One-sentence description — keep under 24 characters */
  description?: string;
  /** Optional action (typically a Link or Button) */
  action?: ReactNode;
  /** Optional custom icon; defaults to FileText */
  icon?: ReactNode;
  className?: string;
}

/**
 * EmptyState — shown when a list or section has no data.
 * Clean, calm, no sensational or religious phrasing.
 */
export default function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-16 text-center',
        className
      )}
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
        {icon ?? <FileText size={24} strokeWidth={1.8} />}
      </div>

      <p className="text-base font-semibold text-stone-800">{title}</p>

      {description && (
        <p className="mt-1.5 max-w-[260px] text-sm leading-relaxed text-stone-500">
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
