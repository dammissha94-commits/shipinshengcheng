'use client';

import { useSyncExternalStore } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  applyContrast,
  CONTRAST_STORAGE_KEY,
  getStoredContrast,
  setContrast,
  type ContrastMode,
} from '@/lib/theme/theme';
import { cn } from '@/lib/utils';

interface ContrastSwitcherProps {
  className?: string;
}

const OPTIONS: { value: ContrastMode; label: string; icon: typeof Eye }[] = [
  { value: 'normal', label: '标准', icon: Eye },
  { value: 'high', label: '高对比', icon: EyeOff },
];

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onStorage = (e: StorageEvent) => {
    if (e.key === CONTRAST_STORAGE_KEY) callback();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

const SERVER_SNAPSHOT: ContrastMode = 'normal';

/**
 * ContrastSwitcher — 标准 / 高对比度二段切换
 *
 * 高对比度模式下：
 *   - ink-1 强化为接近纯黑 / 纯白（满足 WCAG AAA）
 *   - 边线变深加粗
 *   - 焦点环更明显
 */
export default function ContrastSwitcher({ className }: ContrastSwitcherProps) {
  const mode = useSyncExternalStore(subscribe, getStoredContrast, () => SERVER_SNAPSHOT);

  function handleSelect(next: ContrastMode) {
    setContrast(next);
    applyContrast(next);
    window.dispatchEvent(new StorageEvent('storage', { key: CONTRAST_STORAGE_KEY }));
  }

  return (
    <div
      role="radiogroup"
      aria-label="对比度模式"
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
