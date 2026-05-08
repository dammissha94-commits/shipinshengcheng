import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export const metadata = {
  title: '当前无网络',
};

/**
 * Offline fallback — Service Worker 在导航请求失败时返回此页
 * 仅依赖已缓存的静态资源（不调用任何 API）
 */
export default function OfflinePage() {
  return (
    <main className="wj-page flex min-h-screen items-center justify-center px-6">
      <div className="wj-shell text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-[var(--surface-3)] text-[var(--walnut)]">
          <WifiOff size={36} strokeWidth={1.6} />
        </div>
        <h1 className="font-serif text-[28px] font-bold tracking-[0.06em] text-[var(--ink-1)]">
          当前无网络
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-[var(--ink-2)]">
          没关系，家堂数据安然在册。
          <br />
          网络恢复后再继续记录吧。
        </p>
        <Link
          href="/family"
          className="wj-primary mt-8 inline-flex h-12 min-w-[180px] items-center justify-center rounded-2xl px-6 text-sm font-semibold transition active:scale-[0.97]"
        >
          重试进入数字家堂
        </Link>
        <p className="mt-6 text-[12px] text-[var(--ink-3)]">
          Tip：此页面也是一个迷你 PWA — 长按可加到主屏幕
        </p>
      </div>
    </main>
  );
}
