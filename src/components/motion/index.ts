/**
 * 微动效组件桶导出
 *
 * 设计原则：
 * - 仅在关键场景使用（卡片入场、按下反馈、页面切换），避免到处都动
 * - 全部基于 framer-motion，自动遵从 prefers-reduced-motion
 * - 单次动效控制在 0.3s 以内，避免感觉"卡顿"
 */
export { default as FadeIn } from './FadeIn';
export { default as Stagger } from './Stagger';
export { default as Tap } from './Tap';
export { default as PageTransition } from './PageTransition';
