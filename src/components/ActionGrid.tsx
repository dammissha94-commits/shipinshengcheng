import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

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

        const cls = cn(
          'flex min-h-[118px] flex-col items-start p-4 active:scale-[0.98] transition-all hover:-translate-y-0.5 hover:border-gold/35 hover:shadow-md'
        );

        if (item.href) {
          return (
            <Card key={i} className="p-0">
              <Link href={item.href} className={cls}>
                {inner}
              </Link>
            </Card>
          );
        }

        return (
          <Card key={i} className="p-0">
            <button onClick={item.onClick} className={`${cls} text-left w-full`}>
              {inner}
            </button>
          </Card>
        );
      })}
    </div>
  );
}
