'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface FadeInProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'transition'> {
  children: ReactNode;
  /** 延迟（秒） */
  delay?: number;
  /** 持续时间（秒），默认 0.32 */
  duration?: number;
  /** 上移距离（px），默认 8 */
  offset?: number;
}

/**
 * FadeIn — 元素淡入 + 微微上移
 * 已自动遵从 prefers-reduced-motion（framer-motion 会自动处理）
 */
export default function FadeIn({
  children,
  delay = 0,
  duration = 0.32,
  offset = 8,
  ...rest
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: offset }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
