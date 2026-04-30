import * as React from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  contentClassName?: string;
}

export function PageShell({ children, className, contentClassName, ...props }: PageShellProps) {
  return (
    <div className={cn('min-h-screen bg-cream pb-safe', className)} {...props}>
      <main className={cn('mx-auto max-w-md px-4 py-5', contentClassName)}>
        {children}
      </main>
    </div>
  );
}
