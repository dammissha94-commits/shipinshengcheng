import Link from 'next/link';
import type { ReactNode } from 'react';

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
      className={`sticky top-0 z-40 flex items-center h-14 px-4 gap-3
        ${isPine ? 'bg-pine text-cream' : 'bg-card border-b border-sand text-charcoal'}`}
    >
      {backHref ? (
        <Link
          href={backHref}
          className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0
            ${isPine ? 'hover:bg-white/10' : 'hover:bg-sand'} transition-colors`}
          aria-label="返回"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
      ) : (
        <div className="w-8" />
      )}

      <h1 className={`flex-1 text-center text-base font-semibold tracking-wide truncate
        ${isPine ? 'text-cream' : 'text-charcoal'}`}>
        {title}
      </h1>

      <div className="w-8 flex justify-end shrink-0">
        {rightElement}
      </div>
    </header>
  );
}
