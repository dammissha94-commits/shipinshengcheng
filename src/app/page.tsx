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
import { Button, Input } from '@/components/ui';

const HouseIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4L28 12V28H4V12L16 4Z" stroke="#C4AA6A" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M11 28V18H21V28" stroke="#C4AA6A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="16" cy="13" r="2" fill="#C4AA6A" />
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
      if (!hasSupabaseConfig()) {
        setCheckingUser(false);
        return;
      }

      try {
        const user = await getCurrentUser();
        if (!active) return;
        setCurrentUser(user);

        if (user) {
          const family = await getCurrentFamilySpace(undefined, user);
          if (active) setHasFamily(Boolean(family));
        }
      } catch {
        if (active) {
          setCurrentUser(null);
          setHasFamily(false);
        }
      } finally {
        if (active) setCheckingUser(false);
      }
    }

    loadCurrentUser();

    return () => {
      active = false;
    };
  }, []);

  function handleStart(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedSurname = String(formData.get('surname') ?? '').trim();
    if (!submittedSurname) return;
    router.push(`/create?surname=${encodeURIComponent(submittedSurname)}`);
  }

  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-pine flex items-center justify-center shadow-lg">
          <HouseIcon />
        </div>
        <h1 className="mt-5 text-4xl font-bold text-pine tracking-[0.12em] mb-2">
          吾家祠堂
        </h1>
        <div className="flex items-center gap-2">
          <div className="h-px w-8 bg-gold/50" />
          <p className="text-xs text-gold font-medium tracking-widest">数字家堂</p>
          <div className="h-px w-8 bg-gold/50" />
        </div>
      </div>

      <p className="text-base text-muted text-center leading-relaxed mb-8 max-w-[320px]">
        从自己的姓氏开始，建立一座属于家人的数字家堂。记录家族关系，保存家族记忆，整理家人故事，让家人的记忆有处安放。
      </p>

      <form onSubmit={handleStart} className="w-full max-w-[340px] space-y-4">
        <div className="relative">
          <Input
            name="surname"
            type="text"
            value={surname}
            onChange={(event) => setSurname(event.target.value)}
            placeholder="请输入您的姓氏，如：王"
            maxLength={4}
            required
            autoFocus
            className="bg-card"
          />
          {surname && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted/60 pointer-events-none">
              氏
            </div>
          )}
        </div>

        {trimmedSurname && (
          <div className="flex items-center justify-center gap-2 text-sm text-pine/80 font-medium">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20,6 9,17 4,12" />
            </svg>
            将为你建立：{templeName}
          </div>
        )}

        <Button
          type="submit"
          aria-disabled={!trimmedSurname}
          disabled={!trimmedSurname}
          fullWidth
          size="lg"
        >
          开始建立我的家堂
        </Button>

        {hasFamily ? (
          <Link
            href="/family"
            className="block w-full rounded-xl border border-pine bg-card py-3.5 text-center text-base font-semibold text-pine transition-colors hover:bg-pine/5"
          >
            进入我的数字家堂
          </Link>
        ) : (
          <Link href={loginRedirectPath('/family')} className="block text-center text-sm font-medium text-gold">
            {checkingUser ? '正在检查登录状态' : currentUser ? '进入家堂工作台' : '已有账号，登录后继续'}
          </Link>
        )}
      </form>

      <div className="mt-12 w-full max-w-[340px]">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-sand" />
          <span className="text-xs text-muted/60">核心能力</span>
          <div className="h-px flex-1 bg-sand" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {FEATURES.map((feature) => (
            <div key={feature.label} className="rounded-xl border border-sand/70 bg-card px-3 py-3 text-center">
              <p className="text-sm font-semibold text-charcoal">{feature.label}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
