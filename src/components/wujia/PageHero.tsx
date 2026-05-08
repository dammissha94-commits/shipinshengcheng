import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeroProps {
  /** 顶部分类小字（eyebrow，如「家堂数据看板」） */
  eyebrow?: string;
  /** 主标题（通常是家堂 displayName） */
  title: string;
  /** 副标题（统计数字描述） */
  subtitle?: string;
  /** 右上角行动 slot（如导出按钮） */
  action?: ReactNode;
  /** 主体下方扩展 slot（如进度条、图表） */
  children?: ReactNode;
  /** 主色调；不同二级页面可选不同基调 */
  tone?: 'walnut' | 'jade' | 'gold';
  className?: string;
}

const TONE_GRADIENTS: Record<NonNullable<PageHeroProps['tone']>, string> = {
  walnut: 'from-[var(--walnut)] to-[var(--walnut-light)]',
  jade: 'from-[#5C7A6A] to-[#8AA597]',
  gold: 'from-[#9F7B3A] to-[var(--gold)]',
};

/**
 * PageHero — 二级页面统一头卡（替代 9 处复制粘贴的 walnut hero）
 *
 * 设计：
 * - 暖色渐变底（默认 walnut，可选 jade/gold 区分模块）
 * - eyebrow + title + subtitle 三段式
 * - 右上 action slot（导出/操作按钮）
 * - 下方 children slot（进度条、嵌入卡片）
 * - 装饰光斑统一管理（旧版每处复制 6 行）
 *
 * 用法：
 * <PageHero
 *   eyebrow="家庭节点提醒"
 *   title={family.displayName}
 *   subtitle={`${count} 条近期提醒`}
 *   action={<button>导出</button>}
 * />
 */
export default function PageHero({
  eyebrow,
  title,
  subtitle,
  action,
  children,
  tone = 'walnut',
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br p-5 text-white shadow-warm-lg',
        TONE_GRADIENTS[tone],
        className
      )}
    >
      {/* 装饰光斑（统一） */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-[var(--gold-light)]/16"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-[var(--jade)]/14"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[12px] font-medium tracking-[0.18em] text-white/55">{eyebrow}</p>
          )}
          <h1 className="mt-0.5 truncate text-[20px] font-bold tracking-[0.02em]">{title}</h1>
          {subtitle && <p className="mt-1 text-[13px] text-white/70">{subtitle}</p>}
        </div>
        {action && <div className="relative shrink-0">{action}</div>}
      </div>

      {children && <div className="relative mt-4">{children}</div>}
    </section>
  );
}
