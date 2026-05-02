'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { loginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { formatTempleName } from '@/lib/family-naming';

const HouseIcon = () => (
  <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4L28 12V28H4V12L16 4Z" stroke="#FBBF24" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M11 28V18H21V28" stroke="#FBBF24" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="16" cy="13" r="2" fill="#FBBF24" />
  </svg>
);

const FEATURES = [
  { label: '家族关系', desc: '以自己为中心整理三代谱' },
  { label: '家族记忆', desc: '保存故事、相册和家人档案' },
  { label: '家庭节点', desc: '记录纪念日与生日提醒' },
];

export default function HomePage() {
  const router = useRouter();
  const [surname, setSurname] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasFamily, setHasFamily] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);

  const trimmedSurname = surname.trim();
  const templeName = formatTempleName(trimmedSurname);

  useEffect(() => {
    let active = true;
    async function loadCurrentUser() {
      if (!hasSupabaseConfig()) { setCheckingUser(false); return; }
      try {
        const user = await getCurrentUser();
        if (!active) return;
        setCurrentUser(user);
        if (user) { const family = await getCurrentFamilySpace(undefined, user); if (active) setHasFamily(Boolean(family)); }
      } catch { if (active) { setCurrentUser(null); setHasFamily(false); } }
      finally { if (active) setCheckingUser(false); }
    }
    loadCurrentUser();
    return () => { active = false; };
  }, []);

  function handleStart(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedSurname = String(new FormData(event.currentTarget).get('surname') ?? '').trim();
    if (!submittedSurname) return;
    router.push(`/create?surname=${encodeURIComponent(submittedSurname)}`);
  }

  return (
    <main className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 py-12">
      {/* Hero */}
      <div className="mb-10 flex flex-col items-center">
        <div className="w-[68px] h-[68px] rounded-2xl bg-emerald-950 flex items-center justify-center shadow-[0_4px_16px_rgba(30,58,47,0.2)]">
          <HouseIcon />
        </div>
        <h1 className="mt-6 text-[40px] font-bold text-emerald-950 tracking-[0.08em]">
          吾家祠堂
        </h1>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-px w-10 bg-amber-400/40" />
          <p className="text-[13px] text-amber-600 font-medium tracking-[0.15em]">数字家堂</p>
          <div className="h-px w-10 bg-amber-400/40" />
        </div>
      </div>

      <p className="text-[15px] text-stone-500 text-center leading-relaxed mb-9 max-w-[300px]">
        从自己的姓氏开始，建立一座属于家人的数字家堂。记录家族关系，保存家族记忆，整理家人故事。
      </p>

      <form onSubmit={handleStart} className="w-full max-w-[340px] space-y-4">
        <div className="relative">
          <input
            name="surname"
            type="text"
            value={surname}
            onChange={(event) => setSurname(event.target.value)}
            placeholder="请输入您的姓氏，如：王"
            maxLength={4}
            required
            autoFocus
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-[15px] text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all"
          />
          {surname && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-stone-400 pointer-events-none">氏</div>
          )}
        </div>

        {trimmedSurname && (
          <div className="flex items-center justify-center gap-2 py-1 text-[15px] text-emerald-800 font-medium">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20,6 9,17 4,12" />
            </svg>
            将为你建立：{templeName}
          </div>
        )}

        <button
          type="submit"
          disabled={!trimmedSurname}
          className="w-full h-12 rounded-xl bg-emerald-950 text-[15px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-900 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
        >
          开始建立我的家堂
        </button>

        {hasFamily ? (
          <Link
            href="/family"
            className="block w-full rounded-xl border-2 border-emerald-900/30 bg-white py-3.5 text-center text-[15px] font-semibold text-emerald-800 transition-all duration-200 hover:border-emerald-800 hover:bg-emerald-50/50 active:scale-[0.98]"
          >
            进入我的数字家堂
          </Link>
        ) : (
          <Link href={loginRedirectPath('/family')} className="block text-center text-[14px] font-medium text-amber-600 hover:text-amber-500 transition-colors">
            {checkingUser ? '正在检查登录状态' : currentUser ? '进入家堂工作台' : '已有账号，登录后继续'}
          </Link>
        )}
      </form>

      {/* Features */}
      <div className="mt-14 w-full max-w-[340px]">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-stone-300/80" />
          <span className="text-[12px] text-stone-400 tracking-wider">核心能力</span>
          <div className="h-px flex-1 bg-stone-300/80" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {FEATURES.map((feature) => (
            <div key={feature.label} className="rounded-xl border border-stone-200 bg-white px-3 py-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <p className="text-[14px] font-semibold text-stone-800">{feature.label}</p>
              <p className="mt-1.5 text-[12px] leading-snug text-stone-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
