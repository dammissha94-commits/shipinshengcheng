import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface PrimaryActionProps {
  href: string;
  /** 大图标 */
  icon: ReactNode;
  /** 主标 */
  title: string;
  /** 一句话说明（描述目的） */
  description: string;
}

/**
 * PrimaryAction — 首页主操作大卡（高于一切的 CTA）
 *
 * 视觉权重：~ 96px 高，渐变底，描述长一行，明确"这是首要动作"。
 * 用法：动态选择当前用户最该做的一件事
 *   - 0 位家人 → 添加亲属
 *   - 有未认领 → 邀请认领
 *   - 0 段故事 → 人生记忆
 *   - 否则 → 查看家族树
 */
export default function PrimaryAction({ href, icon, title, description }: PrimaryActionProps) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-4 overflow-hidden rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--walnut)] to-[var(--walnut-light)] p-4 text-white shadow-warm-md transition active:scale-[0.99]"
    >
      <span aria-hidden className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/12" />
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/14 text-white">
        {icon}
      </span>
      <div className="relative min-w-0 flex-1">
        <p className="text-[16px] font-bold tracking-[0.02em]">{title}</p>
        <p className="mt-0.5 line-clamp-1 text-[12px] text-white/75">{description}</p>
      </div>
      <span
        aria-hidden
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/16 text-white"
      >
        <ChevronRight size={18} />
      </span>
    </Link>
  );
}
