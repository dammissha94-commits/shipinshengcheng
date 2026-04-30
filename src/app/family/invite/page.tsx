'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FamilySpace, PersonProfile } from '@/types/domain';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { canManageFamily } from '@/lib/auth/permission-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { createInviteToken, listPendingInvites } from '@/lib/services/invite-service';
import type { PendingInviteTarget } from '@/lib/services/invite-service';
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/EmptyState';

function buildInviteText(person: PersonProfile, familyDisplayName: string, token: string): string {
  const inviteUrl =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/claim/${encodeURIComponent(token)}`;
  return `你已被加入「${familyDisplayName}」。这里记录了我们家的亲属关系、老照片和家族故事。点击链接后，你可以认领自己的资料，并补充家人的记忆：${inviteUrl}\n\n待认领档案：${person.display_name}`;
}

export default function InvitePage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [targets, setTargets] = useState<PendingInviteTarget[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    async function loadInvites() {
      if (!hasSupabaseConfig()) {
        setError('尚未配置 Supabase 环境变量，请先配置 .env.local');
        setLoading(false);
        return;
      }

      try {
        const user = await getCurrentUser();
        if (!user) {
          router.replace(currentLoginRedirectPath());
          return;
        }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) {
          router.replace('/create');
          return;
        }
        setFamily(currentFamily);
        setCanManage(await canManageFamily(currentFamily.id));
        setTargets(await listPendingInvites(currentFamily.id));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载邀请列表失败');
      } finally {
        setLoading(false);
      }
    }

    loadInvites();
  }, [router]);

  async function handleCopy(target: PendingInviteTarget) {
    if (!family) return;
    if (!canManage) {
      setError('当前账号无权限创建邀请，请联系家堂管理员。');
      return;
    }

    try {
      setError('');
      const invite =
        target.invite ??
        (await createInviteToken({
          familyId: family.id,
          inviteePersonId: target.person.id,
        }));
      const text = buildInviteText(target.person, family.displayName, invite.token);
      await navigator.clipboard.writeText(text);
      setCopied(target.person.id);
      setTargets((current) =>
        current.map((item) =>
          item.person.id === target.person.id ? { ...item, invite } : item
        )
      );
      setTimeout(() => setCopied(null), 2000);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : '复制邀请文案失败');
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-cream flex items-center justify-center"><p className="text-muted text-sm">加载中…</p></div>;
  }

  if (error && !family) {
    return <div className="min-h-screen bg-cream flex items-center justify-center px-4 text-center"><p className="text-sm text-muted">{error}</p></div>;
  }

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader title="邀请亲属认领" backHref="/family" />

      <div className="px-4 py-6 max-w-md mx-auto">
        <div className="bg-pine/8 border border-pine/20 rounded-2xl p-4 mb-5">
          <p className="text-sm text-pine font-medium mb-1">如何邀请认领？</p>
          <p className="text-xs text-muted leading-relaxed">
            复制下方邀请文案，通过常用聊天工具发送给对应家人。家人打开链接后，可认领自己的家人档案。
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-4">{error}</p>
        )}

        {targets.length === 0 ? (
          <EmptyState
            icon={<ShareIcon />}
            title="暂无待认领成员"
            description="先在家谱中添加亲属，再邀请他们认领各自的档案"
            action={{ label: '前往添加家庭成员', onClick: () => router.push('/family/relatives/new') }}
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted mb-1">
              共 <span className="text-pine font-semibold">{targets.length}</span> 位待认领成员
            </p>
            {targets.map((target) => {
              const isCopied = copied === target.person.id;
              const previewToken = target.invite?.token ?? '生成后自动填入';
              const inviteText = family
                ? buildInviteText(target.person, family.displayName, previewToken)
                : '';

              return (
                <div key={target.person.id} className="bg-card rounded-2xl border border-sand/60 shadow-sm p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-sand flex items-center justify-center text-pine font-semibold text-base shrink-0">
                      {target.person.display_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-charcoal">{target.person.display_name}</p>
                      <p className="text-xs text-muted">家人档案 · 待认领</p>
                    </div>
                    <span className="ml-auto text-xs text-gold bg-gold/10 px-2 py-1 rounded-full">待认领</span>
                  </div>

                  <div className="bg-cream rounded-xl p-3 mb-3 text-xs text-muted leading-relaxed whitespace-pre-line border border-sand/60">
                    {inviteText}
                  </div>

                  <button
                    onClick={() => handleCopy(target)}
                    disabled={!canManage}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${isCopied ? 'bg-green-600 text-white' : 'bg-pine text-cream hover:bg-pine-light active:scale-[0.98]'}`}
                  >
                    {!canManage ? '无权限生成邀请' : isCopied ? '已复制！' : target.invite ? '复制邀请文案' : '生成并复制邀请文案'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
