'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatTempleName } from '@/lib/family-naming';
import { ensureProfile, getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { createFamilySpace } from '@/lib/services/family-service';
import type { Gender } from '@/types/domain';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import { WjCardHeader, WjHeroPanel, WjPaperCard, WjScreenContent, WjSoftNote } from '@/components/wujia/MobileDesignSystem';
import { WjButton, WjFormRow, WjInput, WjSelect } from '@/components/wujia/WjForm';

const YEARS = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i - 10);

const NEXT_STEPS = [
  { label: '添加第一位家人', desc: '录入父母、配偶或子女，让家堂从真实关系开始。' },
  { label: '邀请成员认领', desc: '把节点发给家人，让他们补充自己的档案。' },
  { label: '生成三代谱', desc: '把零散家人整理成清晰的三代关系结构。' },
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

  if (checkingAuth) return <CenteredText text="加载中..." />;

  return (
    <WjScreenContent>
      <WjHeroPanel
        eyebrow="CREATE FAMILY HALL"
        title="创建数字家堂"
        description="为你的家庭建立一个私密的关系与记忆空间，先从姓氏和本人档案开始。"
      />

      {trimmedSurname && (
        <WjPaperCard className="overflow-hidden bg-gradient-to-br from-[#5A3825] to-[#8B5A3C] p-5 text-center text-white">
          <p className="text-[12px] tracking-[0.24em] text-white/55">家堂预览</p>
          <p className="mt-1 text-[24px] font-bold tracking-wide">{displayName}</p>
          {name && <p className="mt-1 text-[13px] text-white/68">创建人：{name}</p>}
        </WjPaperCard>
      )}

      <form onSubmit={handleSubmit}>
        <WjPaperCard className="overflow-hidden">
          <WjCardHeader title="基本资料" description="填写你的姓氏和姓名即可创建，出生年份为可选项。" />

          <div className="space-y-4 px-5 py-5">
            <WjFormRow label="姓氏" required>
              <WjInput value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="如：王、李、张" maxLength={4} />
            </WjFormRow>

            <WjFormRow label="你的姓名" required>
              <WjInput value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入你的姓名" maxLength={20} />
            </WjFormRow>

            <WjFormRow label="性别">
              <div className="flex gap-3">
                {([['male', '男'], ['female', '女']] as const).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setGender(val)}
                    className={`min-h-[44px] flex-1 rounded-[14px] border-2 text-sm font-medium transition ${
                      gender === val
                        ? 'border-[#5A3825] bg-[#5A3825] text-white shadow-[0_10px_22px_rgba(90,53,36,0.18)]'
                        : 'border-[#E7D9C9] bg-white text-[#5A3524] hover:border-[#8B5A3C]'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </WjFormRow>

            <WjFormRow label="出生年份" hint="可选">
              <WjSelect value={birthYear} onChange={(e) => setBirthYear(e.target.value)}>
                <option value="">不填写</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y} 年</option>
                ))}
              </WjSelect>
            </WjFormRow>
          </div>

          <div className="space-y-4 border-t border-[#EEE3D6] px-5 py-4">
            <WjSoftNote>你的信息仅在家族内部可见，不对外公开。后续可以继续补充父母、配偶、子女和兄弟姐妹。</WjSoftNote>

            {error && <p className="rounded-xl bg-danger-light px-4 py-2.5 text-sm text-danger">{error}</p>}

            <WjButton type="submit" variant="primary" size="lg" disabled={!canSubmit} loading={submitting} className="w-full">
              立即创建
            </WjButton>
          </div>
        </WjPaperCard>
      </form>

      <WjPaperCard className="p-5">
        <p className="mb-3 text-sm font-semibold text-[#2A1D16]">创建后你可以</p>
        <div className="space-y-3">
          {NEXT_STEPS.map((step, i) => (
            <div key={step.label} className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F1E5D6] text-xs font-semibold text-[#8B5A3C]">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-medium text-[#2A1D16]">{step.label}</p>
                <p className="text-xs leading-5 text-[#78675B]">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </WjPaperCard>
    </WjScreenContent>
  );
}

function CenteredText({ text }: { text: string }) {
  return (
    <div className="relative z-10 flex min-h-[60vh] items-center justify-center px-5 text-center">
      <p className="rounded-[15px] border border-[#E7D9C9] bg-white/82 px-4 py-5 text-sm text-[#78675B] shadow-[0_10px_28px_rgba(90,53,36,0.06)]">{text}</p>
    </div>
  );
}

export default function CreatePage() {
  return (
    <MobilePage withBottomNav={false}>
      <MobileStatusBar />
      <MobileTopBar title="创建家堂" backHref="/" />
      <Suspense fallback={<CenteredText text="加载中..." />}>
        <CreateForm />
      </Suspense>
    </MobilePage>
  );
}
