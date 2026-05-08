'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface TapProps extends Omit<HTMLMotionProps<'button'>, 'children' | 'whileTap'> {
  children: ReactNode;
  /** 缩放强度，默认 0.97 */
  scale?: number;
}

/**
 * Tap — 按下时弹性缩放反馈
 * 替代静态的 active:scale-[0.97]，提供更精细的弹簧感。
 */
export default function Tap({ children, scale = 0.97, ...rest }: TapProps) {
  return (
    <motion.button
      whileTap={{ scale }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
