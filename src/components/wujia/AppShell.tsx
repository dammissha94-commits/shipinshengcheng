import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
  /** Optional top navigation or header area rendered above the main container */
  header?: ReactNode;
  /** Constrain content width. Default "wide" for content pages, "narrow" for forms */
  maxWidth?: 'wide' | 'narrow' | 'full';
  className?: string;
}

const MAX_WIDTH_CLASSES = {
  wide: 'max-w-6xl',
  narrow: 'max-w-2xl',
  full: '',
} as const;

/**
 * AppShell — unified page shell with consistent background, padding, and
 * optional header slot. Does NOT read auth, query data, or route.
 */
export default function AppShell({
  children,
  header,
  maxWidth = 'wide',
  className,
}: AppShellProps) {
  return (
    <div className={cn('min-h-screen bg-[var(--surface-2)]', className)}>
      {header}
      <div
        className={cn(
          'mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10',
          MAX_WIDTH_CLASSES[maxWidth]
        )}
      >
        {children}
      </div>
    </div>
  );
}
