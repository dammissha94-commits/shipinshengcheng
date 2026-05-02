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
        'sticky top-0 z-40 flex h-14 items-center gap-3 px-4 backdrop-blur-xl',
        isPine
          ? 'bg-pine/95 text-cream shadow-[0_1px_0_rgba(255,255,255,0.06)]'
          : 'border-b border-sand/60 bg-card/90 text-charcoal shadow-[0_1px_4px_rgba(0,0,0,0.03)]'
      )}
    >
      {backHref ? (
        <Link
          href={backHref}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95',
            isPine ? 'hover:bg-white/10' : 'hover:bg-sand/70'
          )}
          aria-label="返回"
        >
          <ChevronLeft size={20} strokeWidth={2.2} />
        </Link>
      ) : (
        <div className="w-8" />
      )}

      <h1
        className={cn(
          'flex-1 truncate text-center text-[17px] font-semibold tracking-[0.04em]',
          isPine ? 'text-cream' : 'text-charcoal'
        )}
      >
        {title}
      </h1>

      <div className="flex w-8 shrink-0 justify-end">{rightElement}</div>
    </header>
  );
}
