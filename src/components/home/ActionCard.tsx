import Link from 'next/link';
import type { ReactNode } from 'react';

type ActionTone = 'terracotta' | 'jade' | 'walnut' | 'gold';

interface ActionCardProps {
  href: string;
  icon: ReactNode;
  label: string;
  tone?: ActionTone;
  /** 是否为紧凑模式（用于次 CTA）*/
  compact?: boolean;
}

/**
 * 真渐变（同色不再叫渐变）。每个 tone 都是 base → light/deep 的双色梯度。
 */
const TONE_GRADIENTS: Record<ActionTone, string> = {
  terracotta: 'from-[#C26946] to-[#D88B6E]',
  jade: 'from-[#6F8A79] to-[#92AA9E]',
  walnut: 'from-[var(--walnut)] to-[var(--walnut-light)]',
  gold: 'from-[var(--gold)] to-[var(--gold-light)]',
};

/**
 * ActionCard — 首页操作卡（添加亲属 / 邀请认领 / 查看家族树 / 人生记忆）
 * - 默认：大卡片（首页四宫格）
 * - compact=true：小卡片（次 CTA）
 */
export default function ActionCard({ href, icon, label, tone = 'walnut', compact = false }: ActionCardProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-1)] shadow-warm-sm transition active:scale-[0.97] ${
        compact
          ? 'min-h-[72px] px-2 py-2'
          : 'min-h-[92px] px-2 py-4'
      }`}
    >
      <span
        className={`flex items-center justify-center rounded-full bg-gradient-to-br text-white shadow-warm-md ${
          compact
            ? 'h-[44px] w-[44px]'
            : 'h-[56px] w-[56px]'
        } ${TONE_GRADIENTS[tone]}`}
      >
        {icon}
      </span>
      <span className={`whitespace-nowrap font-semibold text-[var(--ink-1)] ${
        compact ? 'mt-2 text-[13px]' : 'mt-3 text-[15px]'
      }`}>
        {label}
      </span>
    </Link>
  );
}
