'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, Share2, UserPlus } from 'lucide-react';
import type { FamilySpace, PersonProfile } from '@/types/domain';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { canManageFamily } from '@/lib/auth/permission-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { createInviteToken, listPendingInvites } from '@/lib/services/invite-service';
import type { PendingInviteTarget } from '@/lib/services/invite-service';
import StatusBadge from '@/components/wujia/StatusBadge';
import EmptyState from '@/components/wujia/EmptyState';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';

function buildInviteText(person: PersonProfile, familyDisplayName: string, token: string): string {
  const inviteUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/claim/${encodeURIComponent(token)}`;
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
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        setFamily(currentFamily);
        setCanManage(await canManageFamily(currentFamily.id));
        setTargets(await listPendingInvites(currentFamily.id));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载邀请列表失败');
      } finally { setLoading(false); }
    }
    loadInvites();
  }, [router]);

  async function handleCopy(target: PendingInviteTarget) {
    if (!family) return;
    if (!canManage) { setError('当前账号无权限创建邀请。'); return; }
    try {
      setError('');
      const invite = target.invite ?? (await createInviteToken({ familyId: family.id, inviteePersonId: target.person.id }));
      const text = buildInviteText(target.person, family.displayName, invite.token);
      await navigator.clipboard.writeText(text);
      setCopied(target.person.id);
      setTargets((cur) => cur.map((item) => item.person.id === target.person.id ? { ...item, invite } : item));
      setTimeout(() => setCopied(null), 2000);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : '复制邀请文案失败');
    }
  }

  if (loading) return <PageSkeleton title="邀请认领" backHref="/family" cards={3} withStats={false} withSearch={false} />;
  if (error && !family) return <MobilePage><MobileStatusBar /><div className="flex min-h-[70vh] items-center justify-center px-5 text-center"><p className="text-sm text-[#8A7465]">{error}</p></div></MobilePage>;

  return (
    <MobilePage>
      <MobileStatusBar />
      <MobileTopBar title="邀请认领" />

      <div className="relative z-10 space-y-5 px-5 pb-6">
        {/* Instructions */}
        <div className="rounded-[15px] border border-[#E7D9C9] bg-white/76 p-5 shadow-[0_10px_28px_rgba(90,53,36,0.06)]">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4E8DC] text-[#8B5A3C]">
              <Share2 size={18} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#2A1D16]">如何邀请？</h2>
              <p className="mt-1 text-sm text-[#8A7465] leading-relaxed">
                复制邀请文案后，通过微信等常用工具发送给家人。家人打开链接即可认领自己的档案。
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[15px] border border-[#E7D9C9] bg-[#FBF4E8]/80 p-4">
          <p className="text-sm font-semibold text-[#2A1D16]">发送前可以这样说明</p>
          <div className="mt-3 space-y-2 text-[12px] leading-5 text-[#78675B]">
            <p>1. 这是私密家堂邀请，只用于确认本人档案。</p>
            <p>2. 对方认领后，可以补充自己的资料和家庭记忆。</p>
            <p>3. 如果不是本人，可以在认领页选择拒绝，不会关联账号。</p>
          </div>
        </div>

        {error && <p className="rounded-xl bg-danger-light px-4 py-2.5 text-sm text-danger">{error}</p>}

        {/* Targets */}
        {targets.length === 0 ? (
          <EmptyState
            icon={<UserPlus size={24} strokeWidth={1.8} />}
            title="暂无待认领成员"
            description="先在家谱中添加亲属，再邀请他们认领"
            action={<button onClick={() => router.push('/family/relatives/new')} className="wj-primary inline-flex items-center gap-2 rounded-2xl px-5 min-h-[44px] text-sm font-semibold transition-colors">添加家人</button>}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#8A7465]">共 <span className="text-[#7A4B34] font-semibold">{targets.length}</span> 位家人待认领</p>
            {targets.map((target) => {
              const isCopied = copied === target.person.id;
              const previewToken = target.invite?.token ?? '';
              const inviteText = family ? buildInviteText(target.person, family.displayName, previewToken || '...') : '';

              return (
                <div key={target.person.id} className="overflow-hidden rounded-[15px] border border-[#E7D9C9] bg-white/82 shadow-[0_10px_28px_rgba(90,53,36,0.06)]">
                  {/* Person header */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--surface-2)]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4E8DC] text-[#6D4C41] font-semibold text-sm">
                      {target.person.display_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#2A1D16]">{target.person.display_name}</p>
                      <p className="text-xs text-[#8A7465]">家人档案 · 待认领</p>
                    </div>
                    <StatusBadge variant="warning">待认领</StatusBadge>
                  </div>

                  {/* Preview */}
                  <div className="px-5 py-4">
                    <div className="max-h-24 overflow-y-auto whitespace-pre-line rounded-2xl border border-[#E7D9C9] bg-[#FBF4E8] p-3 text-xs leading-relaxed text-[#8A7465]">
                      {inviteText || '加载中...'}
                    </div>
                  </div>

                  {/* Copy button */}
                  <div className="border-t border-[var(--surface-2)] px-5 py-4">
                    <button onClick={() => handleCopy(target)} disabled={!canManage}
                      className={`w-full flex items-center justify-center gap-2 rounded-xl min-h-[44px] text-sm font-semibold transition-all active:scale-[0.98] ${
                        isCopied
                          ? 'bg-[#5A3524] text-white'
                          : 'wj-primary'
                      } disabled:opacity-50 disabled:pointer-events-none`}>
                      {isCopied ? <><Check size={16} />已复制</> : target.invite ? <><Copy size={15} />复制邀请文案</> : <><Copy size={15} />生成并复制邀请</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobilePage>
  );
}
