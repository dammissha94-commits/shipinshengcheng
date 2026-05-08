import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface HomePanelProps {
  icon: ReactNode;
  title: string;
  href: string;
  className?: string;
  children: ReactNode;
}

/**
 * HomePanel — 首页区块容器（头部图标徽章 + 标题 + 「查看全部」+ 内容 slot）
 */
export default function HomePanel({ icon, title, href, className = '', children }: HomePanelProps) {
  return (
    <section className={`rounded-[var(--radius-md)] bg-[var(--surface-1)] px-4 py-4 shadow-warm-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--walnut-light)] text-white">
            {icon}
          </span>
          <h2 className="text-[20px] font-bold text-[var(--ink-1)]">{title}</h2>
        </div>
        <Link
          href={href}
          className="flex min-h-[44px] items-center gap-1 px-1 text-[14px] text-[var(--ink-3)] transition-colors hover:text-[var(--ink-2)]"
        >
          查看全部 <ChevronRight size={16} />
        </Link>
      </div>
      {children}
    </section>
  );
}
