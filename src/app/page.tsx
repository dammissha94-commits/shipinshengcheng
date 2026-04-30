'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { useFamily } from '@/lib/hooks';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { loginRedirectPath } from '@/lib/auth/redirect';
import { clearAll } from '@/lib/storage';
import { formatTempleName } from '@/lib/family-naming';

const HouseIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4L28 12V28H4V12L16 4Z" stroke="#C4AA6A" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M11 28V18H21V28" stroke="#C4AA6A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="16" cy="13" r="2" fill="#C4AA6A" />
  </svg>
);

const BrandMark = ({ size = 'lg' }: { size?: 'lg' | 'sm' }) => (
  <div className={`${size === 'lg' ? 'w-16 h-16' : 'w-12 h-12'} rounded-2xl bg-pine flex items-center justify-center shadow-lg`}>
    <HouseIcon />
  </div>
);

const FEATURES = [
  { icon: '📋', label: '三代家谱', desc: '以自己为中心记录三代家人' },
  { icon: '✉️', label: '邀请认领', desc: '家人扫码认领各自档案' },
  { icon: '📖', label: '家族故事', desc: '记录家族往事与传承记忆' },
];

export default function HomePage() {
  const [surname, setSurname] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const router = useRouter();
  const existingFamily = useFamily();
  const trimmedSurname = surname.trim();
  const templeName = formatTempleName(trimmedSurname);

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      try {
        const user = await getCurrentUser();
        if (active) setCurrentUser(user);
      } finally {
        if (active) setCheckingUser(false);
      }
    }

    loadCurrentUser();

    return () => {
      active = false;
    };
  }, []);

  function handleStart(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const submittedSurname = String(formData.get('surname') ?? '').trim();
    if (!submittedSurname) return;
    router.push(`/create?surname=${encodeURIComponent(submittedSurname)}`);
  }

  function handleCreateNew() {
    if (window.confirm('重新创建将清空当前家族数据，确定继续吗？')) {
      clearAll();
      setShowNewForm(true);
    }
  }

  // ── 已有家族：显示"欢迎回来"界面 ───────────────────────────────────────
  if (existingFamily && !showNewForm) {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 py-12">
        <BrandMark size="sm" />

        <div className="mt-5 mb-1 text-xs text-muted tracking-widest text-center">欢迎回来</div>
        <h1 className="text-2xl font-bold text-pine tracking-wide text-center mb-1">
          {existingFamily.displayName}
        </h1>
        <p className="text-sm text-muted mb-8 text-center">
          {existingFamily.ownerName} 创建
        </p>

        <div className="w-full max-w-[320px] space-y-3">
          <Link
            href="/family"
            className="w-full flex items-center justify-center gap-2 py-4 bg-pine text-cream
              rounded-xl text-base font-semibold shadow-sm hover:bg-pine-light active:scale-[0.98]
              transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
            进入我的祠堂
          </Link>

          <Link
            href={loginRedirectPath('/family')}
            className="w-full flex items-center justify-center gap-2 py-3.5 border border-sand text-charcoal rounded-xl text-base font-semibold bg-card hover:border-pine/40 transition-colors"
          >
            {checkingUser ? '正在检查登录状态' : currentUser ? '已登录，直接进入' : '登录 / 注册'}
          </Link>

          <button
            onClick={handleCreateNew}
            className="w-full py-2.5 text-sm text-muted hover:text-charcoal transition-colors"
          >
            重新创建新的祠堂
          </button>
        </div>

        {/* Divider + features */}
        <div className="mt-12 w-full max-w-[320px]">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-sand" />
            <span className="text-xs text-muted/60">吾家祠堂</span>
            <div className="h-px flex-1 bg-sand" />
          </div>
          <div className="flex justify-between">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-1 text-center w-20">
                <span className="text-2xl">{f.icon}</span>
                <span className="text-xs font-medium text-charcoal">{f.label}</span>
                <span className="text-[10px] text-muted leading-tight">{f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ── 尚无家族：显示创建界面 ───────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 py-12">
      {/* Brand */}
      <div className="mb-10 flex flex-col items-center">
        <BrandMark size="lg" />
        <h1 className="mt-5 text-4xl font-bold text-pine tracking-[0.12em] mb-2">
          吾家祠堂
        </h1>
        <div className="flex items-center gap-2">
          <div className="h-px w-8 bg-gold/50" />
          <p className="text-xs text-gold font-medium tracking-widest">家族数字档案</p>
          <div className="h-px w-8 bg-gold/50" />
        </div>
      </div>

      {/* Tagline */}
      <p className="text-base text-muted text-center leading-relaxed mb-10 max-w-[280px]">
        从自己的姓氏开始，建立一份<br />属于家人的数字祠堂
      </p>

      {/* Input */}
      <form action="/create" method="get" onSubmit={handleStart} className="w-full max-w-[320px] space-y-4">
        <div className="text-center">
          <Link href={loginRedirectPath('/family')} className="text-sm text-gold font-medium">
            {checkingUser ? '正在检查登录状态' : currentUser ? '已有账号，直接登录后继续' : '已有账号，去登录'}
          </Link>
        </div>

        <div className="relative">
          <input
            name="surname"
            type="text"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            placeholder="请输入您的姓氏，如：王"
            maxLength={4}
            required
            autoFocus
            className="w-full bg-card border-2 border-sand rounded-xl px-4 py-3.5
              text-base text-charcoal placeholder:text-muted/50
              focus:outline-none focus:border-pine transition-colors"
          />
          {surname && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted/60 pointer-events-none">
              氏祠堂
            </div>
          )}
        </div>

        {trimmedSurname && (
          <div className="flex items-center justify-center gap-2 text-sm text-pine/80 font-medium">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20,6 9,17 4,12" />
            </svg>
            将为您创建：{templeName}
          </div>
        )}

        <button
          type="submit"
          aria-disabled={!trimmedSurname}
          className={`w-full py-4 rounded-xl text-base font-semibold transition-all duration-150
            ${trimmedSurname
              ? 'bg-pine text-cream shadow-sm hover:bg-pine-light active:scale-[0.98]'
              : 'bg-sand text-muted'
            }`}
        >
          开始创建祠堂
        </button>
      </form>

      {/* Features */}
      <div className="mt-12 w-full max-w-[320px]">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-sand" />
          <span className="text-xs text-muted/60">主要功能</span>
          <div className="h-px flex-1 bg-sand" />
        </div>
        <div className="flex justify-between">
          {FEATURES.map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-1 text-center w-20">
              <span className="text-2xl">{f.icon}</span>
              <span className="text-xs font-medium text-charcoal">{f.label}</span>
              <span className="text-[10px] text-muted leading-tight">{f.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 text-xs text-muted/40 text-center">
        数据存储于本地，隐私安全
      </div>
    </main>
  );
}
