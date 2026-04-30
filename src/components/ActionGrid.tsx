import Link from 'next/link';
import type { ReactNode } from 'react';

export interface ActionItem {
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
}

interface ActionGridProps {
  items: ActionItem[];
  cols?: 2 | 3;
}

export default function ActionGrid({ items, cols = 2 }: ActionGridProps) {
  const gridClass = cols === 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div className={`grid ${gridClass} gap-3`}>
      {items.map((item, i) => {
        const inner = (
          <>
            <div className="w-10 h-10 rounded-xl bg-pine/8 flex items-center justify-center mb-2.5 text-pine">
              {item.icon}
            </div>
            <p className="text-sm font-semibold text-charcoal leading-tight">{item.label}</p>
            {item.description && (
              <p className="text-xs text-muted mt-0.5 leading-snug">{item.description}</p>
            )}
          </>
        );

        const cls = `flex flex-col items-start p-4 bg-card rounded-2xl border border-sand/60
          shadow-sm active:scale-[0.98] transition-transform`;

        if (item.href) {
          return (
            <Link key={i} href={item.href} className={cls}>
              {inner}
            </Link>
          );
        }

        return (
          <button key={i} onClick={item.onClick} className={`${cls} text-left w-full`}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
