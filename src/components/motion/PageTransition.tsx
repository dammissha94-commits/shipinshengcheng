'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * PageTransition — 整页淡入 + 微微上移
 * 适合包裹 page.tsx 的根元素，给路由切换一点呼吸感。
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
