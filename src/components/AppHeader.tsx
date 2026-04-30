import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  title: string;
  backHref?: string;
  rightElement?: ReactNode;
  variant?: 'default' | 'pine';
}

export default function AppHeader({
  title,
  backHref,
  rightElement,
  variant = 'default',
}: AppHeaderProps) {
  const isPine = variant === 'pine';

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 items-center gap-3 px-4 backdrop-blur',
        isPine ? 'bg-pine text-cream' : 'border-b border-sand/80 bg-card/95 text-charcoal'
      )}
    >
      {backHref ? (
        <Link
          href={backHref}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
            isPine ? 'hover:bg-white/10' : 'hover:bg-sand'
          )}
          aria-label="返回"
        >
          <ChevronLeft size={19} strokeWidth={2.4} />
        </Link>
      ) : (
        <div className="w-8" />
      )}

      <h1
        className={cn(
          'flex-1 truncate text-center text-base font-semibold tracking-wide',
          isPine ? 'text-cream' : 'text-charcoal'
        )}
      >
        {title}
      </h1>

      <div className="flex w-8 shrink-0 justify-end">{rightElement}</div>
    </header>
  );
}
