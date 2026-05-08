import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function WjScreenContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <main className={cn('relative z-10 space-y-5 px-5 pb-6', className)}>{children}</main>;
}

export function WjHeroPanel({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[18px] border border-[#E7D9C9] bg-white/76 p-5 shadow-[0_14px_34px_rgba(90,53,36,0.08)]',
        className
      )}
    >
      <div aria-hidden className="absolute -right-12 -top-14 h-36 w-36 rounded-full bg-[#F3D6AA]/30" />
      <div aria-hidden className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-[#DCE6D4]/40" />
      <div className="relative">
        {eyebrow && <p className="text-[12px] font-medium tracking-[0.18em] text-[#9B6A37]">{eyebrow}</p>}
        <h1 className="mt-1 text-[24px] font-bold tracking-[0.02em] text-[#2A1D16]">{title}</h1>
        {description && <p className="mt-2 text-[13px] leading-6 text-[#78675B]">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </section>
  );
}

export function WjPaperCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-[18px] border border-[#E7D9C9] bg-white/82 shadow-[0_10px_28px_rgba(90,53,36,0.06)]',
        className
      )}
    >
      {children}
    </section>
  );
}

export function WjCardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-[#EEE3D6] px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[16px] font-semibold text-[#2A1D16]">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] leading-5 text-[#78675B]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function WjSectionHeading({
  title,
  count,
}: {
  title: string;
  count?: number;
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="h-4 w-[3px] rounded-full bg-[#B8924E]" />
      <h2 className="text-[16px] font-semibold text-[#2A1D16]">{title}</h2>
      {typeof count === 'number' && <span className="text-[12px] text-[#8C7768]">{count}</span>}
    </div>
  );
}

export function WjInlineStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-[13px] border border-[#EEE3D6] bg-[#FBF7EF] px-3 py-2">
      <p className="text-[11px] text-[#78675B]">{label}</p>
      <p className="mt-0.5 font-serif text-[22px] font-semibold text-[#3A2519]">{value}</p>
    </div>
  );
}

export function WjSoftNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-[15px] border border-[#EEE3D6] bg-[#FBF7EF] px-4 py-3 text-[12px] leading-5 text-[#78675B]', className)}>
      {children}
    </div>
  );
}
