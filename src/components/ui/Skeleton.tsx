import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Skeleton 原子库 — 用于页面加载态填充
 *
 * 共享样式：暖色 surface-3 底 + 浅金 shimmer 扫光（见 globals.css `.wj-skeleton`）
 *
 * 三种粒度：
 *   <Skeleton.Box />     一块矩形（自定 w/h/radius）
 *   <Skeleton.Text />    单/多行文本占位（按 lines 数量）
 *   <Skeleton.Avatar />  圆形头像
 *   <Skeleton.Card />    标准卡片骨架（avatar + 2 行文字 + chip）
 */

interface BoxProps extends HTMLAttributes<HTMLDivElement> {
  /** 圆角；可传数字（px）或 token name（'sm' | 'md' | 'lg' | 'xl' | 'full'） */
  radius?: number | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  width?: number | string;
  height?: number | string;
}

const RADIUS_MAP: Record<string, string> = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  full: '9999px',
};

function Box({ className, radius = 'sm', width, height, style, ...rest }: BoxProps) {
  const borderRadius =
    typeof radius === 'number' ? `${radius}px` : RADIUS_MAP[radius] ?? RADIUS_MAP.sm;
  const mergedStyle: CSSProperties = {
    width,
    height,
    borderRadius,
    ...style,
  };
  return <div className={cn('wj-skeleton', className)} style={mergedStyle} {...rest} />;
}

interface TextProps {
  /** 行数，默认 1 */
  lines?: number;
  /** 末行是否短一些（更像段落） */
  lastShort?: boolean;
  /** 行高（px），默认 14 */
  lineHeight?: number;
  /** 行间距（px），默认 8 */
  gap?: number;
  className?: string;
}

function Text({ lines = 1, lastShort = true, lineHeight = 14, gap = 8, className }: TextProps) {
  return (
    <div className={cn('flex w-full flex-col', className)} style={{ rowGap: `${gap}px` }}>
      {Array.from({ length: lines }).map((_, i) => {
        const isLast = i === lines - 1;
        const width = lastShort && isLast && lines > 1 ? '60%' : '100%';
        return <Box key={i} height={lineHeight} width={width} radius={6} />;
      })}
    </div>
  );
}

interface AvatarProps {
  size?: number;
  className?: string;
}

function Avatar({ size = 48, className }: AvatarProps) {
  return <Box className={className} width={size} height={size} radius="full" />;
}

interface CardProps {
  /** 是否显示左侧头像 */
  withAvatar?: boolean;
  /** 是否显示底部 chip */
  withChip?: boolean;
  className?: string;
}

function Card({ withAvatar = true, withChip = true, className }: CardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--line-1)] bg-[var(--surface-1)] p-3',
        className
      )}
    >
      {withAvatar && <Avatar size={52} />}
      <div className="flex-1 space-y-2">
        <Box height={16} width="60%" radius={6} />
        <Box height={12} width="80%" radius={6} />
        {withChip && <Box height={20} width={56} radius="full" />}
      </div>
    </div>
  );
}

const Skeleton = { Box, Text, Avatar, Card };
export default Skeleton;
export { Box as SkeletonBox, Text as SkeletonText, Avatar as SkeletonAvatar, Card as SkeletonCard };
