'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface StaggerProps extends Omit<HTMLMotionProps<'div'>, 'children' | 'initial' | 'animate' | 'variants'> {
  children: ReactNode;
  /** 子元素间隔（秒），默认 0.06 */
  stagger?: number;
  /** 整体延迟（秒） */
  delay?: number;
}

const containerVariants = (stagger: number, delay: number) => ({
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
};

/**
 * Stagger — 容器：让每个直接子节点依次淡入
 *
 * 用法：把 <Stagger.Item> 包住要逐个出现的元素
 *   <Stagger>
 *     <Stagger.Item>...</Stagger.Item>
 *     <Stagger.Item>...</Stagger.Item>
 *   </Stagger>
 *
 * 因 framer-motion 的事件签名与 React DOM 不完全兼容，这里直接采用 HTMLMotionProps，
 * 不再向外暴露 React 的 onDrag 等冲突字段。
 */
function Stagger({ children, stagger = 0.06, delay = 0, ...rest }: StaggerProps) {
  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants(stagger, delay)} {...rest}>
      {children}
    </motion.div>
  );
}

interface ItemProps extends Omit<HTMLMotionProps<'div'>, 'children' | 'variants'> {
  children: ReactNode;
}

function Item({ children, ...rest }: ItemProps) {
  return (
    <motion.div variants={itemVariants} {...rest}>
      {children}
    </motion.div>
  );
}

Stagger.Item = Item;
export default Stagger;
