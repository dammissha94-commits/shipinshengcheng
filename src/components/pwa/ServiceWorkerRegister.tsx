'use client';

import { useEffect } from 'react';

/**
 * ServiceWorkerRegister — 静默注册 Service Worker
 *
 * - 仅在生产环境注册（避免开发环境的缓存干扰）
 * - 失败静默（不打扰用户）
 * - SW 文件位于 public/sw.js
 *
 * 用法：放在 app/layout.tsx 的 <body> 内
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // 静默失败 — SW 不是核心功能
      });
    };

    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);

  return null;
}
