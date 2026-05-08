'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ChevronLeft, Folder, GitBranch, Home, Plus, UserRound } from 'lucide-react';

export function MobilePage({
  children,
  className = '',
  withBottomNav = true,
}: {
  children: ReactNode;
  className?: string;
  withBottomNav?: boolean;
}) {
  return (
    <main
      className={`min-h-screen bg-[var(--surface-2)] text-[var(--ink-1)] ${
        withBottomNav ? 'pb-safe-nav' : 'pb-safe'
      }`}
    >
      <div
        className={`relative mx-auto min-h-screen max-w-[var(--content-max)] overflow-hidden bg-[var(--surface-2)] shadow-container ${className}`}
      >
        <PaperTexture />
        {children}
      </div>
      {withBottomNav && <MobileBottomNav />}
    </main>
  );
}

export function MobileStatusBar() {
  return <div aria-hidden className="h-0" />;
}

export function MobileTopBar({
  title,
  backHref = '/family',
  right,
}: {
  title: string;
  backHref?: string;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-[var(--surface-2)]/85 px-5 backdrop-blur-md">
      <Link
        href={backHref}
        className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink-1)] transition-colors hover:bg-[var(--surface-3)]/60 active:scale-95"
        aria-label="返回"
      >
        <ChevronLeft size={22} />
      </Link>
      <h1 className="absolute left-16 right-16 text-center text-[17px] font-semibold tracking-[0.04em] text-[var(--ink-1)]">
        {title}
      </h1>
      <div className="flex min-w-11 justify-end text-[14px] text-[var(--ink-3)]">{right}</div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname() ?? '';
  const tabs = [
    { href: '/family', label: '首页', icon: <Home size={23} />, match: (p: string) => p === '/family' },
    { href: '/family/tree', label: '家族树', icon: <GitBranch size={22} />, match: (p: string) => p.startsWith('/family/tree') },
    { href: '/family/relatives/new', label: '添加', icon: <Plus size={32} />, primary: true, match: (p: string) => p.startsWith('/family/relatives') },
    { href: '/family/output', label: '档案', icon: <Folder size={22} />, match: (p: string) => p.startsWith('/family/output') },
    { href: '/family/settings', label: '我的', icon: <UserRound size={23} />, match: (p: string) => p.startsWith('/family/settings') },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[var(--content-max)] rounded-t-[20px] border-t border-[var(--line-1)]/70 bg-[var(--surface-1)]/95 shadow-warm-top backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5 items-end px-5 pb-3 pt-2">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex min-h-[56px] flex-col items-center justify-end gap-1 rounded-xl px-1 py-1 ${
                tab.primary ? '-mt-5' : ''
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {tab.primary ? (
                <span className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--walnut-light)] text-white shadow-[0_10px_24px_rgba(176,84,44,0.35)] transition-transform active:scale-95">
                  {tab.icon}
                </span>
              ) : (
                <span
                  className={`flex h-9 w-9 items-center justify-center transition-colors ${
                    active ? 'text-[var(--walnut)]' : 'text-[var(--ink-3)]'
                  }`}
                >
                  {tab.icon}
                </span>
              )}
              <span
                className={`text-[12px] font-medium transition-colors ${
                  active ? 'text-[var(--walnut)]' : 'text-[var(--ink-3)]'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PaperTexture() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-70"
      style={{
        backgroundImage:
          'radial-gradient(circle at 12% 8%, rgba(184,146,78,.12), transparent 14rem), radial-gradient(circle at 86% 0%, rgba(111,138,121,.08), transparent 16rem), linear-gradient(rgba(90,53,36,.028) 1px, transparent 1px), linear-gradient(90deg, rgba(90,53,36,.02) 1px, transparent 1px)',
        backgroundSize: 'auto, auto, 22px 22px, 22px 22px',
      }}
    />
  );
}
