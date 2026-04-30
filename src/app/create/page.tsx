'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatTempleName } from '@/lib/family-naming';
import { ensureProfile, getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { createFamilySpace } from '@/lib/services/family-service';
import type { Gender } from '@/types/domain';
import AppHeader from '@/components/AppHeader';

const YEARS = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i - 10);

function CreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [surname, setSurname] = useState(() => searchParams.get('surname') ?? '');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [birthYear, setBirthYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<Awaited<ReturnType<typeof getCurrentUser>>>(null);

  const trimmedSurname = surname.trim();
  const trimmedName = name.trim();
  const displayName = formatTempleName(trimmedSurname);
  const canSubmit = Boolean(trimmedSurname && trimmedName);

  useEffect(() => {
    async function checkAuth() {
      if (!hasSupabaseConfig()) {
        setError('尚未配置 Supabase 环境变量，请先配置 .env.local');
        setCheckingAuth(false);
        return;
      }

      try {
        const user = await getCurrentUser();
        if (!user) {
          router.replace(currentLoginRedirectPath());
          return;
        }
        setCurrentUser(user);
        await ensureProfile(user);
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : '登录状态检查失败');
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setError('');

    try {
      setSubmitting(true);
      await createFamilySpace({
        surname: trimmedSurname,
        ownerName: trimmedName,
        selfGender: gender,
        selfBirthYear: birthYear ? parseInt(birthYear, 10) : null,
        displayName,
        name: displayName,
      }, undefined, currentUser);
      router.push('/family');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '创建失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted text-sm">加载中…</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      {/* Preview card */}
      <div className="bg-pine rounded-2xl p-5 mb-6 text-cream text-center shadow-lg">
        <div className="text-xs text-cream/60 mb-1 tracking-widest">正在创建</div>
        <div className="text-xl font-bold tracking-wide">{displayName}</div>
        {name && (
          <div className="text-sm text-cream/70 mt-1">创建人：{name}</div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Surname */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">
            姓氏 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            placeholder="如：王、李、张"
            maxLength={4}
            className="w-full border-2 border-sand rounded-xl px-4 py-3 text-base
              focus:outline-none focus:border-pine transition-colors bg-card"
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">
            您的姓名 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入您的姓名"
            maxLength={20}
            className="w-full border-2 border-sand rounded-xl px-4 py-3 text-base
              focus:outline-none focus:border-pine transition-colors bg-card"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">性别</label>
          <div className="flex gap-3">
            {([['male', '男'], ['female', '女']] as const).map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => setGender(val)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-colors
                  ${gender === val
                    ? 'bg-pine text-cream border-pine'
                    : 'bg-card text-charcoal border-sand hover:border-pine/40'
                  }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Birth year */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">
            出生年份 <span className="text-muted font-normal">（可选）</span>
          </label>
          <select
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            className="w-full border-2 border-sand rounded-xl px-4 py-3 text-base
              focus:outline-none focus:border-pine transition-colors bg-card appearance-none"
          >
            <option value="">不填写</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y} 年</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-muted leading-relaxed bg-sand/50 rounded-xl p-3">
          您的信息仅在家族内部可见，不对外公开。出生年份为可选项，无需填写手机号。
        </p>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || submitting || Boolean(error && !hasSupabaseConfig())}
          className={`w-full py-4 rounded-xl text-base font-semibold transition-all
            ${canSubmit
              ? 'bg-pine text-cream shadow-sm hover:bg-pine-light active:scale-[0.98]'
              : 'bg-sand text-muted cursor-not-allowed'
            }`}
        >
          {submitting ? '创建中…' : '立即创建'}
        </button>
      </form>
    </div>
  );
}

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-cream">
      <AppHeader title="创建祠堂" backHref="/" />
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <p className="text-muted text-sm">加载中…</p>
          </div>
        }
      >
        <CreateForm />
      </Suspense>
    </div>
  );
}
