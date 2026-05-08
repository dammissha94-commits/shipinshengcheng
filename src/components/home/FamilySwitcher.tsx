'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Plus, Settings } from 'lucide-react';
import type { FamilySpace } from '@/types/domain';
import { ACTIVE_FAMILY_STORAGE_KEY } from '@/lib/services/family-service';

interface FamilySwitcherProps {
  /** 当前家堂（用于 trigger 显示） */
  current: FamilySpace;
  /** 用户所属全部家堂 */
  families: FamilySpace[];
  /** 设置入口路由 */
  settingsHref?: string;
}

/**
 * FamilySwitcher — 顶栏「{姓氏}氏家堂 ▾」按钮 + 下拉切换面板
 *
 * - 单家堂：表现等同于一个跳转设置的胶囊（无下拉）
 * - 多家堂：点击展开列表，选择后写入 localStorage 并 router.refresh()
 * - 不调任何 schema/接口，仅利用现有 listUserFamilySpaces 数据
 */
export default function FamilySwitcher({
  current,
  families,
  settingsHref = '/family/settings',
}: FamilySwitcherProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const hasMultiple = families.length > 1;

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function selectFamily(familyId: string) {
    if (familyId === current.id) {
      setOpen(false);
      return;
    }
    try {
      window.localStorage.setItem(ACTIVE_FAMILY_STORAGE_KEY, familyId);
    } catch {
      // 静默失败 — 仍可工作但下次刷新不持久
    }
    setOpen(false);
    router.refresh();
    // 若 router.refresh 在客户端组件中不触发数据重拉，使用 reload 兜底
    setTimeout(() => {
      if (typeof window !== 'undefined') window.location.reload();
    }, 50);
  }

  // 单家堂：简单胶囊（链接到设置）
  if (!hasMultiple) {
    return (
      <Link
        href={settingsHref}
        className="flex h-[52px] min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-[var(--walnut)] to-[var(--walnut-light)] px-4 text-white shadow-[0_10px_24px_rgba(63,36,24,0.24)] transition active:scale-[0.97]"
        aria-label={`${current.surname}氏家堂设置`}
      >
        <SealIcon />
        <span className="text-[16px] font-bold tracking-[0.02em]">{current.surname}氏家堂</span>
        <ChevronDown size={18} className="opacity-70" />
      </Link>
    );
  }

  // 多家堂：dropdown
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-[52px] min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-[var(--walnut)] to-[var(--walnut-light)] px-4 text-white shadow-[0_10px_24px_rgba(63,36,24,0.24)] transition active:scale-[0.97]"
      >
        <SealIcon />
        <span className="text-[16px] font-bold tracking-[0.02em]">{current.surname}氏家堂</span>
        <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-[60px] z-50 w-[260px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--line-1)] bg-[var(--surface-1)] shadow-warm-md"
        >
          <div className="px-4 py-2.5 text-[12px] tracking-[0.16em] text-[var(--ink-3)]">
            切换家堂
          </div>
          <ul className="max-h-[280px] overflow-y-auto">
            {families.map((f) => {
              const active = f.id === current.id;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => selectFamily(f.id)}
                    className={`flex w-full min-h-[52px] items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-[var(--surface-2)] ${
                      active ? 'bg-[var(--surface-2)]' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[var(--ink-1)]">
                        {f.surname}氏家堂
                      </p>
                      <p className="truncate text-[12px] text-[var(--ink-3)]">
                        {f.displayName ?? f.display_name}
                      </p>
                    </div>
                    {active && <Check size={18} className="shrink-0 text-[var(--walnut)]" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-[var(--line-1)]">
            <Link
              href="/create"
              className="flex w-full min-h-[48px] items-center gap-2 px-4 py-2.5 text-[14px] font-medium text-[var(--walnut-light)] hover:bg-[var(--surface-2)]"
              onClick={() => setOpen(false)}
            >
              <Plus size={16} /> 创建另一个家堂
            </Link>
            <Link
              href={settingsHref}
              className="flex w-full min-h-[48px] items-center gap-2 px-4 py-2.5 text-[14px] font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
              onClick={() => setOpen(false)}
            >
              <Settings size={16} /> 当前家堂设置
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function SealIcon() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-3)] text-[var(--gold)]">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 19V6M12 11c-3-4-6-4-8-2 1 3 4 4 8 2ZM12 11c3-4 6-4 8-2-1 3-4 4-8 2ZM12 15c-2-3-5-3-7-1 1 2 4 3 7 1ZM12 15c2-3 5-3 7-1-1 2-4 3-7 1Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
