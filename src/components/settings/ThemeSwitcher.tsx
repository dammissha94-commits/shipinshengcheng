'use client';

import { useSyncExternalStore } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { applyTheme, getStoredTheme, setTheme, THEME_STORAGE_KEY, type ThemeMode } from '@/lib/theme/theme';
import { cn } from '@/lib/utils';

interface ThemeSwitcherProps {
  className?: string;
}

const OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
];

/** 订阅 storage 事件 + system theme 变化，让 ThemeSwitcher 跟随外部状态变更 */
function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) callback();
  };
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
      callback();
    }
  };
  window.addEventListener('storage', onStorage);
  mediaQuery.addEventListener('change', onSystemChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    mediaQuery.removeEventListener('change', onSystemChange);
  };
}

const SERVER_SNAPSHOT: ThemeMode = 'system';

/**
 * ThemeSwitcher — 三段式主题切换控件（浅 / 深 / 跟随系统）
 *
 * 用 useSyncExternalStore 订阅 localStorage 与 system theme 变化，
 * 满足 React 19 的最佳实践（避免 useEffect 中 setState）。
 */
export default function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const mode = useSyncExternalStore(subscribe, getStoredTheme, () => SERVER_SNAPSHOT);

  function handleSelect(next: ThemeMode) {
    setTheme(next);
    // setTheme 写 localStorage，但同窗口 storage 事件不会触发，手动通知 SES 重读
    window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY }));
  }

  return (
    <div
      role="radiogroup"
      aria-label="界面主题"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-[var(--line-1)] bg-[var(--surface-1)] p-1',
        className
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => handleSelect(value)}
            className={cn(
              'flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors',
              active
                ? 'bg-[var(--walnut)] text-white shadow-warm-sm'
                : 'text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-2)]'
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
