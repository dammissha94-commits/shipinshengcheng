import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormPanelProps {
  /** Panel title */
  title?: string;
  /** Short description below the title */
  description?: string;
  /** Form fields / children */
  children: ReactNode;
  /** Footer — typically submit/cancel buttons */
  footer?: ReactNode;
  className?: string;
}

/**
 * FormPanel — a card wrapper for forms with consistent header, body,
 * and footer slots. Does NOT include form logic or state management.
 */
export default function FormPanel({
  title,
  description,
  children,
  footer,
  className,
}: FormPanelProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-stone-200 bg-white shadow-sm',
        className
      )}
    >
      {(title || description) && (
        <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
          {title && (
            <h2 className="text-base font-semibold text-stone-800 sm:text-lg">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-0.5 text-sm text-stone-500">{description}</p>
          )}
        </div>
      )}

      <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">{children}</div>

      {footer && (
        <div className="border-t border-stone-100 px-5 py-4 sm:px-6">
          {footer}
        </div>
      )}
    </div>
  );
}
