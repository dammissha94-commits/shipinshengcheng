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
  /**
   * 优先于 icon 的暖调插画（来自 components/illustrations/）
   * 当传入 illustration 时不再显示徽标圆角图标。
   */
  illustration?: ReactNode;
  /** Optional custom icon; defaults to FileText（仅在 illustration 未传时生效）*/
  icon?: ReactNode;
  className?: string;
}

/**
 * EmptyState — 列表/区块无数据时的通用占位
 * 优先级：illustration > icon
 */
export default function EmptyState({
  title,
  description,
  action,
  illustration,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className
      )}
    >
      {illustration ? (
        <div className="mb-5">{illustration}</div>
      ) : (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--ink-3)]">
          {icon ?? <FileText size={24} strokeWidth={1.8} />}
        </div>
      )}

      <p className="text-base font-semibold text-[var(--ink-1)]">{title}</p>

      {description && (
        <p className="mt-1.5 max-w-[280px] text-sm leading-relaxed text-[var(--ink-2)]">
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
