import Link from 'next/link';
import type { ReactNode } from 'react';

type IconTone = 'walnut' | 'jade' | 'gold' | 'terracotta';

interface SecondaryActionProps {
  href: string;
  icon: ReactNode;
  label: string;
  /** 图标色调（统一的 surface-3 底 + 不同图标色，节奏更和谐） */
  tone?: IconTone;
}

const ICON_COLOR: Record<IconTone, string> = {
  walnut: 'text-[var(--walnut)]',
  jade: 'text-[var(--jade)]',
  gold: 'text-[var(--gold)]',
  terracotta: 'text-[var(--terracotta)]',
};

/**
 * SecondaryAction — 主操作右侧 / 下方的次要操作小卡
 *
 * 视觉对齐：统一 surface-1 卡 + surface-3 圆形图标底 + 单色图标
 * 与 PrimaryAction 形成 1 大 + 3 小的层级
 */
export default function SecondaryAction({ href, icon, label, tone = 'walnut' }: SecondaryActionProps) {
  return (
    <Link
      href={href}
      className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-1)] bg-[var(--surface-1)] px-2 py-3 shadow-warm-sm transition active:scale-[0.97]"
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-3)] ${ICON_COLOR[tone]}`}
      >
        {icon}
      </span>
      <span className="whitespace-nowrap text-[13px] font-semibold text-[var(--ink-1)]">{label}</span>
    </Link>
  );
}
