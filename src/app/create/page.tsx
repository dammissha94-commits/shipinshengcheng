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

const NEXT_STEPS = [
  { label: '添加第一位家人', desc: '录入父母、配偶或子女' },
  { label: '邀请成员认领', desc: '让家人完善自己的个人档案' },
  { label: '建立三代谱', desc: '自动生成家族关系结构图' },
];

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
        <p className="text-sm text-stone-500">加载中…</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold text-stone-900">创建数字家堂</h2>
        <p className="mt-1 text-sm text-stone-500">
          为你的家庭建立一个私密的关系与记忆空间
        </p>
      </div>

      {/* Preview card */}
      {trimmedSurname && (
        <div className="rounded-2xl bg-#5A3524 p-5 text-center text-white shadow-lg">
          <p className="text-xs text-white/50 tracking-widest">预览</p>
          <p className="mt-1 text-xl font-bold tracking-wide">{displayName}</p>
          {name && <p className="mt-1 text-sm text-white/60">创建人：{name}</p>}
        </div>
      )}

      {/* Form card */}
      <form onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-5 py-4">
            <h3 className="text-base font-semibold text-stone-800">基本资料</h3>
            <p className="mt-0.5 text-sm text-stone-500">填写你的姓氏和姓名即可创建</p>
          </div>

          <div className="space-y-4 px-5 py-5">
            {/* Surname */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                姓氏 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="如：王、李、张"
                maxLength={4}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all duration-200"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                你的姓名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入你的姓名"
                maxLength={20}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all duration-200"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">性别</label>
              <div className="flex gap-3">
                {([['male', '男'], ['female', '女']] as const).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setGender(val)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-200 ${
                      gender === val
                        ? 'bg-#5A3524 text-white border-#5A3524 shadow-sm'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Birth year */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                出生年份 <span className="text-stone-400 font-normal">（可选）</span>
              </label>
              <select
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all duration-200 appearance-none"
              >
                <option value="">不填写</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y} 年</option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-stone-100 px-5 py-4 space-y-4">
            <p className="text-xs text-stone-400 leading-relaxed">
              你的信息仅在家族内部可见，不对外公开。出生年份为可选项。
            </p>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="w-full h-12 rounded-xl bg-#5A3524 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-#4E342E disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
            >
              {submitting ? '创建中…' : '立即创建'}
            </button>
          </div>
        </div>
      </form>

      {/* Next steps */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-5">
        <p className="text-sm font-semibold text-stone-800 mb-3">创建后你可以</p>
        <div className="space-y-3">
          {NEXT_STEPS.map((step, i) => (
            <div key={step.label} className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-#F0E6D5 text-xs font-semibold text-#8D6E63">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-medium text-stone-800">{step.label}</p>
                <p className="text-xs text-stone-500">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-[#F8F1E7]">
      <AppHeader title="创建家堂" backHref="/" />
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-stone-500">加载中…</p>
          </div>
        }
      >
        <CreateForm />
      </Suspense>
    </div>
  );
}
